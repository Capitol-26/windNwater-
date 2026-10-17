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
FRAME_INTERVAL_SEC = float(os.getenv("FRAME_INTERVAL_SEC", "1.0"))  # sample one frame per interval
MAX_FRAMES = int(os.getenv("MAX_FRAMES", "40"))  # hard cap on frames extracted from the video
MAX_FRAME_WIDTH = int(os.getenv("MAX_FRAME_WIDTH", "768"))  # downscale before encoding
JPEG_QUALITY = int(os.getenv("JPEG_QUALITY", "80"))
MIN_SHARPNESS = float(os.getenv("MIN_SHARPNESS", "30.0"))  # Laplacian variance; below = blurry
MAX_SIMILARITY = float(os.getenv("MAX_SIMILARITY", "0.97"))  # histogram correlation; above = duplicate
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "300"))

# AI: Elorian Glimpse (a visual reasoning model) through OpenRouter's OpenAI-compatible API.
# Only the key is required; the rest have defaults and can be overridden in .env.
AI_API_KEY = _env("AI_API_KEY", "OPENROUTER_API_KEY")
AI_BASE_URL = _env("AI_BASE_URL", default="https://openrouter.ai/api/v1")
AI_MODEL = _env("AI_MODEL", default="elorian/glimpse")
AI_MAX_IMAGES = int(os.getenv("AI_MAX_IMAGES", "12"))  # frames actually sent to the model
AI_MAX_TOKENS = int(os.getenv("AI_MAX_TOKENS", "6000"))  # reasoning tokens count toward this budget
AI_TIMEOUT_SEC = float(os.getenv("AI_TIMEOUT_SEC", "180"))
