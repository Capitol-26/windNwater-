// RoomScanModule.swift — React Native bridge for camera + motion-sensor (ARKit) room scanning
import Foundation
import UIKit
import React

@objc(RoomScanModule)
class RoomScanModule: RCTEventEmitter {

  private var hasListeners = false
  private var activeController: GuidedScanViewController?

  override static func requiresMainQueueSetup() -> Bool { true }

  override func supportedEvents() -> [String]! {
    ["onScanProgress"]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  // MARK: Exposed methods

  @objc func isSupported(_ resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(ARSupportChecker.isScanSupported)
  }

  @objc func startScan(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard ARSupportChecker.isScanSupported else {
        reject("E_UNSUPPORTED", "This device doesn't support ARKit motion tracking.", nil)
        return
      }
      guard self.activeController == nil else {
        reject("E_BUSY", "A room scan is already in progress.", nil)
        return
      }
      ARSupportChecker.requestCameraAccess { granted in
        guard granted else {
          reject("E_CAMERA_DENIED", "Camera access is required. Enable it in Settings.", nil)
          return
        }
        self.present(resolve: resolve, reject: reject)
      }
    }
  }

  @objc func stopScan(_ resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      self.activeController?.finishScan()
      resolve(nil)
    }
  }

  // MARK: Presentation

  private func present(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard let presenter = Self.topViewController() else {
      reject("E_NO_VIEW", "Could not find a view to present the scanner from.", nil)
      return
    }
    let controller = GuidedScanViewController()
    controller.onProgress = { [weak self] counts in
      guard let self = self, self.hasListeners else { return }
      self.sendEvent(withName: "onScanProgress", body: counts)
    }
    controller.onFinish = { [weak self] outcome in
      self?.activeController = nil
      switch outcome {
      case .finished(let plan): resolve(plan)
      case .cancelled: reject("E_CANCELLED", "The scan was cancelled.", nil)
      case .failed(let error): reject("E_SCAN_FAILED", error.localizedDescription, error)
      }
    }
    activeController = controller
    presenter.present(controller, animated: true)
  }

  private static func topViewController() -> UIViewController? {
    let scene = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .first { $0.activationState == .foregroundActive }
    var top = scene?.windows.first(where: { $0.isKeyWindow })?.rootViewController
    while let presented = top?.presentedViewController { top = presented }
    return top
  }
}
