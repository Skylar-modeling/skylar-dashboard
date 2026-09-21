// ClickSend inbound-SMS webhook. ClickSend POSTs here whenever a lead texts
// our number. Authenticated by a shared secret in the URL (?token=…) matched
// against CLICKSEND_INBOUND_SECRET.
//
// ClickSend's payload uses form-encoded or JSON depending on how you configure
// the rule. We accept either; Vercel already parses JSON bodies.
import { sql } from '../_lib/db.js';
import { toE164, OUR_NUMBER } from '../_lib/phone.js';
import { classifyAndStore } from '../_lib/classifier.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expected = process.env.CLICKSEND_INBOUND_SECRET;
  if (!expected) return res.status(500).json({ error: 'Server misconfigured' });
  if (req.query.token !== expected) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // ClickSend field names: from, to, body, message_id, custom_string, timestamp.
  // Also occasionally "originalmessage" (delivery receipt) or "originalbody" —
  // we only handle inbound bodies here.
  const b = req.body || {};
  const from = toE164(b.from || b.From);
  const to = toE164(b.to || b.To);
  const body = String(b.body || b.Body || '').trim();
  const clicksendId = b.message_id || b.MessageID || null;
  const customString = b.custom_string || b.CustomString || null;
  const tsRaw = b.timestamp || b.Timestamp;
  const sentAt = tsRaw ? new Date(Number(tsRaw) * 1000) : new Date();

  if (!from || !body) {
    return res.status(400).json({ error: 'Missing from or body' });
  }

  try {
    // Upsert conversation.
    const rows = await sql`
      INSERT INTO conversations (phone_e164, contact_email, unread, last_message_at, last_inbound_at, last_message_preview)
      VALUES (${from}, ${customString}, true, ${sentAt}, ${sentAt}, ${body.slice(0, 140)})
      ON CONFLICT (phone_e164) DO UPDATE SET
        unread = true,
        contact_email = COALESCE(EXCLUDED.contact_email, conversations.contact_email),
        last_message_at = EXCLUDED.last_message_at,
        last_inbound_at = EXCLUDED.last_inbound_at,
        last_message_preview = EXCLUDED.last_message_preview,
        updated_at = now()
      RETURNING id
    `;
    const conversationId = rows[0].id;

    // Insert the inbound message. clicksend_id dedups repeated deliveries.
    await sql`
      INSERT INTO messages
        (conversation_id, clicksend_id, direction, from_phone, to_phone, body, custom_string, status, source, sent_at)
      VALUES
        (${conversationId}, ${clicksendId}, 'in', ${from}, ${to || OUR_NUMBER}, ${body}, ${customString}, 'received', 'webhook', ${sentAt})
      ON CONFLICT (clicksend_id) DO NOTHING
    `;

    // Fire-and-forget classification. Don't await — return 200 fast.
    classifyAndStore(conversationId, body).catch((err) => {
      console.error('Classification failed:', err);
    });

    return res.status(200).json({ ok: true, conversationId });
  } catch (err) {
    console.error('Inbound handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
