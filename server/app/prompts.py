# prompts.py — the feng shui prompts and the helpers that describe a scanned room to the AI
import math

from .frame_extractor import ExtractedFrame

SYSTEM_PROMPT = """You are an experienced feng shui consultant. You are given a scan of a single room, as photos taken while walking around it, a measured floor plan, or both. Assess the room and reply with ONE JSON object and nothing else.

How to assess:
1. Chi flow: energy should enter at the door and move slowly through the room. Penalize a door in a straight line with a window or another door (energy rushes out), furniture blocking the entrance or walkways, clutter, sharp furniture corners aimed at where people sit or sleep, and cramped or dead corners. Reward clear, gently curving paths and open space near the entrance.
2. Command position: beds, desks and main seats are best placed with a solid wall behind them and a clear view of the door, but not directly in line with it.
3. The five elements, judged from what you can actually see or infer:
   - wood: plants, wooden furniture, green and teal, tall rectangular or columnar shapes
   - fire: red, orange and strong purple, triangular or pointed shapes, lamps and candles, leather and bright light
   - earth: yellow, beige and brown, square and flat shapes, ceramics, stone, rugs, low heavy furniture
   - metal: white, grey and metallic colors, round or arched shapes, metal furniture and frames
   - water: black and deep blue, flowing or irregular shapes, mirrors, glass, dark reflective surfaces
   Give each element a percent of the room's overall elemental makeup. The five percents MUST sum to 100. A balanced room is roughly even; a room dominated by one element or missing one is out of balance.
4. If compass directions are given, use the bagua: north = career (water), northeast = knowledge (earth), east = family (wood), southeast = wealth (wood), south = fame (fire), southwest = relationships (earth), west = creativity (metal), northwest = helpful people (metal). Note when furniture or elements sit in a mismatched zone.

Scoring: overall_score and chi_flow.score are integers from 0 to 100. 50 is an average, unremarkable room; 80+ is genuinely good; below 30 is poor. Be honest, do not inflate scores, and base every claim on evidence from the scan. Only mention what is supported by the images or floor plan; never invent furniture, colors or windows you cannot see. If you have only a floor plan (no photos), infer elements from furniture categories and layout, and set confidence to "low" or "medium". If photos are blurry or show little of the room, lower confidence.

Reply with exactly this JSON shape:
{
  "room_type": "bedroom | living room | office | kitchen | dining room | other",
  "basis": "images | floor_plan | both",
  "confidence": "low | medium | high",
  "overall_score": 0-100,
  "summary": "2-3 sentences on the room's overall feng shui",
  "chi_flow": {"score": 0-100, "summary": "one sentence", "issues": ["specific problems, each citing what causes it"]},
  "elements": {
    "wood":  {"percent": 0-100, "evidence": "what in the room represents this element"},
    "fire":  {"percent": 0-100, "evidence": "..."},
    "earth": {"percent": 0-100, "evidence": "..."},
    "metal": {"percent": 0-100, "evidence": "..."},
    "water": {"percent": 0-100, "evidence": "..."}
  },
  "recommendations": [{"title": "short action", "detail": "what to move or add and why", "priority": "high | medium | low"}]
}
Give 3 to 6 recommendations, most important first. Keep each string short and concrete."""

_COMPASS_POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]


def _bearing(dx: float, dz: float) -> str:
    """Compass point of a vector on the floor plan (x = east, z = south, so north is -z)."""
    angle = math.degrees(math.atan2(dx, -dz)) % 360
    return _COMPASS_POINTS[int((angle + 22.5) // 45) % 8]


def _round(value: float) -> float:
    return round(float(value), 2)


def describe_floor_plan(plan: dict) -> str:
    """Compact text description of a scanned floor plan, with compass directions when available."""
    compass = bool(plan.get("compassAligned"))
    polygon = plan.get("floor", {}).get("polygon", [])
    walls = plan.get("walls", [])
    cx = sum(p["x"] for p in polygon) / len(polygon) if polygon else 0.0
    cz = sum(p["z"] for p in polygon) / len(polygon) if polygon else 0.0

    def direction(x: float, z: float) -> str | None:
        return _bearing(x - cx, z - cz) if compass else None

    lines = [
        f"Floor area: {_round(plan.get('floor', {}).get('area', 0))} m2. "
        + ("Compass directions are real (N/E/S/W)." if compass else "No compass: directions are unknown."),
        "Walls (length m" + (", side of the room" if compass else "") + "):",
    ]
    for i, wall in enumerate(walls):
        mid_x, mid_z = (wall["a"]["x"] + wall["b"]["x"]) / 2, (wall["a"]["z"] + wall["b"]["z"]) / 2
        side = direction(mid_x, mid_z)
        lines.append(f"  wall {i}: {_round(wall['length'])}" + (f", {side} side" if side else ""))

    for label, key in (("Doors", "doors"), ("Windows", "windows")):
        items = plan.get(key, [])
        lines.append(f"{label}: " + ("none" if not items else ""))
        for item in items:
            mid_x, mid_z = (item["a"]["x"] + item["b"]["x"]) / 2, (item["a"]["z"] + item["b"]["z"]) / 2
            side = direction(mid_x, mid_z)
            lines.append(
                f"  on wall {item['wall']}, {_round(item['width'])} m wide, {_round(item['offset'])} m from wall start"
                + (f", {side} side" if side else "")
            )

    objects = plan.get("objects", [])
    lines.append("Furniture: " + ("none" if not objects else ""))
    for obj in objects:
        c = obj["center"]
        side = direction(c["x"], c["z"])
        dims = obj["dimensions"]
        lines.append(
            f"  {obj['category']}, {_round(dims['width'])} x {_round(dims['depth'])} m, "
            f"center ({_round(c['x'])}, {_round(c['z'])})" + (f", {side} part of the room" if side else "")
        )
    return "\n".join(lines)


def build_user_content(frames: list[ExtractedFrame], floor_plan: dict | None, include_images: bool = True) -> list[dict]:
    """The user message: instructions, the floor plan description, and the photos."""
    parts: list[str] = ["Assess the feng shui of this room."]
    if floor_plan:
        parts.append("Measured floor plan (meters, top-down):\n" + describe_floor_plan(floor_plan))
    use_images = include_images and bool(frames)
    if use_images:
        parts.append(f"{len(frames)} photos of the room follow, in the order they were taken.")
    elif frames:
        parts.append("Photos were taken but are not available to you; rely on the floor plan.")
    content: list[dict] = [{"type": "text", "text": "\n\n".join(parts)}]
    if use_images:
        for frame in frames:
            content.append(
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{frame.jpeg_base64}"}}
            )
    return content
