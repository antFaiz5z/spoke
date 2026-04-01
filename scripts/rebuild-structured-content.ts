import process from "node:process";
import { getDbPool } from "@/db";
import {
  buildStructuredContentRebuildPayload,
  parseRebuildStructuredContentArgs,
  type RebuildTarget,
} from "@/scripts/rebuild-structured-content-lib";

type RebuildRow = {
  id: string;
  raw_text: string;
  normalized_text: string;
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
      `SELECT id, raw_text, normalized_text FROM ${table} ORDER BY updated_at DESC`,
    );

    const preview = result.rows.map((row) => {
      const payload = buildStructuredContentRebuildPayload(row.raw_text);

      return {
        table,
        id: row.id,
        paragraphCount: payload.paragraphCount,
        speakerLabelCount: payload.speakerLabelCount,
        normalizedChanged: payload.normalizedText !== row.normalized_text,
      };
    });

    if (!apply) {
      return preview;
    }

    await client.query("BEGIN");

    for (const row of result.rows) {
      const payload = buildStructuredContentRebuildPayload(row.raw_text);

      await client.query(
        `
          UPDATE ${table}
          SET
            normalized_text = $2,
            structured_content = $3::jsonb,
            updated_at = NOW()
          WHERE id = $1
        `,
        [row.id, payload.normalizedText, JSON.stringify(payload.structuredContent)],
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
