// useScanUpload.ts — tracks a scan video through upload and server-side analysis
import { useCallback, useState } from 'react';
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

  const upload = useCallback(async (videoPath: string) => {
    setState({ status: 'uploading', progress: 0 });
    try {
      const result = await uploadScanVideo(videoPath, progress =>
        setState(progress >= 1 ? { status: 'analyzing' } : { status: 'uploading', progress }),
      );
      setState({ status: 'done', result });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : 'Upload failed.' });
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, upload, reset };
}
