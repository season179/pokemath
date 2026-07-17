// Generate better-auth DDL from the INSTALLED runtime (not the CLI, which
// lags behind the lib and would bake in schema drift). Runs the runtime's
// own migrations against an in-memory better-sqlite3 DB (same SQLite
// dialect as D1), then dumps the resulting schema.
//
//   node worker/scripts/generate-auth-schema.mjs > worker/scripts/better-auth-schema.sql
//
// The config here MUST mirror worker/src/auth.ts (user.additionalFields).
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import Database from "better-sqlite3";

const db = new Database(":memory:");
const auth = betterAuth({
  database: db,
  socialProviders: {
    google: { clientId: "placeholder", clientSecret: "placeholder" },
  },
  user: {
    additionalFields: {
      // In-game display name, chosen by the player. NULL until first set.
      playerName: { type: "string", required: false, input: false },
    },
  },
});

const { runMigrations } = await getMigrations(auth.options);
await runMigrations();

const rows = db
  .prepare(
    "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type DESC, name",
  )
  .all();
for (const { sql } of rows) console.log(sql + ";\n");
