"""Tests for eval/metrics/reference_free.py"""

import pytest
from eval.generator import Message
from eval.metrics.reference_free import (
    compute_conversation_balance,
    compute_format_violations,
    compute_lexical_diversity,
    compute_persona_distinctiveness,
    compute_turn_length_compliance,
)


def make_message(role: str, content: str) -> Message:
    return Message(persona_id="test", role=role, content=content, timestamp="2026-01-01")


# ---------------------------------------------------------------------------
# Turn length compliance
# ---------------------------------------------------------------------------

def test_compliance_all_in_range():
    # 100-word content (approximately)
    content = " ".join(["word"] * 100)
    messages = [make_message("Host", content), make_message("Guest", content)]
    result = compute_turn_length_compliance(messages)
    assert result["compliance_rate"] == 1.0
    assert result["in_range"] == 2
    assert result["too_short"] == 0
    assert result["too_long"] == 0


def test_compliance_too_short():
    short = " ".join(["word"] * 50)
    messages = [make_message("Host", short)]
    result = compute_turn_length_compliance(messages)
    assert result["compliance_rate"] == 0.0
    assert result["too_short"] == 1


def test_compliance_too_long():
    long_text = " ".join(["word"] * 200)
    messages = [make_message("Host", long_text)]
    result = compute_turn_length_compliance(messages)
    assert result["compliance_rate"] == 0.0
    assert result["too_long"] == 1


def test_compliance_mixed():
    short = " ".join(["word"] * 50)
    ok = " ".join(["word"] * 110)
    long_text = " ".join(["word"] * 200)
    messages = [
        make_message("A", short),
        make_message("B", ok),
        make_message("C", long_text),
    ]
    result = compute_turn_length_compliance(messages)
    assert result["in_range"] == 1
    assert result["too_short"] == 1
    assert result["too_long"] == 1
    assert abs(result["compliance_rate"] - 1/3) < 0.01


def test_compliance_empty():
    result = compute_turn_length_compliance([])
    assert result["compliance_rate"] == 0.0


# ---------------------------------------------------------------------------
# Lexical diversity
# ---------------------------------------------------------------------------

def test_ttr_unique_words():
    # 10 unique words = TTR of 1.0
    messages = [make_message("Host", "the cat sat on a big red hot dry mat")]
    result = compute_lexical_diversity(messages)
    assert result["overall_ttr"] == 1.0


def test_ttr_repeated_words():
    # Highly repetitive = low TTR
    messages = [make_message("Host", "word word word word word word word word word word")]
    result = compute_lexical_diversity(messages)
    assert result["overall_ttr"] < 0.2


def test_ttr_per_persona():
    messages = [
        make_message("Alice", "apple banana cherry date elderberry fig"),
        make_message("Bob", "apple apple apple apple apple apple"),
    ]
    result = compute_lexical_diversity(messages)
    assert result["per_persona"]["Alice"]["ttr"] == 1.0
    assert result["per_persona"]["Bob"]["ttr"] < 0.3


# ---------------------------------------------------------------------------
# Persona distinctiveness
# ---------------------------------------------------------------------------

def test_distinctiveness_very_different():
    # Completely non-overlapping content words
    messages = [
        make_message("Alice", " ".join(["alpha"] * 50 + ["omega"] * 50)),
        make_message("Bob", " ".join(["beta"] * 50 + ["gamma"] * 50)),
    ]
    result = compute_persona_distinctiveness(messages)
    # No shared words = Jaccard of 0
    assert result["mean_pairwise_overlap"] == 0.0


def test_distinctiveness_identical():
    content = " ".join(["machine"] * 100)
    messages = [make_message("Alice", content), make_message("Bob", content)]
    result = compute_persona_distinctiveness(messages)
    # Same vocabulary = high overlap
    assert result["mean_pairwise_overlap"] > 0.8


# ---------------------------------------------------------------------------
# Conversation balance
# ---------------------------------------------------------------------------

def test_balance_equal():
    content = " ".join(["word"] * 100)
    messages = [
        make_message("Alice", content),
        make_message("Bob", content),
        make_message("Alice", content),
        make_message("Bob", content),
    ]
    result = compute_conversation_balance(messages)
    assert result["std_dev"] == 0.0
    assert result["gini_coefficient"] < 0.05


def test_balance_unequal():
    short = " ".join(["word"] * 20)
    long_text = " ".join(["word"] * 200)
    messages = [
        make_message("Alice", long_text),
        make_message("Bob", short),
    ]
    result = compute_conversation_balance(messages)
    assert result["std_dev"] > 0.0
    assert result["gini_coefficient"] > 0.1


# ---------------------------------------------------------------------------
# Format violations
# ---------------------------------------------------------------------------

def test_no_violations():
    messages = [make_message("Host", "This is a clean plain text response without any issues.")]
    result = compute_format_violations(messages)
    assert result["total_violations"] == 0
    assert result["clean_turn_rate"] == 1.0


def test_detects_bold_markdown():
    messages = [make_message("Host", "This is **very important** and you should know it.")]
    result = compute_format_violations(messages)
    assert result["per_type"]["markdown_bold"] >= 1
    assert result["total_violations"] >= 1


def test_detects_citation_markers():
    messages = [make_message("Host", "According to research [1] and studies [2] this is true.")]
    result = compute_format_violations(messages)
    assert result["per_type"]["citation_markers"] == 2


def test_detects_headings():
    messages = [make_message("Host", "## Introduction\nThis is the intro.")]
    result = compute_format_violations(messages)
    assert result["per_type"]["headings"] >= 1


def test_clean_turn_rate_mixed():
    clean = make_message("Alice", "This is perfectly clean text.")
    dirty = make_message("Bob", "This has **bold** text [1].")
    result = compute_format_violations([clean, dirty])
    assert result["clean_turn_rate"] == 0.5
