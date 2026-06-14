"""
verdict_usefulness.py — scores a rendered verdict artifact (NOT the transcript)
on how useful it is to someone actually trying to make the decision.

Reuses the anthropic JSON-judge pattern from llm_judge.py. The point is to put a
number on "did the verdict layer turn the conversation into something actionable?"
— separate from how good the conversation itself was.
"""

import json
import statistics
from typing import Optional

USEFULNESS_DIMENSIONS = {
    "decision_readiness": (
        "Could the target person act on this artifact without doing more research? "
        "(1=still just vibes, 10=a clear plan/recommendation they can execute)"
    ),
    "grounding": (
        "Are the specifics and numbers concrete and internally consistent "
        "(e.g. does a budget actually sum, are picks justified)? "
        "(1=vague or contradictory, 10=concrete and consistent)"
    ),
    "non_redundancy": (
        "Does each section add something new, or do cards/sections repeat each other? "
        "(1=heavily repetitive, 10=every section earns its place)"
    ),
}

USEFULNESS_SYSTEM = (
    "You evaluate decision-support artifacts. Score each dimension on a 1-10 integer "
    "scale from the point of view of the person who needs to make the decision. "
    "Return only a JSON object — no markdown, no text outside the JSON."
)


def build_usefulness_prompt(title: str, artifact_markdown: str) -> str:
    dims = "\n".join(f'"{k}": {desc}' for k, desc in USEFULNESS_DIMENSIONS.items())
    keys = ", ".join(f'"{k}": 7' for k in USEFULNESS_DIMENSIONS)
    return f"""A podcast about "{title}" was distilled into the decision artifact below.
Judge the ARTIFACT (not a transcript) for someone trying to make this decision.

ARTIFACT:
{artifact_markdown}

Score 1-10 (integer) on each dimension:
{dims}

Also give a one-sentence "rationale" naming the single biggest gap.

Return ONLY a JSON object like:
{{{keys}, "rationale": "..."}}"""


def _parse(text: str) -> dict:
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


def score_verdict_usefulness(
    title: str,
    artifact_markdown: str,
    anthropic_api_key: str,
    model: str = "claude-sonnet-4-6",
    num_runs: int = 1,
) -> dict:
    """Returns {scores: {dim: mean}, rationale, raw_runs, model_used}."""
    import anthropic

    client = anthropic.Anthropic(api_key=anthropic_api_key)
    prompt = build_usefulness_prompt(title, artifact_markdown)

    raw_runs = []
    for _ in range(num_runs):
        response = client.messages.create(
            model=model,
            max_tokens=300,
            system=USEFULNESS_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        raw_runs.append(_parse(response.content[0].text))

    averaged = {}
    for dim in USEFULNESS_DIMENSIONS:
        vals = [r[dim] for r in raw_runs if isinstance(r.get(dim), (int, float))]
        averaged[dim] = round(statistics.mean(vals), 2) if vals else None

    return {
        "scores": averaged,
        "rationale": raw_runs[-1].get("rationale") if raw_runs else None,
        "raw_runs": raw_runs,
        "model_used": model,
    }
