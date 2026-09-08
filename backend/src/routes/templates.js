import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { query } from '../db/client.js';

export const templateRoutes = new Hono();
templateRoutes.use('*', authMiddleware);

templateRoutes.get('/', async (c) => {
  const { category, type, search } = c.req.query();
  let sql = `SELECT * FROM agent_templates WHERE 1=1`;
  const params = [];
  let idx = 1;
  if (category) { sql += ` AND category=$${idx++}`; params.push(category); }
  if (type) { sql += ` AND type=$${idx++}`; params.push(type); }
  if (search) { sql += ` AND (name ILIKE $${idx} OR description ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
  sql += ` ORDER BY popularity DESC`;
  const result = await query(sql, params);
  return c.json(result.rows);
});

templateRoutes.get('/:id', async (c) => {
  const result = await query(`SELECT * FROM agent_templates WHERE id=$1`, [c.req.param('id')]);
  if (result.rows.length === 0) return c.json({ error: 'Template not found' }, 404);
  return c.json(result.rows[0]);
});
