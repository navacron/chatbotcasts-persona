#!/usr/bin/env python3
"""
render_verdicts.py — run the verdict synthesizer over a saved eval result and
print a human-readable artifact (the thing a real planner would actually read).

Usage:
    python render_verdicts.py results/runs/<run>.json --schema travel-decision
    python render_verdicts.py results/runs/<run>.json --schema product-review --usefulness

Writes <run>.verdicts.json (the data.verdicts payload) next to the input file.
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))
from eval.synthesizer import synthesize_verdicts  # noqa: E402

load_dotenv(Path(__file__).parent / ".env")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _persona_names(personas_used) -> list[str]:
    names = []
    for p in personas_used or []:
        if isinstance(p, dict):
            names.append(p.get("name") or p.get("role") or str(p.get("id", "")))
        else:
            names.append(str(p))
    return [n for n in names if n]


def _amount_to_number(amount) -> float:
    """Extract a numeric value from a budget amount like '$700' or '700 USD'."""
    if isinstance(amount, (int, float)):
        return float(amount)
    m = re.search(r"-?\d[\d,]*(?:\.\d+)?", str(amount))
    return float(m.group(0).replace(",", "")) if m else 0.0


def _h(s: str) -> str:
    return f"\n## {s}\n"


# ---------------------------------------------------------------------------
# Renderers
# ---------------------------------------------------------------------------

def render_cards(per_subtopic: list) -> str:
    out = [_h("Per-subtopic verdicts")]
    for i, card in enumerate(per_subtopic, 1):
        subtopic = card.get("subtopic", f"Subtopic {i}")
        out.append(f"\n### {subtopic}")
        for key, val in card.items():
            if key == "subtopic":
                continue
            label = key.replace("_", " ").title()
            out.append(f"- **{label}:** {val}")
    return "\n".join(out)


def render_trip_plan(rollup: dict) -> str:
    out = [_h("The plan (rollup)")]
    if rollup.get("bottom_line"):
        out.append(f"\n**Bottom line:** {rollup['bottom_line']}\n")

    budget = rollup.get("budget_breakdown") or []
    if budget:
        out.append("\n**Budget**\n")
        out.append("| Item | Amount |")
        out.append("|------|--------|")
        total = 0.0
        for row in budget:
            label = row.get("label", "")
            amount = row.get("amount", "")
            total += _amount_to_number(amount)
            out.append(f"| {label} | {amount} |")
        out.append(f"| **Total** | **{total:,.0f}** |")

    day_plan = rollup.get("day_plan") or []
    if day_plan:
        out.append("\n**Day plan**\n")
        for row in day_plan:
            out.append(f"- **{row.get('days', '')}:** {row.get('what', '')}")

    book_now = rollup.get("book_now") or []
    if book_now:
        out.append("\n**Book now**\n")
        for row in book_now:
            out.append(f"- {row.get('item', '')} — _{row.get('when', '')}_")
    return "\n".join(out)


def render_comparison(rollup: dict) -> str:
    out = [_h("Buying guide (rollup)")]
    items = rollup.get("items") or []
    criteria = rollup.get("criteria") or []
    cells = rollup.get("cells") or []

    if items and criteria:
        grid = {(c.get("item"), c.get("criterion")): c.get("value") for c in cells}
        out.append("\n**Comparison**\n")
        out.append("| | " + " | ".join(criteria) + " |")
        out.append("|" + "---|" * (len(criteria) + 1))
        for it in items:
            row = [str(grid.get((it, cr), "—")) for cr in criteria]
            out.append(f"| **{it}** | " + " | ".join(row) + " |")

    for pc in rollup.get("pros_cons") or []:
        out.append(f"\n**{pc.get('item', '')}**")
        pros = pc.get("pros") or []
        cons = pc.get("cons") or []
        out.append("- Pros: " + ("; ".join(pros) if isinstance(pros, list) else str(pros)))
        out.append("- Cons: " + ("; ".join(cons) if isinstance(cons, list) else str(cons)))

    pick = rollup.get("overall_pick")
    if isinstance(pick, dict):
        why = pick.get("why") or pick.get("reason") or ""
        out.append(f"\n**Overall pick:** {pick.get('item', '')} — {why}".rstrip(" —"))
    elif pick:
        out.append(f"\n**Overall pick:** {pick}")

    best = rollup.get("best_for_map") or []
    if best:
        out.append("\n**Best for**\n")
        for row in best:
            out.append(f"- {row.get('use_case', '')} → {row.get('item', '')}")
    return "\n".join(out)


def render_rollup(verdicts: dict) -> str:
    rollup = verdicts.get("rollup", {})
    rtype = verdicts.get("rollupType")
    if rtype == "trip-plan":
        return render_trip_plan(rollup)
    if rtype == "comparison":
        return render_comparison(rollup)
    return _h("Rollup") + "\n```json\n" + json.dumps(rollup, indent=2, ensure_ascii=False) + "\n```"


def render_artifact(title: str, verdicts: dict) -> str:
    parts = [f"# Verdict — {title}", f"_schema: {verdicts.get('schemaType')}_"]
    parts.append(render_cards(verdicts.get("perSubtopic", [])))
    parts.append(render_rollup(verdicts))
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Synthesize + render verdicts for a saved run.")
    ap.add_argument("result", type=Path, help="Path to a results/runs/*.json file")
    ap.add_argument("--schema", default="travel-decision", help="Schema key from verdict_schemas.yaml")
    ap.add_argument("--model", default="claude-sonnet-4-6")
    ap.add_argument("--usefulness", action="store_true", help="Also score the artifact for usefulness")
    args = ap.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("ANTHROPIC_API_KEY not set (expected in eval/.env)")

    data = json.loads(args.result.read_text())
    title = data.get("title", "")
    messages = data.get("messages", [])
    personas = _persona_names(data.get("personas_used"))

    print(f"Synthesizing verdicts for: {title}", file=sys.stderr)
    print(f"  {len(messages)} messages, schema={args.schema}, model={args.model}", file=sys.stderr)

    verdicts = synthesize_verdicts(
        messages=messages,
        title=title,
        schema_key=args.schema,
        anthropic_api_key=api_key,
        personas=personas,
        model=args.model,
    )

    out_path = args.result.with_suffix(".verdicts.json")
    out_path.write_text(json.dumps(verdicts, indent=2, ensure_ascii=False))
    print(f"  wrote {out_path}", file=sys.stderr)

    print(render_artifact(title, verdicts))

    if args.usefulness:
        from eval.metrics.verdict_usefulness import score_verdict_usefulness
        artifact_md = render_artifact(title, verdicts)
        scores = score_verdict_usefulness(title, artifact_md, api_key, model=args.model)
        print(_h("Usefulness scores"))
        for k, v in scores.get("scores", {}).items():
            print(f"- **{k}:** {v}")
        if scores.get("rationale"):
            print(f"\n_{scores['rationale']}_")


if __name__ == "__main__":
    main()
