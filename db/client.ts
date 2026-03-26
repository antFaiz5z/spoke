import { Pool } from "pg";
import { getEnv } from "@/lib/env";

declare global {
  var __spokePool: Pool | undefined;
}

export function getDbPool(): Pool {
  if (!global.__spokePool) {
    global.__spokePool = new Pool({
      connectionString: getEnv("DATABASE_URL"),
    });
  }

  return global.__spokePool;
}
