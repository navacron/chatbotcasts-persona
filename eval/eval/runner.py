"""
runner.py — Orchestrates full conversation generation.
Loads configs, calls Perplexity directly, accumulates conversation history.
"""

import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests
import yaml
from tqdm import tqdm

from eval.generator import (
    Message,
    Persona,
    PromptConfig,
    build_system_prompt,
    build_user_prompt,
    remove_citations,
    strip_markdown,
)

CONFIG_DIR = Path(__file__).parent.parent / "config"
PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"


# ---------------------------------------------------------------------------
# Config loaders
# ---------------------------------------------------------------------------

def load_personas(yaml_path: Optional[Path] = None) -> dict[str, Persona]:
    """Returns dict keyed by persona ID."""
    path = yaml_path or CONFIG_DIR / "personas.yaml"
    with open(path) as f:
        data = yaml.safe_load(f)
    return {
        p["id"]: Persona(id=p["id"], name=p["name"], prompt=p["prompt"])
        for p in data["personas"]
    }


def load_prompt_config(version: str, prompts_dir: Optional[Path] = None) -> PromptConfig:
    """Loads a prompt version from config/prompts/{version}.yaml."""
    dir_ = prompts_dir or CONFIG_DIR / "prompts"
    path = dir_ / f"{version}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Prompt config not found: {path}")
    with open(path) as f:
        data = yaml.safe_load(f)
    return PromptConfig(
        version=data["version"],
        description=data.get("description", ""),
        model=data["model"],
        temperature=data["temperature"],
        max_tokens=data["max_tokens"],
        system_template=data["system_template"],
        guidelines=data["guidelines"],
        formatting=data["formatting"],
        output_instruction=data["output_instruction"],
        novelty_rule=data.get("novelty_rule"),
        voice_rules=data.get("voice_rules"),
        include_subtopic_prefix=data.get("include_subtopic_prefix", True),
        include_conversation_history=data.get("include_conversation_history", True),
    )


def load_test_plan(plan_id: str, yaml_path: Optional[Path] = None) -> dict:
    """Returns a single test plan dict from config/test_plans.yaml."""
    path = yaml_path or CONFIG_DIR / "test_plans.yaml"
    with open(path) as f:
        data = yaml.safe_load(f)
    for plan in data["test_plans"]:
        if plan["id"] == plan_id:
            return plan
    raise ValueError(f"Plan '{plan_id}' not found in {path}")


def load_all_plans(yaml_path: Optional[Path] = None) -> list[dict]:
    path = yaml_path or CONFIG_DIR / "test_plans.yaml"
    with open(path) as f:
        data = yaml.safe_load(f)
    return data["test_plans"]


# ---------------------------------------------------------------------------
# Perplexity API call
# ---------------------------------------------------------------------------

def call_perplexity(
    system_prompt: str,
    user_prompt: str,
    model: str,
    temperature: float,
    max_tokens: int,
    api_key: str,
) -> tuple[str, list[str]]:
    """
    Direct HTTP call to Perplexity API.
    Returns (raw_text, citations).
    Raises on non-200 responses.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    response = requests.post(PERPLEXITY_API_URL, json=payload, headers=headers, timeout=30)
    response.raise_for_status()
    data = response.json()

    raw_text = data["choices"][0]["message"]["content"]
    citations = data.get("citations", [])
    return raw_text, citations


# ---------------------------------------------------------------------------
# Single turn generation
# ---------------------------------------------------------------------------

def generate_turn(
    persona: Persona,
    messages: list[Message],
    title: str,
    config: PromptConfig,
    api_key: str,
    focused_subtopic: Optional[str] = None,
) -> Message:
    """
    Generates a single conversation turn for the given persona.
    Applies strip_markdown + remove_citations post-processing.
    """
    system_prompt = build_system_prompt(persona, config)
    user_prompt = build_user_prompt(
        persona=persona,
        config=config,
        title=title,
        messages=messages,
        focused_subtopic=focused_subtopic,
    )

    raw_text, _citations = call_perplexity(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        model=config.model,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
        api_key=api_key,
    )

    cleaned = remove_citations(strip_markdown(raw_text))

    return Message(
        persona_id=persona.id,
        role=persona.name,
        content=cleaned,
        timestamp=datetime.now(timezone.utc).isoformat(),
        subtopic=focused_subtopic,
    )


# ---------------------------------------------------------------------------
# Full conversation generation
# ---------------------------------------------------------------------------

def generate_full_conversation(
    plan: dict,
    personas_dict: dict[str, Persona],
    config: PromptConfig,
    api_key: str,
    turns_override: Optional[int] = None,
    delay_between_calls: float = 0.5,
) -> list[Message]:
    """
    Drives the full conversation:
    - Iterates plan subtopics
    - For each subtopic, cycles through personas for turns_per_subtopic rounds
    - Skips persona_id == 'human'
    - Accumulates message history passed to each subsequent call

    Args:
        plan: A single test plan dict from test_plans.yaml
        personas_dict: {id: Persona} from load_personas()
        config: Prompt configuration
        api_key: Perplexity API key
        turns_override: Override turns_per_subtopic if set
        delay_between_calls: Seconds to wait between API calls (rate limiting)
    """
    title = plan["title"]
    subtopics = plan["plan"]
    turns_per_subtopic = turns_override or plan.get("turns_per_subtopic", 2)

    # Filter out 'human' and unknown personas
    persona_ids = [
        pid for pid in plan["persona_ids"]
        if pid != "human" and pid in personas_dict
    ]
    if not persona_ids:
        raise ValueError("No valid personas found for this plan.")

    personas = [personas_dict[pid] for pid in persona_ids]
    messages: list[Message] = []

    total_turns = len(subtopics) * len(personas) * turns_per_subtopic
    with tqdm(total=total_turns, desc=f"Generating [{config.version}] {plan['id']}") as pbar:
        for subtopic in subtopics:
            for _round in range(turns_per_subtopic):
                for persona in personas:
                    msg = generate_turn(
                        persona=persona,
                        messages=messages,
                        title=title,
                        config=config,
                        api_key=api_key,
                        focused_subtopic=subtopic,
                    )
                    messages.append(msg)
                    pbar.update(1)
                    if delay_between_calls > 0:
                        time.sleep(delay_between_calls)

    return messages
