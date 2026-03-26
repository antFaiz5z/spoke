import { readFile } from "node:fs/promises";
import process from "node:process";
import { getDbPool } from "@/db";
import { buildStructuredContent, normalizeText } from "@/lib/content-processing";
import type { ContentKind } from "@/lib/types/content";

type ImportRecord = {
  scenarioSlug: string;
  title: string;
  rawText: string;
  contentKind: ContentKind;
  difficultyLevel: string;
};

type ScenarioRow = {
  id: string;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--"));
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run") || !apply;

  if (!file) {
    throw new Error(
      "Usage: tsx scripts/import-preset-content.ts <file.json> [--dry-run|--apply]",
    );
  }

  return { file, dryRun, apply };
}

async function loadRecords(file: string): Promise<ImportRecord[]> {
  const content = await readFile(file, "utf8");
  const parsed = JSON.parse(content) as ImportRecord[];

  if (!Array.isArray(parsed)) {
    throw new Error("Input file must be a JSON array");
  }

  return parsed;
}

async function run() {
  const { file, dryRun, apply } = parseArgs();
  const records = await loadRecords(file);

  if (records.length === 0) {
    console.log("No records found.");
    return;
  }

  const preview = records.map((record) => {
    const normalizedText = normalizeText(record.rawText);
    const structuredContent = buildStructuredContent(normalizedText);

    return {
      scenarioSlug: record.scenarioSlug,
      title: record.title,
      contentKind: record.contentKind,
      difficultyLevel: record.difficultyLevel,
      paragraphCount: structuredContent.paragraphs.length,
      tokenCount: structuredContent.paragraphs.flatMap((p) =>
        p.sentences.flatMap((s) => s.tokens),
      ).length,
    };
  });

  console.log(JSON.stringify(preview, null, 2));

  if (!apply || dryRun) {
    return;
  }

  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const record of records) {
      const scenarioResult = await client.query<ScenarioRow>(
        "SELECT id FROM scenarios WHERE slug = $1 LIMIT 1",
        [record.scenarioSlug],
      );

      const scenario = scenarioResult.rows[0];
      if (!scenario) {
        throw new Error(`Scenario not found: ${record.scenarioSlug}`);
      }

      const normalizedText = normalizeText(record.rawText);
      const structuredContent = buildStructuredContent(normalizedText);

      await client.query(
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
            created_by_type
          )
          VALUES ($1, 'preset', $2, $3, $4, $5, $6::jsonb, 'en', $7, 'ready', 'system')
        `,
        [
          scenario.id,
          record.contentKind,
          record.title,
          record.rawText,
          normalizedText,
          JSON.stringify(structuredContent),
          record.difficultyLevel,
        ],
      );
    }

    await client.query("COMMIT");
    console.log(`Imported ${records.length} preset content items.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
