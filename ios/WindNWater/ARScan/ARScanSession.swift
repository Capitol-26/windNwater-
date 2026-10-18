// ARScanSession.swift — one ARKit world-tracking session that shows the camera and, while recording, writes the
// video together with the camera pose of every few frames. The session keeps running after the recording stops, so
// the danger spots found later can be pinned in the same world the scan was taken in. Plain ARWorldTrackingConfiguration: no LiDAR, no RoomPlan,
// so it runs on every iPhone that supports ARKit.
import ARKit
import AVFoundation

final class ARScanSession: NSObject, ARSessionDelegate {
  static let shared = ARScanSession()

  let session = ARSession()
  private let queue = DispatchQueue(label: "windnwater.arscan")  // every piece of state below is touched only here

  private var writer: AVAssetWriter?
  private var input: AVAssetWriterInput?
  private var adaptor: AVAssetWriterInputPixelBufferAdaptor?
  private var outputURL: URL?
  private var recording = false
  private var firstTimestamp: TimeInterval?
  private var lastWritten: TimeInterval = -1
  private var written = 0
  private var samples: [[String: Any]] = []
  private var planes: [UUID: (y: Float, area: Float, isFloor: Bool)] = [:]

  private let videoFPS = 24.0
  private let poseEvery = 3  // a pose for every third written frame, 8 per second
  private let videoWidth = 1440, videoHeight = 1080  // sensor orientation; the file is turned upright below

  override init() {
    super.init()
    session.delegate = self
    session.delegateQueue = queue
  }

  static var isSupported: Bool { ARWorldTrackingConfiguration.isSupported }

  private var running = false
  private(set) var hazards: [[String: Any]] = []  // boxes placed in the world, drawn by every ARScanView

  // Starts tracking, or does nothing when it is already running. `reset` forgets the old world and its hazards.
  func run(reset: Bool = false) {
    guard Self.isSupported, reset || !running else { return }
    let config = ARWorldTrackingConfiguration()
    config.planeDetection = [.horizontal]  // finds the floor; works without LiDAR
    config.isLightEstimationEnabled = false
    // 30 fps at the largest size keeps the files small and the tracking steady
    config.videoFormat = ARWorldTrackingConfiguration.supportedVideoFormats
      .filter { $0.framesPerSecond == 30 }
      .max { $0.imageResolution.width < $1.imageResolution.width } ?? config.videoFormat
    if reset {
      queue.async { self.planes = [:]; if self.recording { self.cancel() } }
      setHazards([])
      session.run(config, options: [.resetTracking, .removeExistingAnchors])
    } else {
      session.run(config)
    }
    running = true
  }

  func pause() {
    queue.async { if self.recording { self.cancel() } }
    session.pause()
    running = false
  }

  func setHazards(_ items: [[String: Any]]) {
    hazards = items
    DispatchQueue.main.async { NotificationCenter.default.post(name: .arScanHazardsChanged, object: nil) }
  }

  // MARK: recording

  func start(_ done: @escaping (Error?) -> Void) {
    queue.async {
      guard !self.recording else { return done(Self.fail("Already recording.")) }
      guard self.session.currentFrame != nil else { return done(Self.fail("The camera is not ready yet.")) }
      let url = FileManager.default.temporaryDirectory.appendingPathComponent("scan-\(UUID().uuidString).mov")
      do {
        let writer = try AVAssetWriter(outputURL: url, fileType: .mov)
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
          AVVideoCodecKey: AVVideoCodecType.h264,
          AVVideoWidthKey: self.videoWidth,
          AVVideoHeightKey: self.videoHeight,
          AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 6_000_000],
        ])
        input.expectsMediaDataInRealTime = true
        input.transform = CGAffineTransform(rotationAngle: .pi / 2)  // the sensor is landscape; the phone is upright
        guard writer.canAdd(input) else { return done(Self.fail("The video could not be set up.")) }
        writer.add(input)
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: nil)
        guard writer.startWriting() else { return done(writer.error ?? Self.fail("The video could not be started.")) }
        writer.startSession(atSourceTime: .zero)
        self.writer = writer; self.input = input; self.adaptor = adaptor; self.outputURL = url
        self.firstTimestamp = nil; self.lastWritten = -1; self.written = 0; self.samples = []
        self.recording = true
        done(nil)
      } catch {
        done(error)
      }
    }
  }

  func stop(_ done: @escaping ([String: Any]?, Error?) -> Void) {
    queue.async {
      guard self.recording, let writer = self.writer, let input = self.input, let url = self.outputURL else {
        return done(nil, Self.fail("Not recording."))
      }
      self.recording = false
      input.markAsFinished()
      let samples = self.samples, floorY = self.floorY()
      writer.finishWriting {
        if writer.status == .completed {
          done(["videoPath": url.path, "samples": samples, "floorY": floorY as Any? ?? NSNull()], nil)
        } else {
          done(nil, writer.error ?? Self.fail("The video could not be saved."))
        }
      }
    }
  }

  private func cancel() {
    recording = false
    input?.markAsFinished()
    writer?.cancelWriting()
  }

  // The floor: the biggest plane ARKit labels floor, else the lowest sizeable horizontal plane. World metres, y up.
  private func floorY() -> Double? {
    let labelled = planes.values.filter { $0.isFloor }.max { $0.area < $1.area }
    let lowest = planes.values.filter { $0.area >= 0.4 }.min { $0.y < $1.y }
    return (labelled ?? lowest).map { Double($0.y) }
  }

  // MARK: ARSessionDelegate (all on `queue`)

  func session(_ session: ARSession, didUpdate frame: ARFrame) {
    guard recording, let input = input, let adaptor = adaptor else { return }
    let first = firstTimestamp ?? frame.timestamp
    firstTimestamp = first
    let t = frame.timestamp - first
    guard t - lastWritten >= 1.0 / videoFPS - 0.004, input.isReadyForMoreMediaData else { return }
    guard adaptor.append(frame.capturedImage, withPresentationTime: CMTime(seconds: t, preferredTimescale: 600)) else { return }
    lastWritten = t
    if written % poseEvery == 0 { samples.append(Self.sample(frame, at: t)) }
    written += 1
  }

  func session(_ session: ARSession, didAdd anchors: [ARAnchor]) { track(anchors) }
  func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) { track(anchors) }
  func session(_ session: ARSession, didRemove anchors: [ARAnchor]) { anchors.forEach { planes[$0.identifier] = nil } }

  private func track(_ anchors: [ARAnchor]) {
    for case let plane as ARPlaneAnchor in anchors where plane.alignment == .horizontal {
      let isFloor = ARPlaneAnchor.isClassificationSupported && plane.classification == .floor
      planes[plane.identifier] = (plane.transform.columns.3.y, plane.planeExtent.width * plane.planeExtent.height, isFloor)
    }
  }

  // MARK: helpers

  // camera-to-world transform (column-major, as ARKit stores it) and pixel intrinsics of the sensor image
  private static func sample(_ frame: ARFrame, at t: TimeInterval) -> [String: Any] {
    let m = frame.camera.transform, k = frame.camera.intrinsics
    let transform = [m.columns.0, m.columns.1, m.columns.2, m.columns.3].flatMap { [$0.x, $0.y, $0.z, $0.w] }
    return [
      "timestamp_sec": t,
      "transform": transform.map { Double($0) },
      "intrinsics": ["fx": Double(k[0][0]), "fy": Double(k[1][1]), "cx": Double(k[2][0]), "cy": Double(k[2][1])],
      "imageSize": ["width": Double(frame.camera.imageResolution.width), "height": Double(frame.camera.imageResolution.height)],
    ]
  }

  private static func fail(_ message: String) -> NSError {
    NSError(domain: "ARScan", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
  }
}

extension Notification.Name {
  static let arScanHazardsChanged = Notification.Name("windnwater.arscan.hazardsChanged")
}
