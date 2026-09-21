// Reusable Clerk token verifier for API endpoints. Returns the userId on
// success, or a { status, error } object suitable to hand back to the client.
import { verifyToken } from '@clerk/backend';

export async function requireUser(req) {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return { error: 'Server misconfigured: missing CLERK_SECRET_KEY', status: 500 };

  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) return { error: 'Missing auth token', status: 401 };

  try {
    const payload = await verifyToken(token, { secretKey: secret });
    if (!payload?.sub) return { error: 'Invalid token', status: 401 };
    return { userId: payload.sub };
  } catch (err) {
    return { error: `Token verification failed: ${err.message}`, status: 401 };
  }
}
