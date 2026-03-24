// Vercel serverless function — proxies Clerk admin API calls
// so the CLERK_SECRET_KEY stays server-side.

const CLERK_API = 'https://api.clerk.com/v1';

export default async function handler(req, res) {
  const SECRET = process.env.CLERK_SECRET_KEY;
  if (!SECRET) {
    return res.status(500).json({ error: 'Server misconfigured: missing Clerk secret key' });
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

    const createRes = await fetch(`${CLERK_API}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email_address: [email],
        first_name: firstName || '',
        last_name: lastName || '',
        public_metadata: { role: roleValue },
      }),
    });
    const user = await createRes.json();
    return res.status(createRes.status).json(user);
  }

  // PATCH — update user role
  if (req.method === 'PATCH') {
    const { userId, role } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const roleValue = Array.isArray(role) ? role : [role].filter(Boolean);

    const updateRes = await fetch(`${CLERK_API}/users/${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ public_metadata: { role: roleValue } }),
    });
    const user = await updateRes.json();
    return res.status(updateRes.status).json(user);
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
    return res.status(banRes.status).json(result);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
