"""
storage.py — Saves/loads eval results. Maintains history.jsonl for longitudinal tracking.
"""

import json
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

RESULTS_DIR = Path(__file__).parent.parent / "results"


def _messages_to_dicts(messages: list) -> list[dict]:
    """Converts Message dataclasses to plain dicts for JSON serialization."""
    return [asdict(m) for m in messages]


def save_run(result: dict, runs_dir: Optional[Path] = None) -> Path:
    """
    Writes a full result dict to runs/{date}_{version}_{plan_id}.json.
    Returns the path written.
    """
    dir_ = runs_dir or RESULTS_DIR / "runs"
    dir_.mkdir(parents=True, exist_ok=True)

    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H%M%S")
    version = result.get("prompt_version", "unknown")
    plan_id = result.get("plan_id", "unknown")
    filename = f"{ts}_{version}_{plan_id}.json"
    path = dir_ / filename

    # Convert Message dataclasses if present
    serializable = {**result}
    if "messages" in serializable and serializable["messages"] and hasattr(serializable["messages"][0], "__dataclass_fields__"):
        serializable["messages"] = _messages_to_dicts(serializable["messages"])

    with open(path, "w") as f:
        json.dump(serializable, f, indent=2)

    return path


def load_run(path: Path) -> dict:
    """Loads a full result dict from a run JSON file."""
    with open(path) as f:
        return json.load(f)


def _make_summary(result: dict) -> dict:
    """
    Extracts scalar metrics from a full result for history.jsonl.
    Omits raw message text to keep the history file compact.
    """
    m = result.get("metrics", {}) or {}
    rb = m.get("reference_based") or {}
    rf = m.get("reference_free") or {}
    judge = m.get("llm_judge") or {}
    judge_scores = judge.get("scores", {}) if isinstance(judge, dict) else {}

    return {
        "timestamp": result.get("run_id", ""),
        "prompt_version": result.get("prompt_version", ""),
        "plan_id": result.get("plan_id", ""),
        # Reference-based
        "bertscore_f1": rb.get("bertscore_f1"),
        "bertscore_precision": rb.get("bertscore_precision"),
        "bertscore_recall": rb.get("bertscore_recall"),
        "embedding_similarity": rb.get("embedding_cosine_similarity"),
        "topic_coverage_ratio": rb.get("topic_coverage_ratio"),
        "entity_overlap_ratio": rb.get("named_entity_overlap_ratio"),
        # Reference-free
        "compliance_rate": rf.get("turn_length", {}).get("compliance_rate"),
        "mean_words": rf.get("turn_length", {}).get("mean_words"),
        "overall_ttr": rf.get("lexical_diversity", {}).get("overall_ttr"),
        "persona_distinctiveness": rf.get("persona_distinctiveness", {}).get("mean_pairwise_overlap"),
        "balance_gini": rf.get("conversation_balance", {}).get("gini_coefficient"),
        "format_violations_total": rf.get("format_violations", {}).get("total_violations"),
        "clean_turn_rate": rf.get("format_violations", {}).get("clean_turn_rate"),
        # LLM judge
        "naturalness": judge_scores.get("naturalness"),
        "persona_fidelity": judge_scores.get("persona_fidelity"),
        "information_density": judge_scores.get("information_density"),
        "topic_coverage_judge": judge_scores.get("topic_coverage"),
    }


def append_to_history(result: dict, history_path: Optional[Path] = None) -> None:
    """Appends a summary record (one line) to history.jsonl."""
    path = history_path or RESULTS_DIR / "history.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    summary = _make_summary(result)
    with open(path, "a") as f:
        f.write(json.dumps(summary) + "\n")


def load_history(
    history_path: Optional[Path] = None,
    plan_id: Optional[str] = None,
) -> list[dict]:
    """Reads history.jsonl, optionally filtering by plan_id."""
    path = history_path or RESULTS_DIR / "history.jsonl"
    if not path.exists():
        return []
    records = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                rec = json.loads(line)
                if plan_id is None or rec.get("plan_id") == plan_id:
                    records.append(rec)
    return records
