# WindNWater

React Native iOS app that scans a room with Apple's RoomPlan/ARKit, draws a 2D floor plan, rates its feng shui with DeepSeek, and shows an optimal feng shui layout.

Requires an iPhone/iPad with LiDAR, iOS 16+, Xcode 16+.

## Layout
- `src/` — React Native (TypeScript) app: `screens/`, `components/`, `navigation/`, `store/`, `hooks/`, `native/` (JS bridge), `types/`, `utils/`, `constants/`, `theme/`
- `src/ai/` — everything that talks to DeepSeek: `deepseekClient.ts`, `prompts/`, `services/`, `schemas/`
- `ios/WindNWater/AR/` — Swift code for camera/LiDAR scanning (RoomPlan + ARKit) and the RN bridge

## Setup
```sh
npm install
cp .env.example .env   # add DEEPSEEK_API_KEY
bundle install && npm run pods
npm run ios
```
