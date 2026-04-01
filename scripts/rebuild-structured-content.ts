import process from "node:process";
import { getDbPool } from "@/db";
import {
  buildStructuredContentRebuildPayload,
  parseRebuildStructuredContentArgs,
  type RebuildTarget,
} from "@/scripts/rebuild-structured-content-lib";

type RebuildRow = {
  id: string;
  title: string;
  raw_text: string;
  normalized_text: string;
  content_kind: "dialogue" | "monologue" | "qa" | "script";
  difficulty_level?: string;
  scenario_title?: string;
  source_type?: "preset" | "generated";
};

type RebuildTable = "content_items" | "generated_drafts";

const TARGET_TABLES: Record<RebuildTarget, RebuildTable[]> = {
  all: ["content_items", "generated_drafts"],
  "content-items": ["content_items"],
  "generated-drafts": ["generated_drafts"],
};

async function rebuildTable(table: RebuildTable, apply: boolean) {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    const result = await client.query<RebuildRow>(
      table === "content_items"
        ? `SELECT ci.id, ci.title, ci.raw_text, ci.normalized_text, ci.content_kind, ci.difficulty_level, s.title AS scenario_title, ci.source_type FROM ${table} ci INNER JOIN scenarios s ON s.id = ci.scenario_id ORDER BY ci.updated_at DESC`
        : `SELECT gd.id, gd.title, gd.raw_text, gd.normalized_text, gd.content_kind, gd.difficulty_level, s.title AS scenario_title FROM ${table} gd INNER JOIN scenarios s ON s.id = gd.scenario_id ORDER BY gd.updated_at DESC`,
    );

    const preview = result.rows.map((row) => {
      const payload = buildStructuredContentRebuildPayload({
        rawText: row.raw_text,
        contentKind: row.content_kind,
        sourceType: row.source_type,
        isGeneratedDraft: table === "generated_drafts",
        existingTitle: row.title,
        scenarioTitle: row.scenario_title,
        difficultyLevel: row.difficulty_level,
      });

      return {
        table,
        id: row.id,
        paragraphCount: payload.paragraphCount,
        speakerLabelCount: payload.speakerLabelCount,
        normalizedChanged: payload.normalizedText !== row.normalized_text,
        titleChanged: payload.rebuiltTitle !== null && payload.rebuiltTitle !== row.title,
      };
    });

    if (!apply) {
      return preview;
    }

    await client.query("BEGIN");

    for (const row of result.rows) {
      const payload = buildStructuredContentRebuildPayload({
        rawText: row.raw_text,
        contentKind: row.content_kind,
        sourceType: row.source_type,
        isGeneratedDraft: table === "generated_drafts",
        existingTitle: row.title,
        scenarioTitle: row.scenario_title,
        difficultyLevel: row.difficulty_level,
      });

      await client.query(
        `
          UPDATE ${table}
          SET
            title = COALESCE($2, title),
            normalized_text = $3,
            structured_content = $4::jsonb,
            updated_at = NOW()
          WHERE id = $1
        `,
        [row.id, payload.rebuiltTitle, payload.normalizedText, JSON.stringify(payload.structuredContent)],
      );
    }

    await client.query("COMMIT");
    return preview;
  } catch (error) {
    if (apply) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    throw error;
  } finally {
    client.release();
  }
}

async function run() {
  const { apply, dryRun, target } = parseRebuildStructuredContentArgs(process.argv.slice(2));
  const tables = TARGET_TABLES[target];
  const previewGroups = [];

  for (const table of tables) {
    previewGroups.push(...(await rebuildTable(table, apply && !dryRun)));
  }

  console.log(JSON.stringify(previewGroups, null, 2));

  if (apply && !dryRun) {
    console.log(`Rebuilt normalized_text and structured_content for ${previewGroups.length} rows.`);
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
