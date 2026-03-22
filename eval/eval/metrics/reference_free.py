"""
reference_free.py — Metrics that evaluate quality without a reference transcript.
All metrics take a list of Message objects.
"""

import re
from collections import Counter
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from eval.generator import Message

import numpy as np

# Common English stopwords (subset — NLTK stopwords list)
_STOPWORDS = {
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
    "yours", "he", "him", "his", "she", "her", "hers", "it", "its", "they",
    "them", "their", "theirs", "what", "which", "who", "whom", "this", "that",
    "these", "those", "am", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "shall", "should",
    "may", "might", "must", "can", "could", "a", "an", "the", "and", "but", "if",
    "or", "because", "as", "until", "while", "of", "at", "by", "for", "with",
    "about", "against", "between", "into", "through", "during", "before", "after",
    "above", "below", "to", "from", "up", "down", "in", "out", "on", "off",
    "over", "under", "again", "further", "then", "once", "here", "there", "when",
    "where", "why", "how", "all", "both", "each", "few", "more", "most", "other",
    "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than",
    "too", "very", "s", "t", "just", "don", "now", "d", "ll", "m", "o", "re",
    "ve", "y",
}

# Patterns for format violation detection
_MARKDOWN_BOLD = re.compile(r'\*\*\w+.*?\*\*|__\w+.*?__')
_BARE_ASTERISKS = re.compile(r'\*')
_CITATION_MARKERS = re.compile(r'\[\d+\]')
_HEADINGS = re.compile(r'^#{1,6}\s', re.MULTILINE)
_BULLET_LISTS = re.compile(r'^\s*[-*+]\s', re.MULTILINE)
_NUMBERED_LISTS = re.compile(r'^\d+\.\s', re.MULTILINE)


def _tokenize(text: str) -> list[str]:
    """Lowercase, strip punctuation, split on whitespace."""
    text = re.sub(r'[^\w\s]', '', text.lower())
    return text.split()


def _word_count(text: str) -> int:
    return len(text.split())


def compute_turn_length_compliance(messages: list) -> dict:
    """
    Checks what fraction of turns fall within the 90–130 word target.
    Returns compliance stats and per-turn breakdown.
    """
    target_min, target_max = 90, 130
    per_turn = []
    for msg in messages:
        wc = _word_count(msg.content)
        per_turn.append({
            "persona_name": msg.role,
            "word_count": wc,
            "compliant": target_min <= wc <= target_max,
        })

    counts = [t["word_count"] for t in per_turn]
    in_range = sum(1 for t in per_turn if t["compliant"])
    too_short = sum(1 for t in per_turn if t["word_count"] < target_min)
    too_long = sum(1 for t in per_turn if t["word_count"] > target_max)
    n = len(per_turn)

    return {
        "compliance_rate": in_range / n if n else 0.0,
        "mean_words": float(np.mean(counts)) if counts else 0.0,
        "std_words": float(np.std(counts)) if counts else 0.0,
        "too_short": too_short,
        "in_range": in_range,
        "too_long": too_long,
        "per_turn": per_turn,
    }


def compute_lexical_diversity(messages: list) -> dict:
    """
    Computes Type-Token Ratio (TTR) per persona and overall.
    TTR = unique_tokens / total_tokens. Higher = richer vocabulary.
    """
    # Group messages by persona
    by_persona: dict[str, list[str]] = {}
    all_tokens: list[str] = []

    for msg in messages:
        tokens = _tokenize(msg.content)
        all_tokens.extend(tokens)
        by_persona.setdefault(msg.role, []).extend(tokens)

    def ttr(tokens: list[str]) -> float:
        if not tokens:
            return 0.0
        return len(set(tokens)) / len(tokens)

    per_persona = {
        name: {
            "ttr": ttr(tokens),
            "unique": len(set(tokens)),
            "total": len(tokens),
        }
        for name, tokens in by_persona.items()
    }

    return {
        "overall_ttr": ttr(all_tokens),
        "per_persona": per_persona,
    }


def compute_persona_distinctiveness(messages: list, top_n: int = 200) -> dict:
    """
    Measures how different each persona's vocabulary is from others.
    Builds top-N content word sets per persona, computes pairwise Jaccard overlap.
    Lower mean overlap = more distinct voices.
    """
    by_persona: dict[str, Counter] = {}
    for msg in messages:
        tokens = [t for t in _tokenize(msg.content) if t not in _STOPWORDS and len(t) > 2]
        counter = by_persona.setdefault(msg.role, Counter())
        counter.update(tokens)

    # Build top-N word sets per persona
    vocab_sets: dict[str, set[str]] = {
        name: set(counter.most_common(top_n)[i][0] for i in range(min(top_n, len(counter))))
        for name, counter in by_persona.items()
    }

    personas = list(vocab_sets.keys())
    pair_scores = {}
    jaccard_values = []

    for i in range(len(personas)):
        for j in range(i + 1, len(personas)):
            a, b = personas[i], personas[j]
            intersection = len(vocab_sets[a] & vocab_sets[b])
            union = len(vocab_sets[a] | vocab_sets[b])
            score = intersection / union if union else 0.0
            pair_scores[f"{a} vs {b}"] = score
            jaccard_values.append(score)

    return {
        "mean_pairwise_overlap": float(np.mean(jaccard_values)) if jaccard_values else 0.0,
        "pairs": pair_scores,
    }


def compute_conversation_balance(messages: list) -> dict:
    """
    Measures how evenly distributed airtime is across personas.
    Low std dev and Gini coefficient = balanced conversation.
    """
    by_persona: dict[str, list[int]] = {}
    for msg in messages:
        by_persona.setdefault(msg.role, []).append(_word_count(msg.content))

    per_persona_mean = {
        name: float(np.mean(counts))
        for name, counts in by_persona.items()
    }

    means = list(per_persona_mean.values())
    if not means:
        return {"std_dev": 0.0, "per_persona_mean": {}, "gini_coefficient": 0.0}

    std_dev = float(np.std(means))

    # Gini coefficient
    sorted_means = np.sort(np.array(means))
    n = len(sorted_means)
    cumulative = np.cumsum(sorted_means)
    gini = (n + 1 - 2 * np.sum(cumulative) / cumulative[-1]) / n if cumulative[-1] > 0 else 0.0

    return {
        "std_dev": std_dev,
        "per_persona_mean": per_persona_mean,
        "gini_coefficient": float(gini),
    }


def compute_format_violations(messages: list) -> dict:
    """
    Counts residual markdown and citation artifacts in each message.
    Aim: zero violations, clean_turn_rate approaching 1.0.
    """
    per_turn = []
    totals = {
        "markdown_bold": 0,
        "asterisks": 0,
        "citation_markers": 0,
        "headings": 0,
        "bullet_lists": 0,
        "numbered_lists": 0,
    }

    for msg in messages:
        text = msg.content
        counts = {
            "markdown_bold": len(_MARKDOWN_BOLD.findall(text)),
            "asterisks": len(_BARE_ASTERISKS.findall(text)),
            "citation_markers": len(_CITATION_MARKERS.findall(text)),
            "headings": len(_HEADINGS.findall(text)),
            "bullet_lists": len(_BULLET_LISTS.findall(text)),
            "numbered_lists": len(_NUMBERED_LISTS.findall(text)),
        }
        turn_total = sum(counts.values())
        per_turn.append({
            "persona_name": msg.role,
            "violations": turn_total,
            "breakdown": counts,
        })
        for k, v in counts.items():
            totals[k] += v

    total_violations = sum(totals.values())
    n = len(per_turn)
    clean_turn_rate = sum(1 for t in per_turn if t["violations"] == 0) / n if n else 0.0

    return {
        "total_violations": total_violations,
        "per_type": totals,
        "per_turn": per_turn,
        "clean_turn_rate": clean_turn_rate,
    }
