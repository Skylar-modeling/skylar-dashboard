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
  { label: 'Wrong email / spam (EN)', body: "You might have signed up with the wrong email or check your spam folder — I'd love to schedule an appointment with you. You can easily set it up here: skylarmodeling.com/contact", language: 'en', sort_order: 5 },
  { label: 'Correo/spam (ES · virtual)', body: "Puede que te hayas registrado con el correo equivocado o revisa tu carpeta de spam — me encantaría agendar tu audición virtual. Puedes reservarla aquí: https://calendly.com/d/ctgt-9s5-7ws/virtual-audicion", language: 'es', sort_order: 6 },
  { label: 'Correo/spam (ES · presencial)', body: "Puede que te hayas registrado con el correo equivocado o revisa tu carpeta de spam — me encantaría agendar tu audición presencial. Puedes reservarla aquí: https://calendly.com/skylarmodeling/audicion", language: 'es', sort_order: 7 },
  { label: 'Cost? (EN)', body: "The consultation is completely free! We only work with 6 models, and if we feel you're a good fit, we may offer you a program that requires an investment. If not, we'll still give you your next steps for free.\n\nI'd love to schedule an appointment with you! You can easily book one here: skylarmodeling.com/contact", language: 'en', sort_order: 8 },
  { label: '¿Costo? (ES)', body: "¡La consulta es completamente gratuita! Solo trabajamos con 6 modelos, y si sentimos que eres una buena opción, es posible que te ofrezcamos un programa que requiera una inversión. Si no, igual te daremos tus próximos pasos sin costo.\n\n¡Me encantaría agendar una cita contigo! Puedes reservarla fácilmente aquí: https://calendly.com/skylarmodeling/audicion", language: 'es', sort_order: 9 },
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
    // Seed templates idempotently — insert each by label only if it doesn't
    // already exist. Lets us add new quick-reply buttons later by adding to
    // SEED_TEMPLATES and re-hitting this endpoint; existing rows are left
    // alone (edits to their body should be done in the DB directly).
    //
    // Pass ?upsert=1 to also update body/language/sort_order on existing
    // rows whose content differs from SEED_TEMPLATES. Destructive to any
    // manual DB edits that don't match the source, which is exactly what we
    // want when the source-code copy is the authoritative version.
    const upsert = req.query.upsert === '1' || req.query.upsert === 'true';
    let inserted = 0;
    let updated = 0;
    for (const t of SEED_TEMPLATES) {
      const insertResult = await sql`
        INSERT INTO templates (label, body, language, sort_order)
        SELECT ${t.label}, ${t.body}, ${t.language}, ${t.sort_order}
        WHERE NOT EXISTS (SELECT 1 FROM templates WHERE label = ${t.label})
        RETURNING id
      `;
      if (insertResult.length > 0) {
        inserted += 1;
        continue;
      }
      if (upsert) {
        const updateResult = await sql`
          UPDATE templates
          SET body = ${t.body},
              language = ${t.language},
              sort_order = ${t.sort_order}
          WHERE label = ${t.label}
            AND (body <> ${t.body} OR language <> ${t.language} OR sort_order <> ${t.sort_order})
          RETURNING id
        `;
        if (updateResult.length > 0) updated += 1;
      }
    }
    const parts = [];
    if (inserted > 0) parts.push(`Added ${inserted} new template${inserted === 1 ? '' : 's'}`);
    if (updated > 0) parts.push(`updated ${updated} existing`);
    const message = parts.length > 0
      ? `Schema ready. ${parts.join(', ')}.`
      : 'Schema ready. All templates already present and in sync.';
    return res.status(200).json({
      ok: true,
      tables: ['conversations', 'messages', 'templates'],
      templatesSeeded: inserted,
      templatesUpdated: updated,
      message,
    });
  } catch (err) {
    console.error('Init error:', err);
    return res.status(500).json({ error: err.message });
  }
}
