# WindNWater

React Native iOS app that scans a room (video, or a hand-mapped floor plan using ARKit motion tracking) and rates its feng shui with Elorian Glimpse via OpenRouter: overall score, chi flow, and the balance of the five elements.

Requires an iPhone on iOS 16+ (no LiDAR needed) and Xcode 16+.

## Layout
- `src/` — React Native (TypeScript) app: `screens/`, `components/`, `navigation/`, `store/`, `hooks/`, `native/` (JS bridge), `types/`, `utils/`, `constants/`, `theme/`
- `server/` — Python scan server: OpenCV frame extraction, prompts, and the AI call (`server/app/ai_client.py`)
- `ios/WindNWater/AR/` — Swift code for ARKit room mapping and the RN bridge

## Setup
```sh
npm install
# create .env with your key, see "Scan server" below
bundle install && npm run pods
npm run ios
```

## Scan server (OpenCV frame extraction)
The app records a video and uploads it to `server/`, which uses OpenCV to pull out sharp, distinct frames and sends them (and/or a hand-mapped floor plan) to the AI with the prompts in `server/app/prompts.py`, and returns an overall feng shui score, a chi flow score, and the share of each of the five elements. The AI call lives in `server/app/ai_client.py`; set your OpenRouter key in `.env`.
```sh
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Create a `.env` in the repo root:
```
AI_API_KEY=<your OpenRouter key>
SCAN_API_URL=http://<your-mac-lan-ip>:8000   # app only; defaults to http://localhost:8000
```
The AI model defaults to `elorian/glimpse` on OpenRouter. Optional overrides: `AI_MODEL`, `AI_BASE_URL`, `AI_MAX_IMAGES`, `AI_MAX_TOKENS`, `AI_TIMEOUT_SEC`.
