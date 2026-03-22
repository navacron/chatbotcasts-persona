"""Tests for eval/generator.py — prompt builder and post-processing."""

import pytest
from eval.generator import (
    Message,
    Persona,
    PromptConfig,
    build_conversation_context,
    build_system_prompt,
    build_user_prompt,
    remove_citations,
    strip_markdown,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def persona():
    return Persona(
        id="a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        name="Andrew Ng",
        prompt="You are Andrew Ng, renowned AI researcher.",
    )


@pytest.fixture
def v1_config():
    return PromptConfig(
        version="v1",
        model="sonar",
        temperature=0.8,
        max_tokens=500,
        system_template="You are {persona_name}. And your role is: {persona_prompt}",
        guidelines="Respond naturally as if speaking in a thoughtful podcast.\nResponse length: Aim for 90–130 words.",
        formatting="Plain text only.\nNEVER use markdown formatting.",
        output_instruction="Output your answer as {persona_name} would respond. You will be discussing the topic of <topic>{title}</topic>.",
    )


@pytest.fixture
def messages():
    return [
        Message(persona_id="a1b2c3d4", role="Andrew Ng", content="AI is transforming industries.", timestamp="2026-01-01"),
        Message(persona_id="b2c3d4e5", role="Elon Musk", content="First principles matter most.", timestamp="2026-01-01"),
    ]


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

def test_build_system_prompt(persona, v1_config):
    result = build_system_prompt(persona, v1_config)
    assert result == "You are Andrew Ng. And your role is: You are Andrew Ng, renowned AI researcher."


# ---------------------------------------------------------------------------
# Conversation context
# ---------------------------------------------------------------------------

def test_build_conversation_context(messages):
    result = build_conversation_context(messages)
    assert "Andrew Ng: AI is transforming industries." in result
    assert "Elon Musk: First principles matter most." in result
    assert "\n\n" in result


def test_build_conversation_context_empty():
    assert build_conversation_context([]) == ""


# ---------------------------------------------------------------------------
# User prompt
# ---------------------------------------------------------------------------

def test_build_user_prompt_contains_guidelines(persona, v1_config):
    result = build_user_prompt(persona, v1_config, "AI Ethics", [])
    assert "Respond naturally" in result
    assert "Plain text only" in result
    assert "Andrew Ng" in result
    assert "<topic>AI Ethics</topic>" in result


def test_build_user_prompt_with_subtopic(persona, v1_config):
    result = build_user_prompt(persona, v1_config, "AI Ethics", [], focused_subtopic="1. Introduction")
    assert "Currently discussing: 1. Introduction" in result


def test_build_user_prompt_no_history_when_empty(persona, v1_config):
    result = build_user_prompt(persona, v1_config, "AI Ethics", [])
    assert "Here is the conversation so far" not in result


def test_build_user_prompt_includes_history(persona, v1_config, messages):
    result = build_user_prompt(persona, v1_config, "AI Ethics", messages)
    assert "Here is the conversation so far" in result
    assert "Andrew Ng:" in result


def test_build_user_prompt_novelty_rule():
    config = PromptConfig(
        version="v2",
        model="sonar",
        temperature=0.8,
        max_tokens=500,
        system_template="You are {persona_name}. And your role is: {persona_prompt}",
        guidelines="Respond naturally.",
        formatting="Plain text only.",
        output_instruction="Output your answer as {persona_name}. Topic: <topic>{title}</topic>.",
        novelty_rule="Each response must introduce at least one new idea.",
    )
    persona = Persona(id="1", name="Host", prompt="You are the host.")
    result = build_user_prompt(persona, config, "Test", [])
    assert "Novelty rule" in result
    assert "new idea" in result


# ---------------------------------------------------------------------------
# strip_markdown
# ---------------------------------------------------------------------------

def test_strip_markdown_bold():
    assert strip_markdown("This is **bold** text") == "This is bold text"


def test_strip_markdown_italic():
    assert strip_markdown("This is *italic* text") == "This is italic text"


def test_strip_markdown_heading():
    assert strip_markdown("## Section Header\nSome text") == "Section Header\nSome text"


def test_strip_markdown_link():
    assert strip_markdown("Visit [OpenAI](https://openai.com) for more") == "Visit OpenAI for more"


def test_strip_markdown_bare_asterisks():
    assert strip_markdown("Some text ** with bare") == "Some text  with bare"


def test_strip_markdown_keeps_citation_markers():
    # Citation markers [1] should NOT be stripped by strip_markdown — only by remove_citations
    result = strip_markdown("This is true [1] according to sources.")
    assert "[1]" in result


def test_strip_markdown_clean_text_unchanged():
    text = "This is plain text. No formatting here."
    assert strip_markdown(text) == text


def test_strip_markdown_none():
    assert strip_markdown(None) is None


def test_strip_markdown_empty():
    assert strip_markdown("") == ""


# ---------------------------------------------------------------------------
# remove_citations
# ---------------------------------------------------------------------------

def test_remove_citations_basic():
    result = remove_citations("This is true [1] and also [23] accurate.")
    assert "[1]" not in result
    assert "[23]" not in result
    assert "This is true" in result


def test_remove_citations_no_citations():
    text = "Plain text without citations."
    assert remove_citations(text) == text


def test_remove_citations_preserves_brackets():
    # [abc] should NOT be removed — only [digits]
    text = "Refer to [section A] for context."
    result = remove_citations(text)
    assert "[section A]" in result


def test_remove_citations_none():
    assert remove_citations(None) is None


# ---------------------------------------------------------------------------
# Integration: strip then remove
# ---------------------------------------------------------------------------

def test_strip_then_remove_pipeline():
    raw = "**Bold claim** [1] with *emphasis* and [2] citations."
    cleaned = remove_citations(strip_markdown(raw))
    assert "**" not in cleaned
    assert "*" not in cleaned
    assert "[1]" not in cleaned
    assert "[2]" not in cleaned
    assert "Bold claim" in cleaned
    assert "emphasis" in cleaned
