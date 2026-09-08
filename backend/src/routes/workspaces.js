import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { query } from '../db/client.js';

export const workspaceRoutes = new Hono();
workspaceRoutes.use('*', authMiddleware);

// GET /api/v1/workspaces — list user's workspaces
workspaceRoutes.get('/', async (c) => {
  const { userId } = c.get('user');
  const result = await query(
    `SELECT w.*, wm.role,
            (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as members
     FROM workspaces w
     JOIN workspace_members wm ON wm.workspace_id = w.id
     WHERE wm.user_id = $1
     ORDER BY w.created_at ASC`,
    [userId]
  );
  return c.json(result.rows);
});

// PATCH /api/v1/workspaces/:id — update workspace
workspaceRoutes.patch('/:id', async (c) => {
  const { userId } = c.get('user');
  const { id } = c.req.param();
  const { name, region } = await c.req.json();

  const check = await query(`SELECT id FROM workspaces WHERE id=$1 AND owner_id=$2`, [id, userId]);
  if (check.rows.length === 0) return c.json({ error: 'Not found or unauthorized' }, 404);

  const result = await query(
    `UPDATE workspaces SET name=COALESCE($1,name), region=COALESCE($2,region), updated_at=NOW() WHERE id=$3 RETURNING *`,
    [name, region, id]
  );
  return c.json(result.rows[0]);
});
