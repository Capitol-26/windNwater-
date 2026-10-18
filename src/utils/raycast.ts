// raycast.ts — puts a 2D detection box into the room using the camera pose ARKit recorded for that photo.
// Plain world tracking is enough: the ray through the bottom of the box meets the floor plane, no depth sensor involved.
import { CameraSample, Hazard, PlacedHazard } from '../types/hazard.types';

type Vec3 = [number, number, number];

const MIN_RANGE = 0.3; // metres: closer than this the floor hit is noise
const MAX_RANGE = 12;
const MAX_CLUSTER_GAP = 0.6; // metres between floor points of one hazard seen in two photos

// A point in the upright (portrait) photo, as fractions, to a pixel in the landscape sensor image.
// The phone is held upright, so the upright photo is the sensor image turned 90 degrees clockwise.
export function uprightToSensor(u: number, v: number, image: { width: number; height: number }) {
  return { x: v * image.width, y: (1 - u) * image.height };
}

// Camera-space ray through a sensor pixel. ARKit's camera looks down -Z with +Y up, so the ray's z is -1 and a
// point t along it is t metres in front of the camera.
export function pixelRay(px: { x: number; y: number }, k: CameraSample['intrinsics']): Vec3 {
  return [(px.x - k.cx) / k.fx, -(px.y - k.cy) / k.fy, -1];
}

// Rotate a camera-space direction into the world (column-major transform, translation ignored)
function toWorld(m: number[], v: Vec3): Vec3 {
  return [m[0] * v[0] + m[4] * v[1] + m[8] * v[2], m[1] * v[0] + m[5] * v[1] + m[9] * v[2], m[2] * v[0] + m[6] * v[1] + m[10] * v[2]];
}

// Where a ray from the camera meets the horizontal plane y = floorY: the world point and its depth in front of the camera
export function floorHit(sample: CameraSample, px: { x: number; y: number }, floorY: number) {
  const m = sample.transform;
  const world = toWorld(m, pixelRay(px, sample.intrinsics));
  const origin: Vec3 = [m[12], m[13], m[14]];
  if (world[1] >= -1e-6) return null; // level or looking up: never reaches the floor
  const depth = (floorY - origin[1]) / world[1];
  if (!(depth >= MIN_RANGE && depth <= MAX_RANGE)) return null;
  return { point: [origin[0] + world[0] * depth, floorY, origin[2] + world[2] * depth] as Vec3, depth, origin };
}

// One hazard in the room. The bottom-centre of its box is where the object meets the floor; the box's pixel size
// at that depth gives the object's size. Null when that ray never reaches the floor within range.
export function placeHazard(hazard: Hazard, sample: CameraSample, floorY: number): PlacedHazard | null {
  const [x1, y1, x2, y2] = hazard.box;
  const hit = floorHit(sample, uprightToSensor((x1 + x2) / 2, y2, sample.imageSize), floorY);
  if (!hit) return null;

  // the upright box's width runs along the sensor's y axis, its height along the sensor's x axis
  const width = (((x2 - x1) * sample.imageSize.height) / sample.intrinsics.fy) * hit.depth;
  const height = (((y2 - y1) * sample.imageSize.width) / sample.intrinsics.fx) * hit.depth;
  const depth = Math.max(width, 0.3); // one side says nothing about how deep it is; assume square
  // The box's bottom edge is where the object's FRONT meets the floor, so its centre is half a depth farther from the camera
  const away = Math.hypot(hit.point[0] - hit.origin[0], hit.point[2] - hit.origin[2]) || 1;
  const x = hit.point[0] + ((hit.point[0] - hit.origin[0]) / away) * (depth / 2);
  const z = hit.point[2] + ((hit.point[2] - hit.origin[2]) / away) * (depth / 2);
  const yaw = Math.atan2(hit.origin[0] - x, hit.origin[2] - z);
  return { ...hazard, position: [x, floorY + height / 2, z], size: [width, height, depth], yaw };
}

// The same hazard seen in several photos lands near the same floor point: average those into one
export function mergeAcrossPhotos(placed: PlacedHazard[]): PlacedHazard[] {
  const groups: PlacedHazard[][] = [];
  for (const item of [...placed].sort((a, b) => b.confidence - a.confidence)) {
    const group = groups.find(
      g => g[0].kind === item.kind && Math.hypot(g[0].position[0] - item.position[0], g[0].position[2] - item.position[2]) <= MAX_CLUSTER_GAP,
    );
    if (group) group.push(item);
    else groups.push([item]);
  }
  return groups.map(group => {
    const weight = group.reduce((sum, g) => sum + g.confidence, 0);
    const mean = (pick: (g: PlacedHazard) => number) => group.reduce((sum, g) => sum + pick(g) * g.confidence, 0) / weight;
    return {
      ...group[0],
      labels: [...new Set(group.flatMap(g => g.labels))],
      position: [mean(g => g.position[0]), mean(g => g.position[1]), mean(g => g.position[2])],
      size: [mean(g => g.size[0]), mean(g => g.size[1]), mean(g => g.size[2])],
    };
  });
}

// The ARKit sample nearest in time to a photo
export function sampleAt(samples: CameraSample[], timestamp: number): CameraSample | null {
  return samples.reduce<CameraSample | null>(
    (best, s) => (!best || Math.abs(s.timestamp_sec - timestamp) < Math.abs(best.timestamp_sec - timestamp) ? s : best),
    null,
  );
}

const CAMERA_HEIGHT = 1.4; // metres: a phone held while walking a room, used when ARKit found no floor

// The floor height: ARKit's plane when it found one, else the typical phone height below the median camera height
export function floorHeight(floorY: number | null | undefined, samples: CameraSample[]): number | null {
  if (typeof floorY === 'number') return floorY;
  if (samples.length === 0) return null;
  const heights = samples.map(s => s.transform[13]).sort((a, b) => a - b);
  return heights[Math.floor(heights.length / 2)] - CAMERA_HEIGHT;
}

// Every hazard the server found, in world coordinates, with the same hazard from different photos merged
export function placeAll(hazards: Hazard[], samples: CameraSample[], floorY: number | null | undefined): PlacedHazard[] {
  const floor = floorHeight(floorY, samples);
  if (floor === null) return [];
  const placed: PlacedHazard[] = [];
  for (const hazard of hazards) {
    const sample = sampleAt(samples, hazard.timestamp_sec);
    const result = sample && placeHazard(hazard, sample, floor);
    if (result) placed.push(result);
  }
  return mergeAcrossPhotos(placed);
}
