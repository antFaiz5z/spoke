import { getDbPool } from "@/db";
import type { ContentItemDetailResponse } from "@/lib/types/api";
import type { StructuredContent, ContentKind, SourceType } from "@/lib/types/content";

type ContentItemDetailRow = {
  scenario_id: string;
  scenario_slug: string;
  scenario_title: string;
  content_item_id: string;
  content_title: string;
  content_kind: ContentKind;
  difficulty_level: string;
  source_type: SourceType;
  content_status: string;
  structured_content: StructuredContent;
  farthest_paragraph_index: number | null;
  progress_last_read_at: Date | null;
  has_read: boolean | null;
  first_read_at: Date | null;
  state_last_read_at: Date | null;
};

type NavigationRow = {
  prev_id: string | null;
  next_id: string | null;
  is_first: boolean;
  is_last: boolean;
};

export async function getContentItemDetail(
  id: string,
): Promise<ContentItemDetailResponse | null> {
  const pool = getDbPool();
  const result = await pool.query<ContentItemDetailRow>(
    `
      SELECT
        s.id AS scenario_id,
        s.slug AS scenario_slug,
        s.title AS scenario_title,
        ci.id AS content_item_id,
        ci.title AS content_title,
        ci.content_kind,
        ci.difficulty_level,
        ci.source_type,
        ci.status AS content_status,
        ci.structured_content,
        ap.farthest_paragraph_index,
        ap.last_read_at AS progress_last_read_at,
        ars.has_read,
        ars.first_read_at,
        ars.last_read_at AS state_last_read_at
      FROM content_items ci
      INNER JOIN scenarios s ON s.id = ci.scenario_id
      LEFT JOIN article_progress ap ON ap.content_item_id = ci.id
      LEFT JOIN article_read_states ars ON ars.content_item_id = ci.id
      WHERE ci.id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const navigationResult = await pool.query<NavigationRow>(
    `
      WITH ordered AS (
        SELECT
          ci.id,
          LAG(ci.id) OVER (ORDER BY ci.updated_at DESC, ci.created_at DESC) AS prev_id,
          LEAD(ci.id) OVER (ORDER BY ci.updated_at DESC, ci.created_at DESC) AS next_id
        FROM content_items ci
        WHERE ci.scenario_id = $1
      )
      SELECT
        prev_id,
        next_id,
        prev_id IS NULL AS is_first,
        next_id IS NULL AS is_last
      FROM ordered
      WHERE id = $2
      LIMIT 1
    `,
    [row.scenario_id, id],
  );

  const navigation = navigationResult.rows[0];

  return {
    subjectType: "contentItem",
    scenario: {
      id: row.scenario_id,
      slug: row.scenario_slug,
      title: row.scenario_title,
    },
    contentItem: {
      id: row.content_item_id,
      scenarioId: row.scenario_id,
      title: row.content_title,
      contentKind: row.content_kind,
      difficultyLevel: row.difficulty_level,
      sourceType: row.source_type,
      status: row.content_status,
    },
    structuredContent: row.structured_content,
    articleProgress: {
      farthestParagraphIndex: row.farthest_paragraph_index ?? 0,
      lastReadAt: row.progress_last_read_at
        ? row.progress_last_read_at.toISOString()
        : null,
    },
    articleReadState: {
      hasRead: Boolean(row.has_read),
      firstReadAt: row.first_read_at ? row.first_read_at.toISOString() : null,
      lastReadAt: row.state_last_read_at ? row.state_last_read_at.toISOString() : null,
    },
    navigation: {
      prevContentItemId: navigation?.prev_id ?? null,
      nextContentItemId: navigation?.next_id ?? null,
      isFirst: navigation?.is_first ?? true,
      isLast: navigation?.is_last ?? true,
    },
  };
}
