// ARScan.m — exposes the Swift ARScan module and view to React Native
#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE (ARScan, NSObject)
RCT_EXTERN_METHOD(isSupported : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(cameraPermission : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(requestCameraPermission : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(resetSession : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(placeHazards : (NSArray *)items resolver : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(startRecording : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(stopRecording : (RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject)
@end

@interface RCT_EXTERN_MODULE (ARScanViewManager, RCTViewManager)
@end
