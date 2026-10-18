# ai_client.py — the single place where extracted frames are sent to the AI model
import json
import logging
import re

import httpx
from pydantic import ValidationError

from . import config
from .frame_extractor import ExtractedFrame
from .prompts import SYSTEM_PROMPT, build_user_content
from .schemas import FengShuiAnalysis, normalize


log = logging.getLogger("uvicorn.error")


class AIError(Exception):
    """Raised when the AI call fails. `status_code` is the HTTP status the API should return."""

    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def _endpoint() -> str:
    base = config.AI_BASE_URL.rstrip("/")
    return base if base.endswith("/chat/completions") else f"{base}/chat/completions"


def _evenly_spaced(frames: list[ExtractedFrame], limit: int) -> list[ExtractedFrame]:
    if len(frames) <= limit:
        return frames
    step = (len(frames) - 1) / (limit - 1) if limit > 1 else 0
    return [frames[round(i * step)] for i in range(limit)]


def _extract_json(text: str) -> dict:
    """Pull the JSON object out of the model's reply, tolerating code fences and stray text."""
    text = re.sub(r"```(?:json)?", "", text)
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise AIError("The AI reply did not contain JSON.")
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError as error:
        raise AIError(f"The AI reply was not valid JSON: {error}") from error


async def _post(client: httpx.AsyncClient, content: list[dict]) -> httpx.Response:
    return await client.post(
        _endpoint(),
        headers={"Authorization": f"Bearer {config.AI_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": config.AI_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content},
            ],
            "temperature": 0.3,
            "max_tokens": config.AI_MAX_TOKENS,
            "response_format": {"type": "json_object"},
            "reasoning": {"enabled": config.AI_REASONING},
        },
    )


def _read_reply(response: httpx.Response) -> dict:
    """Turn an AI response into the model's JSON object, raising AIError with a useful message otherwise."""
    if response.status_code == 400:
        raise AIError("The AI model rejected the photos. Use a vision-capable model (AI_MODEL).")
    if response.status_code in (401, 403):
        raise AIError("The AI service rejected the API key.", 502)
    if response.status_code == 429:
        raise AIError("The AI service is rate limiting requests. Try again in a moment.", 429)
    if response.status_code >= 400:
        log.warning("AI service returned %s: %s", response.status_code, response.text[:200])
        raise AIError(f"The AI service returned {response.status_code}.")

    try:
        choice = response.json()["choices"][0]
        reply = choice["message"].get("content")
    except (KeyError, IndexError, ValueError, AttributeError) as error:
        raise AIError("The AI service returned an unexpected response.") from error
    if not reply:
        # The model can spend the whole token budget and return no answer.
        hint = " Try raising AI_MAX_TOKENS." if choice.get("finish_reason") == "length" else ""
        raise AIError("The AI returned an empty answer." + hint)
    return _extract_json(reply)


def _validate(raw: dict, photo_count: int) -> dict:
    try:
        return normalize(FengShuiAnalysis.model_validate(raw), photo_count)
    except ValidationError as error:
        raise AIError(f"The AI reply was missing required fields: {error.errors()[0]['loc']}") from error


async def analyze_frames(frames: list[ExtractedFrame]) -> tuple[dict, list[ExtractedFrame]]:
    """Send the room photos to the AI. Returns the validated analysis and the photos it was actually shown, in order
    (the analysis's danger spots count photos from 1 in that list)."""
    if not config.AI_API_KEY:
        raise AIError("No AI key is set. Add AI_API_KEY (your OpenRouter key) to your .env file.", 503)
    if not frames:
        raise AIError("Nothing to analyze.", 422)

    sent = _evenly_spaced(frames, config.AI_MAX_IMAGES)
    try:
        async with httpx.AsyncClient(timeout=config.AI_TIMEOUT_SEC) as client:
            reply = _read_reply(await _post(client, build_user_content(sent)))
    except httpx.TimeoutException as error:
        raise AIError("The AI took too long to respond.", 504) from error
    except httpx.HTTPError as error:
        raise AIError(f"Could not reach the AI service: {error}") from error
    return _validate(reply, len(sent)), sent
