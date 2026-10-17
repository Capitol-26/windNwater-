# ai_client.py — the single place where extracted frames are sent to an AI model
from .frame_extractor import ExtractedFrame


async def analyze_frames(frames: list[ExtractedFrame]) -> dict:
    """Send the extracted room frames to the AI and return its analysis as a dict."""
    # ------------------------------------------------------------------
    # AI CALL GOES HERE.
    #
    # Each frame has:
    #   frame.jpeg_base64   JPEG image, base64-encoded, at most 768px wide
    #   frame.timestamp_sec when in the video the frame was taken
    #
    # Example shape (use your own provider, model and API key):
    #
    #   async with httpx.AsyncClient(timeout=120) as client:
    #       response = await client.post(
    #           AI_API_URL,
    #           headers={"Authorization": f"Bearer {AI_API_KEY}"},
    #           json={
    #               "model": AI_MODEL,
    #               "messages": [{
    #                   "role": "user",
    #                   "content": [
    #                       {"type": "text", "text": PROMPT},
    #                       *[
    #                           {"type": "image_url",
    #                            "image_url": {"url": f"data:image/jpeg;base64,{f.jpeg_base64}"}}
    #                           for f in frames
    #                       ],
    #                   ],
    #               }],
    #           },
    #       )
    #       return response.json()
    # ------------------------------------------------------------------
    return {"status": "not_implemented", "frames_received": len(frames)}
