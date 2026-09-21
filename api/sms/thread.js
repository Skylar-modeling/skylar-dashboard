// GET /api/sms/thread?phone=+1234
//
// Returns every message we have for that phone, ordered oldest-first.
// On first open for a phone (hydrated=false), lazy-fetches the full outbound
// + inbound history from ClickSend and caches it — so we can show the whole
// thread on demand without maintaining a global sync.
// Also marks the conversation as read.
import { sql } from '../_lib/db.js';
import { requireUser } from '../_lib/clerk.js';
import { fetchHistory } from '../_lib/clicksend.js';
import { toE164, OUR_NUMBER } from '../_lib/phone.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const phone = toE164(req.query.phone);
  if (!phone) return res.status(400).json({ error: 'Invalid phone' });

  try {
    // Ensure a conversation row exists.
    let convRows = await sql`
      SELECT id, phone_e164, contact_email, contact_name, hydrated, unread, status,
             classification, classification_confidence, last_message_at
      FROM conversations
      WHERE phone_e164 = ${phone}
    `;
    if (convRows.length === 0) {
      convRows = await sql`
        INSERT INTO conversations (phone_e164, unread) VALUES (${phone}, false)
        RETURNING id, phone_e164, contact_email, contact_name, hydrated, unread, status,
                  classification, classification_confidence, last_message_at
      `;
    }
    const conversation = convRows[0];

    // First open → pull history from ClickSend and cache.
    if (!conversation.hydrated) {
      try {
        const history = await fetchHistory(phone, { limit: 100 });
        for (const m of history) {
          if (!m.clicksendId) continue;
          await sql`
            INSERT INTO messages
              (conversation_id, clicksend_id, direction, from_phone, to_phone, body, custom_string, status, source, sent_at)
            VALUES
              (${conversation.id}, ${m.clicksendId}, ${m.direction},
               ${m.fromPhone || OUR_NUMBER}, ${m.toPhone || phone},
               ${m.body || ''}, ${m.customString}, ${m.status}, 'history-fetch', ${m.sentAt})
            ON CONFLICT (clicksend_id) DO NOTHING
          `;
        }
        await sql`UPDATE conversations SET hydrated = true, updated_at = now() WHERE id = ${conversation.id}`;
      } catch (err) {
        // Non-fatal — return whatever we have.
        console.error('History hydration failed:', err.message);
      }
    }

    // Mark as read.
    if (conversation.unread) {
      await sql`UPDATE conversations SET unread = false, updated_at = now() WHERE id = ${conversation.id}`;
    }

    const messages = await sql`
      SELECT id, clicksend_id, direction, from_phone, to_phone, body, status, source,
             sent_at, created_at
      FROM messages
      WHERE conversation_id = ${conversation.id}
      ORDER BY sent_at ASC NULLS LAST, id ASC
    `;

    return res.status(200).json({
      conversation: { ...conversation, unread: false },
      messages,
    });
  } catch (err) {
    console.error('Thread handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
