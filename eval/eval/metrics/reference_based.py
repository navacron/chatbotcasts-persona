"""
reference_based.py — Metrics that compare generated output against a reference transcript.
Requires OPENAI_API_KEY for embedding similarity.
Requires spacy en_core_web_sm for topic coverage and NER.
Requires bert-score for BERTScore.
"""

from typing import Optional

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


def compute_bertscore(
    generated_text: str,
    reference_text: str,
    lang: str = "en",
    model_type: Optional[str] = None,
) -> dict:
    """
    Computes BERTScore between generated and reference texts.
    Returns {precision, recall, f1} as Python floats.
    F1 is the primary comparison metric.
    Higher = generated text is semantically closer to reference.
    Practical range for same-language, same-topic: ~0.85–0.95.
    """
    from bert_score import score as bert_score_fn

    kwargs = {"lang": lang, "verbose": False}
    if model_type:
        kwargs["model_type"] = model_type

    P, R, F1 = bert_score_fn([generated_text], [reference_text], **kwargs)

    return {
        "precision": float(P[0]),
        "recall": float(R[0]),
        "f1": float(F1[0]),
    }


def _embed_text(text: str, client, model: str = "text-embedding-3-small") -> list[float]:
    """Returns the embedding vector for a text string."""
    response = client.embeddings.create(input=[text], model=model)
    return response.data[0].embedding


def compute_embedding_similarity(
    generated_text: str,
    reference_text: str,
    openai_api_key: str,
    model: str = "text-embedding-3-small",
) -> float:
    """
    Embeds both texts via OpenAI and computes cosine similarity.
    Returns float in [0, 1] for same-language texts.
    Higher = more topically aligned with real-world discourse on the subject.
    """
    from openai import OpenAI

    client = OpenAI(api_key=openai_api_key)
    gen_vec = _embed_text(generated_text, client, model)
    ref_vec = _embed_text(reference_text, client, model)

    gen_arr = np.array(gen_vec).reshape(1, -1)
    ref_arr = np.array(ref_vec).reshape(1, -1)
    sim = cosine_similarity(gen_arr, ref_arr)[0][0]
    return float(sim)


def compute_topic_coverage(
    generated_text: str,
    reference_text: str,
    top_n_phrases: int = 30,
) -> dict:
    """
    Extracts top-N noun phrases from the reference using spaCy noun chunk extraction.
    Checks what fraction appear in the generated text (case-insensitive substring match).
    Returns {coverage_ratio, matched_phrases, total_phrases}.
    Higher coverage = generated conversation hitting real-world key topics.
    """
    import spacy

    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        raise OSError(
            "spaCy model 'en_core_web_sm' not found. Run: python -m spacy download en_core_web_sm"
        )

    ref_doc = nlp(reference_text)
    # Count noun chunk frequency
    from collections import Counter
    chunk_counter: Counter = Counter()
    for chunk in ref_doc.noun_chunks:
        phrase = chunk.text.strip().lower()
        if len(phrase.split()) >= 2:  # Only multi-word phrases
            chunk_counter[phrase] += 1

    top_phrases = [phrase for phrase, _ in chunk_counter.most_common(top_n_phrases)]
    gen_lower = generated_text.lower()

    matched = [p for p in top_phrases if p in gen_lower]

    return {
        "coverage_ratio": len(matched) / len(top_phrases) if top_phrases else 0.0,
        "matched_phrases": matched,
        "total_phrases": len(top_phrases),
    }


def compute_named_entity_overlap(
    generated_text: str,
    reference_text: str,
) -> dict:
    """
    Uses spaCy NER to find entities in both texts.
    Entity types: PERSON, ORG, GPE, PRODUCT, EVENT, WORK_OF_ART.
    Returns {overlap_ratio, common_entities, ref_only, gen_only}.
    Higher overlap = generated conversation grounded in same factual landscape as reference.
    """
    import spacy

    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        raise OSError(
            "spaCy model 'en_core_web_sm' not found. Run: python -m spacy download en_core_web_sm"
        )

    target_types = {"PERSON", "ORG", "GPE", "PRODUCT", "EVENT", "WORK_OF_ART"}

    def extract_entities(text: str) -> set[str]:
        doc = nlp(text)
        return {
            ent.text.strip().lower()
            for ent in doc.ents
            if ent.label_ in target_types and len(ent.text.strip()) > 1
        }

    gen_entities = extract_entities(generated_text)
    ref_entities = extract_entities(reference_text)

    common = gen_entities & ref_entities
    ref_only = ref_entities - gen_entities
    gen_only = gen_entities - ref_entities

    overlap_ratio = len(common) / len(ref_entities) if ref_entities else 0.0

    return {
        "overlap_ratio": overlap_ratio,
        "common_entities": sorted(common),
        "ref_only": sorted(ref_only),
        "gen_only": sorted(gen_only),
    }
