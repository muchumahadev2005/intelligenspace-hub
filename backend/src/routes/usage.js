import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { query } from '../db/client.js';

export const usageRoutes = new Hono();
usageRoutes.use('*', authMiddleware);

usageRoutes.get('/records', async (c) => {
  const { workspaceId } = c.get('user');
  const result = await query(
    `SELECT * FROM usage_records WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 100`,
    [workspaceId]
  );
  return c.json(result.rows);
});

usageRoutes.get('/balance', async (c) => {
  const { workspaceId } = c.get('user');
  const result = await query(`SELECT credits, plan FROM workspaces WHERE id=$1`, [workspaceId]);
  return c.json(result.rows[0] || { credits: 0, plan: 'starter' });
});

usageRoutes.post('/topup', async (c) => {
  const { workspaceId } = c.get('user');
  const { amount } = await c.req.json();
  if (!amount || amount <= 0) return c.json({ error: 'Invalid amount' }, 400);

  const result = await query(
    `UPDATE workspaces SET credits = credits + $1 WHERE id=$2 RETURNING credits`,
    [amount, workspaceId]
  );
  await query(
    `INSERT INTO usage_records (workspace_id, description, usage, amount, balance)
     VALUES ($1, 'Credit top-up', $2, $3, $4)`,
    [workspaceId, `${amount} credits`, amount, result.rows[0].credits]
  );
  return c.json({ newBalance: result.rows[0].credits });
});
