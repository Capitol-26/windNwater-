// fengShuiService.ts — sends a measured floor plan to the scan server for feng shui analysis
import { SCAN_API_URL } from '../constants/config';
import { CapturedFloorPlan } from '../native/RoomScanner.types';
import { FengShuiAnalysis } from '../types/fengshui.types';

export async function analyzeFloorPlan(plan: CapturedFloorPlan): Promise<FengShuiAnalysis> {
  let response: Response;
  try {
    response = await fetch(`${SCAN_API_URL}/floor-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(plan),
    });
  } catch {
    throw new Error('Could not reach the scan server.');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.analysis) {
    throw new Error(body?.detail ?? `Analysis failed (${response.status}).`);
  }
  return body.analysis as FengShuiAnalysis;
}
