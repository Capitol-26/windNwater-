# detector.py — finds the AI's danger spots in the photos with YOLO-World, an open-vocabulary YOLO that takes text labels
import os
from functools import lru_cache

import cv2
import numpy as np

from . import config
from .frame_extractor import ExtractedFrame

COLORS = {"blocked_chi": (60, 60, 230), "poison_arrow": (70, 190, 70)}  # BGR: red blocks chi, green is a poison arrow


@lru_cache(maxsize=1)
def _model():
    from pathlib import Path

    from ultralytics import YOLOWorld  # imported late: it pulls in torch, which the rest of the API does not need
    from ultralytics.nn import text_model

    # Weights (and the CLIP text encoder it needs, in weights/clip/) live next to the server, whatever directory it is started from
    text_model.WEIGHTS_DIR = Path(config.WEIGHTS_DIR)
    return YOLOWorld(os.path.join(config.WEIGHTS_DIR, config.DETECTOR_MODEL))


def _decode(frame: ExtractedFrame) -> np.ndarray:
    import base64

    return cv2.imdecode(np.frombuffer(base64.b64decode(frame.jpeg_base64), np.uint8), cv2.IMREAD_COLOR)


def _detect(image: np.ndarray, phrases: list[str]) -> list[list[dict]]:
    """Boxes for each phrase in one image, best first. Coordinates are fractions of the image, origin top-left."""
    model = _model()
    model.set_classes(phrases)
    result = model.predict(image, conf=config.DETECTOR_CONF, imgsz=config.DETECTOR_IMGSZ, verbose=False)[0]
    found: list[list[dict]] = [[] for _ in phrases]
    for (x1, y1, x2, y2), cls, conf in zip(result.boxes.xyxyn.tolist(), result.boxes.cls.tolist(), result.boxes.conf.tolist()):
        found[int(cls)].append({"box": [round(x1, 4), round(y1, 4), round(x2, 4), round(y2, 4)], "confidence": round(conf, 3)})
    return [sorted(boxes, key=lambda b: -b["confidence"])[: config.DETECTOR_MAX_PER_SPOT] for boxes in found]


def _annotate(image: np.ndarray, spots: list[dict]) -> np.ndarray:
    out = image.copy()
    height, width = out.shape[:2]
    for spot in spots:
        color = COLORS[spot["kind"]]
        for hit in spot["detections"]:
            x1, y1, x2, y2 = (int(v * s) for v, s in zip(hit["box"], (width, height, width, height)))
            cv2.rectangle(out, (x1, y1), (x2, y2), color, 3)
            label = f'{spot["detect"]} {hit["confidence"]:.2f}'
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(out, (x1, max(0, y1 - th - 8)), (x1 + tw + 6, y1), color, -1)
            cv2.putText(out, label, (x1 + 3, max(th, y1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    return out


def locate_danger_spots(spots: list[dict], frames: list[ExtractedFrame], scan_id: str) -> list[dict]:
    """Add `detections` (boxes with confidences) to each spot, by searching its photo for its `detect` phrase.

    The spot's phrase is searched only in the photo the AI named. The annotated photos are written to
    DEBUG_DIR/<scan_id>/ so the boxes can be checked by eye: red for chi blocking, green for poison arrows.
    """
    located = [{**spot, "detections": []} for spot in spots]
    by_photo: dict[int, list[dict]] = {}
    for spot in located:
        by_photo.setdefault(spot["photo"], []).append(spot)

    for photo, group in by_photo.items():
        image = _decode(frames[photo - 1])
        phrases = list(dict.fromkeys(spot["detect"] for spot in group))
        boxes = dict(zip(phrases, _detect(image, phrases)))
        for spot in group:
            spot["detections"] = boxes[spot["detect"]]
        if config.DEBUG_DIR:
            folder = os.path.join(config.DEBUG_DIR, scan_id)
            os.makedirs(folder, exist_ok=True)
            cv2.imwrite(os.path.join(folder, f"photo{photo}.jpg"), _annotate(image, group))
    return located
