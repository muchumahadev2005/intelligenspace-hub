import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { query } from '../db/client.js';

export const phoneNumberRoutes = new Hono();
phoneNumberRoutes.use('*', authMiddleware);

phoneNumberRoutes.get('/', async (c) => {
  const { workspaceId } = c.get('user');
  const result = await query(
    `SELECT pn.*, a.name as assigned_agent_name
     FROM phone_numbers pn
     LEFT JOIN agents a ON a.id = pn.assigned_agent_id
     WHERE pn.workspace_id=$1 ORDER BY pn.created_at DESC`,
    [workspaceId]
  );
  return c.json(result.rows);
});

phoneNumberRoutes.patch('/:id/assign', async (c) => {
  const { workspaceId } = c.get('user');
  const { agent_id } = await c.req.json();
  const result = await query(
    `UPDATE phone_numbers SET assigned_agent_id=$1 WHERE id=$2 AND workspace_id=$3 RETURNING *`,
    [agent_id || null, c.req.param('id'), workspaceId]
  );
  if (result.rows.length === 0) return c.json({ error: 'Phone number not found' }, 404);
  return c.json(result.rows[0]);
});
