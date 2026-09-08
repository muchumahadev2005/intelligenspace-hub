import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { query } from '../db/client.js';

export const teamRoutes = new Hono();
teamRoutes.use('*', authMiddleware);

teamRoutes.get('/', async (c) => {
  const { workspaceId } = c.get('user');
  const result = await query(
    `SELECT u.id, u.name, u.email, u.avatar_url, wm.role, wm.status, u.updated_at as last_active_at
     FROM workspace_members wm
     JOIN users u ON u.id = wm.user_id
     WHERE wm.workspace_id=$1 ORDER BY wm.created_at ASC`,
    [workspaceId]
  );
  return c.json(result.rows);
});

teamRoutes.post('/invite', async (c) => {
  const { workspaceId } = c.get('user');
  const { email, role } = await c.req.json();
  if (!email) return c.json({ error: 'email is required' }, 400);
  // Check if user exists
  const user = await query(`SELECT id FROM users WHERE email=$1`, [email]);
  if (user.rows.length > 0) {
    await query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, status) VALUES ($1,$2,$3,'active') ON CONFLICT DO NOTHING`,
      [workspaceId, user.rows[0].id, role || 'member']
    );
  } else {
    // Store pending invite by email
    await query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, status, invited_email)
       SELECT $1, gen_random_uuid(), $2, 'invited', $3
       WHERE NOT EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND invited_email=$3)`,
      [workspaceId, role || 'member', email]
    );
  }
  return c.json({ invited: true, email });
});

teamRoutes.patch('/:id/role', async (c) => {
  const { workspaceId } = c.get('user');
  const { role } = await c.req.json();
  const result = await query(
    `UPDATE workspace_members SET role=$1 WHERE user_id=$2 AND workspace_id=$3 RETURNING *`,
    [role, c.req.param('id'), workspaceId]
  );
  if (result.rows.length === 0) return c.json({ error: 'Member not found' }, 404);
  return c.json(result.rows[0]);
});

teamRoutes.delete('/:id', async (c) => {
  const { workspaceId } = c.get('user');
  await query(`DELETE FROM workspace_members WHERE user_id=$1 AND workspace_id=$2`, [c.req.param('id'), workspaceId]);
  return c.json({ removed: true });
});
