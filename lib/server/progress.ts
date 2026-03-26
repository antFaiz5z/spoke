import { getDbPool } from "@/db";
import type {
  MarkReadResponse,
  UpdateProgressResponse,
} from "@/lib/types/api";

type MarkReadRow = {
  content_item_id: string;
  has_read: boolean;
  first_read_at: Date;
  last_read_at: Date;
};

type ProgressRow = {
  content_item_id: string;
  farthest_paragraph_index: number;
  last_read_at: Date;
};

export async function markContentItemRead(id: string): Promise<MarkReadResponse> {
  const pool = getDbPool();
  const result = await pool.query<MarkReadRow>(
    `
      INSERT INTO article_read_states (
        content_item_id,
        has_read,
        first_read_at,
        last_read_at
      )
      VALUES ($1, TRUE, NOW(), NOW())
      ON CONFLICT (content_item_id)
      DO UPDATE SET
        has_read = TRUE,
        first_read_at = COALESCE(article_read_states.first_read_at, NOW()),
        last_read_at = NOW(),
        updated_at = NOW()
      RETURNING
        content_item_id,
        has_read,
        first_read_at,
        last_read_at
    `,
    [id],
  );

  const row = result.rows[0];

  return {
    contentItemId: row.content_item_id,
    hasRead: true,
    firstReadAt: row.first_read_at.toISOString(),
    lastReadAt: row.last_read_at.toISOString(),
  };
}

export async function updateContentItemProgress(
  id: string,
  farthestParagraphIndex: number,
): Promise<UpdateProgressResponse> {
  const pool = getDbPool();
  const result = await pool.query<ProgressRow>(
    `
      INSERT INTO article_progress (
        content_item_id,
        farthest_paragraph_index,
        last_read_at
      )
      VALUES ($1, $2, NOW())
      ON CONFLICT (content_item_id)
      DO UPDATE SET
        farthest_paragraph_index = GREATEST(
          article_progress.farthest_paragraph_index,
          EXCLUDED.farthest_paragraph_index
        ),
        last_read_at = NOW(),
        updated_at = NOW()
      RETURNING
        content_item_id,
        farthest_paragraph_index,
        last_read_at
    `,
    [id, farthestParagraphIndex],
  );

  const row = result.rows[0];

  return {
    contentItemId: row.content_item_id,
    farthestParagraphIndex: row.farthest_paragraph_index,
    lastReadAt: row.last_read_at.toISOString(),
  };
}
