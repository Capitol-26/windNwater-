// roomLayout.test.ts — geometry used to draw the 2D room plan
import { fitPlan, gridLines, openingGeometry } from '../src/utils/roomLayout';

const room = { width: 4, length: 3 };

test('fitPlan scales to the tighter side and centres the room', () => {
  const fit = fitPlan(room, 220, 400, 10);
  expect(fit.scale).toBe(50); // (220 - 20) / 4
  expect(fit.originX).toBe(10);
  expect(fit.originY).toBe(125); // (400 - 150) / 2
});

test('gridLines puts whole metres in major and half metres in minor, excluding the walls', () => {
  expect(gridLines(2.5)).toEqual({ minor: [0.5, 1.5], major: [1, 2] });
});

test('openingGeometry keeps the opening on its wall and points inward', () => {
  const door = openingGeometry(room, { kind: 'door', wall: 'south', offset: 0.2, width: 0.9 });
  expect(door.from).toEqual({ x: 0, y: 3 }); // slid in from the corner
  expect(door.to.x).toBeCloseTo(0.9);
  expect(door.inward).toEqual({ x: 0, y: -1 });
  expect(openingGeometry(room, { kind: 'window', wall: 'east', offset: 1.5, width: 1 }).inward).toEqual({ x: -1, y: 0 });
});
