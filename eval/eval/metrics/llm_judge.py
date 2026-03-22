"""
llm_judge.py — Uses Claude as a judge to score conversation quality.
Runs num_runs times and averages scores to reduce stochasticity.
"""

import json
import statistics
from typing import TYPE_CHECKING

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
    model: str = "claude-opus-4-6",
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
