#!/bin/sh
# setup.sh — creates server/.venv with only the headless OpenCV.
# ultralytics (the YOLO-World detector) depends on the full opencv-python, which pulls in GUI libraries a server does
# not need and clashes with opencv-python-headless, so after installing we swap it back out.
set -e
cd "$(dirname "$0")"
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
pip uninstall -y opencv-python opencv-python-headless
pip install "opencv-python-headless>=4.10,<5"
