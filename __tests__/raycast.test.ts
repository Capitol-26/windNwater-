// raycast.test.ts — an upright phone 1.5 m up, looking along world -Z, floor at y = 0, so the geometry is checkable by hand
import { CameraSample, Hazard } from '../src/types/hazard.types';
import { floorHit, mergeAcrossPhotos, placeHazard, sampleAt, uprightToSensor } from '../src/utils/raycast';

const image = { width: 1920, height: 1440 };
const intrinsics = { fx: 1500, fy: 1500, cx: 960, cy: 720 };
// ARKit's camera frame for an upright phone: camera +X points at the world's down, camera +Y at world +X, camera +Z
// (backwards) at world +Z. Column-major, translation last.
const upright = (x: number, y: number, z: number, t = 0): CameraSample => ({
  timestamp_sec: t,
  transform: [0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, x, y, z, 1],
  intrinsics,
  imageSize: image,
});
const hazard = (box: Hazard['box'], extra: Partial<Hazard> = {}): Hazard => ({
  kind: 'blocked_chi', photo: 1, timestamp_sec: 0, box, confidence: 0.5, labels: ['box'], target: '', why: '', ...extra,
});

test('uprightToSensor turns the upright photo back to the landscape sensor', () => {
  expect(uprightToSensor(0.5, 0.5, image)).toEqual({ x: 960, y: 720 });
  expect(uprightToSensor(0, 0, image)).toEqual({ x: 0, y: 1440 }); // upright top-left is the sensor's bottom-left
  expect(uprightToSensor(1, 1, image)).toEqual({ x: 1920, y: 0 });
});

test('the centre of the photo, looking level, never reaches the floor', () => {
  expect(floorHit(upright(0, 1.5, 0), { x: 960, y: 720 }, 0)).toBeNull();
});

test('a pixel 750 px below the horizon hits the floor 3 m ahead', () => {
  // upright "down" is sensor +x: 750 px along it is a slope of 0.5, and the floor is 1.5 m down
  const hit = floorHit(upright(0, 1.5, 0), { x: 1710, y: 720 }, 0)!;
  expect(hit.point[0]).toBeCloseTo(0);
  expect(hit.point[2]).toBeCloseTo(-3);
  expect(hit.depth).toBeCloseTo(3);
});

test('placeHazard puts an object where its base meets the floor and sizes it from the pixels', () => {
  // base at upright (0.5, 0.89) is the pixel above; the box is 0.2 of the photo wide and 0.39 tall
  const placed = placeHazard(hazard([0.4, 0.5, 0.6, 0.89]), upright(0, 1.5, 0), 0)!;
  expect(placed.position[0]).toBeCloseTo(0);
  expect(placed.position[2]).toBeCloseTo(-3);
  expect(placed.size[0]).toBeCloseTo(0.576, 2); // 288 px / 1500 * 3 m
  expect(placed.size[1]).toBeCloseTo(1.498, 2); // 749 px / 1500 * 3 m
  expect(placed.position[1]).toBeCloseTo(placed.size[1] / 2);
  expect(placed.yaw).toBeCloseTo(0); // the camera is straight in front of it
});

test('an object to the right of the view lands to the right in the world', () => {
  // upright u = 0.7 is right of centre, which is world +X for a camera looking along -Z
  expect(placeHazard(hazard([0.6, 0.5, 0.8, 0.89]), upright(0, 1.5, 0), 0)!.position[0]).toBeGreaterThan(0.3);
});

test('a hazard whose base is above the horizon is not placed', () => {
  expect(placeHazard(hazard([0.4, 0.1, 0.6, 0.4]), upright(0, 1.5, 0), 0)).toBeNull();
});

test('the same hazard seen from two places merges into one, and different kinds stay apart', () => {
  const placed = (x: number, z: number, kind: Hazard['kind'], confidence: number) => ({
    ...hazard([0, 0, 1, 1], { kind, confidence }), position: [x, 0.3, z] as [number, number, number], size: [0.5, 0.6, 0.5] as [number, number, number], yaw: 0,
  });
  const merged = mergeAcrossPhotos([placed(1, -2, 'blocked_chi', 0.6), placed(1.2, -2.1, 'blocked_chi', 0.2), placed(1.1, -2, 'poison_arrow', 0.5)]);
  expect(merged).toHaveLength(2);
  expect(merged.find(m => m.kind === 'blocked_chi')!.position[0]).toBeCloseTo(1.05);
});

test('sampleAt finds the nearest sample in time', () => {
  expect(sampleAt([upright(0, 1, 0, 0), upright(0, 1, 0, 1), upright(0, 1, 0, 2)], 1.4)!.timestamp_sec).toBe(1);
  expect(sampleAt([], 1)).toBeNull();
});
