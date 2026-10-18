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


def _gap(a: Box, b: Box) -> float:
    """Distance between two boxes, 0 when they touch or overlap."""
    dx = max(0.0, a[0] - b[2], b[0] - a[2])
    dy = max(0.0, a[1] - b[3], b[1] - a[3])
    return (dx * dx + dy * dy) ** 0.5


def _union(a: Box, b: Box) -> Box:
    return [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]


def _same_hazard(a: dict, b: dict) -> bool:
    """Two boxes of one kind in one photo are one hazard when they overlap a lot, or one sits almost wholly inside the other."""
    inter = _inter(a["box"], b["box"])
    smaller = min(_area(a["box"]), _area(b["box"]))
    return iou(a["box"], b["box"]) >= config.MERGE_IOU or (smaller > 0 and inter / smaller >= config.MERGE_CONTAINMENT)


def _absorb(into: dict, other: dict, box: Box) -> None:
    # the label of the bigger box goes first: it names the whole area, not a thing inside it
    first, second = (into, other) if _area(into["box"]) >= _area(other["box"]) else (other, into)
    into["labels"] = list(dict.fromkeys(first["labels"] + second["labels"]))
    into["parts"] = into["parts"] + other["parts"]
    into["box"] = box
    into["confidence"] = max(into["confidence"], other["confidence"])
    into["target"] = into["target"] or other["target"]
    into["why"] = into["why"] or other["why"]


def _plural(noun: str) -> str:
    return noun + ("es" if noun.endswith(("s", "x", "sh", "ch")) else "s")


def _pile_title(parts: list[str]) -> str:
    """Name for several chi-blocking boxes joined into one: "pile of bags" when they are all the same thing, else "general clutter"."""
    kinds = set(parts)
    if len(kinds) == 1:
        what = parts[0]
        return what if what.startswith(("pile of", "pile")) else f"pile of {_plural(what)}"
    return "general clutter"


def merge_hazards(spots: list[dict]) -> list[dict]:
    """Flatten spots-with-detections into hazards, one box each.

    Boxes the size of the whole photo or a speck are dropped. Within a photo and kind, overlapping boxes are
    merged. Chi-blocking boxes that overlap or sit close together become ONE box around the whole cluster (a pile
    is one hazard, not a box per item in it); poison arrows keep the most confident box, since each is one object.
    Different kinds never merge, since one object can be both blocking chi and a poison arrow.
    """
    hits = []
    for spot in spots:
        for hit in spot["detections"]:
            if config.MIN_BOX_AREA <= _area(hit["box"]) <= config.MAX_BOX_AREA:
                hits.append({
                    "kind": spot["kind"], "photo": spot["photo"], "box": list(hit["box"]), "confidence": hit["confidence"],
                    "labels": [spot["detect"]], "parts": [spot["detect"]], "target": spot["target"], "why": spot["why"],
                })

    hazards: list[dict] = []
    for hit in sorted(hits, key=lambda h: -h["confidence"]):
        twin = next((h for h in hazards if h["kind"] == hit["kind"] and h["photo"] == hit["photo"] and _same_hazard(h, hit)), None)
        if twin is None:
            hazards.append(hit)
        elif hit["kind"] == "blocked_chi":
            _absorb(twin, hit, _union(twin["box"], hit["box"]))
        else:
            twin["labels"] = list(dict.fromkeys(twin["labels"] + hit["labels"]))
            twin["target"] = twin["target"] or hit["target"]
            twin["why"] = twin["why"] or hit["why"]

    # near neighbours join into one area, repeatedly, until nothing is close enough to join
    merged = True
    while merged:
        merged = False
        for i, a in enumerate(hazards):
            for b in hazards[i + 1 :]:
                if a["kind"] == b["kind"] == "blocked_chi" and a["photo"] == b["photo"] and _gap(a["box"], b["box"]) <= config.CLUSTER_GAP:
                    box = _union(a["box"], b["box"])
                    if _area(box) <= config.MAX_BOX_AREA:
                        _absorb(a, b, box)
                        hazards.remove(b)
                        merged = True
                        break
            if merged:
                break

    # a joined area is named for what it is made of; the detector's own labels follow it
    for hazard in hazards:
        if hazard["kind"] == "blocked_chi" and len(hazard["parts"]) > 1:
            title = _pile_title(hazard["parts"])
            hazard["labels"] = [title] + [label for label in hazard["labels"] if label != title]
        del hazard["parts"]
    return hazards
