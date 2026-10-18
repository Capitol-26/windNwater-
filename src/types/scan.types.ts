// scan.types.ts — shapes returned by the scan API
import { FengShuiAnalysis } from './fengshui.types';
import { CameraSample, Hazard } from './hazard.types';

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
  preview_image: string; // data URI of the last frame of the recording
  analysis: FengShuiAnalysis;
  danger_spots: Hazard[]; // never shown as text: the camera view pins them in the room
  camera_samples?: CameraSample[]; // added on the phone: ARKit's pose for the video
  floor_y?: number | null; // added on the phone: world height of the floor
};
