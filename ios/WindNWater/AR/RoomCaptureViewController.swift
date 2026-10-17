// RoomCaptureViewController.swift — presents RoomCaptureView (camera/LiDAR) for scanning
import UIKit
import ARKit
import RoomPlan

@available(iOS 16.0, *)
class RoomCaptureViewController: UIViewController, RoomCaptureViewDelegate, RoomCaptureSessionDelegate {

  private var roomCaptureView: RoomCaptureView!

  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
  init() { super.init(nibName: nil, bundle: nil) }

  func encode(with coder: NSCoder) {}
}
