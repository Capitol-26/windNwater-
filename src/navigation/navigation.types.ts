import { FengShuiAnalysis } from '../types/fengshui.types';

// navigation.types.ts — route names and param lists for React Navigation
export type RootStackParamList = {
  Home: undefined;
  ScanRoom: undefined;
  FengShuiRating: { analysis: FengShuiAnalysis };
};
