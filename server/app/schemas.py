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


class Opening(BaseModel):
    kind: Literal["door", "window"]
    wall: Literal["north", "east", "south", "west"]
    offset: float = 0  # metres from the wall's start (west end of a north/south wall, north end of an east/west wall) to the opening's centre
    width: float = 0.9


class Item(BaseModel):
    name: str
    x: float  # centre, metres from the room's west wall
    y: float  # centre, metres from the room's north wall
    width: float  # extent along x, metres
    depth: float  # extent along y, metres
    floor_uv: tuple[float, float] | None = None  # where its base meets the floor in the floor reference photo, 0-1 from the top-left


class OptimalItem(BaseModel):
    name: str
    x: float
    y: float
    width: float | None = None  # a 90 degree turn swaps width and depth
    depth: float | None = None
    reason: str = ""
    added: bool = False  # a new piece the recommendations suggest bringing in, not one already in the room


class Zone(BaseModel):
    x: float  # centre, metres
    y: float
    width: float
    depth: float


class Layout(BaseModel):
    width: float  # room extent along x, metres
    length: float  # room extent along y, metres
    openings: list[Opening] = Field(default_factory=list)
    items: list[Item] = Field(default_factory=list)
    optimal_items: list[OptimalItem] = Field(default_factory=list)
    clutter: list[Zone] = Field(default_factory=list)  # floor areas to clear


class FengShuiAnalysis(BaseModel):
    overall_score: float
    room_type: str = "unknown"
    summary: str = ""
    elements: Elements
    recommendations: list[Recommendation] = Field(default_factory=list)
    layout: Layout | None = None


MIN_ROOM, MAX_ROOM, MAX_ITEMS, MAX_ADDED, MAX_CLUTTER = 1.5, 15.0, 14, 4, 4


def _fit(centre: float, size: float, room: float) -> tuple[float, float]:
    """Shrink `size` to the room and slide `centre` so the item stays inside it."""
    size = min(size, room)
    return min(max(centre, size / 2), room - size / 2), size


def _normalize_layout(layout: Layout) -> dict | None:
    """Keep every item inside the room, and give the optimal layout exactly the current items."""
    width = min(MAX_ROOM, max(MIN_ROOM, layout.width))
    length = min(MAX_ROOM, max(MIN_ROOM, layout.length))

    items: list[dict] = []
    for item in layout.items[:MAX_ITEMS]:
        if item.width <= 0.05 or item.depth <= 0.05:
            continue
        x, w = _fit(item.x, item.width, width)
        y, d = _fit(item.y, item.depth, length)
        entry = {"name": item.name, "x": round(x, 2), "y": round(y, 2), "width": round(w, 2), "depth": round(d, 2)}
        if item.floor_uv and all(0 <= c <= 1 for c in item.floor_uv):
            entry["floor_uv"] = [round(c, 4) for c in item.floor_uv]
        items.append(entry)
    if not items:
        return None

    proposed = {entry.name: entry for entry in layout.optimal_items}
    optimal: list[dict] = []
    for item in items:
        entry = proposed.get(item["name"])
        if entry is None:  # the model left it out: it stays where it is
            optimal.append({**{k: v for k, v in item.items() if k != "floor_uv"}, "reason": "", "added": False})
            continue
        x, w = _fit(entry.x, entry.width or item["width"], width)
        y, d = _fit(entry.y, entry.depth or item["depth"], length)
        optimal.append({"name": item["name"], "x": round(x, 2), "y": round(y, 2), "width": round(w, 2), "depth": round(d, 2), "reason": entry.reason, "added": False})

    # pieces the recommendations add (a plant, a lamp...): anything optimal that is not already in the room
    known = {item["name"] for item in items}
    for entry in layout.optimal_items:
        if entry.name in known or sum(o["added"] for o in optimal) >= MAX_ADDED:
            continue
        known.add(entry.name)
        x, w = _fit(entry.x, entry.width or 0.5, width)
        y, d = _fit(entry.y, entry.depth or 0.5, length)
        optimal.append({"name": entry.name, "x": round(x, 2), "y": round(y, 2), "width": round(w, 2), "depth": round(d, 2), "reason": entry.reason, "added": True})

    clutter = []
    for zone in layout.clutter[:MAX_CLUTTER]:
        if zone.width <= 0.05 or zone.depth <= 0.05:
            continue
        x, w = _fit(zone.x, zone.width, width)
        y, d = _fit(zone.y, zone.depth, length)
        clutter.append({"x": round(x, 2), "y": round(y, 2), "width": round(w, 2), "depth": round(d, 2)})

    openings = [
        {"kind": o.kind, "wall": o.wall, "offset": round(max(0.0, o.offset), 2), "width": round(min(max(o.width, 0.4), 3.0), 2)}
        for o in layout.openings[:8]
    ]
    return {"width": round(width, 2), "length": round(length, 2), "openings": openings, "items": items, "optimal_items": optimal, "clutter": clutter}


def normalize(analysis: FengShuiAnalysis) -> dict:
    """Clamp the score and make the element percentages sum to exactly 100."""
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
    data["layout"] = _normalize_layout(analysis.layout) if analysis.layout else None
    return data
