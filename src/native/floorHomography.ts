// FloorHomography.ts — Apple Vision (via the FloorHomography native module) finds the floor in a scan video
import { NativeModules } from 'react-native';

export type FloorHint = {
  timestamp: number; // seconds into the video of the frame the floor was found in
  confidence: number;
  quad: [number, number][]; // floor corners TL, TR, BR, BL; normalised image coords, origin top-left
  homography: number[]; // row-major 3x3: normalised image coords -> unit square of the floor, seen from above
};

// Null when the module is missing, Vision finds no floor-like quad, or anything fails: the scan still goes ahead
export async function detectFloor(videoPath: string): Promise<FloorHint | null> {
  try {
    return (await NativeModules.FloorHomography?.detectFloor(videoPath)) ?? null;
  } catch {
    return null;
  }
}
