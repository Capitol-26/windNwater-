// config.ts — runtime config read from .env via react-native-config
import Config from 'react-native-config';

export const SCAN_API_URL = Config.SCAN_API_URL ?? 'http://localhost:8000';

// Scans are capped so the upload and AI analysis stay quick.
export const MAX_SCAN_SECONDS = 20;

// Shorter walk-throughs give the AI one or two frames to judge, so stopping is held back until this long.
export const MIN_SCAN_SECONDS = 4;
