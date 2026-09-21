// One-time DB setup endpoint. Idempotent — safe to hit multiple times.
// Visit https://skylar-dashboard.vercel.app/api/sms/init?token=<CLICKSEND_INBOUND_SECRET>
// once after the first deploy to create the schema. The SQL below is the
// same as db/migrations/*.sql; kept inline so this endpoint doesn't have to
// read migration files off the Vercel deployment bundle.
import { sql } from '../_lib/db.js';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS conversations (
     id BIGSERIAL PRIMARY KEY,
     phone_e164 TEXT UNIQUE NOT NULL,
     contact_email TEXT,
     contact_name TEXT,
     unread BOOLEAN NOT NULL DEFAULT true,
     status TEXT NOT NULL DEFAULT 'open',
     classification TEXT,
     classification_confidence REAL,
     hydrated BOOLEAN NOT NULL DEFAULT false,
     last_message_at TIMESTAMPTZ,
     last_message_preview TEXT,
     last_inbound_at TIMESTAMPTZ,
     last_outbound_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx
     ON conversations (last_message_at DESC NULLS LAST)`,
  `CREATE INDEX IF NOT EXISTS conversations_unread_idx
     ON conversations (unread, last_message_at DESC) WHERE unread = true`,
  `CREATE TABLE IF NOT EXISTS messages (
     id BIGSERIAL PRIMARY KEY,
     conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
     clicksend_id TEXT UNIQUE,
     direction TEXT NOT NULL,
     from_phone TEXT NOT NULL,
     to_phone TEXT NOT NULL,
     body TEXT NOT NULL,
     custom_string TEXT,
     status TEXT,
     source TEXT NOT NULL,
     sent_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS messages_conversation_idx
     ON messages (conversation_id, sent_at ASC NULLS LAST)`,
  `CREATE TABLE IF NOT EXISTS templates (
     id BIGSERIAL PRIMARY KEY,
     label TEXT NOT NULL,
     body TEXT NOT NULL,
     language TEXT NOT NULL DEFAULT 'en',
     sort_order INT NOT NULL DEFAULT 0
   )`,
];

const SEED_TEMPLATES = [
  { label: 'Book appointment (EN)', body: "I'd love to schedule an appointment with you. You can easily set it up here: skylarmodeling.com/contact", language: 'en', sort_order: 1 },
  { label: 'Reservar cita (ES)',     body: "Me encantaría agendar una cita contigo. Puedes reservarla fácilmente aquí: skylarmodeling.com/contact", language: 'es', sort_order: 2 },
  { label: 'Follow up (EN)',         body: "Just checking in! Are you still interested in learning more about Skylar Modeling?", language: 'en', sort_order: 3 },
  { label: 'Understood (EN)',        body: "Understood — thanks for letting us know! If anything changes down the road, we're just a text away.", language: 'en', sort_order: 4 },
];

export default async function handler(req, res) {
  const expected = process.env.CLICKSEND_INBOUND_SECRET;
  if (!expected) return res.status(500).json({ error: 'Server misconfigured' });
  if (req.query.token !== expected) return res.status(401).json({ error: 'Invalid token' });

  try {
    for (const stmt of SCHEMA_STATEMENTS) {
      // Neon HTTP driver: sql is a callable — pass a plain string to run
      // a raw statement (there is no .query() method).
      await sql(stmt);
    }
    // Seed templates only if the table is empty (idempotent).
    const existing = await sql`SELECT COUNT(*)::int AS count FROM templates`;
    if (existing[0].count === 0) {
      for (const t of SEED_TEMPLATES) {
        await sql`
          INSERT INTO templates (label, body, language, sort_order)
          VALUES (${t.label}, ${t.body}, ${t.language}, ${t.sort_order})
        `;
      }
    }
    return res.status(200).json({
      ok: true,
      tables: ['conversations', 'messages', 'templates'],
      templatesSeeded: existing[0].count === 0 ? SEED_TEMPLATES.length : 0,
      message: 'Schema ready. You can now use the inbox.',
    });
  } catch (err) {
    console.error('Init error:', err);
    return res.status(500).json({ error: err.message });
  }
}
