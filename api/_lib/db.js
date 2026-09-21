// Neon Postgres client. Uses the HTTP driver, which is safe to instantiate
// at module load in Vercel's Node runtime — it doesn't hold a connection.
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  // Fail fast at deploy time rather than at first request.
  throw new Error('DATABASE_URL is not set — connect Neon in Vercel → Storage.');
}

export const sql = neon(process.env.DATABASE_URL);
