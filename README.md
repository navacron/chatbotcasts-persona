# chatbotcasts-persona

# To backfill missing embeddings
npx tsx scripts/backfill-embeddings.ts

## Optional: Search relevance threshold

To hide low-relevance search results, set an environment variable:

- **`SEARCH_RELEVANCE_THRESHOLD`** (optional, number): Minimum RRF similarity score for a result to be returned. Default is `0` (no filtering). Set to a value like `0.005` to filter out irrelevant results; RRF scores are typically in the range 0.001–0.04. Tune based on your data.

To Revalidate Cache
curl "https://www.chatbotcasts.com/api/revalidate?token=maggy123"