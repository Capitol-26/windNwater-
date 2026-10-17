// floorProjection.test.ts — places furniture on the plan from the Vision floor homography
import { applyHomography, projectLayout } from '../src/utils/floorProjection';
import { RoomLayout } from '../src/types/fengshui.types';

const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const halve = [0.5, 0, 0, 0, 0.5, 0, 0, 0, 1];

const layout: RoomLayout = {
  width: 4,
  length: 3,
  openings: [],
  items: [
    { name: 'bed', x: 1, y: 1, width: 1.6, depth: 2, floor_uv: [0.5, 0.5] },
    { name: 'sofa', x: 3, y: 2, width: 2, depth: 0.9 },
    { name: 'lamp', x: 0.5, y: 0.5, width: 0.4, depth: 0.4, floor_uv: [3, 3] },
  ],
  optimal_items: [],
};

test('applyHomography divides by w and rejects points at infinity', () => {
  expect(applyHomography(halve, 1, 0.5)).toEqual([0.5, 0.25]);
  expect(applyHomography([1, 0, 0, 0, 1, 0, 1, 0, 0], 0, 1)).toBeNull();
});

test('projectLayout scales a landmark to metres and keeps the item inside the room', () => {
  const [bed] = projectLayout(layout, identity).items;
  expect(bed.x).toBeCloseTo(2); // 0.5 * 4
  expect(bed.y).toBeCloseTo(1.5); // 0.5 * 3
  const edge = projectLayout({ ...layout, items: [{ ...layout.items[0], floor_uv: [1, 1] }] }, identity).items[0];
  expect(edge.x).toBeCloseTo(3.2); // 4 - 1.6 / 2
  expect(edge.y).toBeCloseTo(2); // 3 - 2 / 2
});

test('items without a landmark, or that land far off the floor, keep the AI position', () => {
  const [, sofa, lamp] = projectLayout(layout, identity).items;
  expect(sofa).toBe(layout.items[1]);
  expect(lamp).toBe(layout.items[2]);
});
