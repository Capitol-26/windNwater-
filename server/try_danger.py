# try_danger.py — runs a room video or photo through the danger-spot pipeline and writes annotated photos to check the boxes.
#   python try_danger.py scan.mov (or room.jpg)   video -> frames -> AI danger spots -> YOLO boxes (needs AI_API_KEY)
#   python try_danger.py room.jpg --spot blocked_chi "pile of cardboard boxes" --spot poison_arrow "square coffee table"
# Red boxes block chi, green boxes are poison arrows. Output goes to debug_boxes/<scan id>/.
import argparse
import asyncio
import base64
import os
import uuid

from app import config
from app.ai_client import analyze_frames
from app.detector import locate_danger_spots
from app.frame_extractor import ExtractedFrame, extract_frames

parser = argparse.ArgumentParser()
parser.add_argument("path")
parser.add_argument("--spot", nargs=2, action="append", metavar=("KIND", "PHRASE"), help="skip the AI and search a photo for these")
args = parser.parse_args()
config.DEBUG_DIR = config.DEBUG_DIR or os.path.join(os.path.dirname(os.path.abspath(__file__)), "debug_boxes")  # this tool exists to write them
scan_id = "try-" + uuid.uuid4().hex[:8]

if args.spot:
    with open(args.path, "rb") as f:
        frames = [ExtractedFrame(0, 0, 0, base64.b64encode(f.read()).decode("ascii"))]
    spots = [{"kind": k, "photo": 1, "detect": p, "target": "", "why": ""} for k, p in args.spot]
else:
    if args.path.lower().endswith((".jpg", ".jpeg", ".png")):  # a single photo goes to the AI as a one-photo scan
        with open(args.path, "rb") as f:
            frames = [ExtractedFrame(0, 0, 0, base64.b64encode(f.read()).decode("ascii"))]
    else:
        frames = extract_frames(args.path).frames
    analysis, frames = asyncio.run(analyze_frames(frames))
    spots = analysis["danger_spots"]
    print(f"AI sent {len(frames)} photos and asked for {len(spots)} danger spots")

located = locate_danger_spots(spots, frames, scan_id)
asked = {s["detect"] for s in spots}
for h in located:
    print(f'photo {h["photo"]} {h["kind"]:<12} {" + ".join(h["labels"])!r} -> {h["confidence"]:.2f} box {h["box"]}   ({h["why"]})')
for phrase in sorted(asked - {label for h in located for label in h["labels"]}):
    print(f"NOT FOUND (or merged away): {phrase!r}")
print(f"annotated photos: {config.DEBUG_DIR}/{scan_id}/")
