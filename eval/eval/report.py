"""
report.py — Terminal reporting using rich for formatted, color-coded output.
"""

from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich import box

console = Console()

# Metrics with their display names, units, and improvement direction
METRIC_META = {
    "bertscore_f1": ("BERTScore F1", "", True),
    "bertscore_precision": ("BERTScore Precision", "", True),
    "bertscore_recall": ("BERTScore Recall", "", True),
    "embedding_similarity": ("Embedding Similarity", "", True),
    "topic_coverage_ratio": ("Topic Coverage", "%", True),
    "entity_overlap_ratio": ("Entity Overlap", "%", True),
    "compliance_rate": ("Turn Length Compliance", "%", True),
    "mean_words": ("Mean Words/Turn", "words", None),
    "overall_ttr": ("Lexical Diversity (TTR)", "", True),
    "persona_distinctiveness": ("Persona Distinctiveness", "overlap", False),
    "balance_gini": ("Conversation Balance (Gini)", "", False),
    "format_violations_total": ("Format Violations", "count", False),
    "clean_turn_rate": ("Clean Turn Rate", "%", True),
    "naturalness": ("Naturalness (Judge)", "/10", True),
    "persona_fidelity": ("Persona Fidelity (Judge)", "/10", True),
    "information_density": ("Info Density (Judge)", "/10", True),
    "topic_coverage_judge": ("Topic Coverage (Judge)", "/10", True),
}

SECTION_GROUPS = {
    "Reference-Based Metrics": [
        "bertscore_f1", "bertscore_precision", "bertscore_recall",
        "embedding_similarity", "topic_coverage_ratio", "entity_overlap_ratio",
    ],
    "Reference-Free Metrics": [
        "compliance_rate", "mean_words", "overall_ttr",
        "persona_distinctiveness", "balance_gini",
        "format_violations_total", "clean_turn_rate",
    ],
    "LLM Judge Scores": [
        "naturalness", "persona_fidelity", "information_density", "topic_coverage_judge",
    ],
}


def _fmt_val(val: Optional[float], unit: str) -> str:
    if val is None:
        return "[dim]N/A[/dim]"
    if unit == "%":
        return f"{val:.1%}"
    if unit == "/10":
        return f"{val:.1f}/10"
    if unit == "count":
        return str(int(val))
    return f"{val:.4f}"


def print_run_summary(result: dict) -> None:
    """Prints a structured terminal report for a single eval run."""
    version = result.get("prompt_version", "?")
    plan_id = result.get("plan_id", "?")
    title = result.get("title", "")
    personas = result.get("personas_used", [])
    run_id = result.get("run_id", "")

    console.print(Panel(
        f"[bold cyan]Prompt Version:[/bold cyan] {version}\n"
        f"[bold cyan]Plan:[/bold cyan] {plan_id} — {title}\n"
        f"[bold cyan]Personas:[/bold cyan] {', '.join(personas)}\n"
        f"[bold cyan]Run ID:[/bold cyan] {run_id}",
        title="[bold white]Eval Run Summary[/bold white]",
        border_style="cyan",
    ))

    m = result.get("metrics", {})
    rb = m.get("reference_based", {}) or {}
    rf = m.get("reference_free", {}) or {}
    judge = m.get("llm_judge", {}) or {}
    judge_scores = judge.get("scores", {}) if isinstance(judge, dict) else {}

    all_values = {
        "bertscore_f1": rb.get("bertscore_f1"),
        "bertscore_precision": rb.get("bertscore_precision"),
        "bertscore_recall": rb.get("bertscore_recall"),
        "embedding_similarity": rb.get("embedding_cosine_similarity"),
        "topic_coverage_ratio": rb.get("topic_coverage_ratio"),
        "entity_overlap_ratio": rb.get("named_entity_overlap_ratio"),
        "compliance_rate": rf.get("turn_length", {}).get("compliance_rate") if rf.get("turn_length") else None,
        "mean_words": rf.get("turn_length", {}).get("mean_words") if rf.get("turn_length") else None,
        "overall_ttr": rf.get("lexical_diversity", {}).get("overall_ttr") if rf.get("lexical_diversity") else None,
        "persona_distinctiveness": rf.get("persona_distinctiveness", {}).get("mean_pairwise_overlap") if rf.get("persona_distinctiveness") else None,
        "balance_gini": rf.get("conversation_balance", {}).get("gini_coefficient") if rf.get("conversation_balance") else None,
        "format_violations_total": rf.get("format_violations", {}).get("total_violations") if rf.get("format_violations") else None,
        "clean_turn_rate": rf.get("format_violations", {}).get("clean_turn_rate") if rf.get("format_violations") else None,
        "naturalness": judge_scores.get("naturalness"),
        "persona_fidelity": judge_scores.get("persona_fidelity"),
        "information_density": judge_scores.get("information_density"),
        "topic_coverage_judge": judge_scores.get("topic_coverage"),
    }

    for section, keys in SECTION_GROUPS.items():
        table = Table(title=section, box=box.SIMPLE, show_header=True, header_style="bold magenta")
        table.add_column("Metric", style="white", width=32)
        table.add_column("Value", justify="right", width=16)

        for key in keys:
            display_name, unit, _ = METRIC_META[key]
            val = all_values.get(key)
            formatted = _fmt_val(val, unit)
            table.add_row(display_name, formatted)

        console.print(table)

    # Per-turn word count distribution
    turn_data = rf.get("turn_length", {})
    if turn_data and turn_data.get("per_turn"):
        _print_word_count_histogram(turn_data["per_turn"])

    # Format violations detail
    fmt = rf.get("format_violations", {})
    if fmt and fmt.get("total_violations", 0) > 0:
        console.print(f"\n[yellow]Format Violations Detail:[/yellow] {fmt['per_type']}")


def _print_word_count_histogram(per_turn: list[dict]) -> None:
    """Prints a simple ASCII histogram of turn word counts."""
    counts = [t["word_count"] for t in per_turn]
    if not counts:
        return
    buckets = {"<70": 0, "70-89": 0, "90-130 ✓": 0, "131-160": 0, ">160": 0}
    for c in counts:
        if c < 70:
            buckets["<70"] += 1
        elif c < 90:
            buckets["70-89"] += 1
        elif c <= 130:
            buckets["90-130 ✓"] += 1
        elif c <= 160:
            buckets["131-160"] += 1
        else:
            buckets[">160"] += 1

    console.print("\n[bold]Turn Word Count Distribution[/bold]")
    max_count = max(buckets.values()) or 1
    for label, count in buckets.items():
        bar = "█" * int(count / max_count * 20)
        color = "green" if "✓" in label else "yellow" if count > 0 else "dim"
        console.print(f"  [{color}]{label:12}[/{color}] {bar} {count}")


def print_comparison(comparison: dict) -> None:
    """Prints an A/B comparison with color-coded deltas."""
    ver_a = comparison.get("run_a_version", "A")
    ver_b = comparison.get("run_b_version", "B")
    plan_id = comparison.get("plan_id", "")
    summary = comparison.get("summary", {})

    console.print(Panel(
        f"Comparing [bold yellow]{ver_a}[/bold yellow] (baseline) vs [bold green]{ver_b}[/bold green] (candidate)\n"
        f"Plan: {plan_id}",
        title="[bold white]A/B Comparison[/bold white]",
        border_style="yellow",
    ))

    table = Table(box=box.SIMPLE, show_header=True, header_style="bold")
    table.add_column("Metric", width=32)
    table.add_column(ver_a, justify="right", width=12)
    table.add_column(ver_b, justify="right", width=12)
    table.add_column("Delta", justify="right", width=12)
    table.add_column("", width=4)

    for key, data in sorted(comparison.get("metric_deltas", {}).items()):
        if key not in METRIC_META:
            continue
        display_name, unit, _ = METRIC_META[key]
        a = data.get("a")
        b = data.get("b")
        delta = data.get("delta")
        improved = data.get("improved")

        a_str = _fmt_val(a, unit)
        b_str = _fmt_val(b, unit)

        if delta is None:
            delta_str = "N/A"
            arrow = ""
        else:
            delta_str = f"{delta:+.4f}"
            if improved is True:
                arrow = "[green]▲[/green]"
            elif improved is False:
                arrow = "[red]▼[/red]"
            else:
                arrow = "[yellow]→[/yellow]"

        table.add_row(display_name, a_str, b_str, delta_str, arrow)

    console.print(table)

    imp = summary.get("improved_count", 0)
    deg = summary.get("degraded_count", 0)
    neu = summary.get("neutral_count", 0)
    console.print(
        f"\n[green]Improved: {imp}[/green]  "
        f"[red]Degraded: {deg}[/red]  "
        f"[yellow]Neutral: {neu}[/yellow]"
    )


def print_history_trend(history: list[dict], metric: str) -> None:
    """Prints ASCII sparkline of a metric over time across versions."""
    if not history:
        console.print("[dim]No history records found.[/dim]")
        return

    values = [(r.get("prompt_version", "?"), r.get(metric)) for r in history]
    valid = [(v, m) for v, m in values if m is not None]

    if not valid:
        console.print(f"[dim]No data for metric: {metric}[/dim]")
        return

    display_name = METRIC_META.get(metric, (metric, "", True))[0]
    console.print(f"\n[bold]Trend: {display_name}[/bold]")

    min_val = min(m for _, m in valid)
    max_val = max(m for _, m in valid)
    range_val = max_val - min_val or 1.0
    height = 5

    # Build ASCII sparkline
    bars = []
    for ver, val in valid:
        normalized = (val - min_val) / range_val
        bar_height = max(1, int(normalized * height))
        bars.append((ver, val, bar_height))

    for row in range(height, 0, -1):
        line = ""
        for _, _, bar_h in bars:
            line += "█  " if bar_h >= row else "   "
        console.print(f"  {line}")

    label_line = "  ".join(f"{ver[:4]}" for ver, _, _ in bars)
    console.print(f"  {label_line}")
    val_line = "  ".join(f"{val:.3f}"[:4] for _, val, _ in bars)
    console.print(f"  {val_line}")
