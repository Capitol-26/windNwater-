// RoomScanner.types.ts — types for data returned from the native RoomScanModule
// Coordinates are meters on a top-down plane: x points right, z points down.
// When compassAligned is true, north is up (x = east, z = south).
export type Point2D = { x: number; z: number };

export type FloorPlanWall = {
  id: string;
  a: Point2D;
  b: Point2D;
  length: number;
};

// A door or window snapped onto a wall.
export type FloorPlanOpening = {
  id: string;
  a: Point2D;
  b: Point2D;
  width: number;
  wall: number; // index into walls
  offset: number; // meters from the wall's start point
};

export type FloorPlanObject = {
  id: string;
  category: string; // bed, sofa, chair, desk, table, wardrobe, dresser, bookshelf, tv stand, plant, other
  center: Point2D;
  corners: [Point2D, Point2D, Point2D, Point2D];
  rotation: number; // radians, 0 = pointing right, clockwise on screen
  dimensions: { width: number; depth: number };
};

export type FloorPlanBounds = {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  width: number;
  depth: number;
};

export type CapturedFloorPlan = {
  version: 2;
  source: 'arkit-guided';
  units: 'meters';
  compassAligned: boolean;
  floor: { polygon: Point2D[]; area: number };
  bounds: FloorPlanBounds | null;
  walls: FloorPlanWall[];
  doors: FloorPlanOpening[];
  windows: FloorPlanOpening[];
  objects: FloorPlanObject[];
};

export type ScanProgress = {
  corners: number;
  doors: number;
  windows: number;
  objects: number;
};

export type RoomScanErrorCode =
  | 'E_UNSUPPORTED'
  | 'E_BUSY'
  | 'E_CAMERA_DENIED'
  | 'E_CANCELLED'
  | 'E_SCAN_FAILED'
  | 'E_NO_VIEW';
