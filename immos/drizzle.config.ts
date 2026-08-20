import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  // Rollen werden in 0001_guards.sql angelegt, nicht von drizzle-kit verwaltet.
  entities: { roles: { provider: "", exclude: ["immos_app", "immos_dienst", "immos_owner"] } },
  verbose: true,
  strict: true,
});
