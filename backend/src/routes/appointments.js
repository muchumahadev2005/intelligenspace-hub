import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { query } from '../db/client.js';

export const appointmentRoutes = new Hono();
appointmentRoutes.use('*', authMiddleware);

appointmentRoutes.get('/', async (c) => {
  const { workspaceId } = c.get('user');
  const { status, search } = c.req.query();
  let sql = `SELECT id, workspace_id, customer, phone, email, agent_id, agent_name, type,
                    TO_CHAR(date, 'YYYY-MM-DD') as date,
                    TO_CHAR(time, 'HH24:MI') as time,
                    duration_minutes, status, notes, created_at, updated_at
             FROM appointments WHERE workspace_id=$1`;
  const params = [workspaceId]; let idx = 2;
  if (status && status !== 'all') { sql += ` AND status=$${idx++}`; params.push(status); }
  if (search) { sql += ` AND (customer ILIKE $${idx} OR type ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
  sql += ` ORDER BY date DESC, time DESC`;
  const result = await query(sql, params);
  return c.json(result.rows);
});

appointmentRoutes.post('/', async (c) => {
  const { workspaceId } = c.get('user');
  const d = await c.req.json();
  if (!d.customer) return c.json({ error: 'customer is required' }, 400);

  const result = await query(
    `INSERT INTO appointments (
      workspace_id, customer, phone, email, agent_id, agent_name, type, 
      date, time, duration_minutes, notes, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [
      workspaceId,
      d.customer,
      d.phone || '',
      d.email || '',
      d.agent_id || d.agentId || null,
      d.agent_name || d.agentName || 'Receptionist AI',
      d.type || 'Consultation',
      d.date || new Date().toISOString().slice(0, 10),
      d.time || '10:00',
      d.duration_minutes || d.durationMinutes || 30,
      d.notes || '',
      d.status || 'confirmed',
    ]
  );
  const row = result.rows[0];
  return c.json(
    {
      ...row,
      date: typeof row.date === 'string' ? row.date.slice(0, 10) : new Date(row.date).toISOString().slice(0, 10),
      time: row.time ? row.time.slice(0, 5) : (d.time || '10:00'),
    },
    201
  );
});

appointmentRoutes.patch('/:id', async (c) => {
  const { workspaceId } = c.get('user');
  const d = await c.req.json();
  const result = await query(
    `UPDATE appointments SET status=COALESCE($1,status), notes=COALESCE($2,notes), updated_at=NOW()
     WHERE id=$3 AND workspace_id=$4 RETURNING *`,
    [d.status, d.notes, c.req.param('id'), workspaceId]
  );
  if (result.rows.length === 0) return c.json({ error: 'Not found' }, 404);
  return c.json(result.rows[0]);
});

appointmentRoutes.delete('/:id', async (c) => {
  const { workspaceId } = c.get('user');
  await query(`DELETE FROM appointments WHERE id=$1 AND workspace_id=$2`, [c.req.param('id'), workspaceId]);
  return c.json({ deleted: true });
});
