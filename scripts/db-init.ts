import { readFile } from "node:fs/promises";
import process from "node:process";
import { getDbPool } from "@/db";

async function run() {
  const sql = await readFile("./db/schema.sql", "utf8");
  const pool = getDbPool();
  await pool.query(sql);
  console.log("Database schema applied from db/schema.sql");
  await pool.end();
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
