// useScanUpload.ts — tracks a scan video through upload and server-side analysis
import { useCallback, useState } from 'react';
import { detectFloor } from '../native/floorHomography';
import { uploadScanVideo } from '../services/scanUploadService';
import { ScanAnalysisResponse } from '../types/scan.types';
import { projectLayout } from '../utils/floorProjection';

export type ScanUploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'analyzing' }
  | { status: 'done'; result: ScanAnalysisResponse }
  | { status: 'error'; message: string };

export function useScanUpload() {
  const [state, setState] = useState<ScanUploadState>({ status: 'idle' });

  const upload = useCallback(async (videoPath: string) => {
    setState({ status: 'uploading', progress: 0 });
    try {
      // Vision finds the floor first, so the server can place the furniture on it
      const floor = await detectFloor(videoPath);
      const result = await uploadScanVideo(
        videoPath,
        progress => setState(progress >= 1 ? { status: 'analyzing' } : { status: 'uploading', progress }),
        floor?.timestamp,
      );
      const { layout } = result.analysis;
      if (floor && layout) result.analysis.layout = projectLayout(layout, floor.homography);
      setState({ status: 'done', result });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : 'Upload failed.' });
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, upload, reset };
}
