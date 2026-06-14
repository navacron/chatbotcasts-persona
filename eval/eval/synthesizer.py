"""
synthesizer.py — schema-driven verdict synthesis.

Reads a finished conversation and emits a structured, skimmable artifact:
  - one verdict card per planned subtopic (the resolution of that slice), and
  - one whole-conversation rollup (trip-plan / comparison / etc.)

The engine is schema-agnostic. The schema (loaded from config/verdict_schemas.yaml)
decides which fields to populate and how. Mirrors the anthropic usage in
metrics/llm_judge.py so it reuses the same client + JSON-output convention.

The returned dict is the exact shape intended for `data.verdicts` in production
(Phase 2): {schemaType, perSubtopicType, rollupType, perSubtopic, rollup}.
"""

import json
from pathlib import Path
from typing import Optional

import yaml

CONFIG_DIR = Path(__file__).parent.parent / "config"

SYNTH_SYSTEM = (
    "You are a sharp editor turning a podcast debate into a decision the listener "
    "can actually act on. You extract concrete conclusions, never restate filler, "
    "and never invent facts the speakers did not say. "
    "Return only a JSON object — no prose, no markdown, no text outside the JSON."
)


# ---------------------------------------------------------------------------
# Schema loading
# ---------------------------------------------------------------------------

def load_verdict_schema(key: str, yaml_path: Optional[Path] = None) -> dict:
    """Returns a single schema dict ({per_subtopic, rollup, ...}) by key."""
    path = yaml_path or CONFIG_DIR / "verdict_schemas.yaml"
    with open(path) as f:
        data = yaml.safe_load(f)
    schemas = data["schemas"]
    if key not in schemas:
        raise ValueError(f"Unknown verdict schema '{key}'. Available: {list(schemas)}")
    return schemas[key]


# ---------------------------------------------------------------------------
# Message accessors (work on both result-JSON dicts and Message dataclasses)
# ---------------------------------------------------------------------------

def _field(msg, *names):
    for n in names:
        if isinstance(msg, dict):
            if msg.get(n) is not None:
                return msg[n]
        else:
            v = getattr(msg, n, None)
            if v is not None:
                return v
    return None


def _role(msg) -> str:
    return _field(msg, "role") or "Speaker"


def _content(msg) -> str:
    return _field(msg, "content") or ""


def _subtopic(msg):
    return _field(msg, "subtopic")


def _group_by_subtopic(messages: list) -> list[tuple[str, list]]:
    """Groups messages by their subtopic tag, preserving first-seen order."""
    order: list[str] = []
    bucket: dict[str, list] = {}
    for m in messages:
        st = _subtopic(m) or "(unassigned)"
        if st not in bucket:
            bucket[st] = []
            order.append(st)
        bucket[st].append(m)
    return [(st, bucket[st]) for st in order]


# ---------------------------------------------------------------------------
# Claude call + JSON parsing
# ---------------------------------------------------------------------------

def _parse_json(text: str) -> dict:
    """Tolerant JSON extraction: strips code fences and surrounding prose."""
    text = text.strip()
    if text.startswith("```"):
        text = "\n".join(text.split("\n")[1:-1]).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end > start:
            return json.loads(text[start:end + 1])
        raise


def _call_claude(client, model: str, prompt: str, max_tokens: int) -> str:
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=SYNTH_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
    )
    return response.content[0].text


def _call_claude_json(client, model: str, prompt: str, max_tokens: int) -> dict:
    """Calls Claude and parses JSON, with one repair retry on malformed output."""
    raw = _call_claude(client, model, prompt, max_tokens)
    try:
        return _parse_json(raw)
    except (json.JSONDecodeError, ValueError):
        repair = (
            "The following was supposed to be a single valid JSON object but is "
            "malformed (likely an unescaped quote or a missing comma). Return the "
            "corrected, valid JSON object only — same content, no other text:\n\n"
            f"{raw}"
        )
        fixed = _call_claude(client, model, repair, max_tokens)
        return _parse_json(fixed)


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------

def _subtopic_prompt(title: str, subtopic: str, msgs: list, per_schema: dict) -> str:
    transcript = "\n\n".join(f"{_role(m)}: {_content(m)}" for m in msgs)
    fields = per_schema["fields"]
    instruction = per_schema["instruction"].strip()
    example = "{" + ", ".join(f'"{f}": "..."' for f in fields) + "}"
    return f"""Podcast: {title}
Subtopic: {subtopic}

Exchange on this subtopic:
{transcript}

Task: {instruction}

Return ONLY a JSON object with exactly these keys: {fields}
Example shape: {example}"""


def _rollup_prompt(title: str, personas: list, cards: list, rollup_schema: dict) -> str:
    cards_json = json.dumps(cards, indent=2, ensure_ascii=False)
    persona_line = ", ".join(personas) if personas else "(unspecified)"
    fields = rollup_schema["fields"]
    instruction = rollup_schema["instruction"].strip()
    return f"""Podcast: {title}
Speakers: {persona_line}

Per-subtopic verdict cards already extracted from the conversation:
{cards_json}

Task: {instruction}

Return ONLY a JSON object with exactly these top-level keys: {fields}"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def synthesize_verdicts(
    messages: list,
    title: str,
    schema_key: str,
    anthropic_api_key: str,
    personas: Optional[list] = None,
    model: str = "claude-sonnet-4-6",
    schema: Optional[dict] = None,
    schema_yaml_path: Optional[Path] = None,
) -> dict:
    """
    Synthesizes per-subtopic verdict cards + a rollup from a finished conversation.

    Args:
        messages: list of result-JSON message dicts (or Message dataclasses) that
                  carry `role`, `content`, and `subtopic`.
        title: conversation title (gives the synthesizer the scenario, e.g. the budget).
        schema_key: key into config/verdict_schemas.yaml (e.g. "travel-decision").
        anthropic_api_key: Anthropic key (same one the judge uses).
        personas: optional list of speaker names for the rollup context.
        model: Claude model id.

    Returns:
        {schemaType, perSubtopicType, rollupType, perSubtopic: [...], rollup: {...}}
    """
    import anthropic

    schema = schema or load_verdict_schema(schema_key, schema_yaml_path)
    per_schema = schema["per_subtopic"]
    rollup_schema = schema["rollup"]

    client = anthropic.Anthropic(api_key=anthropic_api_key)

    per_subtopic: list[dict] = []
    for subtopic, msgs in _group_by_subtopic(messages):
        card = _call_claude_json(
            client, model, _subtopic_prompt(title, subtopic, msgs, per_schema),
            max_tokens=500,
        )
        card["subtopic"] = subtopic
        per_subtopic.append(card)

    rollup = _call_claude_json(
        client, model, _rollup_prompt(title, personas or [], per_subtopic, rollup_schema),
        max_tokens=3000,
    )

    return {
        "schemaType": schema_key,
        "perSubtopicType": per_schema["type"],
        "rollupType": rollup_schema["type"],
        "perSubtopic": per_subtopic,
        "rollup": rollup,
    }
