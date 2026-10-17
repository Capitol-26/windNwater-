// ARSupportChecker.swift — checks ARKit motion-tracking support, compass availability and camera permission
import ARKit
import AVFoundation
import CoreLocation

struct ARSupportChecker {

  /// World tracking (camera + gyroscope/accelerometer) works on any ARKit device, no LiDAR needed.
  static var isScanSupported: Bool { ARWorldTrackingConfiguration.isSupported }

  /// The compass lets the floor plan be aligned to north, which feng shui directions depend on.
  static var isCompassAvailable: Bool { CLLocationManager.headingAvailable() }

  static func requestCameraAccess(_ completion: @escaping (Bool) -> Void) {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      completion(true)
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { granted in
        DispatchQueue.main.async { completion(granted) }
      }
    default:
      completion(false)
    }
  }
}
