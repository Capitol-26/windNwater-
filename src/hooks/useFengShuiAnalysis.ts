// useFengShuiAnalysis.ts — hook that sends a floor plan for AI analysis
import { useCallback, useState } from 'react';
import { CapturedFloorPlan } from '../native/RoomScanner.types';
import { analyzeFloorPlan } from '../services/fengShuiService';
import { FengShuiAnalysis } from '../types/fengshui.types';

export function useFengShuiAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (plan: CapturedFloorPlan): Promise<FengShuiAnalysis | null> => {
    setError(null);
    setAnalyzing(true);
    try {
      return await analyzeFloorPlan(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.');
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, []);

  return { analyzing, error, analyze };
}
