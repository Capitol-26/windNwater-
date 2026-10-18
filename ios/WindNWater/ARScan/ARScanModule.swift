// ARScanModule.swift — the React Native side of ARScan: a camera view and start/stop recording calls
import ARKit
import SceneKit
import AVFoundation
import React

@objc(ARScan)
final class ARScanModule: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func isSupported(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(ARScanSession.isSupported)
  }

  // "granted", "denied" or "undetermined"
  @objc func cameraPermission(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized: resolve("granted")
    case .notDetermined: resolve("undetermined")
    default: resolve("denied")
    }
  }

  @objc func requestCameraPermission(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    AVCaptureDevice.requestAccess(for: .video) { resolve($0) }
  }

  // Forget the old world and start tracking afresh: called when a new scan begins
  @objc func resetSession(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async { ARScanSession.shared.run(reset: true); resolve(nil) }
  }

  // Pins boxes in the world: [{ kind, label, position: [x, y, z], size: [w, h, d], yaw }]
  @objc func placeHazards(_ items: [[String: Any]], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    ARScanSession.shared.setHazards(items)
    resolve(nil)
  }

  @objc func startRecording(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    ARScanSession.shared.start { error in
      if let error = error { reject("ARSCAN_START", error.localizedDescription, error) } else { resolve(nil) }
    }
  }

  // { videoPath, samples: CameraSample[], floorY: number | null }
  @objc func stopRecording(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    ARScanSession.shared.stop { result, error in
      if let result = result { resolve(result) } else { reject("ARSCAN_STOP", error?.localizedDescription ?? "Stopped.", error) }
    }
  }
}

final class ARScanView: UIView {
  private let scene = ARSCNView(frame: .zero)
  private var boxes: [SCNNode] = []

  override init(frame: CGRect) {
    super.init(frame: frame)
    scene.session = ARScanSession.shared.session
    scene.automaticallyUpdatesLighting = false
    scene.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(scene)
    NotificationCenter.default.addObserver(self, selector: #selector(redraw), name: .arScanHazardsChanged, object: nil)
    redraw()
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }
  deinit { NotificationCenter.default.removeObserver(self) }

  override func layoutSubviews() {
    super.layoutSubviews()
    scene.frame = bounds
  }

  // The session starts with the first view and keeps going when the view goes away, so the pinned boxes stay in place
  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil { ARScanSession.shared.run() }
  }

  // red boxes block chi, green boxes are poison arrows
  @objc private func redraw() {
    boxes.forEach { $0.removeFromParentNode() }
    boxes = ARScanSession.shared.hazards.compactMap { item in
      guard let kind = item["kind"] as? String, let p = item["position"] as? [Double], let s = item["size"] as? [Double],
            p.count == 3, s.count == 3 else { return nil }
      let color = kind == "poison_arrow" ? UIColor(red: 0.2, green: 0.8, blue: 0.35, alpha: 1) : UIColor(red: 0.92, green: 0.2, blue: 0.2, alpha: 1)
      let node = Self.box(size: SCNVector3(Float(s[0]), Float(s[1]), Float(s[2])), color: color, label: item["label"] as? String ?? "")
      node.position = SCNVector3(Float(p[0]), Float(p[1]), Float(p[2]))
      node.eulerAngles.y = Float(item["yaw"] as? Double ?? 0)
      scene.scene.rootNode.addChildNode(node)
      return node
    }
  }

  // a see-through filled box, its twelve edges and a label that always faces the viewer
  private static func box(size: SCNVector3, color: UIColor, label: String) -> SCNNode {
    let root = SCNNode()
    let fill = SCNBox(width: CGFloat(size.x), height: CGFloat(size.y), length: CGFloat(size.z), chamferRadius: 0)
    let fillMaterial = SCNMaterial()
    fillMaterial.diffuse.contents = color.withAlphaComponent(0.22)
    fillMaterial.isDoubleSided = true
    fillMaterial.writesToDepthBuffer = false
    fill.materials = [fillMaterial]
    root.addChildNode(SCNNode(geometry: fill))

    let edge: CGFloat = 0.012
    let hx = size.x / 2, hy = size.y / 2, hz = size.z / 2
    let edgeMaterial = SCNMaterial()
    edgeMaterial.diffuse.contents = color
    edgeMaterial.lightingModel = .constant
    for sy in [-hy, hy] {
      for sz in [-hz, hz] { root.addChildNode(edgeNode(CGFloat(size.x), edge, edge, SCNVector3(0, sy, sz), edgeMaterial)) }
    }
    for sx in [-hx, hx] {
      for sz in [-hz, hz] { root.addChildNode(edgeNode(edge, CGFloat(size.y), edge, SCNVector3(sx, 0, sz), edgeMaterial)) }
      for sy in [-hy, hy] { root.addChildNode(edgeNode(edge, edge, CGFloat(size.z), SCNVector3(sx, sy, 0), edgeMaterial)) }
    }

    if !label.isEmpty {
      let text = SCNText(string: label, extrusionDepth: 0)
      text.font = UIFont.systemFont(ofSize: 0.7, weight: .medium)
      text.flatness = 0.1
      text.firstMaterial = edgeMaterial
      let node = SCNNode(geometry: text)
      let (lo, hi) = node.boundingBox
      node.pivot = SCNMatrix4MakeTranslation((lo.x + hi.x) / 2, lo.y, 0)
      node.scale = SCNVector3(0.1, 0.1, 0.1)
      node.position = SCNVector3(0, hy + 0.06, 0)
      node.constraints = [SCNBillboardConstraint()]
      root.addChildNode(node)
    }
    return root
  }

  private static func edgeNode(_ w: CGFloat, _ h: CGFloat, _ l: CGFloat, _ at: SCNVector3, _ material: SCNMaterial) -> SCNNode {
    let geometry = SCNBox(width: w, height: h, length: l, chamferRadius: 0)
    geometry.materials = [material]
    let node = SCNNode(geometry: geometry)
    node.position = at
    return node
  }
}

@objc(ARScanViewManager)
final class ARScanViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { true }
  override func view() -> UIView! { ARScanView() }
}
