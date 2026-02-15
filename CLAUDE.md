# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application for creating and sharing AI-powered conversations between multiple personas. Users can create conversations with AI agents, organize them by categories, and publish them for others to view. The app uses a credit-based system for conversation creation.

## Development Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint

# Run embedding backfill script
npx tsx scripts/backfill-embeddings.ts
```

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL with pgvector extension)
- **Authentication**: Clerk
- **Payments**: Stripe (subscription-based credits)
- **AI**: Vercel AI SDK, OpenAI (embeddings), Perplexity
- **UI Components**: Radix UI primitives

## Project Structure

- `app/` - Next.js App Router pages and API routes
  - `app/api/` - API endpoints for conversations, credits, webhooks, AI
  - `app/(home)/` - Route group for home layout
- `components/` - React components
  - `components/ui/` - Reusable UI components (Radix-based)
- `lib/` - Utility functions and business logic
  - `lib/supabase/` - Supabase client configurations (server, client, service, middleware)
  - `lib/conversations.ts` - Conversation fetching logic
  - `lib/embeddings.ts` - OpenAI embedding generation
  - `lib/stripe.ts` - Stripe integration
- `scripts/` - Database migration scripts and utilities

## Architecture Overview

### Data Model

**Core Tables**:
- `users` - User accounts (Clerk integration, id is TEXT not UUID)
- `conversations` - AI conversations with personas
  - Has `data` JSONB field storing message arrays
  - Supports versioning via `parent_conversation_id`, `root_conversation_id`, `version`
  - Has `embedding` vector field for semantic search (1536 dimensions)
- `persona` - AI agents/characters that participate in conversations
- `category` - Organize conversations by topic
- `conversation_personas` - Junction table linking conversations to personas (AI) or users (human)
- `credit_transactions` - Track credit purchases and usage
- `credit_usage_log` - Audit log for conversation creation

**Important Relationships**:
- Conversations can be **versioned** - a conversation can have a parent (previous version) and children (subsequent versions/extensions)
- Conversations can have multiple personas (AI) or human users via the `conversation_personas` junction table
- The special persona ID `"human"` represents human participants

### Authentication & Authorization

- **Clerk** handles user authentication (not Supabase Auth)
- User IDs are TEXT format (Clerk IDs), not UUIDs
- Middleware (`middleware.ts`) protects `/dashboard` and `/profile` routes
- Row Level Security (RLS) policies enforce data access:
  - Public conversations visible to all
  - Private conversations only to owner
  - Users can only modify their own data

### Supabase Client Patterns

**Three types of clients**:
1. `lib/supabase/server.ts` - Server-side client (respects RLS, user context)
2. `lib/supabase/client.ts` - Client-side browser client
3. `lib/supabase/service.ts` - Service role client (bypasses RLS, admin operations)

**When to use each**:
- Use `server.ts` for user-specific data access in Server Components/Actions
- Use `service.ts` for credit operations, system actions that need to bypass RLS
- Use `client.ts` for client-side interactions

### Credits System

- Users need **1 credit** to create a conversation
- Credits obtained via Stripe subscriptions (managed by webhooks)
- API route `/api/addUpdateConversation` handles credit logic:
  1. Pre-check credits with `get_available_credits` RPC
  2. Block if insufficient (returns 403)
  3. Attempt `check_and_decrement_credits` RPC (atomic operation)
  4. On conversation creation failure, refund credits
  5. Log usage in `credit_usage_log`

### Vector Search & Embeddings

- Uses OpenAI `text-embedding-3-small` model (1536 dimensions)
- Embeddings generated on conversation creation from `title + description`
- Stored in `conversations.embedding` column (pgvector type)
- Search uses hybrid approach (vector similarity + full-text search with RRF ranking)
- `SEARCH_RELEVANCE_THRESHOLD` env var filters low-relevance results (optional)

### Conversation Versioning

- Conversations can be **extended/revised** creating parent-child chains
- When extending a conversation:
  - `parent_conversation_id` set to original
  - `root_conversation_id` tracks the first ancestor
  - `version` increments (parent version + 1)
  - Slug auto-generated from parent slug (e.g., `original-slug-2`)
- Access control: Can extend if you're the owner OR if parent is public

## Key Implementation Patterns

### Creating Conversations

Always follow this pattern (see `app/api/addUpdateConversation/route.ts`):
1. Validate required fields (title, topic, data, personaIds, categoryId)
2. Check credits BEFORE any database operations
3. Resolve parent/slug/version if extending a conversation
4. Insert conversation record
5. Insert persona relations to `conversation_personas`
6. Generate embeddings for public conversations (non-blocking, can fail silently)
7. Log credit usage
8. On ANY failure, refund credits

### Fetching Conversations

Use functions from `lib/conversations.ts`:
- `getConversationById(id)` - Fetch by ID
- `getConversationBySlug(slug, options)` - Fetch by slug with view counting

Both return:
- `conversation` - Main record
- `personas` - Array of AI personas
- `humanUsers` - Array of human participants
- `user` - Conversation creator
- `category` - Category details (slug variant)
- `parentConversation` / `firstChildConversation` - Version navigation (slug variant)

### Message Format Migration

Old conversations may have messages without `personaId`. The code in `getConversationBySlug` handles backward compatibility by assigning default persona IDs based on role names.

### Caching Strategy

The app uses Next.js Incremental Static Regeneration (ISR) to cache pages and prevent timeout issues:

- **Page-level caching**: `export const revalidate = 3600` (1 hour) on dynamic pages
- **Revalidate endpoint**: `/api/revalidate?token=SECRET` for manual cache clearing
- **Cached routes**: posts/[slug], category/[slug], guest/[slug], sitemap.ts, robots.ts
- **Key benefit**: Prevents database timeouts on high-traffic routes (robots.txt, sitemap.xml)

See `CACHING.md` for detailed documentation and usage instructions.

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)
- `OPENAI_API_KEY` - For embeddings
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `STRIPE_SECRET_KEY` - Stripe secret
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification
- `SEARCH_RELEVANCE_THRESHOLD` (optional) - Minimum search score (default: 0)
- `REVALIDATE_TOKEN` - Secret token for cache revalidation endpoint (generate random 32+ char string)
- `NEXT_PUBLIC_SITE_URL` - Public site URL for sitemap, robots.txt (e.g., https://www.chatbotcasts.com)

## Common Gotchas

1. **User ID Type**: User IDs are TEXT (Clerk format), not UUID. Don't use UUID functions on user_id.

2. **Credit Refunds**: Always refund credits if conversation creation fails at any step after decrementing.

3. **Service Client for Credits**: Credit operations MUST use `createServiceClient()` to bypass RLS, since credit functions need admin access.

4. **Embeddings Can Fail**: Embedding generation is non-blocking and failures are acceptable (backfill script can retry later).

5. **Persona vs User**: The `conversation_personas` table has both `persona_id` (AI) and `user_id` (human). Use the special ID `"human"` to represent human participants in the UI.

6. **Slug Validation**: Slugs must match `/^[a-z0-9-]+$/` (lowercase, numbers, hyphens only).

7. **RLS Policies**: Be aware of Row Level Security when writing queries. Use service client only when necessary for system operations.

8. **Caching**: Pages use ISR with 1-hour revalidation. After content updates, call `/api/revalidate?token=SECRET` to clear cache. Never use `export const dynamic = "force-dynamic"` on public pages as it disables caching and can cause timeouts.

## Testing & Debugging

- Test prompt page at `/test-prompt` (password-protected)
- Check credit operations in Supabase logs
- Vector search can be tested via `/search` page
- Embedding backfill progress tracked in `embedding_backfill_progress` table
