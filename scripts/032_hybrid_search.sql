-- Hybrid search: full-text (keyword) + vector (semantic) with RRF
-- Add tsvector column for keyword search on title + description

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS fts tsvector
GENERATED ALWAYS AS (
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
) STORED;

-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS conversations_fts_idx ON conversations USING gin(fts);

COMMENT ON COLUMN conversations.fts IS 'Full-text search vector on title + description for keyword search';

-- Hybrid search: FTS + vector similarity combined with Reciprocal Rank Fusion (RRF)
-- Returns same shape as search_conversations_by_similarity (id, title, description, slug, similarity)
-- so the search API can drop-in replace the RPC call.
CREATE OR REPLACE FUNCTION search_conversations_hybrid(
  query_text text,
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  full_text_weight float DEFAULT 1,
  semantic_weight float DEFAULT 1,
  rrf_k int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  slug text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  WITH full_text AS (
    SELECT
      c.id,
      row_number() OVER (
        ORDER BY ts_rank_cd(c.fts, websearch_to_tsquery('english', COALESCE(query_text, ''))) DESC
      ) AS rank_ix
    FROM conversations c
    WHERE c.is_public = true
      AND c.fts @@ websearch_to_tsquery('english', COALESCE(query_text, ''))
    ORDER BY rank_ix
    LIMIT least(match_count, 30) * 2
  ),
  semantic AS (
    SELECT
      c.id,
      row_number() OVER (ORDER BY c.embedding <=> query_embedding) AS rank_ix
    FROM conversations c
    WHERE c.is_public = true
      AND c.embedding IS NOT NULL
    ORDER BY rank_ix
    LIMIT least(match_count, 30) * 2
  ),
  combined AS (
    SELECT
      COALESCE(full_text.id, semantic.id) AS id,
      (
        COALESCE(1.0 / (rrf_k + full_text.rank_ix), 0.0) * full_text_weight
        + COALESCE(1.0 / (rrf_k + semantic.rank_ix), 0.0) * semantic_weight
      ) AS rrf_score
    FROM full_text
    FULL OUTER JOIN semantic ON full_text.id = semantic.id
  )
  SELECT
    c.id,
    c.title,
    c.description,
    c.slug,
    combined.rrf_score::float AS similarity
  FROM combined
  JOIN conversations c ON c.id = combined.id
  ORDER BY combined.rrf_score DESC
  LIMIT least(match_count, 30);
$$;

COMMENT ON FUNCTION search_conversations_hybrid IS 'Hybrid search: full-text (keyword) + vector (semantic) with RRF; public conversations only';
