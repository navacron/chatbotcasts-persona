"""
llm_judge.py — Uses Claude as a judge to score conversation quality.
Runs num_runs times and averages scores to reduce stochasticity.
Also includes subtopic compliance scoring (compute_subtopic_compliance).
"""

import json
import statistics
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from eval.generator import Message, Persona

JUDGE_DIMENSIONS = {
    "naturalness": (
        "Does this sound like a real, spontaneous spoken podcast conversation? "
        "(1=robotic/unnatural, 10=completely natural spoken dialogue)"
    ),
    "persona_fidelity": (
        "Does each speaker's voice, vocabulary, and perspective match their described persona? "
        "(1=generic/interchangeable, 10=unmistakably in character)"
    ),
    "information_density": (
        "Are new insights, facts, or perspectives introduced in each turn, or is it repetitive filler? "
        "(1=highly repetitive, 10=every turn advances understanding)"
    ),
    "topic_coverage": (
        "Does the conversation substantively address all the planned subtopics? "
        "(1=barely touches the plan, 10=covers every subtopic with depth)"
    ),
}

JUDGE_SYSTEM = (
    "You are an expert podcast quality evaluator. "
    "Score the provided podcast transcript on each dimension using a 1-10 integer scale. "
    "Return your response as a JSON object only — no explanation, no markdown, no text outside the JSON."
)


def _format_transcript(messages: list) -> str:
    return "\n\n".join(f"{msg.role}: {msg.content}" for msg in messages)


def _format_personas(personas: list) -> str:
    return "\n".join(f"- {p.name}: {p.prompt[:200]}..." for p in personas)


def _format_plan(plan: dict) -> str:
    return "\n".join(plan.get("plan", []))


def build_judge_prompt(messages: list, personas: list, plan: dict) -> str:
    """
    Assembles the full transcript, persona descriptions, and plan subtopics
    into a structured prompt for Claude to score.
    """
    dimensions_str = "\n".join(
        f'"{key}": {desc}' for key, desc in JUDGE_DIMENSIONS.items()
    )

    return f"""You are evaluating a podcast conversation transcript.

PERSONAS:
{_format_personas(personas)}

PLANNED SUBTOPICS:
{_format_plan(plan)}

TRANSCRIPT:
{_format_transcript(messages)}

Score the transcript on these dimensions (1-10 integer each):
{dimensions_str}

Return ONLY a JSON object like:
{{"naturalness": 7, "persona_fidelity": 6, "information_density": 8, "topic_coverage": 7}}"""


def _parse_scores(response_text: str) -> dict[str, int]:
    """Extracts JSON scores from model response."""
    # Strip any markdown code fences if present
    text = response_text.strip()
    if text.startswith("```"):
        text = "\n".join(text.split("\n")[1:-1])
    return json.loads(text)


def run_llm_judge(
    messages: list,
    personas: list,
    plan: dict,
    anthropic_api_key: str,
    model: str = "claude-haiku-4-5-20251001",
    num_runs: int = 3,
) -> dict:
    """
    Calls Claude num_runs times and averages scores across runs.
    Returns {scores: {dimension: mean_score}, raw_runs, model_used}.
    """
    import anthropic

    client = anthropic.Anthropic(api_key=anthropic_api_key)
    prompt = build_judge_prompt(messages, personas, plan)

    raw_runs = []
    for i in range(num_runs):
        response = client.messages.create(
            model=model,
            max_tokens=256,
            system=JUDGE_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,  # Low temperature for consistent scoring
        )
        text = response.content[0].text
        scores = _parse_scores(text)
        raw_runs.append(scores)

    # Average scores across runs
    averaged = {}
    for dim in JUDGE_DIMENSIONS:
        values = [run[dim] for run in raw_runs if dim in run]
        averaged[dim] = round(statistics.mean(values), 2) if values else None

    return {
        "scores": averaged,
        "raw_runs": raw_runs,
        "model_used": model,
        "num_runs": num_runs,
    }


# ---------------------------------------------------------------------------
# Subtopic compliance scoring
# ---------------------------------------------------------------------------

COMPLIANCE_SYSTEM = (
    "You are evaluating whether a podcast speaker's response addresses an assigned subtopic. "
    "Return only a JSON object — no explanation, no markdown, no text outside the JSON."
)


def compute_subtopic_compliance(
    messages: list,
    anthropic_api_key: str,
    model: str = "claude-haiku-4-5",
) -> dict:
    """
    For each message that has a subtopic assigned, asks Claude to score
    how well the response addresses that subtopic (1–10).

    Uses a single batched API call with all turns to avoid per-turn overhead.
    Uses claude-haiku for cost efficiency (this is a simple classification task).

    Returns:
        {
            mean_score: float,           # average across all scored turns
            compliance_rate: float,      # fraction of turns scoring >= 7
            per_turn: [
                {
                    persona_name: str,
                    subtopic: str,
                    score: int,
                    content_preview: str,
                }
            ],
            turns_without_subtopic: int, # turns skipped (no subtopic assigned)
            model_used: str,
        }
    """
    import anthropic

    # Only score turns that have a subtopic assigned
    scored_turns = [
        (i, msg) for i, msg in enumerate(messages)
        if getattr(msg, "subtopic", None)
    ]

    if not scored_turns:
        return {
            "mean_score": None,
            "compliance_rate": None,
            "per_turn": [],
            "turns_without_subtopic": len(messages),
            "model_used": model,
        }

    # Build a single batched prompt with all turns
    turns_block = "\n\n".join(
        f"Turn {idx + 1} | Speaker: {msg.role} | Subtopic: {msg.subtopic}\n{msg.content}"
        for idx, (i, msg) in enumerate(scored_turns)
    )

    n = len(scored_turns)
    example_json = "{" + ", ".join(f'"turn_{i+1}": 7' for i in range(min(3, n))) + ("}" if n <= 3 else ', ...}')

    prompt = f"""You are evaluating whether each speaker's response in a podcast addresses its assigned subtopic.

Score each turn from 1 to 10:
1-3 = Off-topic or ignores the subtopic entirely
4-6 = Tangentially related but does not directly address the subtopic
7-8 = Clearly addresses the subtopic with relevant content
9-10 = Directly and substantively engages with the subtopic in depth

TURNS TO SCORE:
{turns_block}

Return ONLY a JSON object mapping turn numbers to integer scores, like:
{example_json}

Keys must be "turn_1", "turn_2", ... "turn_{n}".
"""

    client = anthropic.Anthropic(api_key=anthropic_api_key)
    response = client.messages.create(
        model=model,
        max_tokens=512,
        system=COMPLIANCE_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = "\n".join(raw.split("\n")[1:-1])
    scores_map: dict[str, int] = json.loads(raw)

    per_turn = []
    score_values = []
    for idx, (i, msg) in enumerate(scored_turns):
        key = f"turn_{idx + 1}"
        score = scores_map.get(key)
        if score is not None:
            score_values.append(score)
        per_turn.append({
            "turn_index": i,
            "persona_name": msg.role,
            "subtopic": msg.subtopic,
            "score": score,
            "content_preview": msg.content[:120] + "..." if len(msg.content) > 120 else msg.content,
        })

    mean_score = round(statistics.mean(score_values), 2) if score_values else None
    compliance_rate = (
        sum(1 for s in score_values if s >= 7) / len(score_values)
        if score_values else None
    )

    return {
        "mean_score": mean_score,
        "compliance_rate": compliance_rate,
        "per_turn": per_turn,
        "turns_without_subtopic": len(messages) - len(scored_turns),
        "model_used": model,
    }
