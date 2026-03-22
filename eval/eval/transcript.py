"""
transcript.py — YouTube transcript fetching and normalization.
Uses youtube-transcript-api. Caches results as JSON.
"""

import json
import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse

FILLER_WORDS = re.compile(
    r'\b(um|uh|you know|like|sort of|kind of|right|okay|so|well|actually|basically|literally)\b',
    flags=re.IGNORECASE,
)
SPEAKER_LABEL = re.compile(
    r'^([A-Z][A-Z\s\-]+:|\[[^\]]+\]:)\s*',
    flags=re.MULTILINE,
)


def extract_video_id(youtube_url: str) -> str:
    """Parses video ID from standard YouTube URL formats."""
    parsed = urlparse(youtube_url)
    if parsed.hostname in ("youtu.be",):
        return parsed.path.lstrip("/")
    if parsed.hostname in ("www.youtube.com", "youtube.com"):
        qs = parse_qs(parsed.query)
        if "v" in qs:
            return qs["v"][0]
    raise ValueError(f"Cannot extract video ID from URL: {youtube_url}")


def fetch_transcript(youtube_url: str, cache_dir: Path) -> list[dict]:
    """
    Fetches raw transcript segments from YouTube using youtube-transcript-api.
    Caches result as JSON in cache_dir/{video_id}.json.
    Returns list of {text, start, duration} dicts.
    """
    from youtube_transcript_api import YouTubeTranscriptApi

    video_id = extract_video_id(youtube_url)
    cache_file = cache_dir / f"{video_id}.json"

    if cache_file.exists():
        with open(cache_file) as f:
            return json.load(f)

    fetched = YouTubeTranscriptApi().fetch(video_id)
    transcript = [{"text": s.text, "start": s.start, "duration": s.duration} for s in fetched]

    cache_dir.mkdir(parents=True, exist_ok=True)
    with open(cache_file, "w") as f:
        json.dump(transcript, f, indent=2)

    return transcript


def normalize_transcript(raw_segments: list[dict]) -> str:
    """
    Cleans a raw YouTube transcript for comparison metrics.
    Steps:
    1. Join all segment texts
    2. Remove speaker label patterns (SPEAKER 1: or [Host]:)
    3. Strip common filler words
    4. Normalize whitespace
    5. Lowercase
    Returns a single cleaned plain-text string.
    """
    text = " ".join(seg["text"] for seg in raw_segments)

    # Remove speaker labels
    text = SPEAKER_LABEL.sub("", text)

    # Strip filler words
    text = FILLER_WORDS.sub("", text)

    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    text = text.strip().lower()

    return text


def split_by_speaker(raw_segments: list[dict]) -> list[dict]:
    """
    Attempts to split transcript into speaker turns.
    Most YouTube auto-transcripts don't have speaker labels, so this returns
    the full transcript as a single block in that case.
    Returns list of {speaker: str, text: str}.
    """
    full_text = " ".join(seg["text"] for seg in raw_segments)

    # Detect if speaker labels exist (e.g., "ANDREW NG: ..." or "[Host]: ...")
    has_labels = bool(re.search(
        r'^([A-Z][A-Z\s\-]+:|\[[^\]]+\]:)\s*',
        full_text,
        flags=re.MULTILINE,
    ))

    if not has_labels:
        return [{"speaker": "unknown", "text": full_text}]

    # Split on speaker label boundaries
    parts = re.split(r'(?=(?:[A-Z][A-Z\s\-]+:|\[[^\]]+\]:)\s*)', full_text)
    turns = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        m = re.match(r'^([A-Z][A-Z\s\-]+|\[[^\]]+\]):\s*(.*)', part, re.DOTALL)
        if m:
            turns.append({"speaker": m.group(1).strip(), "text": m.group(2).strip()})
        else:
            turns.append({"speaker": "unknown", "text": part})

    return turns
