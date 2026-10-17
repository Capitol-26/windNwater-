// config.ts — runtime config read from .env via react-native-config
import Config from 'react-native-config';

export const SCAN_API_URL = Config.SCAN_API_URL ?? 'http://localhost:8000';
