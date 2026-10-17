// floorProjection.ts — moves furniture onto the top-down plan using the floor homography
import { LayoutItem, RoomLayout } from '../types/fengshui.types';

// Applies a row-major 3x3 homography; null when the point maps to infinity
export function applyHomography(h: number[], x: number, y: number): [number, number] | null {
  const w = h[6] * x + h[7] * y + h[8];
  if (Math.abs(w) < 1e-12) return null;
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
}

// How far outside the floor quad a landmark may land before it is treated as a misread
const MARGIN = 0.15;

// Items with a `floor_uv` landmark take their centre from the homography, scaled to the room's size.
// Items without one, or that land well off the floor, keep the position the AI estimated.
export function projectLayout(layout: RoomLayout, homography: number[]): RoomLayout {
  const items = layout.items.map((item): LayoutItem => {
    if (!item.floor_uv) return item;
    const point = applyHomography(homography, item.floor_uv[0], item.floor_uv[1]);
    if (!point || point.some(c => !Number.isFinite(c) || c < -MARGIN || c > 1 + MARGIN)) return item;
    // the landmark is the middle of the item's base, close enough to its footprint centre
    return {
      ...item,
      x: clamp(point[0] * layout.width, item.width / 2, layout.width - item.width / 2),
      y: clamp(point[1] * layout.length, item.depth / 2, layout.length - item.depth / 2),
    };
  });
  return { ...layout, items };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
