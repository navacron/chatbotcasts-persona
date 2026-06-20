"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, CheckCircle2, CalendarDays, Wallet, ListChecks, HelpCircle, ChevronDown, ChevronRight } from "lucide-react"
import type { Verdicts, VerdictCard } from "@/lib/verdict-schemas"

function confidenceColor(confidence?: string): string {
  const c = (confidence || "").toLowerCase()
  if (c.startsWith("high")) return "bg-green-500/15 text-green-700 dark:text-green-400"
  if (c.startsWith("med")) return "bg-amber-500/15 text-amber-700 dark:text-amber-400"
  if (c.startsWith("low")) return "bg-rose-500/15 text-rose-700 dark:text-rose-400"
  return "bg-muted text-muted-foreground"
}

function amountToNumber(amount: unknown): number {
  if (typeof amount === "number") return amount
  const m = String(amount ?? "").match(/-?\d[\d,]*(?:\.\d+)?/)
  return m ? parseFloat(m[0].replace(/,/g, "")) : 0
}

function asArray<T = Record<string, unknown>>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

function titleize(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ----------------------------- Rollup renderers ---------------------------- */

function TripPlanRollup({ rollup }: { rollup: Record<string, unknown> }) {
  const budgetRaw = asArray<{ label?: string; amount?: unknown }>(rollup.budget_breakdown)
  const total = budgetRaw.reduce((sum, r) => sum + amountToNumber(r.amount), 0)
  // Hide a meaningless all-zero budget table (e.g. when the title gives no budget figure)
  const budget = total > 0 ? budgetRaw : []
  // Only show a summed Total when the rows are actually summable: single currency,
  // no per-day/per-night rates, no ranges. Otherwise the rows stand on their own.
  const amountStrs = budget.map((r) => String(r.amount ?? "").toLowerCase())
  const hasRates = amountStrs.some((a) => /per |\/(day|night|person)|x\s*\d|-\s*\d|–/.test(a))
  const currencies = new Set(
    amountStrs.map((a) => (a.match(/usd|yen|eur|gbp|jpy|\$|€|£|¥/) || [""])[0]).filter(Boolean),
  )
  const showTotal = total > 0 && !hasRates && currencies.size <= 1
  const dayPlan = asArray<{ days?: string; what?: string }>(rollup.day_plan)
  const bookNow = asArray<{ item?: string; when?: string }>(rollup.book_now)

  return (
    <div className="space-y-6">
      {typeof rollup.bottom_line === "string" && (
        <p className="text-lg leading-relaxed font-medium">{rollup.bottom_line}</p>
      )}

      {budget.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Wallet className="h-4 w-4" /> Budget
          </h4>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {budget.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-2">{row.label}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{String(row.amount ?? "")}</td>
                  </tr>
                ))}
                {showTotal && (
                  <tr className="bg-muted/40 font-semibold">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2 text-right tabular-nums">{total.toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dayPlan.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
            <CalendarDays className="h-4 w-4" /> Day plan
          </h4>
          <ul className="space-y-1.5">
            {dayPlan.map((row, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{row.days}:</span> {row.what}
              </li>
            ))}
          </ul>
        </div>
      )}

      {bookNow.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
            <ListChecks className="h-4 w-4" /> Book now
          </h4>
          <ul className="space-y-1.5">
            {bookNow.map((row, i) => (
              <li key={i} className="text-sm flex gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span>
                  {row.item} {row.when && <em className="text-muted-foreground">— {row.when}</em>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ComparisonRollup({ rollup }: { rollup: Record<string, unknown> }) {
  const items = asArray<string>(rollup.items).map(String)
  const criteria = asArray<string>(rollup.criteria).map(String)
  const cells = asArray<{ item?: string; criterion?: string; value?: unknown }>(rollup.cells)
  const grid = new Map<string, string>()
  cells.forEach((c) => grid.set(`${c.item}|||${c.criterion}`, String(c.value ?? "")))
  const prosCons = asArray<{ item?: string; pros?: unknown; cons?: unknown }>(rollup.pros_cons)
  const pick = rollup.overall_pick as { item?: string; why?: string } | string | undefined
  const bestFor = asArray<{ use_case?: string; item?: string }>(rollup.best_for_map)

  return (
    <div className="space-y-6">
      {items.length > 0 && criteria.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-3 py-2 text-left"></th>
                {criteria.map((cr) => (
                  <th key={cr} className="px-3 py-2 text-left font-semibold">{cr}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it} className="border-t">
                  <td className="px-3 py-2 font-medium">{it}</td>
                  {criteria.map((cr) => (
                    <td key={cr} className="px-3 py-2">{grid.get(`${it}|||${cr}`) || "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {prosCons.map((pc, i) => (
        <div key={i}>
          <h4 className="text-sm font-semibold mb-1">{pc.item}</h4>
          <p className="text-sm"><span className="text-green-600 font-medium">Pros:</span> {asArray<string>(pc.pros).join("; ") || String(pc.pros ?? "")}</p>
          <p className="text-sm"><span className="text-rose-600 font-medium">Cons:</span> {asArray<string>(pc.cons).join("; ") || String(pc.cons ?? "")}</p>
        </div>
      ))}

      {pick && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <h4 className="text-sm font-semibold mb-1">Overall pick</h4>
          <p className="text-sm">
            {typeof pick === "string" ? pick : `${pick.item ?? ""}${pick.why ? ` — ${pick.why}` : ""}`}
          </p>
        </div>
      )}

      {bestFor.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Best for</h4>
          <ul className="space-y-1.5">
            {bestFor.map((row, i) => (
              <li key={i} className="text-sm">{row.use_case} → <span className="font-medium">{row.item}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function KeyPointsRollup({ rollup }: { rollup: Record<string, unknown> }) {
  const takeaways = asArray<string>(rollup.key_takeaways).map(String)
  const open = asArray<string>(rollup.open_questions).map(String)
  return (
    <div className="space-y-6">
      {typeof rollup.bottom_line === "string" && (
        <p className="text-lg leading-relaxed font-medium">{rollup.bottom_line}</p>
      )}
      {takeaways.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
            <ListChecks className="h-4 w-4" /> Key takeaways
          </h4>
          <ul className="space-y-1.5">
            {takeaways.map((t, i) => (
              <li key={i} className="text-sm flex gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open.length > 0 && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
            <HelpCircle className="h-4 w-4" /> Open questions
          </h4>
          <ul className="space-y-1.5">
            {open.map((q, i) => (
              <li key={i} className="text-sm text-muted-foreground">{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Rollup({ verdicts }: { verdicts: Verdicts }) {
  const rollup = verdicts.rollup || {}
  switch (verdicts.rollupType) {
    case "trip-plan":
      return <TripPlanRollup rollup={rollup} />
    case "comparison":
      return <ComparisonRollup rollup={rollup} />
    default:
      return <KeyPointsRollup rollup={rollup} />
  }
}

/* --------------------------- Per-subtopic cards ---------------------------- */

const HIDDEN_CARD_KEYS = new Set([
  "subtopic",
  "question",
  "the_call",
  "why",
  "confidence",
  "dissent",
  "quote",
  "speaker",
])

function VerdictCardView({ card }: { card: VerdictCard }) {
  const [open, setOpen] = useState(false)
  const extras = Object.keys(card).filter((k) => !HIDDEN_CARD_KEYS.has(k))

  const hasWhy = !!card.why
  const hasQuote = !!(card.quote && String(card.quote).trim())
  const hasDissent = !!(card.dissent && String(card.dissent).toLowerCase() !== "none")
  const hasDetail = hasWhy || hasQuote || hasDissent || extras.length > 0

  return (
    <Card className="p-4 bg-muted/30 border-0 shadow-none">
      {card.subtopic && (
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{card.subtopic}</div>
      )}
      {card.question && <p className="text-sm text-muted-foreground mb-2">{card.question}</p>}

      {/* The call: large visual anchor */}
      {card.the_call && (
        <div className="flex items-start justify-between gap-3">
          <p className="text-lg font-semibold leading-snug">{card.the_call}</p>
          {card.confidence && (
            <Badge className={`shrink-0 ${confidenceColor(card.confidence)}`} variant="secondary">
              {String(card.confidence)}
            </Badge>
          )}
        </div>
      )}

      {hasDetail && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            aria-expanded={open}
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {open ? "Hide reasoning" : "Show reasoning"}
          </button>

          {open && (
            <div className="mt-3 space-y-1">
              {hasWhy && <p className="text-sm"><span className="font-medium">Why:</span> {card.why}</p>}
              {hasQuote && (
                <blockquote className="border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">
                  “{String(card.quote).replace(/^["“”]+|["“”]+$/g, "")}”
                  {card.speaker && String(card.speaker).trim() && (
                    <span className="not-italic font-medium"> — {card.speaker}</span>
                  )}
                </blockquote>
              )}
              {hasDissent && (
                <p className="text-sm text-muted-foreground"><span className="font-medium">Dissent:</span> {card.dissent}</p>
              )}
              {extras.map((k) => (
                <p key={k} className="text-sm"><span className="font-medium">{titleize(k)}:</span> {String(card[k])}</p>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  )
}

/* -------------------------------- Panel ----------------------------------- */

export default function InsightsPanel({ verdicts }: { verdicts: Verdicts }) {
  const cards = Array.isArray(verdicts.perSubtopic) ? verdicts.perSubtopic : []
  const heading = verdicts.rollupType === "comparison" ? "Buying guide" : verdicts.rollupType === "trip-plan" ? "The plan" : "Key takeaways"

  return (
    <div className="space-y-6">
      <Card className="p-6 border-primary/20 bg-primary/[0.03]">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Lightbulb className="h-5 w-5 text-primary" /> {heading}
        </h3>
        <Rollup verdicts={verdicts} />
      </Card>

      {cards.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">Verdict by topic</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((card, i) => (
              <VerdictCardView key={i} card={card} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
