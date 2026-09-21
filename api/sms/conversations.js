// GET  /api/sms/conversations?filter=unread|all|yes|no|question&limit=100
// PATCH /api/sms/conversations?id=<id>  body: { unread?, status? }
// GET  /api/sms/conversations?count=unread  →  { count }
// GET  /api/sms/conversations?templates=1   →  { templates }
import { sql } from '../_lib/db.js';
import { requireUser } from '../_lib/clerk.js';

export default async function handler(req, res) {
  const auth = await requireUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    if (req.method === 'GET') {
      if (req.query.count === 'unread') {
        const rows = await sql`SELECT COUNT(*)::int AS count FROM conversations WHERE unread = true AND status = 'open'`;
        return res.status(200).json({ count: rows[0].count });
      }
      if (req.query.templates) {
        const rows = await sql`SELECT id, label, body, language, sort_order FROM templates ORDER BY sort_order ASC, id ASC`;
        return res.status(200).json({ templates: rows });
      }

      const filter = req.query.filter || 'all';
      const limit = Math.min(Number(req.query.limit) || 100, 500);

      let rows;
      if (filter === 'unread') {
        rows = await sql`
          SELECT id, phone_e164, contact_email, contact_name, unread, status,
                 classification, classification_confidence,
                 last_message_at, last_message_preview
          FROM conversations
          WHERE unread = true AND status = 'open'
          ORDER BY last_message_at DESC NULLS LAST
          LIMIT ${limit}
        `;
      } else if (['yes', 'no', 'question'].includes(filter)) {
        // 'yes' matches yes-en OR yes-es; same for no.
        const prefix = filter + '-';
        rows = await sql`
          SELECT id, phone_e164, contact_email, contact_name, unread, status,
                 classification, classification_confidence,
                 last_message_at, last_message_preview
          FROM conversations
          WHERE (classification = ${filter} OR classification LIKE ${prefix + '%'})
            AND status = 'open'
          ORDER BY last_message_at DESC NULLS LAST
          LIMIT ${limit}
        `;
      } else if (filter === 'archived') {
        rows = await sql`
          SELECT id, phone_e164, contact_email, contact_name, unread, status,
                 classification, classification_confidence,
                 last_message_at, last_message_preview
          FROM conversations
          WHERE status = 'archived'
          ORDER BY last_message_at DESC NULLS LAST
          LIMIT ${limit}
        `;
      } else {
        rows = await sql`
          SELECT id, phone_e164, contact_email, contact_name, unread, status,
                 classification, classification_confidence,
                 last_message_at, last_message_preview
          FROM conversations
          WHERE status = 'open'
          ORDER BY last_message_at DESC NULLS LAST
          LIMIT ${limit}
        `;
      }

      return res.status(200).json({ conversations: rows });
    }

    if (req.method === 'PATCH') {
      const id = Number(req.query.id);
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { unread, status } = req.body || {};

      const rows = await sql`
        UPDATE conversations
        SET unread = COALESCE(${unread ?? null}::boolean, unread),
            status = COALESCE(${status ?? null}::text, status),
            updated_at = now()
        WHERE id = ${id}
        RETURNING id, phone_e164, unread, status
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ conversation: rows[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Conversations handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
