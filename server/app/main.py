# main.py — FastAPI app: receives a scan video, extracts frames with OpenCV, passes them to the AI
import logging
import os
import tempfile
import time
import uuid

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from . import config
from .ai_client import AIError, analyze_frames
from .frame_extractor import VideoReadError, extract_frame_at, extract_frames

log = logging.getLogger("uvicorn.error")
app = FastAPI(title="WindNWater scan API")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/scans")
async def create_scan(video: UploadFile = File(...), floor_time: float | None = Form(None)) -> dict:
    started = time.perf_counter()
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

    saved = time.perf_counter()
    try:
        # OpenCV decoding is blocking; run it off the event loop so other requests aren't stalled
        extraction = await run_in_threadpool(extract_frames, path)
        floor_reference = await run_in_threadpool(extract_frame_at, path, floor_time) if floor_time is not None else None
    except VideoReadError as error:
        raise HTTPException(422, str(error))
    finally:
        os.unlink(path)

    if not extraction.frames:
        raise HTTPException(422, "No usable frames found. Move more slowly and keep the room well lit.")

    extracted = time.perf_counter()
    try:
        analysis = await analyze_frames(extraction.frames, floor_reference)
    except AIError as error:
        raise HTTPException(error.status_code, str(error))

    done = time.perf_counter()
    timings = {
        "receive_s": round(saved - started, 2),
        "extract_s": round(extracted - saved, 2),
        "ai_s": round(done - extracted, 2),
    }
    log.info("scan: %.1f s of video -> %d frames | %s", extraction.duration_sec, len(extraction.frames), timings)

    return {
        "scan_id": uuid.uuid4().hex,
        "frame_count": len(extraction.frames),
        "duration_sec": extraction.duration_sec,
        "frames": [
            {"index": f.index, "timestamp_sec": f.timestamp_sec, "sharpness": f.sharpness}
            for f in extraction.frames
        ],
        "preview_image": f"data:image/jpeg;base64,{extraction.frames[-1].jpeg_base64}",
        "timings": timings,
        "analysis": analysis,
    }

