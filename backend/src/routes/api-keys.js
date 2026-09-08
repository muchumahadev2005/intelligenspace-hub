import crypto from 'crypto';
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { query } from '../db/client.js';
import { generateApiKey, maskApiKey } from '../utils/format.js';

export const apiKeyRoutes = new Hono();
apiKeyRoutes.use('*', authMiddleware);

// GET /api/v1/api-keys
apiKeyRoutes.get('/', async (c) => {
  const { workspaceId } = c.get('user');
  const result = await query(
    `SELECT id, name, masked_key as "maskedKey", permission,
            requests_30d as "requests30d", last_used_at as "lastUsedAt", created_at as "createdAt"
     FROM api_keys WHERE workspace_id=$1 ORDER BY created_at DESC`,
    [workspaceId]
  );
  return c.json(result.rows);
});

// POST /api/v1/api-keys
apiKeyRoutes.post('/', async (c) => {
  const { workspaceId } = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const name = body.name?.trim();
  const permission = body.permission === 'read' ? 'read' : 'full';
  const isTest = body.type === 'test' || body.name?.toLowerCase().includes('test');

  if (!name) return c.json({ error: 'Key name is required' }, 400);

  // Generate 48-char random key with sk_live_ or sk_test_ prefix
  const prefix = isTest ? 'sk_test_' : 'sk_live_';
  const randomChars = crypto.randomBytes(24).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 36);
  const rawKey = `${prefix}${randomChars}`;

  // SHA-256 hash for authentication lookup
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const maskedKey = maskApiKey(rawKey);

  const result = await query(
    `INSERT INTO api_keys (workspace_id, name, key_hash, masked_key, permission, requests_30d)
     VALUES ($1, $2, $3, $4, $5, 0)
     RETURNING id, name, masked_key as "maskedKey", permission, requests_30d as "requests30d", last_used_at as "lastUsedAt", created_at as "createdAt"`,
    [workspaceId, name, keyHash, maskedKey, permission]
  );

  const row = result.rows[0];

  // Return full raw key ONCE — never stored in plaintext
  return c.json({
    ...row,
    secret: rawKey,
  }, 201);
});

// DELETE /api/v1/api-keys/:id
apiKeyRoutes.delete('/:id', async (c) => {
  const { workspaceId } = c.get('user');
  const id = c.req.param('id');
  const res = await query(`DELETE FROM api_keys WHERE id=$1 AND workspace_id=$2`, [id, workspaceId]);
  return c.json({ deleted: true, count: res.rowCount });
});
