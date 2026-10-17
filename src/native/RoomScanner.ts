// RoomScanner.ts — typed JS wrapper around the Swift RoomScanModule (RoomPlan + ARKit)
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { CapturedFloorPlan, RoomScanErrorCode, ScanProgress } from './RoomScanner.types';

type RoomScanNativeModule = {
  isSupported(): Promise<boolean>;
  startScan(): Promise<CapturedFloorPlan>;
  stopScan(): Promise<void>;
};

const native: RoomScanNativeModule | undefined =
  Platform.OS === 'ios' ? NativeModules.RoomScanModule : undefined;

const emitter = native ? new NativeEventEmitter(NativeModules.RoomScanModule) : null;

export const RoomScanner = {
  /** True on an iPhone/iPad with LiDAR running iOS 16+. */
  async isSupported(): Promise<boolean> {
    return native ? native.isSupported() : false;
  },

  /** Opens the native scanner. Resolves with the 2D floor plan when the user taps Done. */
  startScan(): Promise<CapturedFloorPlan> {
    if (!native) return Promise.reject(Object.assign(new Error('Room scanning is only available on iOS.'), { code: 'E_UNSUPPORTED' }));
    return native.startScan();
  },

  /** Finishes the scan as if the user tapped Done. */
  async stopScan(): Promise<void> {
    await native?.stopScan();
  },

  /** Live counts of detected walls, doors, windows and furniture. Returns an unsubscribe function. */
  onProgress(listener: (progress: ScanProgress) => void): () => void {
    const subscription = emitter?.addListener('onScanProgress', (event: unknown) => listener(event as ScanProgress));
    return () => subscription?.remove();
  },
};

export const isRoomScanCancelled = (error: unknown): boolean =>
  (error as { code?: RoomScanErrorCode })?.code === 'E_CANCELLED';
