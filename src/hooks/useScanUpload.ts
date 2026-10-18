// useScanUpload.ts — tracks a scan video through upload and server-side analysis
import { useCallback, useState } from 'react';
import { ScanRecording } from '../native/arScan';
import { uploadScanVideo } from '../services/scanUploadService';
import { ScanAnalysisResponse } from '../types/scan.types';

export type ScanUploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'analyzing' }
  | { status: 'done'; result: ScanAnalysisResponse }
  | { status: 'error'; message: string };

export function useScanUpload() {
  const [state, setState] = useState<ScanUploadState>({ status: 'idle' });

  const upload = useCallback(async (recording: ScanRecording) => {
    setState({ status: 'uploading', progress: 0 });
    try {
      const result = await uploadScanVideo(recording.videoPath, progress =>
        setState(progress >= 1 ? { status: 'analyzing' } : { status: 'uploading', progress }),
      );
      // the poses never go to the server: the app uses them to pin each danger spot in the room the scan was taken in
      setState({ status: 'done', result: { ...result, camera_samples: recording.samples, floor_y: recording.floorY } });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : 'Upload failed.' });
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, upload, reset };
}
