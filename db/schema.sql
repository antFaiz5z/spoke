CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE source_type AS ENUM ('preset', 'generated');
CREATE TYPE content_kind AS ENUM ('dialogue', 'monologue', 'qa', 'script');
CREATE TYPE content_status AS ENUM ('generating', 'processing', 'ready', 'failed', 'archived');
CREATE TYPE generated_draft_status AS ENUM ('created', 'ready', 'saved', 'discarded');

CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  source_type source_type NOT NULL,
  content_kind content_kind NOT NULL,
  title TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  structured_content JSONB NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  difficulty_level TEXT NOT NULL,
  status content_status NOT NULL DEFAULT 'processing',
  created_by_type TEXT NOT NULL DEFAULT 'system',
  generation_prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE article_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID NOT NULL UNIQUE REFERENCES content_items(id) ON DELETE CASCADE,
  farthest_paragraph_index INTEGER NOT NULL DEFAULT 0 CHECK (farthest_paragraph_index >= 0),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE article_read_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID NOT NULL UNIQUE REFERENCES content_items(id) ON DELETE CASCADE,
  has_read BOOLEAN NOT NULL DEFAULT FALSE,
  first_read_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (has_read = FALSE AND first_read_at IS NULL AND last_read_at IS NULL)
    OR
    (has_read = TRUE AND first_read_at IS NOT NULL AND last_read_at IS NOT NULL)
  )
);

CREATE TABLE generated_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  structured_content JSONB NOT NULL,
  content_kind content_kind NOT NULL,
  difficulty_level TEXT NOT NULL,
  generation_prompt TEXT NOT NULL,
  status generated_draft_status NOT NULL DEFAULT 'created',
  inserted_to_stage BOOLEAN NOT NULL DEFAULT FALSE,
  saved_content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scenarios_sort_order ON scenarios(sort_order);
CREATE INDEX idx_content_items_scenario_id ON content_items(scenario_id);
CREATE INDEX idx_content_items_source_type ON content_items(source_type);
CREATE INDEX idx_content_items_content_kind ON content_items(content_kind);
CREATE INDEX idx_generated_drafts_scenario_id ON generated_drafts(scenario_id);
CREATE INDEX idx_generated_drafts_status ON generated_drafts(status);
