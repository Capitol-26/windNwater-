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

## Scan server (OpenCV frame extraction)
The app records a video and uploads it to `server/`, which uses OpenCV to pull out sharp, distinct frames and hands them to `analyze_frames()` in `server/app/ai_client.py` (the AI call is left there for you to fill in).
```sh
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
In `.env`, set `SCAN_API_URL=http://<your-mac-lan-ip>:8000` when testing on a phone.
