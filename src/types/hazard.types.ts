// hazard.types.ts — danger spots found by the scan server, and where ARKit puts them in the room
export type HazardKind = 'blocked_chi' | 'poison_arrow';

export type Hazard = {
  kind: HazardKind;
  photo: number; // 1-based photo it was found in
  timestamp_sec: number; // seconds into the scan video of that photo
  box: [number, number, number, number]; // x1, y1, x2, y2 as fractions of the upright photo, origin top-left
  confidence: number;
  labels: string[];
  target: string;
  why: string;
};

// What ARKit reports for one frame of a world-tracking session (plain ARWorldTrackingConfiguration, no LiDAR)
export type CameraSample = {
  timestamp_sec: number; // seconds since the recording started
  transform: number[]; // camera-to-world, 4x4 column-major (simd_float4x4 order)
  intrinsics: { fx: number; fy: number; cx: number; cy: number }; // pixels, in the sensor image
  imageSize: { width: number; height: number }; // the sensor image: landscape, as ARKit delivers it
};

export type PlacedHazard = Hazard & {
  position: [number, number, number]; // world metres, the box's centre
  size: [number, number, number]; // world metres: width across the view, height, depth along the view
  yaw: number; // radians about +Y, facing the camera that saw it
};
