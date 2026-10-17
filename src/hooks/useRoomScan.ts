// useRoomScan.ts — hook wrapping the native room-scan module
import { useCallback, useEffect, useState } from 'react';
import { RoomScanner, isRoomScanCancelled } from '../native/RoomScanner';
import { CapturedFloorPlan, ScanProgress } from '../native/RoomScanner.types';

export function useRoomScan() {
  const [supported, setSupported] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [floorPlan, setFloorPlan] = useState<CapturedFloorPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    RoomScanner.isSupported().then(setSupported, () => setSupported(false));
    return RoomScanner.onProgress(setProgress);
  }, []);

  const startScan = useCallback(async () => {
    setError(null);
    setProgress(null);
    setScanning(true);
    try {
      const plan = await RoomScanner.startScan();
      setFloorPlan(plan);
      return plan;
    } catch (e) {
      if (!isRoomScanCancelled(e)) setError(e instanceof Error ? e.message : 'Scan failed.');
      return null;
    } finally {
      setScanning(false);
    }
  }, []);

  return { supported, scanning, progress, floorPlan, error, startScan };
}
