#!/usr/bin/env python3
"""
run_eval.py — CLI entry point for the ChatbotCasts prompt evaluation framework.

Usage:
  # Run a single eval
  python run_eval.py --plan ai-regulation-2025 --prompt v1

  # Run with LLM judge scoring
  python run_eval.py --plan ai-regulation-2025 --prompt v1 --judge

  # Compare two prompt versions
  python run_eval.py --compare v1 v2 --plan ai-regulation-2025

  # Show longitudinal trend for a metric
  python run_eval.py --history --plan ai-regulation-2025 --metric naturalness

  # Run all plans
  python run_eval.py --plan all --prompt v2

  # Quick test with fewer turns (override turns_per_subtopic)
  python run_eval.py --plan ai-regulation-2025 --prompt v1 --turns 1
"""

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from rich.console import Console

# Load .env from the eval/ directory
load_dotenv(Path(__file__).parent / ".env")

console = Console()

RESULTS_DIR = Path(__file__).parent / "results"
TRANSCRIPTS_DIR = RESULTS_DIR / "transcripts"


def get_api_key(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        console.print(f"[red]Missing env var: {name}. Set it in eval/.env[/red]")
        sys.exit(1)
    return val


def run_single_eval(plan_id: str, prompt_version: str, args: argparse.Namespace) -> dict:
    """Runs a full evaluation for one plan + prompt version combination."""
    from eval.runner import (
        generate_full_conversation,
        load_all_plans,
        load_personas,
        load_prompt_config,
        load_test_plan,
    )
    from eval.metrics.reference_free import (
        compute_conversation_balance,
        compute_format_violations,
        compute_lexical_diversity,
        compute_persona_distinctiveness,
        compute_turn_length_compliance,
    )
    from eval.storage import append_to_history, save_run

    perplexity_key = get_api_key("PERPLEXITY_API_KEY")
    personas_dict = load_personas()
    config = load_prompt_config(prompt_version)
    plan = load_test_plan(plan_id)

    console.print(f"\n[bold cyan]Generating conversation:[/bold cyan] {plan['title']}")
    console.print(f"  Prompt: [yellow]{prompt_version}[/yellow] | Personas: {len(plan['persona_ids'])} | Subtopics: {len(plan['plan'])}")

    messages = generate_full_conversation(
        plan=plan,
        personas_dict=personas_dict,
        config=config,
        api_key=perplexity_key,
        turns_override=args.turns,
    )

    console.print(f"  [green]Generated {len(messages)} turns[/green]")

    # Reference-free metrics (always run)
    rf_metrics = {
        "turn_length": compute_turn_length_compliance(messages),
        "lexical_diversity": compute_lexical_diversity(messages),
        "persona_distinctiveness": compute_persona_distinctiveness(messages),
        "conversation_balance": compute_conversation_balance(messages),
        "format_violations": compute_format_violations(messages),
    }

    # Reference-based metrics (only if YouTube URL provided)
    rb_metrics = {}
    reference_url = plan.get("reference_youtube_url")
    if reference_url and not args.no_reference:
        console.print("\n[cyan]Computing reference-based metrics...[/cyan]")
        try:
            rb_metrics = _run_reference_metrics(messages, reference_url, args)
        except Exception as e:
            console.print(f"[yellow]Reference metrics skipped: {e}[/yellow]")

    # LLM judge (optional)
    judge_metrics = {}
    if args.judge:
        console.print("\n[cyan]Running LLM judge...[/cyan]")
        try:
            judge_metrics = _run_llm_judge(messages, personas_dict, plan, args)
        except Exception as e:
            console.print(f"[yellow]LLM judge skipped: {e}[/yellow]")

    # Subtopic compliance (runs whenever --judge is set, uses Haiku for cost efficiency)
    compliance_metrics = {}
    if args.judge:
        console.print("\n[cyan]Running subtopic compliance scoring...[/cyan]")
        try:
            compliance_metrics = _run_subtopic_compliance(messages, args)
            rate = compliance_metrics.get("compliance_rate")
            mean = compliance_metrics.get("mean_score")
            console.print(f"  Mean score: {mean}/10 | Compliance rate (≥7): {rate:.0%}" if rate is not None else "  Done")
        except Exception as e:
            console.print(f"[yellow]Subtopic compliance skipped: {e}[/yellow]")

    # Build result
    persona_ids = [pid for pid in plan["persona_ids"] if pid != "human" and pid in personas_dict]
    run_id = f"{datetime.now(timezone.utc).isoformat()}_{prompt_version}_{plan_id}"

    result = {
        "run_id": run_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "prompt_version": prompt_version,
        "plan_id": plan_id,
        "title": plan["title"],
        "personas_used": [personas_dict[pid].name for pid in persona_ids],
        "messages": messages,
        "metrics": {
            "reference_based": rb_metrics or None,
            "reference_free": rf_metrics,
            "llm_judge": judge_metrics or None,
            "subtopic_compliance": compliance_metrics or None,
        },
        "generation_metadata": {
            "model": config.model,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "total_turns": len(messages),
        },
    }

    path = save_run(result)
    append_to_history(result)
    console.print(f"\n[green]Saved:[/green] {path}")

    return result


def _run_reference_metrics(messages: list, reference_url: str, args: argparse.Namespace) -> dict:
    from eval.transcript import fetch_transcript, normalize_transcript
    from eval.metrics.reference_based import (
        compute_bertscore,
        compute_embedding_similarity,
        compute_named_entity_overlap,
        compute_topic_coverage,
    )

    TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    raw_segments = fetch_transcript(reference_url, TRANSCRIPTS_DIR)
    reference_text = normalize_transcript(raw_segments)
    generated_text = " ".join(msg.content for msg in messages).lower()

    rb = {}

    try:
        bertscore = compute_bertscore(generated_text, reference_text)
        rb["bertscore_f1"] = bertscore["f1"]
        rb["bertscore_precision"] = bertscore["precision"]
        rb["bertscore_recall"] = bertscore["recall"]
        console.print("  [green]BERTScore done[/green]")
    except Exception as e:
        console.print(f"  [yellow]BERTScore skipped: {e}[/yellow]")

    try:
        topic = compute_topic_coverage(generated_text, reference_text)
        rb["topic_coverage_ratio"] = topic["coverage_ratio"]
        console.print("  [green]Topic coverage done[/green]")
    except Exception as e:
        console.print(f"  [yellow]Topic coverage skipped: {e}[/yellow]")

    try:
        entity_overlap = compute_named_entity_overlap(generated_text, reference_text)
        rb["named_entity_overlap_ratio"] = entity_overlap["overlap_ratio"]
        console.print("  [green]Entity overlap done[/green]")
    except Exception as e:
        console.print(f"  [yellow]Entity overlap skipped: {e}[/yellow]")

    if not args.no_embeddings:
        openai_key = os.environ.get("OPENAI_API_KEY")
        if openai_key:
            try:
                # Truncate to ~6000 words to stay within OpenAI's 8192 token limit
                gen_trunc = " ".join(generated_text.split()[:6000])
                ref_trunc = " ".join(reference_text.split()[:6000])
                sim = compute_embedding_similarity(gen_trunc, ref_trunc, openai_key)
                rb["embedding_cosine_similarity"] = sim
                console.print("  [green]Embedding similarity done[/green]")
            except Exception as e:
                console.print(f"  [yellow]Embedding similarity skipped: {e}[/yellow]")
        else:
            console.print("[yellow]OPENAI_API_KEY not set — skipping embedding similarity[/yellow]")

    return rb


def _run_llm_judge(messages: list, personas_dict: dict, plan: dict, args: argparse.Namespace) -> dict:
    from eval.metrics.llm_judge import run_llm_judge

    anthropic_key = get_api_key("ANTHROPIC_API_KEY")
    persona_ids = [pid for pid in plan["persona_ids"] if pid != "human" and pid in personas_dict]
    personas = [personas_dict[pid] for pid in persona_ids]

    return run_llm_judge(
        messages=messages,
        personas=personas,
        plan=plan,
        anthropic_api_key=anthropic_key,
        num_runs=args.judge_runs,
    )


def _run_subtopic_compliance(messages: list, args: argparse.Namespace) -> dict:
    from eval.metrics.llm_judge import compute_subtopic_compliance

    anthropic_key = get_api_key("ANTHROPIC_API_KEY")
    return compute_subtopic_compliance(
        messages=messages,
        anthropic_api_key=anthropic_key,
    )


def cmd_run(args: argparse.Namespace) -> None:
    from eval.runner import load_all_plans
    from eval.report import print_run_summary

    plan_ids = [args.plan]
    if args.plan == "all":
        all_plans = load_all_plans()
        plan_ids = [p["id"] for p in all_plans]

    for plan_id in plan_ids:
        result = run_single_eval(plan_id, args.prompt, args)
        print_run_summary(result)


def cmd_compare(args: argparse.Namespace) -> None:
    from eval.storage import load_history
    from eval.compare import compare_runs
    from eval.report import print_comparison
    import json
    from pathlib import Path

    runs_dir = RESULTS_DIR / "runs"

    def find_latest_run(version: str, plan_id: str) -> dict:
        matches = sorted(
            runs_dir.glob(f"*_{version}_{plan_id}.json"),
            reverse=True,
        )
        if not matches:
            console.print(f"[red]No run found for version={version} plan={plan_id}[/red]")
            sys.exit(1)
        with open(matches[0]) as f:
            return json.load(f)

    ver_a, ver_b = args.compare
    run_a = find_latest_run(ver_a, args.plan)
    run_b = find_latest_run(ver_b, args.plan)
    comparison = compare_runs(run_a, run_b)
    print_comparison(comparison)


def cmd_history(args: argparse.Namespace) -> None:
    from eval.storage import load_history
    from eval.report import print_history_trend
    from eval.compare import find_best_prompt_version

    history = load_history(plan_id=args.plan if args.plan != "all" else None)
    metric = getattr(args, "metric", "naturalness") or "naturalness"
    print_history_trend(history, metric)

    best = find_best_prompt_version(args.plan)
    if best:
        console.print(f"\n[bold green]Best version:[/bold green] {best.get('prompt_version')} "
                      f"(composite score: {best.get('composite_score', 'N/A')})")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="ChatbotCasts Prompt Evaluation Framework",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    subparsers = parser.add_subparsers(dest="command")

    # ---- run command ----
    run_parser = parser.add_argument_group("Run")
    parser.add_argument("--plan", default=None, help="Plan ID or 'all'")
    parser.add_argument("--prompt", default=None, help="Prompt version (e.g., v1, v2)")
    parser.add_argument("--turns", type=int, default=None, help="Override turns_per_subtopic")
    parser.add_argument("--judge", action="store_true", help="Run LLM-as-judge scoring")
    parser.add_argument("--judge-runs", type=int, default=3, help="Number of judge runs (default: 3)")
    parser.add_argument("--no-reference", action="store_true", help="Skip reference-based metrics")
    parser.add_argument("--no-embeddings", action="store_true", help="Skip OpenAI embedding similarity")

    # ---- compare command ----
    parser.add_argument("--compare", nargs=2, metavar=("VERSION_A", "VERSION_B"),
                        help="Compare two prompt versions: --compare v1 v2 --plan <plan_id>")

    # ---- history command ----
    parser.add_argument("--history", action="store_true", help="Show metric trend history")
    parser.add_argument("--metric", default="naturalness",
                        help="Metric to plot in history trend (default: naturalness)")

    args = parser.parse_args()

    if args.compare:
        if not args.plan:
            console.print("[red]--compare requires --plan[/red]")
            sys.exit(1)
        cmd_compare(args)
    elif args.history:
        if not args.plan:
            console.print("[red]--history requires --plan[/red]")
            sys.exit(1)
        cmd_history(args)
    elif args.plan and args.prompt:
        cmd_run(args)
    else:
        parser.print_help()
        console.print("\n[yellow]Examples:[/yellow]")
        console.print("  python run_eval.py --plan ai-regulation-2025 --prompt v1")
        console.print("  python run_eval.py --plan ai-regulation-2025 --prompt v1 --judge")
        console.print("  python run_eval.py --compare v1 v2 --plan ai-regulation-2025")
        console.print("  python run_eval.py --history --plan ai-regulation-2025 --metric naturalness")


if __name__ == "__main__":
    main()
