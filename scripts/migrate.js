// Idempotent migration runner. Reads every .sql file in db/migrations/ in
// name order and executes it. Files use IF NOT EXISTS / seed guards so they
// can run repeatedly without failing.
//
// Usage:
//   DATABASE_URL='postgres://...' npm run migrate
//
// Vercel deployments do NOT auto-run this — trigger from your machine after
// deploying schema changes (or wire into a GitHub Action later).
import { neon } from '@neondatabase/serverless';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'db', 'migrations');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy it from Vercel → Storage → skylar-inbox → .env.local snippet.');
  process.exit(1);
}

const sql = neon(url);

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('No migrations to run.');
  process.exit(0);
}

for (const file of files) {
  const path = join(MIGRATIONS_DIR, file);
  const contents = readFileSync(path, 'utf8');
  console.log(`→ ${file}`);
  // Neon's HTTP driver won't execute a raw multi-statement string, so split
  // on semicolons at end-of-line (crude but works for our own migration files).
  const statements = contents
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--'));
  for (const stmt of statements) {
    // Neon HTTP driver: sql is a callable — pass a plain string to run
    // a raw statement (there is no .query() method).
    await sql(stmt);
  }
}

console.log(`\n✓ ${files.length} migration file${files.length !== 1 ? 's' : ''} applied.`);
