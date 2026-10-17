# main.py — FastAPI app: receives a scan video, extracts frames with OpenCV, passes them to the AI
import os
import tempfile
import uuid

from fastapi import Body, FastAPI, File, HTTPException, UploadFile

from . import config
from .ai_client import AIError, analyze_floor_plan, analyze_frames
from .frame_extractor import VideoReadError, extract_frames

app = FastAPI(title="WindNWater scan API")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/scans")
async def create_scan(video: UploadFile = File(...)) -> dict:
    suffix = os.path.splitext(video.filename or "")[1] or ".mov"
    max_bytes = config.MAX_UPLOAD_MB * 1024 * 1024
    written = 0

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        path = tmp.name
        try:
            while chunk := await video.read(1024 * 1024):
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(413, f"Video is larger than {config.MAX_UPLOAD_MB} MB.")
                tmp.write(chunk)
        except HTTPException:
            tmp.close()
            os.unlink(path)
            raise

    try:
        extraction = extract_frames(path)
    except VideoReadError as error:
        raise HTTPException(422, str(error))
    finally:
        os.unlink(path)

    if not extraction.frames:
        raise HTTPException(422, "No usable frames found. Move more slowly and keep the room well lit.")

    try:
        analysis = await analyze_frames(extraction.frames)
    except AIError as error:
        raise HTTPException(error.status_code, str(error))

    return {
        "scan_id": uuid.uuid4().hex,
        "frame_count": len(extraction.frames),
        "duration_sec": extraction.duration_sec,
        "frames": [
            {"index": f.index, "timestamp_sec": f.timestamp_sec, "sharpness": f.sharpness}
            for f in extraction.frames
        ],
        "analysis": analysis,
    }


@app.post("/floor-plans")
async def analyze_plan(floor_plan: dict = Body(...)) -> dict:
    if not isinstance(floor_plan.get("floor"), dict) or not isinstance(floor_plan.get("walls"), list):
        raise HTTPException(422, "Expected a floor plan with 'floor' and 'walls'.")
    try:
        analysis = await analyze_floor_plan(floor_plan)
    except AIError as error:
        raise HTTPException(error.status_code, str(error))
    return {"analysis": analysis}
