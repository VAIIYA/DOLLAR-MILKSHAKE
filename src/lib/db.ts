import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

// Singleton pattern to avoid multiple connections during Next.js hot reload.
// Lazy initialization prevents build-time failures when env vars are not set.
const globalForDb = globalThis as unknown as { _db: DrizzleDb | undefined };

function createDb(): DrizzleDb {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error("TURSO_DATABASE_URL is not set");
    const client = createClient({ url, authToken });
    return drizzle(client, { schema });
}

function getDb(): DrizzleDb {
    if (!globalForDb._db) {
        globalForDb._db = createDb();
    }
    return globalForDb._db;
}

// Export as a Proxy so it stays lazy — the real client is created only on
// the first property access (i.e., during an actual API request).
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
    get(_target, prop) {
        return getDb()[prop as keyof DrizzleDb];
    },
});
