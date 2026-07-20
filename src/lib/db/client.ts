import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

const databaseUrl = process.env.DATABASE_URL;

export const db = databaseUrl
  ? drizzle(postgres(databaseUrl, { prepare: false }), { schema })
  : null;
