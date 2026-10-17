// RoomScanModule.swift — React Native bridge for RoomPlan/ARKit scanning
import Foundation
import React

@objc(RoomScanModule)
class RoomScanModule: RCTEventEmitter {

  override static func requiresMainQueueSetup() -> Bool { true }

  override func supportedEvents() -> [String]! {
    ["onScanProgress", "onScanComplete", "onScanError"]
  }

  @objc func isSupported(_ resolve: RCTPromiseResolveBlock,
                         rejecter reject: RCTPromiseRejectBlock) {
  }

  @objc func startScan(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
  }

  @objc func stopScan(_ resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
  }
}
