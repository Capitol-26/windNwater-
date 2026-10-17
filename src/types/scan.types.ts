// scan.types.ts — shapes returned by the scan API
export type ScanFrameInfo = {
  index: number;
  timestamp_sec: number;
  sharpness: number;
};

export type ScanAnalysisResponse = {
  scan_id: string;
  frame_count: number;
  duration_sec: number;
  frames: ScanFrameInfo[];
  analysis: Record<string, unknown>;
};
