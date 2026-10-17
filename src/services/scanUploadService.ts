// scanUploadService.ts — uploads a recorded scan video to the scan API
import { SCAN_API_URL } from '../constants/config';
import { ScanAnalysisResponse } from '../types/scan.types';

export function uploadScanVideo(
  videoPath: string,
  onProgress?: (fraction: number) => void,
  floorTime?: number,
): Promise<ScanAnalysisResponse> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('video', {
      uri: videoPath.startsWith('file://') ? videoPath : `file://${videoPath}`,
      name: 'scan.mov',
      type: 'video/quicktime',
    } as unknown as Blob);

    if (floorTime !== undefined) form.append('floor_time', String(floorTime));

    const request = new XMLHttpRequest();
    request.open('POST', `${SCAN_API_URL}/scans`);
    request.timeout = 180000;
    request.setRequestHeader('Accept', 'application/json');

    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    request.onload = () => {
      let body: any = null;
      try {
        body = JSON.parse(request.responseText);
      } catch {}
      if (request.status >= 200 && request.status < 300 && body) {
        resolve(body as ScanAnalysisResponse);
      } else {
        reject(new Error(body?.detail ?? `Upload failed (${request.status}).`));
      }
    };
    request.onerror = () => reject(new Error('Could not reach the scan server.'));
    request.ontimeout = () => reject(new Error('The scan server took too long to respond.'));
    request.send(form);
  });
}
