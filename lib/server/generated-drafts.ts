import { getDbPool } from "@/db";
import type {
  CreateGeneratedDraftRequest,
  CreateGeneratedDraftResponse,
  GeneratedDraftDetailResponse,
  SaveGeneratedDraftResponse,
} from "@/lib/types/api";
import type { StructuredContent } from "@/lib/types/content";
import { buildStructuredContent, normalizeText } from "@/lib/content-processing";
import { generateDraftText } from "@/lib/llm";

type ScenarioRow = {
  id: string;
  title: string;
};

type GeneratedDraftInsertRow = {
  id: string;
  status: "ready";
};

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
  saved_content_item_id: string | null;
};

type SavedContentItemRow = {
  id: string;
};

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

  const generatedText = await generateDraftText({
    scenarioTitle: scenario.title,
    prompt: input.prompt,
    contentKind: input.contentKind,
    difficultyLevel: input.difficultyLevel,
  });
  const normalizedText = normalizeText(generatedText);
  const title = normalizedText.split(/\n/)[0]?.slice(0, 80) || "Generated draft";
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
      generatedText,
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
  draft_status: string;
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
  };
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
