"""
compare.py — A/B comparison between two eval run results.
"""

from pathlib import Path
from typing import Optional

from eval.storage import load_history

# Metric improvement direction: True = higher is better, False = lower is better
METRIC_DIRECTIONS: dict[str, bool] = {
    "bertscore_f1": True,
    "bertscore_precision": True,
    "bertscore_recall": True,
    "embedding_similarity": True,
    "topic_coverage_ratio": True,
    "entity_overlap_ratio": True,
    "compliance_rate": True,
    "overall_ttr": True,
    "clean_turn_rate": True,
    "naturalness": True,
    "persona_fidelity": True,
    "information_density": True,
    "topic_coverage_judge": True,
    # Lower is better:
    "mean_words": False,        # not strictly, but closer to target (110) is better — treated as neutral
    "persona_distinctiveness": False,   # lower overlap = more distinct
    "balance_gini": False,
    "format_violations_total": False,
    # Subtopic compliance
    "subtopic_compliance_mean": True,
    "subtopic_compliance_rate": True,
}

# Neutral tolerance — deltas smaller than this are considered "neutral"
NEUTRAL_THRESHOLD = 0.01

# Composite score weights (must sum to 1.0)
COMPOSITE_WEIGHTS = {
    "naturalness": 0.20,
    "persona_fidelity": 0.20,
    "information_density": 0.15,
    "topic_coverage_judge": 0.10,
    "bertscore_f1": 0.15,
    "embedding_similarity": 0.10,
    "compliance_rate": 0.10,
}


def _get_scalar_metrics(result: dict) -> dict[str, Optional[float]]:
    """Extracts all scalar metrics from a full result dict."""
    m = result.get("metrics", {})
    rb = m.get("reference_based") or {}
    rf = m.get("reference_free") or {}
    judge = m.get("llm_judge") or {}
    judge_scores = judge.get("scores", {}) if isinstance(judge, dict) else {}

    return {
        "bertscore_f1": rb.get("bertscore_f1"),
        "bertscore_precision": rb.get("bertscore_precision"),
        "bertscore_recall": rb.get("bertscore_recall"),
        "embedding_similarity": rb.get("embedding_cosine_similarity"),
        "topic_coverage_ratio": rb.get("topic_coverage_ratio"),
        "entity_overlap_ratio": rb.get("named_entity_overlap_ratio"),
        "compliance_rate": rf.get("turn_length", {}).get("compliance_rate"),
        "mean_words": rf.get("turn_length", {}).get("mean_words"),
        "overall_ttr": rf.get("lexical_diversity", {}).get("overall_ttr"),
        "persona_distinctiveness": rf.get("persona_distinctiveness", {}).get("mean_pairwise_overlap"),
        "balance_gini": rf.get("conversation_balance", {}).get("gini_coefficient"),
        "format_violations_total": rf.get("format_violations", {}).get("total_violations"),
        "clean_turn_rate": rf.get("format_violations", {}).get("clean_turn_rate"),
        "naturalness": judge_scores.get("naturalness"),
        "persona_fidelity": judge_scores.get("persona_fidelity"),
        "information_density": judge_scores.get("information_density"),
        "topic_coverage_judge": judge_scores.get("topic_coverage"),
    }


def compare_runs(run_a: dict, run_b: dict) -> dict:
    """
    Computes metric deltas between run_a (baseline) and run_b (candidate).
    delta = run_b_value - run_a_value
    improved = delta is in the "better" direction for that metric.
    """
    metrics_a = _get_scalar_metrics(run_a)
    metrics_b = _get_scalar_metrics(run_b)

    deltas = {}
    improved_count = 0
    degraded_count = 0
    neutral_count = 0

    all_metrics = set(metrics_a.keys()) | set(metrics_b.keys())
    for metric in sorted(all_metrics):
        a = metrics_a.get(metric)
        b = metrics_b.get(metric)

        if a is None or b is None:
            deltas[metric] = {"a": a, "b": b, "delta": None, "improved": None}
            neutral_count += 1
            continue

        delta = b - a
        higher_is_better = METRIC_DIRECTIONS.get(metric, True)

        if abs(delta) < NEUTRAL_THRESHOLD:
            improved = None  # neutral
            neutral_count += 1
        elif higher_is_better:
            improved = delta > 0
            if improved:
                improved_count += 1
            else:
                degraded_count += 1
        else:
            improved = delta < 0
            if improved:
                improved_count += 1
            else:
                degraded_count += 1

        deltas[metric] = {"a": a, "b": b, "delta": delta, "improved": improved}

    return {
        "run_a_version": run_a.get("prompt_version"),
        "run_b_version": run_b.get("prompt_version"),
        "plan_id": run_a.get("plan_id"),
        "metric_deltas": deltas,
        "summary": {
            "improved_count": improved_count,
            "degraded_count": degraded_count,
            "neutral_count": neutral_count,
        },
    }


def compute_composite_score(result: dict) -> Optional[float]:
    """
    Computes a weighted composite score from the most important metrics.
    Returns None if any required metric is missing.
    """
    metrics = _get_scalar_metrics(result)
    total_weight = 0.0
    total_score = 0.0

    for metric, weight in COMPOSITE_WEIGHTS.items():
        val = metrics.get(metric)
        if val is None:
            continue
        # Normalize all metrics to [0, 1] scale (judge scores are 1–10, divide by 10)
        if metric in ("naturalness", "persona_fidelity", "information_density", "topic_coverage_judge"):
            val = val / 10.0
        total_score += val * weight
        total_weight += weight

    if total_weight == 0:
        return None
    return total_score / total_weight


def find_best_prompt_version(
    plan_id: str,
    history_path: Optional[Path] = None,
) -> Optional[dict]:
    """
    Reads history.jsonl, filters to plan_id, finds version with highest composite score.
    Returns the history record for the best version.
    """
    records = load_history(history_path=history_path, plan_id=plan_id)
    if not records:
        return None

    best = None
    best_score = -1.0
    for rec in records:
        # Build a minimal result dict compatible with compute_composite_score
        fake_result = {
            "metrics": {
                "reference_based": {
                    "bertscore_f1": rec.get("bertscore_f1"),
                    "embedding_cosine_similarity": rec.get("embedding_similarity"),
                },
                "reference_free": {
                    "turn_length": {"compliance_rate": rec.get("compliance_rate")},
                },
                "llm_judge": {
                    "scores": {
                        "naturalness": rec.get("naturalness"),
                        "persona_fidelity": rec.get("persona_fidelity"),
                        "information_density": rec.get("information_density"),
                        "topic_coverage": rec.get("topic_coverage_judge"),
                    },
                },
            }
        }
        score = compute_composite_score(fake_result)
        if score is not None and score > best_score:
            best_score = score
            best = {**rec, "composite_score": round(score, 4)}

    return best
