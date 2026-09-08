import crypto from 'crypto';
import { verifyToken } from '../utils/jwt.js';
import { query } from '../db/client.js';

export async function authMiddleware(c, next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized — missing token' }, 401);
  }

  const token = authHeader.slice(7).trim();

  // ── 1. API Key Authentication (sk_live_... or sk_test_...) ─────────────
  if (token.startsWith('sk_live_') || token.startsWith('sk_test_')) {
    try {
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');
      const keyRes = await query(
        `SELECT k.id, k.workspace_id, k.name, k.permission,
                w.name as workspace_name,
                u.id as user_id, u.email as user_email
         FROM api_keys k
         JOIN workspaces w ON w.id = k.workspace_id
         LEFT JOIN users u ON u.id = w.owner_id
         WHERE k.key_hash = $1`,
        [keyHash]
      );

      if (!keyRes.rows.length) {
        return c.json({ error: 'Unauthorized — invalid or revoked API key' }, 401);
      }

      const key = keyRes.rows[0];

      // Enforce read-only scope on mutation methods
      if (key.permission === 'read' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)) {
        return c.json({ error: 'Forbidden — this API key has read-only permission' }, 403);
      }

      // Asynchronously update last_used_at and increment requests_30d
      query(
        `UPDATE api_keys SET last_used_at=NOW(), requests_30d=COALESCE(requests_30d, 0) + 1 WHERE id=$1`,
        [key.id]
      ).catch(() => {});

      c.set('user', {
        id: key.user_id || key.id,
        email: key.user_email || `${key.name}@apikey.local`,
        workspaceId: key.workspace_id,
        workspaceName: key.workspace_name,
        apiKeyId: key.id,
        apiKeyName: key.name,
        permission: key.permission,
      });

      return await next();
    } catch (err) {
      console.error('[AuthMiddleware] API key verification error:', err);
      return c.json({ error: 'Internal server error during authentication' }, 500);
    }
  }

  // ── 2. JWT Bearer Authentication (Web App Session) ──────────────────────
  try {
    const decoded = verifyToken(token);
    c.set('user', decoded);
    return await next();
  } catch {
    return c.json({ error: 'Unauthorized — invalid or expired token' }, 401);
  }
}
