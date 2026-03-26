import process from "node:process";
import { getDbPool } from "@/db";

const scenarios = [
  {
    slug: "job-interview",
    title: "Job Interview",
    summary: "Practice common interview answers and follow-up questions.",
    category: "workplace",
    sortOrder: 10,
  },
  {
    slug: "workplace-meeting",
    title: "Workplace Meeting",
    summary: "Practice discussion, clarification, and status update language.",
    category: "workplace",
    sortOrder: 20,
  },
  {
    slug: "travel",
    title: "Travel",
    summary: "Practice airport, hotel, and trip planning conversations.",
    category: "daily-life",
    sortOrder: 30,
  },
];

async function run() {
  const pool = getDbPool();

  for (const scenario of scenarios) {
    await pool.query(
      `
        INSERT INTO scenarios (
          slug,
          title,
          summary,
          category,
          status,
          sort_order
        )
        VALUES ($1, $2, $3, $4, 'active', $5)
        ON CONFLICT (slug)
        DO UPDATE SET
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          category = EXCLUDED.category,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
      `,
      [
        scenario.slug,
        scenario.title,
        scenario.summary,
        scenario.category,
        scenario.sortOrder,
      ],
    );
  }

  console.log(`Seeded ${scenarios.length} scenarios.`);
  await pool.end();
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
