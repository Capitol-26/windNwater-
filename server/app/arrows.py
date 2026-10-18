# arrows.py — finds likely poison arrows without the AI naming them: angular furniture (tables, desks, picture frames,
# shelves...) standing close to a place where people sit, sleep or enter. YOLO-World finds whole objects, not corners,
# so an angular object next to a landmark is the stand-in for "a sharp corner pointing at it".
from . import config
from .merge import iou, _gap

def _overlaps(a: list[float], b: list[float]) -> bool:
    """Mostly the same region: heavy overlap, or one box almost inside the other."""
    inter = max(0.0, min(a[2], b[2]) - max(a[0], b[0])) * max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    smaller = min((a[2] - a[0]) * (a[3] - a[1]), (b[2] - b[0]) * (b[3] - b[1]))
    return iou(a, b) >= 0.4 or (smaller > 0 and inter / smaller >= 0.7)


Hit = dict  # {"box": [x1, y1, x2, y2], "confidence": float}


def find_arrows(found: dict[str, list[Hit]], photo: int) -> list[dict]:
    """Spots (with detections) for every angular object in one photo that is near a landmark.

    `found` maps each searched phrase (config.LANDMARK_PHRASES and config.ANGULAR_PHRASES) to its hits in the photo.
    """
    landmarks = [
        (phrase, hit)
        for phrase in config.LANDMARK_PHRASES
        for hit in found.get(phrase, [])
        if hit["confidence"] >= config.LANDMARK_CONF
    ]
    if not landmarks:
        return []

    fixtures = [hit for phrase in config.FIXTURE_PHRASES for hit in found.get(phrase, []) if hit["confidence"] >= config.FIXTURE_CONF]

    spots: list[dict] = []
    for phrase in config.ANGULAR_PHRASES:
        for hit in found.get(phrase, []):
            if hit["confidence"] < config.ANGULAR_CONF:
                continue
            # a "cabinet" or "shelf" that is really a door, window or other fixture is architecture, not furniture
            if any(_overlaps(hit["box"], fixture["box"]) for fixture in fixtures):
                continue
            # the same object may also match a landmark phrase ("table" under a "bed"); it must be a different thing nearby
            near = [
                (name, other)
                for name, other in landmarks
                if iou(hit["box"], other["box"]) < 0.5 and _gap(hit["box"], other["box"]) <= config.ANGULAR_NEAR
            ]
            if not near:
                continue
            name = min(near, key=lambda n: _gap(hit["box"], n[1]["box"]))[0]
            spots.append({
                "kind": "poison_arrow", "photo": photo, "detect": phrase, "target": name,
                "why": f"angular {phrase} close to a {name}", "detections": [hit],
            })
    return spots[: config.MAX_ARROWS_PER_PHOTO]
