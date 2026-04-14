import { getDbPool } from "@/db";
import type {
  CreateGeneratedDraftRequest,
  CreateGeneratedDraftResponse,
  DiscardGeneratedDraftResponse,
  GeneratedDraftDetailResponse,
  InsertGeneratedDraftToStageResponse,
  SaveGeneratedDraftResponse,
} from "@/lib/types/api";
import type { StructuredContent } from "@/lib/types/content";
import { buildStructuredContent, normalizeText } from "@/lib/content-processing";
import { generateDraftText } from "@/lib/llm";
import type { ContentKind } from "@/lib/types/content";

type ScenarioRow = {
  id: string;
  title: string;
};

type GeneratedDraftInsertRow = {
  id: string;
  status: "ready";
};

type GeneratedDraftStatus = "created" | "ready" | "saved" | "discarded";

type GeneratedDraftRow = {
  id: string;
  scenario_id: string;
  title: string;
  raw_text: string;
  normalized_text: string;
  structured_content: StructuredContent;
  content_kind: "dialogue" | "monologue" | "qa" | "script";
  difficulty_level: string;
  generation_prompt: string;
  status: GeneratedDraftStatus;
  inserted_to_stage: boolean;
  saved_content_item_id: string | null;
};

type SavedContentItemRow = {
  id: string;
};

type InsertedDraftRow = {
  id: string;
};

type DiscardedDraftRow = {
  id: string;
  status: "discarded";
};

type BuildGeneratedDraftTitleInput = {
  scenarioTitle: string;
  contentKind: ContentKind;
  difficultyLevel: string;
};

type FinalizeGeneratedDraftTitleInput = BuildGeneratedDraftTitleInput & {
  modelTitle: string | null;
};

function capitalizeContentKind(contentKind: ContentKind): string {
  return contentKind.charAt(0).toUpperCase() + contentKind.slice(1);
}

export function buildGeneratedDraftTitle({
  scenarioTitle,
  contentKind,
  difficultyLevel,
}: BuildGeneratedDraftTitleInput): string {
  return `${scenarioTitle} ${capitalizeContentKind(contentKind)} Draft (${difficultyLevel})`;
}

function stripLeadingLabel(text: string): string {
  return text.replace(/^[A-Za-z][A-Za-z0-9'()\- ]{0,40}\s*[:：]\s*/, "").trim();
}

function stripLeadingPromptPhrase(text: string): string {
  return text
    .replace(/^tell me about\s+/i, "")
    .replace(/^can you tell me about\s+/i, "")
    .replace(/^let'?s talk about\s+/i, "")
    .trim();
}

function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function buildRebuiltGeneratedDraftTitle({
  normalizedText,
  scenarioTitle,
  contentKind,
  difficultyLevel,
}: BuildGeneratedDraftTitleInput & { normalizedText: string }): string {
  const blocks = normalizedText
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  const contentBlock =
    blocks.find((block) => !/^(situation|goal|context|task|note|notes|instruction|instructions)\s*:/i.test(block)) ??
    blocks[0] ??
    "";

  const words = stripLeadingLabel(contentBlock)
    .replace(/\?+$/, "")
    .trim();
  const candidateText = stripLeadingPromptPhrase(words);
  const candidateWords = candidateText
    .replace(/[^\p{L}\p{N}\s'-]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (candidateWords.length < 3) {
    return buildGeneratedDraftTitle({ scenarioTitle, contentKind, difficultyLevel });
  }

  const meaningfulWords = candidateWords.slice(0, 5).join(" ");
  return titleCase(`Talking About ${meaningfulWords}`);
}

export function finalizeGeneratedDraftTitle({
  scenarioTitle,
  contentKind,
  difficultyLevel,
  modelTitle,
}: FinalizeGeneratedDraftTitleInput): string {
  const fallbackTitle = buildGeneratedDraftTitle({
    scenarioTitle,
    contentKind,
    difficultyLevel,
  });

  const candidate = modelTitle
    ?.replace(/^Title:\s*/i, "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .trim();

  if (!candidate) {
    return fallbackTitle;
  }

  if (candidate.includes(":") || /[.?!]$/.test(candidate)) {
    return fallbackTitle;
  }

  const wordCount = candidate.split(/\s+/).filter(Boolean).length;
  if (wordCount < 4 || wordCount > 10) {
    return fallbackTitle;
  }

  return candidate;
}

export function parseGeneratedDraftResponse(text: string): { title: string | null; body: string } {
  const normalized = normalizeText(stripThinkBlocks(text));
  const match = normalized.match(/^Title:\s*(.+?)\n+\s*Body:\s*([\s\S]+)$/i);

  if (!match) {
    return {
      title: null,
      body: normalized,
    };
  }

  return {
    title: match[1].trim() || null,
    body: match[2].trim(),
  };
}

export function isDialogueLikeContentKind(contentKind: ContentKind): boolean {
  return contentKind === "dialogue" || contentKind === "qa" || contentKind === "script";
}

function stripThinkBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

const MAX_DIALOGUE_TURNS = 10;

function countDialogueBlocks(text: string): number {
  return text
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean).length;
}

function splitDialogueTurns(text: string): string {
  let result = text.trim();
  let previous: string | null = null;

  while (result !== previous) {
    previous = result;
    result = result.replace(
      /([.?!])\s*([A-Za-z][A-Za-z0-9'()\- ]{0,40}\s*[:：])/g,
      "$1\n$2",
    );
    result = result.replace(
      /([^.?!\n])\s+([A-Za-z][A-Za-z0-9'()\- ]{0,40}\s*[:：])/g,
      "$1\n$2",
    );
  }

  return result;
}

export function normalizeGeneratedDraftText(text: string, contentKind: ContentKind): string {
  const normalized = normalizeText(stripThinkBlocks(text));
  const baseText = isDialogueLikeContentKind(contentKind)
    ? splitDialogueTurns(normalized)
    : normalized;
  const lines = baseText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\(\s*/, "").replace(/\s*\)$/, ""));

  return lines.join("\n\n");
}

export function validateGeneratedDraftText(text: string, contentKind: ContentKind): void {
  if (!text.trim()) {
    throw new Error("Generated draft was empty");
  }

  if (/<think>[\s\S]*?<\/think>/i.test(text)) {
    throw new Error("Generated draft leaked internal model reasoning");
  }

  if (/\p{Script=Han}/u.test(text)) {
    throw new Error("Generated draft must be English-only");
  }

  if (isDialogueLikeContentKind(contentKind) && countDialogueBlocks(text) < 2) {
    throw new Error("Generated dialogue must contain at least two dialogue blocks");
  }

  if (isDialogueLikeContentKind(contentKind) && countDialogueBlocks(text) > MAX_DIALOGUE_TURNS) {
    throw new Error("Generated dialogue has too many dialogue blocks");
  }
}

export function shouldRetryGeneratedDraftValidation(
  contentKind: ContentKind,
  message: string,
): boolean {
  return (
    isDialogueLikeContentKind(contentKind) &&
    message === "Generated dialogue must contain at least two dialogue blocks"
  );
}

export function buildInsertGeneratedDraftToStageResponse(
  id: string,
): InsertGeneratedDraftToStageResponse {
  return {
    generatedDraftId: id,
    insertedToStage: true,
  };
}

export function buildDiscardGeneratedDraftResponse(
  id: string,
): DiscardGeneratedDraftResponse {
  return {
    generatedDraftId: id,
    status: "discarded",
    discarded: true,
  };
}

function assertDraftCanInsert(status: GeneratedDraftStatus) {
  if (status === "discarded") {
    throw new Error("Discarded draft cannot be inserted to stage");
  }
}

function assertDraftCanSave(status: GeneratedDraftStatus) {
  if (status === "discarded") {
    throw new Error("Discarded draft cannot be saved");
  }
}

function assertDraftCanDiscard(status: GeneratedDraftStatus) {
  if (status === "saved") {
    throw new Error("Saved draft cannot be discarded");
  }
}

export async function createGeneratedDraft(
  input: CreateGeneratedDraftRequest,
): Promise<CreateGeneratedDraftResponse> {
  const pool = getDbPool();
  const scenarioResult = await pool.query<ScenarioRow>(
    "SELECT id, title FROM scenarios WHERE slug = $1 LIMIT 1",
    [input.scenarioSlug],
  );

  const scenario = scenarioResult.rows[0];
  if (!scenario) {
    throw new Error("Scenario not found");
  }

  let generatedResponse = await generateDraftText({
    scenarioTitle: scenario.title,
    prompt: input.prompt,
    contentKind: input.contentKind,
    difficultyLevel: input.difficultyLevel,
  });
  let parsedResponse = parseGeneratedDraftResponse(generatedResponse);
  let normalizedText = normalizeGeneratedDraftText(parsedResponse.body, input.contentKind);

  try {
    validateGeneratedDraftText(normalizedText, input.contentKind);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const shouldRetry = shouldRetryGeneratedDraftValidation(input.contentKind, message);

    if (!shouldRetry) {
      throw error;
    }

    generatedResponse = await generateDraftText(
      {
        scenarioTitle: scenario.title,
        prompt: input.prompt,
        contentKind: input.contentKind,
        difficultyLevel: input.difficultyLevel,
      },
      { retryForDialogueBlocks: true },
    );
    parsedResponse = parseGeneratedDraftResponse(generatedResponse);
    normalizedText = normalizeGeneratedDraftText(parsedResponse.body, input.contentKind);
    validateGeneratedDraftText(normalizedText, input.contentKind);
  }

  const title = finalizeGeneratedDraftTitle({
    scenarioTitle: scenario.title,
    contentKind: input.contentKind,
    difficultyLevel: input.difficultyLevel,
    modelTitle: parsedResponse.title,
  });
  const structuredContent = buildStructuredContent(normalizedText);

  const insertResult = await pool.query<GeneratedDraftInsertRow>(
    `
      INSERT INTO generated_drafts (
        scenario_id,
        title,
        raw_text,
        normalized_text,
        structured_content,
        content_kind,
        difficulty_level,
        generation_prompt,
        status
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, 'ready')
      RETURNING id, status
    `,
    [
      scenario.id,
      title,
      parsedResponse.body,
      normalizedText,
      JSON.stringify(structuredContent),
      input.contentKind,
      input.difficultyLevel,
      input.prompt,
    ],
  );

  const row = insertResult.rows[0];

  return {
    generatedDraftId: row.id,
    status: row.status,
  };
}

type GeneratedDraftDetailRow = {
  scenario_id: string;
  scenario_slug: string;
  scenario_title: string;
  generated_draft_id: string;
  generated_draft_title: string;
  content_kind: "dialogue" | "monologue" | "qa" | "script";
  difficulty_level: string;
  draft_status: GeneratedDraftStatus;
  inserted_to_stage: boolean;
  saved_content_item_id: string | null;
  structured_content: StructuredContent;
};

export async function getGeneratedDraftDetail(
  id: string,
): Promise<GeneratedDraftDetailResponse | null> {
  const pool = getDbPool();
  const result = await pool.query<GeneratedDraftDetailRow>(
    `
      SELECT
        s.id AS scenario_id,
        s.slug AS scenario_slug,
        s.title AS scenario_title,
        gd.id AS generated_draft_id,
        gd.title AS generated_draft_title,
        gd.content_kind,
        gd.difficulty_level,
        gd.status AS draft_status,
        gd.inserted_to_stage,
        gd.saved_content_item_id,
        gd.structured_content
      FROM generated_drafts gd
      INNER JOIN scenarios s ON s.id = gd.scenario_id
      WHERE gd.id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    subjectType: "generatedDraft",
    scenario: {
      id: row.scenario_id,
      slug: row.scenario_slug,
      title: row.scenario_title,
    },
    generatedDraft: {
      id: row.generated_draft_id,
      scenarioId: row.scenario_id,
      title: row.generated_draft_title,
      contentKind: row.content_kind,
      difficultyLevel: row.difficulty_level,
      status: row.draft_status,
      insertedToStage: row.inserted_to_stage,
      savedContentItemId: row.saved_content_item_id,
    },
    structuredContent: row.structured_content,
    translationBundle: null,
  };
}

export async function insertGeneratedDraftToStage(
  id: string,
): Promise<InsertGeneratedDraftToStageResponse> {
  const pool = getDbPool();
  const statusResult = await pool.query<{ id: string; status: GeneratedDraftStatus; inserted_to_stage: boolean }>(
    `
      SELECT id, status, inserted_to_stage
      FROM generated_drafts
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  const existing = statusResult.rows[0];
  if (!existing) {
    throw new Error("Generated draft not found");
  }

  assertDraftCanInsert(existing.status);

  if (existing.inserted_to_stage) {
    return buildInsertGeneratedDraftToStageResponse(existing.id);
  }

  const result = await pool.query<InsertedDraftRow>(
    `
      UPDATE generated_drafts
      SET
        inserted_to_stage = TRUE,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Generated draft not found");
  }

  return buildInsertGeneratedDraftToStageResponse(row.id);
}

export async function saveGeneratedDraftAsContentItem(
  id: string,
): Promise<SaveGeneratedDraftResponse> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const draftResult = await client.query<GeneratedDraftRow>(
      `
        SELECT
          id,
          scenario_id,
          title,
          raw_text,
          normalized_text,
          structured_content,
          content_kind,
          difficulty_level,
          generation_prompt,
          status,
          inserted_to_stage,
          saved_content_item_id
        FROM generated_drafts
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    const draft = draftResult.rows[0];
    if (!draft) {
      throw new Error("Generated draft not found");
    }

    assertDraftCanSave(draft.status);

    if (draft.saved_content_item_id) {
      await client.query("COMMIT");
      return {
        generatedDraftId: draft.id,
        savedContentItemId: draft.saved_content_item_id,
      };
    }

    const contentInsertResult = await client.query<SavedContentItemRow>(
      `
        INSERT INTO content_items (
          scenario_id,
          source_type,
          content_kind,
          title,
          raw_text,
          normalized_text,
          structured_content,
          language,
          difficulty_level,
          status,
          created_by_type,
          generation_prompt
        )
        VALUES ($1, 'generated', $2, $3, $4, $5, $6::jsonb, 'en', $7, 'ready', 'system', $8)
        RETURNING id
      `,
      [
        draft.scenario_id,
        draft.content_kind,
        draft.title,
        draft.raw_text,
        draft.normalized_text,
        JSON.stringify(draft.structured_content),
        draft.difficulty_level,
        draft.generation_prompt,
      ],
    );

    const savedContentItemId = contentInsertResult.rows[0].id;

    await client.query(
      `
        UPDATE generated_drafts
        SET
          status = 'saved',
          inserted_to_stage = TRUE,
          saved_content_item_id = $2,
          updated_at = NOW()
        WHERE id = $1
      `,
      [id, savedContentItemId],
    );

    await client.query("COMMIT");

    return {
      generatedDraftId: draft.id,
      savedContentItemId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function discardGeneratedDraft(
  id: string,
): Promise<DiscardGeneratedDraftResponse> {
  const pool = getDbPool();
  const result = await pool.query<{ id: string; status: GeneratedDraftStatus }>(
    `
      SELECT id, status
      FROM generated_drafts
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  const draft = result.rows[0];
  if (!draft) {
    throw new Error("Generated draft not found");
  }

  if (draft.status === "discarded") {
    return buildDiscardGeneratedDraftResponse(draft.id);
  }

  assertDraftCanDiscard(draft.status);

  const updateResult = await pool.query<DiscardedDraftRow>(
    `
      UPDATE generated_drafts
      SET
        status = 'discarded',
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, status
    `,
    [id],
  );

  return buildDiscardGeneratedDraftResponse(updateResult.rows[0].id);
}
