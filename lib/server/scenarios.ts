import { getDbPool } from "@/db";
import type {
  ScenarioDetail,
  ScenarioListItem,
  ScenarioContentListResponse,
} from "@/lib/types/api";
import type { ContentKind, SourceType } from "@/lib/types/content";

type ScenarioListRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  article_count: string;
  read_count: string;
  last_read_at: Date | null;
};

type ScenarioDetailRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  article_count: string;
  read_count: string;
};

type ScenarioContentRow = {
  scenario_id: string;
  scenario_slug: string;
  scenario_title: string;
  id: string;
  title: string;
  content_kind: ContentKind;
  difficulty_level: string;
  source_type: SourceType;
  has_read: boolean | null;
  farthest_paragraph_index: number | null;
  updated_at: Date;
};

function buildReadProgress(readCount: number, totalCount: number) {
  return {
    readCount,
    totalCount,
    ratio: totalCount === 0 ? 0 : Number((readCount / totalCount).toFixed(2)),
  };
}

export async function listScenarios(): Promise<ScenarioListItem[]> {
  const pool = getDbPool();
  const result = await pool.query<ScenarioListRow>(`
    SELECT
      s.id,
      s.slug,
      s.title,
      s.summary,
      COUNT(ci.id)::text AS article_count,
      COUNT(ars.id) FILTER (WHERE ars.has_read = TRUE)::text AS read_count,
      MAX(ars.last_read_at) AS last_read_at
    FROM scenarios s
    LEFT JOIN content_items ci ON ci.scenario_id = s.id
    LEFT JOIN article_read_states ars ON ars.content_item_id = ci.id
    WHERE s.status = 'active'
    GROUP BY s.id, s.slug, s.title, s.summary, s.sort_order
    ORDER BY s.sort_order ASC, s.title ASC
  `);

  return result.rows.map((row) => {
    const articleCount = Number(row.article_count);
    const readCount = Number(row.read_count);

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      articleCount,
      readProgress: buildReadProgress(readCount, articleCount),
      lastReadAt: row.last_read_at ? row.last_read_at.toISOString() : null,
    };
  });
}

export async function getScenarioBySlug(slug: string): Promise<ScenarioDetail | null> {
  const pool = getDbPool();
  const result = await pool.query<ScenarioDetailRow>(
    `
      SELECT
        s.id,
        s.slug,
        s.title,
        s.summary,
        s.category,
        COUNT(ci.id)::text AS article_count,
        COUNT(ars.id) FILTER (WHERE ars.has_read = TRUE)::text AS read_count
      FROM scenarios s
      LEFT JOIN content_items ci ON ci.scenario_id = s.id
      LEFT JOIN article_read_states ars ON ars.content_item_id = ci.id
      WHERE s.slug = $1
      GROUP BY s.id, s.slug, s.title, s.summary, s.category
    `,
    [slug],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const articleCount = Number(row.article_count);
  const readCount = Number(row.read_count);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category,
    articleCount,
    readProgress: buildReadProgress(readCount, articleCount),
  };
}

export async function listScenarioContentItems(
  slug: string,
): Promise<ScenarioContentListResponse | null> {
  const pool = getDbPool();
  const result = await pool.query<ScenarioContentRow>(
    `
      SELECT
        s.id AS scenario_id,
        s.slug AS scenario_slug,
        s.title AS scenario_title,
        ci.id,
        ci.title,
        ci.content_kind,
        ci.difficulty_level,
        ci.source_type,
        ars.has_read,
        ap.farthest_paragraph_index,
        ci.updated_at
      FROM scenarios s
      INNER JOIN content_items ci ON ci.scenario_id = s.id
      LEFT JOIN article_read_states ars ON ars.content_item_id = ci.id
      LEFT JOIN article_progress ap ON ap.content_item_id = ci.id
      WHERE s.slug = $1
      ORDER BY ci.updated_at DESC, ci.created_at DESC
    `,
    [slug],
  );

  if (result.rows.length === 0) {
    const scenario = await getScenarioBySlug(slug);
    if (!scenario) {
      return null;
    }

    return {
      scenario: {
        id: scenario.id,
        slug: scenario.slug,
        title: scenario.title,
      },
      items: [],
    };
  }

  const first = result.rows[0];

  return {
    scenario: {
      id: first.scenario_id,
      slug: first.scenario_slug,
      title: first.scenario_title,
    },
    items: result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      contentKind: row.content_kind,
      difficultyLevel: row.difficulty_level,
      sourceType: row.source_type,
      hasRead: Boolean(row.has_read),
      farthestParagraphIndex: row.farthest_paragraph_index ?? 0,
      updatedAt: row.updated_at.toISOString(),
    })),
  };
}
