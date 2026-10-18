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

export type FengShuiAnalysis = {
  overall_score: number; // 0-100
  room_type: string;
  summary: string;
  elements: Record<ElementName, ElementShare>;
  recommendations: Recommendation[];
};
