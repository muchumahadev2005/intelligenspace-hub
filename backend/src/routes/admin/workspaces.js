import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/rbac.js';
import { query } from '../../db/client.js';

export const adminWorkspacesRoutes = new Hono();

// Super Admin protected
adminWorkspacesRoutes.use('*', authMiddleware);
adminWorkspacesRoutes.use('*', requireAdmin());

/**
 * GET /api/v1/admin/workspaces
 * Lists all tenant organizations and workspaces directly from PostgreSQL
 */
adminWorkspacesRoutes.get('/', async (c) => {
  try {
    const result = await query(`
      SELECT 
        w.id,
        w.name,
        w.plan,
        w.credits::float as credits,
        w.region,
        w.created_at,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id)::int as members,
        u.name as owner_name,
        u.email as owner_email
      FROM workspaces w
      LEFT JOIN users u ON u.id = w.owner_id
      ORDER BY w.created_at DESC
    `);

    return c.json({
      workspaces: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        plan: row.plan || 'starter',
        credits: Number(row.credits || 0),
        region: row.region || 'ap-south-1',
        members: Number(row.members || 1),
        ownerName: row.owner_name || 'Organization Owner',
        ownerEmail: row.owner_email || 'owner@platform',
        status: 'Active',
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    console.error('Failed to list admin workspaces:', err);
    return c.json({ error: 'Failed to fetch workspaces' }, 500);
  }
});

/**
 * POST /api/v1/admin/workspaces/:id/credits
 * Allocates compute credits to a tenant workspace
 */
adminWorkspacesRoutes.post('/:id/credits', async (c) => {
  try {
    const { id } = c.req.param();
    const { amount = 5000 } = await c.req.json().catch(() => ({ amount: 5000 }));

    const result = await query(
      `UPDATE workspaces 
       SET credits = credits + $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, name, credits::float as credits`,
      [amount, id]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Workspace not found' }, 404);
    }

    return c.json({
      success: true,
      workspace: result.rows[0],
      message: `Allocated ${amount.toLocaleString()} credits successfully`,
    });
  } catch (err) {
    console.error('Failed to add credits:', err);
    return c.json({ error: 'Failed to allocate credits' }, 500);
  }
});
