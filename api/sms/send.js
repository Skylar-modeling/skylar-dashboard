// Send an outbound SMS on behalf of the signed-in user, from our dedicated
// ClickSend number. Writes the outbound to the DB and marks the conversation
// as read (since the rep just handled it).
import { sql } from '../_lib/db.js';
import { requireUser } from '../_lib/clerk.js';
import { sendSms } from '../_lib/clicksend.js';
import { toE164, OUR_NUMBER } from '../_lib/phone.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const { phone, body, customString } = req.body || {};
  const to = toE164(phone);
  const text = String(body || '').trim();
  if (!to) return res.status(400).json({ error: 'Invalid phone' });
  if (!text) return res.status(400).json({ error: 'Empty body' });
  if (text.length > 1600) return res.status(400).json({ error: 'Body too long' });

  try {
    const sent = await sendSms({ to, body: text, customString });

    // Upsert conversation for this phone (in case the rep is starting a new
    // thread cold, not replying to an existing one).
    const now = new Date();
    const preview = text.slice(0, 140);
    const rows = await sql`
      INSERT INTO conversations
        (phone_e164, unread, last_message_at, last_outbound_at, last_message_preview)
      VALUES (${to}, false, ${now}, ${now}, ${preview})
      ON CONFLICT (phone_e164) DO UPDATE SET
        unread = false,
        last_message_at = ${now},
        last_outbound_at = ${now},
        last_message_preview = ${preview},
        updated_at = now()
      RETURNING id
    `;
    const conversationId = rows[0].id;

    await sql`
      INSERT INTO messages
        (conversation_id, clicksend_id, direction, from_phone, to_phone, body, custom_string, status, source, sent_at)
      VALUES
        (${conversationId}, ${sent.clicksendId}, 'out', ${OUR_NUMBER}, ${to}, ${text}, ${customString || null}, ${sent.status || 'sent'}, 'app-send', ${now})
      ON CONFLICT (clicksend_id) DO NOTHING
    `;

    return res.status(200).json({ ok: true, conversationId, clicksendId: sent.clicksendId });
  } catch (err) {
    console.error('Send error:', err);
    return res.status(500).json({ error: err.message, details: err.body });
  }
}
