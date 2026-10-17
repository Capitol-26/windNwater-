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


def extract_frames(video_path: str) -> ExtractionResult:
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise VideoReadError("Could not open the video file.")

    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    step = max(1, round(fps * config.FRAME_INTERVAL_SEC))

    frames: list[ExtractedFrame] = []
    last_hist = None
    position = 0

    try:
        while len(frames) < config.MAX_FRAMES:
            # grab() advances without decoding; only decode the frames we sample
            if not capture.grab():
                break
            if position % step == 0:
                ok, frame = capture.retrieve()
                if ok:
                    frame = _resize(frame)
                    sharp = _sharpness(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
                    hist = _histogram(frame)
                    is_sharp = sharp >= config.MIN_SHARPNESS
                    is_new = last_hist is None or (
                        cv2.compareHist(last_hist, hist, cv2.HISTCMP_CORREL) < config.MAX_SIMILARITY
                    )
                    if is_sharp and is_new:
                        encoded, buffer = cv2.imencode(
                            ".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, config.JPEG_QUALITY]
                        )
                        if encoded:
                            frames.append(
                                ExtractedFrame(
                                    index=len(frames),
                                    timestamp_sec=round(position / fps, 2),
                                    sharpness=round(sharp, 1),
                                    jpeg_base64=base64.b64encode(buffer).decode("ascii"),
                                )
                            )
                            last_hist = hist
            position += 1
    finally:
        capture.release()

    return ExtractionResult(frames=frames, duration_sec=round(total / fps, 2), fps=round(fps, 2))
