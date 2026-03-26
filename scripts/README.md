# Scripts

This folder contains TypeScript operational scripts.

Current script:

- `db-init.ts`
- `seed-scenarios.ts`
- `import-preset-content.ts`

Usage:

```bash
npm run db:init
npm run db:seed:scenarios
npm run import:preset -- ./path/to/input.json --dry-run
npm run import:preset -- ./path/to/input.json --apply
```

Input format:

```json
[
  {
    "scenarioSlug": "job-interview",
    "title": "Tell Me About Yourself",
    "rawText": "Tell me about yourself.",
    "contentKind": "dialogue",
    "difficultyLevel": "B1"
  }
]
```

Suggested local bootstrap order:

```bash
cp .env.example .env
npm run db:init
npm run db:seed:scenarios
npm run import:preset -- ./scripts/examples/preset-content.sample.json --apply
npm run dev
```
