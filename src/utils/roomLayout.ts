// roomLayout.ts — pure geometry for drawing a RoomLayout (metres) inside a pixel box
import { Opening, RoomLayout } from '../types/fengshui.types';

export type PlanFit = { scale: number; originX: number; originY: number };

// Largest scale at which the room fits the box with `pad` on every side, centred
export function fitPlan(room: Pick<RoomLayout, 'width' | 'length'>, boxWidth: number, boxHeight: number, pad: number): PlanFit {
  const scale = Math.max(0, Math.min((boxWidth - 2 * pad) / room.width, (boxHeight - 2 * pad) / room.length));
  return {
    scale,
    originX: (boxWidth - room.width * scale) / 2,
    originY: (boxHeight - room.length * scale) / 2,
  };
}

// Grid positions in metres: a line every half metre, `major` on whole metres
export function gridLines(size: number): { minor: number[]; major: number[] } {
  const minor: number[] = [];
  const major: number[] = [];
  for (let step = 1; step * 0.5 < size; step++) {
    (step % 2 === 0 ? major : minor).push(step * 0.5);
  }
  return { minor, major };
}

type Point = { x: number; y: number };

// A door or window as a segment on its wall (metres), plus the unit vector pointing into the room
export function openingGeometry(room: Pick<RoomLayout, 'width' | 'length'>, o: Opening): { from: Point; to: Point; inward: Point } {
  const horizontal = o.wall === 'north' || o.wall === 'south';
  const span = horizontal ? room.width : room.length;
  const width = Math.min(o.width, span);
  const start = Math.min(Math.max(o.offset - width / 2, 0), span - width);
  const end = start + width;
  switch (o.wall) {
    case 'north': return { from: { x: start, y: 0 }, to: { x: end, y: 0 }, inward: { x: 0, y: 1 } };
    case 'south': return { from: { x: start, y: room.length }, to: { x: end, y: room.length }, inward: { x: 0, y: -1 } };
    case 'west': return { from: { x: 0, y: start }, to: { x: 0, y: end }, inward: { x: 1, y: 0 } };
    case 'east': return { from: { x: room.width, y: start }, to: { x: room.width, y: end }, inward: { x: -1, y: 0 } };
  }
}
