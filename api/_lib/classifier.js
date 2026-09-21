// Bucket an inbound message into one of six classes using Claude Haiku.
// Called fire-and-forget from the inbound webhook so the webhook response
// stays fast — the classification writes back to the row when it lands.
import Anthropic from '@anthropic-ai/sdk';
import { sql } from './db.js';

const CATEGORIES = ['yes-en', 'yes-es', 'no-en', 'no-es', 'question', 'other'];

const SYSTEM = `You classify short SMS replies from prospective modeling-school students. The outbound question was always a yes/no like "are you still interested?".

Respond with STRICT JSON: {"classification": "<one of ${CATEGORIES.join(' | ')}>", "confidence": <0-1>}

Rules:
- "yes-en" / "yes-es": clear affirmative (Yes / Sí / Claro / I am / Still interested).
- "no-en" / "no-es": clear declines (No / No thanks / Not interested / No gracias).
- "question": they ask something back (When? Where? How much? Can I reschedule?).
- "other": ambiguous, off-topic, or a mixed reply.
- Pick the language (en/es) by the dominant language of the reply.`;

export async function classifyMessage(body) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { classification: null, confidence: null, error: 'ANTHROPIC_API_KEY not set' };

  const client = new Anthropic({ apiKey: key });
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system: SYSTEM,
      messages: [{ role: 'user', content: body.slice(0, 500) }],
    });
    const text = res?.content?.[0]?.text || '';
    const match = text.match(/\{[^}]*\}/);
    if (!match) return { classification: 'other', confidence: 0.3 };
    const parsed = JSON.parse(match[0]);
    const cls = CATEGORIES.includes(parsed.classification) ? parsed.classification : 'other';
    const conf = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : null;
    return { classification: cls, confidence: conf };
  } catch (err) {
    return { classification: null, confidence: null, error: err.message };
  }
}

// Convenience: classify + write back to the conversation row.
export async function classifyAndStore(conversationId, body) {
  const { classification, confidence } = await classifyMessage(body);
  if (!classification) return;
  await sql`
    UPDATE conversations
    SET classification = ${classification},
        classification_confidence = ${confidence},
        updated_at = now()
    WHERE id = ${conversationId}
  `;
}
