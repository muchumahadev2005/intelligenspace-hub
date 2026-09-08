import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { query } from '../db/client.js';

export const notificationRoutes = new Hono();
notificationRoutes.use('*', authMiddleware);

notificationRoutes.get('/', async (c) => {
  const { userId, workspaceId } = c.get('user');
  const result = await query(
    `SELECT * FROM notifications WHERE workspace_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 50`,
    [workspaceId, userId]
  );
  return c.json(result.rows);
});

notificationRoutes.patch('/:id/read', async (c) => {
  const { userId } = c.get('user');
  await query(`UPDATE notifications SET read=true WHERE id=$1 AND user_id=$2`, [c.req.param('id'), userId]);
  return c.json({ read: true });
});

notificationRoutes.patch('/read-all', async (c) => {
  const { userId, workspaceId } = c.get('user');
  await query(`UPDATE notifications SET read=true WHERE workspace_id=$1 AND user_id=$2`, [workspaceId, userId]);
  return c.json({ allRead: true });
});
