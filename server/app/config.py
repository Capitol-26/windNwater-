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
# sample one frame per interval
FRAME_INTERVAL_SEC = float(os.getenv("FRAME_INTERVAL_SEC", "0.5"))
# hard cap on frames extracted from the video
MAX_FRAMES = int(os.getenv("MAX_FRAMES", "40"))
MAX_FRAME_WIDTH = int(os.getenv("MAX_FRAME_WIDTH", "1024")
                      )  # downscale before encoding
JPEG_QUALITY = int(os.getenv("JPEG_QUALITY", "85"))
# Laplacian variance; below = blurry
MIN_SHARPNESS = float(os.getenv("MIN_SHARPNESS", "30.0"))
# histogram correlation; above = duplicate
MAX_SIMILARITY = float(os.getenv("MAX_SIMILARITY", "0.97"))
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "120"))

# AI: Elorian Glimpse (a visual reasoning model) through OpenRouter's OpenAI-compatible API.
# Only the key is required; the rest have defaults and can be overridden in .env.
AI_API_KEY = _env("AI_API_KEY", "OPENROUTER_API_KEY")
AI_BASE_URL = _env("AI_BASE_URL", default="https://openrouter.ai/api/v1")
AI_MODEL = _env("AI_MODEL", default="elorian/glimpse")
# frames actually sent to the model
AI_MAX_IMAGES = int(os.getenv("AI_MAX_IMAGES", "12"))
AI_MAX_TOKENS = int(os.getenv("AI_MAX_TOKENS", "5000"))
# Glimpse leaks its chain of thought into the answer and runs out of tokens when reasoning is on, so it is off by default.
AI_REASONING = os.getenv("AI_REASONING", "off").lower() in ("on", "true", "1")
AI_TIMEOUT_SEC = float(os.getenv("AI_TIMEOUT_SEC", "300"))

# Danger-spot detection: YOLO-World, an open-vocabulary YOLO that finds whatever noun phrase it is given.
WEIGHTS_DIR = str(_server_dir / "weights")
# also: yolov8m-worldv2.pt, yolov8l-worldv2.pt (slower, better)
DETECTOR_MODEL = os.getenv("DETECTOR_MODEL", "yolov8s-worldv2.pt")
# open-vocabulary scores run low; the debug images show what this keeps
DETECTOR_CONF = float(os.getenv("DETECTOR_CONF", "0.05"))
DETECTOR_MAX_PER_SPOT = int(os.getenv("DETECTOR_MAX_PER_SPOT", "2"))
DETECTOR_IMGSZ = int(os.getenv("DETECTOR_IMGSZ", "960"))
# annotated frames land here; empty turns it off
DEBUG_DIR = os.getenv("DANGER_DEBUG_DIR", str(_server_dir / "debug_boxes"))
# same kind, same photo, overlap above this: one hazard
MERGE_IOU = float(os.getenv("MERGE_IOU", "0.5"))
# a box this far inside another one is the same hazard
MERGE_CONTAINMENT = float(os.getenv("MERGE_CONTAINMENT", "0.85"))
# share of the photo; below is a speck
MIN_BOX_AREA = float(os.getenv("MIN_BOX_AREA", "0.002"))
# above is the whole photo, not an object
MAX_BOX_AREA = float(os.getenv("MAX_BOX_AREA", "0.8"))
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
# these generic hits only count above this, so a tidy room gets no clutter box
CLUTTER_CONF = float(os.getenv("CLUTTER_CONF", "0.15"))
# blocked-chi boxes closer than this (share of the photo) become one area
CLUSTER_GAP = float(os.getenv("CLUSTER_GAP", "0.06"))
# a joined clutter box never covers more than this share of the photo
CLUSTER_MAX_AREA = float(os.getenv("CLUSTER_MAX_AREA", "0.45"))
