# Spoke

Spoke is a text-fragment-first English speaking practice workspace.

The product is built around a scenario catalog, an article catalog, and a practice stage where users interact with paragraph, sentence, and token level text fragments instead of chat threads. The current foundation focuses on structured content, hover and playback behavior, generated draft lifecycle, and a self-hostable local stack.

## What It Does

- Browse scenario-based practice content
- Open a practice item and interact with paragraph, sentence, and token fragments
- Play text fragments through TTS
- Track reading state and farthest paragraph progress
- Generate temporary practice drafts and either save or discard them
- Keep the English source tree separate from any future translation layer

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- PostgreSQL

## Project Structure

- `app/`: routes, pages, and UI composition
- `app/practice/_stage/`: shared practice stage modules
- `lib/`: content processing, runtime indexes, API contracts, providers, and server logic
- `db/`: PostgreSQL schema and DB layer
- `scripts/`: bootstrap and maintenance scripts
- `openspec/`: product and architecture change records

## Requirements

- Node.js 20+
- npm
- PostgreSQL 16+ available at the `DATABASE_URL` in `.env`

## Environment

Create a local env file from the example:

```bash
cp .env.example .env
```

Current variables:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/spoke
OPENAI_PROVIDER=openai-compatible
OPENAI_API_BASE_URL=
OPENAI_API_KEY=
TTS_PROVIDER=minimax
TTS_API_BASE_URL=
TTS_API_KEY=
```

Notes:

- `OPENAI_PROVIDER` is the generation provider selector. V1 uses `openai-compatible`.
- `TTS_PROVIDER` is the speech provider selector. V1 uses `minimax`.
- If you only want to browse seeded content and non-generation flows, the app still needs PostgreSQL, but generation and TTS will require provider credentials.

## Database Setup

Initialize schema:

```bash
npm run db:init
```

Seed scenarios:

```bash
npm run db:seed:scenarios
```

Import sample content:

```bash
npm run import:preset -- ./scripts/examples/preset-content.sample.json --apply
```

If you want a quick local PostgreSQL container:

```bash
docker run -d \
  --name spoke-postgres \
  -e POSTGRES_DB=spoke \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16
```

## Run Locally

Start development server:

```bash
npm run dev
```

Or start with a clean Next.js cache:

```bash
npm run dev:clean
```

Default local URL:

```text
http://localhost:3000
```

## Useful Scripts

```bash
npm test
npm run typecheck
npm run build
npm run verify
```

Content maintenance:

```bash
npm run rebuild:structured-content -- --dry-run
npm run rebuild:structured-content -- --apply --target all
```

## Current Foundation Scope

Implemented in the current foundation:

- Structured English content stored as `structured_content` JSON
- Hover runtime indexes and distance-driven hit logic
- Practice stage boundaries for `TextStage`, `HoverEngine`, `HighlightLayer`, and `PlaybackBar`
- `GeneratedDraft` lifecycle: create, view, insert to stage, save, discard
- Provider boundaries for generation and TTS
- Translation boundary reserved through `translationBundle`, without coupling it into the English source tree

Not yet implemented as full user-facing features:

- Real Chinese translation source, storage, and rendering
- Authentication and user accounts
- Pronunciation scoring
- Long-term draft management UI

## Related Docs

- Foundation proposal: `openspec/changes/define-spoke-foundation/proposal.md`
- Foundation design: `openspec/changes/define-spoke-foundation/design.md`
- Database notes: `db/README.md`
- Script notes: `scripts/README.md`
