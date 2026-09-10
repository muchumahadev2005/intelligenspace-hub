import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.js';
import { requireAdmin, ADMIN_EMAIL } from '../../middleware/rbac.js';
import { query } from '../../db/client.js';

export const adminUsersRoutes = new Hono();

// All routes require authentication and Super Admin privileges
adminUsersRoutes.use('*', authMiddleware);
adminUsersRoutes.use('*', requireAdmin());

/**
 * GET /api/v1/admin/users
 * Returns all real users registered in the database with their workspace & role details.
 */
adminUsersRoutes.get('/', async (c) => {
  try {
    const result = await query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.avatar_url,
        u.created_at,
        u.updated_at,
        COALESCE(
          (SELECT wm.role FROM workspace_members wm WHERE wm.user_id = u.id ORDER BY wm.created_at ASC LIMIT 1),
          'member'
        ) as role,
        COALESCE(
          (SELECT w.name FROM workspace_members wm JOIN workspaces w ON w.id = wm.workspace_id WHERE wm.user_id = u.id ORDER BY wm.created_at ASC LIMIT 1),
          'Personal Workspace'
        ) as workspace_name,
        COALESCE(
          (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = u.id ORDER BY wm.created_at ASC LIMIT 1),
          NULL
        ) as workspace_id
      FROM users u
      ORDER BY u.created_at DESC
    `);

    const users = result.rows.map((row) => {
      const isSuperAdmin = (row.email || '').trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
      return {
        id: row.id,
        name: row.name || 'Anonymous User',
        email: row.email,
        avatarUrl: row.avatar_url,
        role: isSuperAdmin ? 'admin' : (row.role || 'member'),
        workspaceName: row.workspace_name,
        workspaceId: row.workspace_id,
        isSuperAdmin,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return c.json({ users });
  } catch (err) {
    console.error('Failed to list admin users:', err);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

/**
 * PATCH /api/v1/admin/users/:id/role
 * Updates a user's RBAC role in their workspace membership.
 */
adminUsersRoutes.patch('/:id/role', async (c) => {
  try {
    const { id } = c.req.param();
    const { role } = await c.req.json();

    if (!role || !['admin', 'owner', 'developer', 'member'].includes(role)) {
      return c.json({ error: 'Invalid role specified' }, 400);
    }

    // Check user
    const userRes = await query('SELECT id, email, name FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    const targetUser = userRes.rows[0];

    // Cannot demote Super Admin
    if ((targetUser.email || '').trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && role !== 'admin') {
      return c.json({ error: 'Cannot change the primary platform Super Admin role' }, 400);
    }

    // Update workspace membership role
    await query(
      `UPDATE workspace_members 
       SET role = $1 
       WHERE user_id = $2`,
      [role, id]
    );

    return c.json({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role,
      },
    });
  } catch (err) {
    console.error('Failed to update user role:', err);
    return c.json({ error: 'Failed to update user role' }, 500);
  }
});

/**
 * DELETE /api/v1/admin/users/:id
 * Deletes a user and cascades deletion of their owned workspaces and data.
 */
adminUsersRoutes.delete('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const currentUser = c.get('user');

    // Check user exists
    const userRes = await query('SELECT id, email, name FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    const targetUser = userRes.rows[0];

    // Protect Super Admin from being deleted
    if ((targetUser.email || '').trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return c.json({ error: 'Cannot delete the designated platform Super Administrator' }, 403);
    }

    // Cannot delete currently logged in session
    if (currentUser?.userId === id) {
      return c.json({ error: 'You cannot delete your own active administrator account' }, 400);
    }

    // Workspaces owned by user will CASCADE delete, or if they own workspaces:
    await query('DELETE FROM users WHERE id = $1', [id]);

    return c.json({
      success: true,
      message: `User ${targetUser.email} has been permanently removed`,
      deletedUser: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
      },
    });
  } catch (err) {
    console.error('Failed to delete user:', err);
    return c.json({ error: err.message || 'Failed to delete user' }, 500);
  }
});
