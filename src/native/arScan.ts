// arScan.ts — the ARScan native module: an ARKit camera view that records the scan video with a camera pose per frame,
// keeps tracking afterwards, and pins boxes in the room it scanned
import { NativeModules, ViewProps, requireNativeComponent } from 'react-native';
import { CameraSample, PlacedHazard } from '../types/hazard.types';

export type ScanRecording = {
  videoPath: string;
  samples: CameraSample[]; // camera pose and intrinsics about every 0.12 s, timed like the video
  floorY: number | null; // world height of the floor ARKit found, metres; null when it saw no floor
};

type CameraPermission = 'granted' | 'denied' | 'undetermined';

type ARScanModule = {
  isSupported(): Promise<boolean>;
  cameraPermission(): Promise<CameraPermission>;
  requestCameraPermission(): Promise<boolean>;
  resetSession(): Promise<void>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<ScanRecording>;
  placeHazards(items: { kind: string; position: number[]; size: number[]; yaw: number }[]): Promise<void>;
};

const native = NativeModules.ARScan as ARScanModule;

// Native module methods are not always enumerable, so they are called through `native` one by one, never spread
export const ARScan = {
  isSupported: () => native.isSupported(),
  cameraPermission: () => native.cameraPermission(),
  requestCameraPermission: () => native.requestCameraPermission(),
  resetSession: () => native.resetSession(),
  startRecording: () => native.startRecording(),
  stopRecording: () => native.stopRecording(),
  // red boxes for blocked chi, green for poison arrows; boxes carry no text, the native view draws them wherever it is shown
  placeHazards: (hazards: PlacedHazard[]) =>
    native.placeHazards(hazards.map(h => ({ kind: h.kind, position: h.position, size: h.size, yaw: h.yaw }))),
};

// The camera preview. Showing it starts the ARKit session if it is not running; hiding it leaves the session running.
export const ARScanView = requireNativeComponent<ViewProps>('ARScanView');
