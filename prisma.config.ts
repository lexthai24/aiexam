// Prisma CLI configuration.
//
// Next.js loads `.env.local` automatically for the app, but the Prisma CLI
// (migrate / db push / seed) does not — so we explicitly load it here (and fall
// back to `.env`) so `DATABASE_URL` is available to CLI commands too.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct Postgres connection. Prefer DIRECT_DATABASE_URL;
    // fall back to DATABASE_URL (works when it is itself a direct connection).
    url: process.env["DIRECT_DATABASE_URL"] || process.env["DATABASE_URL"],
  },
});
