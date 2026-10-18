# WindNWater

React Native iOS app that scans a room with ARKit (a short walk-through video) and rates its feng shui with Elorian Glimpse via OpenRouter: overall score and the balance of the five elements. After the analysis it pins red boxes on clutter that blocks chi and green boxes on poison arrows (angular furniture pointing at a bed, seat or door) in the live camera view.

Requires an iPhone that supports ARKit (no LiDAR needed) on iOS 16+, and Xcode 16+.

## Layout
- `src/` — React Native (TypeScript) app: `screens/`, `components/`, `navigation/`, `hooks/`, `services/`, `types/`, `constants/`, `theme/`, `assets/`
- `ios/WindNWater/ARScan/` — Swift ARKit module: the camera view, recording with a camera pose per frame, and the pinned boxes
- `server/` — Python scan server: OpenCV frame extraction, prompts, the AI call (`server/app/ai_client.py`) and the YOLO-World danger-spot detector (`server/app/detector.py`)

## Setup
```sh
npm install
# create .env with your key, see "Scan server" below
bundle install && npm run pods
npm run ios
```

## Scan server
The app records a video and uploads it to `server/`, which uses OpenCV to pull out sharp, distinct frames and sends them to the AI with the prompts in `server/app/prompts.py`. The AI returns the score, the element balance, recommendations and a list of danger spots; YOLO-World then finds each one in the photos (`server/app/detector.py`, `arrows.py`, `merge.py`) and the server returns the boxes. The app places them in the room with the camera poses ARKit recorded (`src/utils/raycast.ts`).
```sh
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
python -m pytest tests
```
The detector needs two model files in `server/weights/` (git-ignored): `yolov8s-worldv2.pt` (downloaded on first use) and the CLIP text encoder `clip/ViT-B-32.pt` (from `https://openaipublic.azureedge.net/clip/models/40d365715913c9da98579312b702a82c18be219cc2a73407c4526f58eba950af/ViT-B-32.pt`; put it there if the automatic download is blocked). The server loads them at startup.

Create a `.env` in the repo root:
```
AI_API_KEY=<your OpenRouter key>
SCAN_API_URL=https://<your-server>   # app only; defaults to http://localhost:8000
```
The AI model defaults to `elorian/glimpse` on OpenRouter. Optional overrides: `AI_MODEL`, `AI_BASE_URL`, `AI_MAX_IMAGES`, `AI_MAX_TOKENS`, `AI_TIMEOUT_SEC`, and the detector settings in `server/app/config.py` (`DETECTOR_*`, `CLUTTER_*`, `CLUSTER_*`, `ANGULAR_*`).

### Checking the boxes
`python try_danger.py scan.mov` (or a photo) runs the AI and detector and writes annotated photos to `server/debug_boxes/` (red = blocked chi, green = poison arrow). The server itself writes no photos unless `DANGER_DEBUG_DIR` is set, and that folder holds pictures of people's rooms, so leave it unset in production.

### Production
- Serve the API over HTTPS behind a reverse proxy and point `SCAN_API_URL` at it. The app only allows plain HTTP to local-network addresses (`NSAppTransportSecurity` in `ios/WindNWater/Info.plist`).
- The API has no login or rate limit. Add them at the proxy before exposing it.
- Run it without `--host 0.0.0.0` unless the proxy is on another machine.
