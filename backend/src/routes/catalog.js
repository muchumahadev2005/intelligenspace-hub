import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { query } from '../db/client.js';

export const catalogRoutes = new Hono();
catalogRoutes.use('*', authMiddleware);

function formatProduct(p) {
  return {
    ...p,
    price: Number(p.price || 0),
    stock: Number(p.stock || 0),
    agentVisible: Boolean(p.agent_visible),
    agent_visible: Boolean(p.agent_visible),
  };
}

catalogRoutes.get('/', async (c) => {
  const { workspaceId } = c.get('user');
  const { status, search } = c.req.query();
  let sql = `SELECT * FROM products WHERE workspace_id=$1`;
  const params = [workspaceId]; let idx = 2;
  if (status && status !== 'all') { sql += ` AND status=$${idx++}`; params.push(status); }
  if (search) { sql += ` AND (name ILIKE $${idx} OR sku ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
  sql += ` ORDER BY created_at DESC`;
  const result = await query(sql, params);
  return c.json(result.rows.map(formatProduct));
});

catalogRoutes.post('/', async (c) => {
  const { workspaceId } = c.get('user');
  const d = await c.req.json();
  if (!d.name) return c.json({ error: 'name is required' }, 400);
  const agentVisible = d.agent_visible !== undefined ? d.agent_visible : (d.agentVisible !== undefined ? d.agentVisible : true);
  const result = await query(
    `INSERT INTO products (workspace_id, name, description, sku, category, price, stock, status, agent_visible)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [workspaceId, d.name, d.description || '', d.sku || '', d.category || 'General', Number(d.price) || 0, Number(d.stock) || 0, d.status || 'active', Boolean(agentVisible)]
  );
  return c.json(formatProduct(result.rows[0]), 201);
});

catalogRoutes.patch('/:id', async (c) => {
  const { workspaceId } = c.get('user');
  const d = await c.req.json();
  const agentVisible = d.agent_visible !== undefined ? d.agent_visible : d.agentVisible;
  const result = await query(
    `UPDATE products SET name=COALESCE($1,name), description=COALESCE($2,description),
     price=COALESCE($3,price), stock=COALESCE($4,stock), status=COALESCE($5,status),
     agent_visible=COALESCE($6,agent_visible), updated_at=NOW()
     WHERE id=$7 AND workspace_id=$8 RETURNING *`,
    [d.name, d.description, d.price !== undefined ? Number(d.price) : null, d.stock !== undefined ? Number(d.stock) : null, d.status, agentVisible, c.req.param('id'), workspaceId]
  );
  if (result.rows.length === 0) return c.json({ error: 'Product not found' }, 404);
  return c.json(formatProduct(result.rows[0]));
});

catalogRoutes.delete('/:id', async (c) => {
  const { workspaceId } = c.get('user');
  await query(`DELETE FROM products WHERE id=$1 AND workspace_id=$2`, [c.req.param('id'), workspaceId]);
  return c.json({ deleted: true });
});
