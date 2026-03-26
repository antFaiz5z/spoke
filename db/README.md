# Database

This folder contains the PostgreSQL schema and minimal database access layer.

Current contents:

- `schema.sql`: initial SQL draft aligned with the OpenSpec foundation
- `client.ts`: shared `pg` pool factory
- `index.ts`: db exports

The schema currently covers:

- `scenarios`
- `content_items`
- `article_progress`
- `article_read_states`
- `generated_drafts`

Bootstrap:

```bash
npm run db:init
```
