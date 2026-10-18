# config.py — tunables and AI settings, overridable with environment variables or a .env file
import os
from pathlib import Path

from dotenv import load_dotenv

# Load the repo-root .env first, then server/.env (values already set in the environment win).
_server_dir = Path(__file__).resolve().parents[1]
load_dotenv(_server_dir.parent / ".env")
load_dotenv(_server_dir / ".env")


def _env(*names: str, default: str = "") -> str:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return default


# Frame extraction
FRAME_INTERVAL_SEC = float(os.getenv("FRAME_INTERVAL_SEC", "0.5"))  # sample one frame per interval
MAX_FRAMES = int(os.getenv("MAX_FRAMES", "40"))  # hard cap on frames extracted from the video
MAX_FRAME_WIDTH = int(os.getenv("MAX_FRAME_WIDTH", "1024"))  # downscale before encoding
JPEG_QUALITY = int(os.getenv("JPEG_QUALITY", "85"))
MIN_SHARPNESS = float(os.getenv("MIN_SHARPNESS", "30.0"))  # Laplacian variance; below = blurry
MAX_SIMILARITY = float(os.getenv("MAX_SIMILARITY", "0.97"))  # histogram correlation; above = duplicate
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "120"))

# AI: Elorian Glimpse (a visual reasoning model) through OpenRouter's OpenAI-compatible API.
# Only the key is required; the rest have defaults and can be overridden in .env.
AI_API_KEY = _env("AI_API_KEY", "OPENROUTER_API_KEY")
AI_BASE_URL = _env("AI_BASE_URL", default="https://openrouter.ai/api/v1")
AI_MODEL = _env("AI_MODEL", default="elorian/glimpse")
AI_MAX_IMAGES = int(os.getenv("AI_MAX_IMAGES", "12"))  # frames actually sent to the model
AI_MAX_TOKENS = int(os.getenv("AI_MAX_TOKENS", "5000"))
# Glimpse leaks its chain of thought into the answer and runs out of tokens when reasoning is on, so it is off by default.
AI_REASONING = os.getenv("AI_REASONING", "off").lower() in ("on", "true", "1")
AI_TIMEOUT_SEC = float(os.getenv("AI_TIMEOUT_SEC", "300"))

# Danger-spot detection: YOLO-World, an open-vocabulary YOLO that finds whatever noun phrase it is given.
WEIGHTS_DIR = str(_server_dir / "weights")
DETECTOR_MODEL = os.getenv("DETECTOR_MODEL", "yolov8s-worldv2.pt")  # also: yolov8m-worldv2.pt, yolov8l-worldv2.pt (slower, better)
DETECTOR_CONF = float(os.getenv("DETECTOR_CONF", "0.05"))  # open-vocabulary scores run low; the debug images show what this keeps
DETECTOR_MAX_PER_SPOT = int(os.getenv("DETECTOR_MAX_PER_SPOT", "2"))
DETECTOR_IMGSZ = int(os.getenv("DETECTOR_IMGSZ", "960"))
DEBUG_DIR = os.getenv("DANGER_DEBUG_DIR", str(_server_dir / "debug_boxes"))  # annotated frames land here; empty turns it off
MERGE_IOU = float(os.getenv("MERGE_IOU", "0.5"))  # same kind, same photo, overlap above this: one hazard
MERGE_CONTAINMENT = float(os.getenv("MERGE_CONTAINMENT", "0.85"))  # a box this far inside another one is the same hazard
MIN_BOX_AREA = float(os.getenv("MIN_BOX_AREA", "0.002"))  # share of the photo; below is a speck
MAX_BOX_AREA = float(os.getenv("MAX_BOX_AREA", "0.8"))  # above is the whole photo, not an object
# Clutter: YOLO-World cannot find the abstract word "clutter", so where chi is blocked it also looks for the things
# clutter is made of. Those that lie close together are joined into one area (see merge.py), not boxed item by item.
CLUTTER_PHRASES = [
    p.strip()
    for p in os.getenv(
        "CLUTTER_PHRASES",
        "plastic bag,paper bag,cardboard box,pile of clothes,shoes,pile of papers,laundry basket,backpack,suitcase,toys,stack of books,pile of towels,jacket",
    ).split(",")
    if p.strip()
]
CLUTTER_CONF = float(os.getenv("CLUTTER_CONF", "0.1"))  # these generic hits only count above this, so a tidy room gets no clutter box
CLUSTER_GAP = float(os.getenv("CLUSTER_GAP", "0.06"))  # blocked-chi boxes closer than this (share of the photo) become one area
CLUSTER_MAX_AREA = float(os.getenv("CLUSTER_MAX_AREA", "0.45"))  # a joined clutter box never covers more than this share of the photo

# Poison arrows: angular objects near a landmark are marked even when the AI did not name them
LANDMARK_PHRASES = [p.strip() for p in os.getenv("LANDMARK_PHRASES", "bed,sofa,armchair,office chair,door").split(",") if p.strip()]
ANGULAR_PHRASES = [
    p.strip()
    for p in os.getenv("ANGULAR_PHRASES", "table,desk,picture frame,mirror,shelf,bookshelf,cabinet,dresser,television").split(",")
    if p.strip()
]
LANDMARK_CONF = float(os.getenv("LANDMARK_CONF", "0.25"))
ANGULAR_CONF = float(os.getenv("ANGULAR_CONF", "0.16"))  # the system favours marking an arrow over missing one, but not by much
ANGULAR_NEAR = float(os.getenv("ANGULAR_NEAR", "0.17"))  # gap (share of the photo) within which an object counts as pointing at a landmark
MAX_ARROWS_PER_PHOTO = int(os.getenv("MAX_ARROWS_PER_PHOTO", "6"))

# Architecture is never a poison arrow: an angular object that is really a door, window or other fixture is dropped
FIXTURE_PHRASES = [p.strip() for p in os.getenv("FIXTURE_PHRASES", "door,window,doorway,closet door,sliding door,staircase,fireplace").split(",") if p.strip()]
FIXTURE_CONF = float(os.getenv("FIXTURE_CONF", "0.2"))
FIXTURE_WORDS = ("door", "window", "wall", "pillar", "column", "stair", "fireplace", "doorway", "arch", "beam")  # a poison-arrow phrase with one of these is architecture
