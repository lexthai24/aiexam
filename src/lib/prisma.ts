import { PrismaClient } from "@/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaPg } from "@prisma/adapter-pg";

// Build a Prisma client that works with EITHER connection-string format, so the
// app runs the same locally and on any host regardless of how DATABASE_URL is
// provisioned:
//
//   • prisma+postgres://accelerate.prisma-data.net/...  → Prisma Accelerate
//   • postgres:// or postgresql://...                    → direct Postgres (pg)
//
// This avoids a common production failure where the host sets DATABASE_URL to a
// direct connection string but the code assumed an Accelerate URL (or vice
// versa), causing every query to throw and API routes to return empty 500s.
function makeClient() {
  const url = process.env.DATABASE_URL ?? "";

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
