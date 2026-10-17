# config.py — tunables for frame extraction, overridable with environment variables
import os

FRAME_INTERVAL_SEC = float(os.getenv("FRAME_INTERVAL_SEC", "1.0"))  # sample one frame per interval
MAX_FRAMES = int(os.getenv("MAX_FRAMES", "40"))  # hard cap on frames sent to the AI
MAX_FRAME_WIDTH = int(os.getenv("MAX_FRAME_WIDTH", "768"))  # downscale before encoding
JPEG_QUALITY = int(os.getenv("JPEG_QUALITY", "80"))
MIN_SHARPNESS = float(os.getenv("MIN_SHARPNESS", "30.0"))  # Laplacian variance; below = blurry
MAX_SIMILARITY = float(os.getenv("MAX_SIMILARITY", "0.97"))  # histogram correlation; above = duplicate
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "300"))
