# merge.py — turns the detector's raw hits into one box per hazard: dedupes overlapping boxes and drops implausible ones
from . import config

Box = list[float]  # x1, y1, x2, y2 as fractions of the photo


def _area(b: Box) -> float:
    return max(0.0, b[2] - b[0]) * max(0.0, b[3] - b[1])


def _inter(a: Box, b: Box) -> float:
    return _area([max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])])


def iou(a: Box, b: Box) -> float:
    inter = _inter(a, b)
    union = _area(a) + _area(b) - inter
    return inter / union if union > 0 else 0.0


def _same_hazard(a: dict, b: dict) -> bool:
    """Two boxes of one kind in one photo are one hazard when they overlap a lot, or one sits almost wholly inside the other."""
    inter = _inter(a["box"], b["box"])
    smaller = min(_area(a["box"]), _area(b["box"]))
    return iou(a["box"], b["box"]) >= config.MERGE_IOU or (smaller > 0 and inter / smaller >= config.MERGE_CONTAINMENT)


def merge_hazards(spots: list[dict]) -> list[dict]:
    """Flatten spots-with-detections into hazards, one box each.

    Boxes the size of the whole photo or a speck are dropped. Within a photo and kind, overlapping boxes are
    merged: the most confident box wins and keeps the other labels and reasons. Different kinds never merge, since
    one object can be both blocking chi and a poison arrow.
    """
    hits = []
    for spot in spots:
        for hit in spot["detections"]:
            if config.MIN_BOX_AREA <= _area(hit["box"]) <= config.MAX_BOX_AREA:
                hits.append({
                    "kind": spot["kind"], "photo": spot["photo"], "box": hit["box"], "confidence": hit["confidence"],
                    "labels": [spot["detect"]], "target": spot["target"], "why": spot["why"],
                })

    hazards: list[dict] = []
    for hit in sorted(hits, key=lambda h: -h["confidence"]):
        twin = next((h for h in hazards if h["kind"] == hit["kind"] and h["photo"] == hit["photo"] and _same_hazard(h, hit)), None)
        if twin is None:
            hazards.append(hit)
            continue
        for label in hit["labels"]:
            if label not in twin["labels"]:
                twin["labels"].append(label)
        twin["target"] = twin["target"] or hit["target"]
        twin["why"] = twin["why"] or hit["why"]
    return hazards
