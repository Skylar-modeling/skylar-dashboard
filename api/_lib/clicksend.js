// Thin ClickSend REST wrapper. Basic auth (username:api_key), JSON payloads.
// Docs: https://developers.clicksend.com/docs/rest/v3/
import { OUR_NUMBER } from './phone.js';

const BASE = 'https://rest.clicksend.com/v3';

function authHeader() {
  const user = process.env.CLICKSEND_USERNAME;
  const key = process.env.CLICKSEND_API_KEY;
  if (!user || !key) {
    throw new Error('CLICKSEND_USERNAME or CLICKSEND_API_KEY is not set.');
  }
  return `Basic ${Buffer.from(`${user}:${key}`).toString('base64')}`;
}

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`ClickSend ${method} ${path} → ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

// Send a single SMS from our dedicated number.
export async function sendSms({ to, body, customString }) {
  const payload = {
    messages: [{
      source: 'skylar-inbox',
      from: OUR_NUMBER,
      to,
      body,
      custom_string: customString || '',
    }],
  };
  const res = await call('/sms/send', { method: 'POST', body: payload });
  const msg = res?.data?.messages?.[0];
  return {
    clicksendId: msg?.message_id || null,
    status: msg?.status || null,
    raw: msg,
  };
}

// Pull all SMS history for a specific phone number (both directions).
// ClickSend's history endpoint retains 4 months; anything older is gone.
// The `q` parameter filters by phone in either direction.
export async function fetchHistory(phone, { limit = 100 } = {}) {
  const res = await call(`/sms/history?q=${encodeURIComponent(phone)}&limit=${limit}`);
  const rows = res?.data?.data || [];
  return rows.map((r) => ({
    clicksendId: r.message_id,
    direction: r.direction === 'in' ? 'in' : 'out',
    fromPhone: r.from,
    toPhone: r.to,
    body: r.body,
    customString: r.custom_string || null,
    status: r.status || null,
    sentAt: r.date ? new Date(r.date * 1000) : null,
  }));
}
