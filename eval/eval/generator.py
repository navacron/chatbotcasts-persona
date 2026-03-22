"""
generator.py — Prompt builder that mirrors generateNextConversation/route.ts exactly.
Ports the TypeScript prompt construction and post-processing logic to Python.
"""

import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Persona:
    id: str
    name: str
    prompt: str


@dataclass
class Message:
    persona_id: str
    role: str       # persona name used as role label (mirrors TypeScript msg.role)
    content: str
    timestamp: str


@dataclass
class PromptConfig:
    version: str
    model: str
    temperature: float
    max_tokens: int
    system_template: str
    guidelines: str
    formatting: str
    output_instruction: str
    description: str = ""
    novelty_rule: Optional[str] = None
    include_subtopic_prefix: bool = True
    include_conversation_history: bool = True


def build_system_prompt(persona: Persona, config: PromptConfig) -> str:
    """
    Renders the system prompt.
    Production format: "You are {name}. And your role is: {prompt}"
    """
    return config.system_template.format(
        persona_name=persona.name,
        persona_prompt=persona.prompt,
    )


def build_conversation_context(messages: list[Message]) -> str:
    """
    Joins messages as 'PersonaName: content' blocks separated by double newlines.
    Mirrors the TypeScript: messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n')
    """
    return "\n\n".join(f"{msg.role}: {msg.content}" for msg in messages)


def build_user_prompt(
    persona: Persona,
    config: PromptConfig,
    title: str,
    messages: list[Message],
    focused_subtopic: Optional[str] = None,
) -> str:
    """
    Assembles the full user prompt exactly as the TypeScript route does:
    1. Optional subtopic prefix
    2. Guidelines section
    3. Formatting section
    4. Optional novelty rule (v2+)
    5. Conversation context (if messages exist)
    6. Output instruction with title injection
    """
    parts = []

    # 1. Optional subtopic prefix
    if config.include_subtopic_prefix and focused_subtopic:
        parts.append(f"Currently discussing: {focused_subtopic}\n")

    # 2. Guidelines
    parts.append(f"Guidelines:\n{config.guidelines.rstrip()}")

    # 3. Formatting
    parts.append(f"Formatting:\n{config.formatting.rstrip()}")

    # 4. Novelty rule (v2+ only)
    if config.novelty_rule:
        parts.append(f"Novelty rule:\n{config.novelty_rule.rstrip()}")

    # 5. Conversation context
    if config.include_conversation_history and messages:
        context = build_conversation_context(messages)
        parts.append(f"Here is the conversation so far:\n\n{context}")

    # 6. Output instruction
    output_instruction = config.output_instruction.format(
        persona_name=persona.name,
        title=title,
    )
    parts.append(output_instruction)

    return "\n\n".join(parts)


def strip_markdown(text: str) -> str:
    """
    Python port of lib/markdown-utils.ts stripMarkdown().
    Regex patterns match the TypeScript source exactly.
    """
    if not text or not isinstance(text, str):
        return text

    cleaned = text

    # Remove bold/italic markdown
    cleaned = re.sub(r'\*\*([^*]+)\*\*', r'\1', cleaned)   # **bold**
    cleaned = re.sub(r'\*{2,}', '', cleaned)                 # Bare ** or ***
    cleaned = re.sub(r'\*([^*]+)\*', r'\1', cleaned)         # *italic*
    cleaned = re.sub(r'\*+$', '', cleaned, flags=re.MULTILINE)   # Trailing *
    cleaned = re.sub(r'^\*+', '', cleaned, flags=re.MULTILINE)   # Leading *
    cleaned = re.sub(r'__([^_]+)__', r'\1', cleaned)         # __bold__
    cleaned = re.sub(r'_([^_]+)_', r'\1', cleaned)           # _italic_

    # Remove inline code
    cleaned = re.sub(r'`([^`]+)`', r'\1', cleaned)

    # Remove links but keep text ([text](url) -> text)
    cleaned = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', cleaned)
    # NOTE: bare citation markers like [1], [2] are kept here (removeCitations handles them)

    # Remove heading markers
    cleaned = re.sub(r'^#{1,6}\s+', '', cleaned, flags=re.MULTILINE)

    # Remove horizontal rules
    cleaned = re.sub(r'^[-*]{3,}$', '', cleaned, flags=re.MULTILINE)

    # Remove blockquotes
    cleaned = re.sub(r'^>\s+', '', cleaned, flags=re.MULTILINE)

    # Remove list markers
    cleaned = re.sub(r'^[\s]*[-*+]\s+', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'^\d+\.\s+', '', cleaned, flags=re.MULTILINE)

    # Clean up extra whitespace
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    cleaned = cleaned.strip()

    return cleaned


def remove_citations(text: str) -> str:
    """
    Python port of lib/markdown-utils.ts removeCitations().
    Removes citation markers like [1], [2], [3].
    """
    if not text or not isinstance(text, str):
        return text
    return re.sub(r'\[\d+\]', '', text).strip()
