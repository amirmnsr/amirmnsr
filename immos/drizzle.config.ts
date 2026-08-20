import type { Config } from "drizzle-kit";

/**
 * Migrationen werden erzeugt, nicht handgeschrieben:
 *   npx drizzle-kit generate
 * Anschließend `src/db/policies.sql` an die erste Migration anhängen — Trigger,
 * Ausschluss-Constraints und erzwungene Row Level Security stehen dort.
 */
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/immos",
  },
  verbose: true,
  strict: true,
  // Policies stehen im Schema, sollen aber von drizzle-kit verwaltet werden.
  entities: { roles: { provider: "" } },
} satisfies Config;
