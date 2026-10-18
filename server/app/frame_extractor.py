# frame_extractor.py — uses OpenCV to turn a room-scan video into a small set of sharp, distinct frames
import base64
from dataclasses import dataclass

import cv2

from . import config


@dataclass
class ExtractedFrame:
    index: int
    timestamp_sec: float
    sharpness: float
    jpeg_base64: str


@dataclass
class ExtractionResult:
    frames: list[ExtractedFrame]
    duration_sec: float
    fps: float


class VideoReadError(Exception):
    pass


def _sharpness(gray) -> float:
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _histogram(frame):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1], None, [32, 32], [0, 180, 0, 256])
    return cv2.normalize(hist, hist).flatten()


def _resize(frame):
    height, width = frame.shape[:2]
    if width <= config.MAX_FRAME_WIDTH:
        return frame
    scale = config.MAX_FRAME_WIDTH / width
    return cv2.resize(frame, (config.MAX_FRAME_WIDTH, int(height * scale)), interpolation=cv2.INTER_AREA)


MAX_GAP_SEC = 2.0  # never go longer than this without a frame, however similar the view looks
MIN_FRAMES = 8  # if fewer frames pass the sharpness check, fall back to the sharpest ones


def extract_frames(video_path: str) -> ExtractionResult:
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise VideoReadError("Could not open the video file.")

    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    step = max(1, round(fps * config.FRAME_INTERVAL_SEC))

    candidates: list[ExtractedFrame] = []
    last_hist = None
    last_kept_sec = 0.0
    position = 0

    try:
        while len(candidates) < config.MAX_FRAMES:
            # grab() advances without decoding; only decode the frames we sample
            if not capture.grab():
                break
            if position % step == 0:
                ok, frame = capture.retrieve()
                if ok:
                    frame = _resize(frame)
                    hist = _histogram(frame)
                    now = position / fps
                    # skip near-duplicates, but always keep a frame every few seconds
                    is_new = (
                        last_hist is None
                        or now - last_kept_sec >= MAX_GAP_SEC
                        or cv2.compareHist(last_hist, hist, cv2.HISTCMP_CORREL) < config.MAX_SIMILARITY
                    )
                    if is_new:
                        sharp = _sharpness(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
                        encoded, buffer = cv2.imencode(
                            ".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, config.JPEG_QUALITY]
                        )
                        if encoded:
                            candidates.append(
                                ExtractedFrame(
                                    index=0,
                                    timestamp_sec=round(position / fps, 2),
                                    sharpness=round(sharp, 1),
                                    jpeg_base64=base64.b64encode(buffer).decode("ascii"),
                                )
                            )
                            last_hist = hist
                            last_kept_sec = now
            position += 1
    finally:
        capture.release()

    # Prefer sharp frames. Plain, textureless rooms score low everywhere, so never end up with none.
    frames = [f for f in candidates if f.sharpness >= config.MIN_SHARPNESS]
    if len(frames) < MIN_FRAMES:
        frames = sorted(candidates, key=lambda f: f.sharpness, reverse=True)[:MIN_FRAMES]
        frames.sort(key=lambda f: f.timestamp_sec)
    for i, frame in enumerate(frames):
        frame.index = i

    return ExtractionResult(frames=frames, duration_sec=round(total / fps, 2), fps=round(fps, 2))


def extract_frame_at(video_path: str, seconds: float) -> ExtractedFrame | None:
    """One frame at `seconds`, resized like the others. The app picks this moment as the one with the clearest floor."""
    capture = cv2.VideoCapture(video_path)
    try:
        capture.set(cv2.CAP_PROP_POS_MSEC, max(0.0, seconds) * 1000)
        ok, frame = capture.read()
    finally:
        capture.release()
    if not ok:
        return None
    frame = _resize(frame)
    encoded, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, config.JPEG_QUALITY])
    if not encoded:
        return None
    sharp = _sharpness(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
    return ExtractedFrame(index=-1, timestamp_sec=round(seconds, 2), sharpness=round(sharp, 1), jpeg_base64=base64.b64encode(buffer).decode("ascii"))
