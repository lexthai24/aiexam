import { PrismaClient } from "@/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaPg } from "@prisma/adapter-pg";

// Build a Prisma client that works with EITHER connection-string format, so the
// app runs the same locally and on any host regardless of how the database is
// provisioned:
//
//   • prisma+postgres://accelerate.prisma-data.net/...  → Prisma Accelerate
//   • postgres:// or postgresql://...                    → direct Postgres (pg)
//
// Prisma-managed hosting sets DATABASE_URL to a direct postgres:// URL and also
// provides DATABASE_URL_POOLED (a pgbouncer-pooled connection). In serverless
// runtimes we prefer the pooled URL to avoid exhausting connections. This avoids
// the production failure where the host's URL format differed from the
// Accelerate URL the code assumed, causing every query to throw (empty 500s).
function pickUrl(): string {
  const accelerate = process.env.DATABASE_URL ?? "";
  // If DATABASE_URL is an Accelerate URL, use it directly.
  if (
    accelerate.startsWith("prisma+postgres://") ||
    accelerate.startsWith("prisma://")
  ) {
    return accelerate;
  }
  // Otherwise it's a direct connection — prefer the pooled variant if present.
  return process.env.DATABASE_URL_POOLED || accelerate;
}

function makeClient() {
  const url = pickUrl();

  // Both branches apply withAccelerate() so they return the SAME extended-client
  // type (the extension is harmless on a direct connection — it just adds
  // cache-strategy options we don't use). Keeping one return type is required
  // for query methods to stay callable/typed.
  const base =
    url.startsWith("prisma+postgres://") || url.startsWith("prisma://")
      ? new PrismaClient({ accelerateUrl: url })
      : new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  return base.$extends(withAccelerate());
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof makeClient>;
};

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
