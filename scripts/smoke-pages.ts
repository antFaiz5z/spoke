import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "pg";

type SmokeTargets = {
  scenarioSlug: string;
  contentItemId: string;
  contentItemTitle: string;
  generatedDraftId: string;
  generatedDraftTitle: string;
};

const PORT = Number(process.env.SMOKE_PORT ?? "3101");
const BASE_URL = `http://127.0.0.1:${PORT}`;
const READY_PATH = "/scenarios";

function loadDotEnv() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const envText = readFileSync(".env", "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function getSmokeTargets(): Promise<SmokeTargets> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    const contentResult = await client.query<{
      scenario_slug: string;
      content_item_id: string;
      content_item_title: string;
    }>(`
      SELECT
        s.slug AS scenario_slug,
        ci.id AS content_item_id,
        ci.title AS content_item_title
      FROM content_items ci
      INNER JOIN scenarios s ON s.id = ci.scenario_id
      ORDER BY ci.updated_at DESC
      LIMIT 1
    `);

    const draftResult = await client.query<{
      generated_draft_id: string;
      generated_draft_title: string;
    }>(`
      SELECT
        id AS generated_draft_id,
        title AS generated_draft_title
      FROM generated_drafts
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    const contentRow = contentResult.rows[0];
    const draftRow = draftResult.rows[0];

    assert.ok(contentRow, "No content_items rows found for smoke test");
    assert.ok(draftRow, "No generated_drafts rows found for smoke test");

    return {
      scenarioSlug: contentRow.scenario_slug,
      contentItemId: contentRow.content_item_id,
      contentItemTitle: contentRow.content_item_title,
      generatedDraftId: draftRow.generated_draft_id,
      generatedDraftTitle: draftRow.generated_draft_title,
    };
  } finally {
    await client.end();
  }
}

function startServer(): ChildProcess {
  return spawn("npm", ["run", "dev"], {
    env: {
      ...process.env,
      PORT: String(PORT),
    },
    stdio: "inherit",
  });
}

async function waitForServerReady(): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}${READY_PATH}`, { method: "HEAD" });
      if (response.status < 500) {
        return;
      }
    } catch {}

    await delay(1000);
  }

  throw new Error(`Smoke server did not become ready on ${BASE_URL}${READY_PATH}`);
}

async function fetchText(pathname: string): Promise<string> {
  const response = await fetch(`${BASE_URL}${pathname}`);
  const text = await response.text();
  assert.equal(response.status, 200, `Expected 200 for ${pathname}, got ${response.status}`);
  return text;
}

async function main() {
  loadDotEnv();
  const targets = await getSmokeTargets();
  const server = startServer();

  try {
    await waitForServerReady();

    const scenarioHtml = await fetchText(`/scenarios/${targets.scenarioSlug}`);
    assert.match(scenarioHtml, new RegExp(targets.contentItemTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

    const practiceHtml = await fetchText(`/practice/content-items/${targets.contentItemId}`);
    assert.match(practiceHtml, /Back to article catalog/);
    assert.match(practiceHtml, /auto next/i);

    const draftHtml = await fetchText(`/practice/generated-drafts/${targets.generatedDraftId}`);
    assert.match(draftHtml, new RegExp(targets.generatedDraftTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(draftHtml, /Save to scenario/);
  } finally {
    server.kill("SIGTERM");
    await delay(1000);
    if (!server.killed) {
      server.kill("SIGKILL");
    }
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
