import mongoose from "mongoose";

// Next.js dev mode reloads files often. Caching the connection on globalThis
// stops us from opening a new database connection on every reload.
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as unknown as { _mongoose?: Cache };
const cache: Cache = (g._mongoose ??= { conn: null, promise: null });

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Add it to web/.env.local");

  if (cache.conn) return cache.conn;
  try {
    cache.promise ??= mongoose.connect(uri);
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null; // allow a retry next request
    throw e;
  }
  return cache.conn;
}