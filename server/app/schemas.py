# schemas.py — the feng shui analysis returned by the AI, validated and normalized
from typing import Literal

from pydantic import BaseModel, Field

ELEMENTS = ("wood", "fire", "earth", "metal", "water")


class ChiFlow(BaseModel):
    score: float = 0
    summary: str = ""
    issues: list[str] = Field(default_factory=list)


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


class FengShuiAnalysis(BaseModel):
    overall_score: float
    room_type: str = "unknown"
    summary: str = ""
    confidence: Literal["low", "medium", "high"] = "medium"
    basis: Literal["images", "floor_plan", "both"] = "images"
    chi_flow: ChiFlow
    elements: Elements
    recommendations: list[Recommendation] = Field(default_factory=list)


def _clamp(value: float) -> int:
    return int(round(min(100, max(0, value))))


def normalize(analysis: FengShuiAnalysis) -> dict:
    """Clamp scores, make the element percentages sum to 100, and derive dominant/weakest elements."""
    data = analysis.model_dump()
    data["overall_score"] = _clamp(analysis.overall_score)
    data["chi_flow"]["score"] = _clamp(analysis.chi_flow.score)

    raw = {name: max(0.0, getattr(analysis.elements, name).percent) for name in ELEMENTS}
    total = sum(raw.values())
    shares = {name: (raw[name] / total * 100 if total else 20.0) for name in ELEMENTS}
    rounded = {name: int(round(value)) for name, value in shares.items()}
    # fix rounding drift so the five values always sum to exactly 100
    strongest = max(ELEMENTS, key=lambda name: shares[name])
    rounded[strongest] += 100 - sum(rounded.values())
    for name in ELEMENTS:
        data["elements"][name]["percent"] = rounded[name]

    data["dominant_element"] = strongest
    data["weakest_element"] = min(ELEMENTS, key=lambda name: shares[name])
    return data
