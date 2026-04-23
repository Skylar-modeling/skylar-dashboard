// Vercel serverless function — proxies Clerk admin API calls
// so the CLERK_SECRET_KEY stays server-side.

import { verifyToken } from '@clerk/backend';

const CLERK_API = 'https://api.clerk.com/v1';

/**
 * Verify the request is from an authenticated CEO user.
 * Uses Clerk's verifyToken to validate the JWT signature.
 */
async function verifyCEO(req, secret) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return { ok: false, status: 401, error: 'Missing auth token' };

  let payload;
  try {
    payload = await verifyToken(token, { secretKey: secret });
  } catch (err) {
    return { ok: false, status: 401, error: `Token verification failed: ${err.message}` };
  }

  const userId = payload?.sub;
  if (!userId) return { ok: false, status: 401, error: 'Invalid token (no sub)' };

  // Fetch user and verify they have CEO role
  const userRes = await fetch(`${CLERK_API}/users/${userId}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!userRes.ok) return { ok: false, status: 401, error: 'User not found' };
  const user = await userRes.json();
  const roles = user.public_metadata?.role;
  const roleList = Array.isArray(roles) ? roles : [roles].filter(Boolean);
  if (!roleList.includes('ceo')) {
    return { ok: false, status: 403, error: 'Only CEO can manage users' };
  }
  return { ok: true, userId };
}

export default async function handler(req, res) {
  const SECRET = process.env.CLERK_SECRET_KEY;
  if (!SECRET) {
    return res.status(500).json({ error: 'Server misconfigured: missing Clerk secret key' });
  }

  // Require CEO auth for all mutations and for listing users
  const authCheck = await verifyCEO(req, SECRET);
  if (!authCheck.ok) {
    return res.status(authCheck.status).json({ error: authCheck.error });
  }

  const headers = {
    Authorization: `Bearer ${SECRET}`,
    'Content-Type': 'application/json',
  };

  // GET — list all users
  if (req.method === 'GET') {
    const response = await fetch(`${CLERK_API}/users?limit=100&order_by=-created_at`, { headers });
    const data = await response.json();
    return res.status(200).json(data);
  }

  // POST — create a new user
  if (req.method === 'POST') {
    const { email, firstName, lastName, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const roleValue = Array.isArray(role) ? role : [role].filter(Boolean);

    // Generate a strong random password — user will reset via email anyway
    const tempPassword = `Skylar-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

    const createRes = await fetch(`${CLERK_API}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email_address: [email],
        first_name: firstName || '',
        last_name: lastName || '',
        password: tempPassword,
        skip_password_checks: true,
        public_metadata: { role: roleValue },
      }),
    });
    const user = await createRes.json();
    if (!createRes.ok) {
      // Surface actual Clerk error for easier debugging
      const errorMsg = user.errors?.[0]?.long_message || user.errors?.[0]?.message || user.error || 'Failed to create user';
      return res.status(createRes.status).json({ error: errorMsg, errors: user.errors });
    }
    return res.status(201).json(user);
  }

  // PATCH — update user role
  if (req.method === 'PATCH') {
    const { userId, role } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const roleValue = Array.isArray(role) ? role : [role].filter(Boolean);

    const updateRes = await fetch(`${CLERK_API}/users/${userId}/metadata`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ public_metadata: { role: roleValue } }),
    });
    const user = await updateRes.json();
    if (!updateRes.ok) {
      const errorMsg = user.errors?.[0]?.long_message || user.errors?.[0]?.message || 'Failed to update user';
      return res.status(updateRes.status).json({ error: errorMsg });
    }
    return res.status(200).json(user);
  }

  // DELETE — ban/deactivate user
  if (req.method === 'DELETE') {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const banRes = await fetch(`${CLERK_API}/users/${userId}/ban`, {
      method: 'POST',
      headers,
    });
    const result = await banRes.json();
    if (!banRes.ok) {
      const errorMsg = result.errors?.[0]?.long_message || result.errors?.[0]?.message || 'Failed to deactivate user';
      return res.status(banRes.status).json({ error: errorMsg });
    }
    return res.status(200).json(result);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
