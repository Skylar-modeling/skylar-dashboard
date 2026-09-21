// Frontend client for the SMS Inbox API. All endpoints require a Clerk
// bearer token; the token getter is injected from the page (Clerk's
// useAuth().getToken lives in React, not module scope).
async function req(path, { getToken, method = 'GET', body } = {}) {
  const token = getToken ? await getToken() : null;
  const res = await fetch(path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export function listConversations(getToken, filter = 'all') {
  return req(`/api/sms/conversations?filter=${encodeURIComponent(filter)}`, { getToken });
}

export function unreadCount(getToken) {
  return req(`/api/sms/conversations?count=unread`, { getToken });
}

export function loadTemplates(getToken) {
  return req(`/api/sms/conversations?templates=1`, { getToken });
}

export function loadThread(getToken, phone) {
  return req(`/api/sms/thread?phone=${encodeURIComponent(phone)}`, { getToken });
}

export function updateConversation(getToken, id, patch) {
  return req(`/api/sms/conversations?id=${id}`, { getToken, method: 'PATCH', body: patch });
}

export function sendMessage(getToken, { phone, body, customString }) {
  return req(`/api/sms/send`, { getToken, method: 'POST', body: { phone, body, customString } });
}
