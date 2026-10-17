// fengshui.types.ts — the feng shui analysis returned by the scan server
export type ElementName = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export type ElementShare = {
  percent: number; // the five percents sum to 100
  evidence: string;
};

export type Recommendation = {
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
};

// All distances are metres, measured from the room's north-west corner (x runs east, y runs south)
export type Wall = 'north' | 'east' | 'south' | 'west';

export type Opening = {
  kind: 'door' | 'window';
  wall: Wall;
  offset: number; // from the wall's start (west or north end) to the opening's centre
  width: number;
};

export type LayoutItem = {
  name: string;
  x: number; // centre
  y: number; // centre
  width: number;
  depth: number;
};

export type OptimalItem = LayoutItem & { reason: string };

export type RoomLayout = {
  width: number;
  length: number;
  openings: Opening[];
  items: LayoutItem[];
  optimal_items: OptimalItem[]; // the same pieces as `items`, in the same order
};

export type FengShuiAnalysis = {
  overall_score: number; // 0-100
  room_type: string;
  summary: string;
  elements: Record<ElementName, ElementShare>;
  recommendations: Recommendation[];
  layout?: RoomLayout | null; // missing when the photos show too little of the room
};
