# schemas.py — the feng shui analysis returned by the AI, validated and normalized
from typing import Literal

from pydantic import BaseModel, Field

ELEMENTS = ("wood", "fire", "earth", "metal", "water")


class ElementShare(BaseModel):
    percent: float = 0
    evidence: str = ""


class Elements(BaseModel):
    wood: ElementShare = Field(default_factory=ElementShare)
    fire: ElementShare = Field(default_factory=ElementShare)
    earth: ElementShare = Field(default_factory=ElementShare)
    metal: ElementShare = Field(default_factory=ElementShare)
    water: ElementShare = Field(default_factory=ElementShare)


class Recommendation(BaseModel):
    title: str
    detail: str = ""
    priority: Literal["high", "medium", "low"] = "medium"


class DangerSpot(BaseModel):
    kind: Literal["blocked_chi", "poison_arrow"]
    photo: int  # 1-based number of the photo the spot is clearest in
    detect: str  # short noun phrase for the object detector
    target: str = ""  # what it blocks, or what the arrow points at
    why: str = ""


class FengShuiAnalysis(BaseModel):
    overall_score: float
    room_type: str = "unknown"
    summary: str = ""
    elements: Elements
    recommendations: list[Recommendation] = Field(default_factory=list)
    danger_spots: list[DangerSpot] = Field(default_factory=list)


MAX_DANGER_SPOTS = 8


def _normalize_spots(spots: list[DangerSpot], photo_count: int) -> list[dict]:
    """Drop spots that name no object or a photo that was not sent, and duplicates of the same object in the same photo."""
    seen: set[tuple[int, str]] = set()
    kept: list[dict] = []
    for spot in spots:
        detect = " ".join(spot.detect.lower().split())
        if not detect or not 1 <= spot.photo <= photo_count or (spot.photo, detect) in seen:
            continue
        seen.add((spot.photo, detect))
        kept.append({"kind": spot.kind, "photo": spot.photo, "detect": detect, "target": spot.target.strip(), "why": spot.why.strip()})
    return kept[:MAX_DANGER_SPOTS]


def normalize(analysis: FengShuiAnalysis, photo_count: int) -> dict:
    """Clamp the score, make the element percentages sum to exactly 100 and tidy the danger spots."""
    data = analysis.model_dump()
    data["overall_score"] = int(round(min(100, max(0, analysis.overall_score))))

    raw = {name: max(0.0, getattr(analysis.elements, name).percent) for name in ELEMENTS}
    total = sum(raw.values())
    shares = {name: (raw[name] / total * 100 if total else 20.0) for name in ELEMENTS}
    rounded = {name: int(round(value)) for name, value in shares.items()}
    # fix rounding drift so the five values always sum to exactly 100
    strongest = max(ELEMENTS, key=lambda name: shares[name])
    rounded[strongest] += 100 - sum(rounded.values())
    for name in ELEMENTS:
        data["elements"][name]["percent"] = rounded[name]
    data["danger_spots"] = _normalize_spots(analysis.danger_spots, photo_count)
    return data
