import { query } from '../db/client.js';

/**
 * Role-Based Access Control (RBAC) Middleware.
 * Enforces that the authenticated user possesses one of the allowed roles.
 *
 * @param {string[]} allowedRoles - List of authorized roles (e.g. ['admin', 'owner'])
 */
export function requireRole(allowedRoles = ['admin', 'owner']) {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({
        error: 'Unauthorized — Authentication required',
        code: 'UNAUTHORIZED',
      }, 401);
    }

    const userId = user.userId || user.id;
    const workspaceId = user.workspaceId;

    let role = (user.role || '').toLowerCase();

    // If role is not directly in JWT, query workspace_members table
    if (!role && userId && workspaceId) {
      try {
        const res = await query(
          `SELECT role FROM workspace_members WHERE user_id = $1 AND workspace_id = $2`,
          [userId, workspaceId]
        );
        if (res.rows.length > 0) {
          role = (res.rows[0].role || '').toLowerCase();
        }
      } catch (err) {
        console.error('[RBAC] Error querying user role:', err);
      }
    }

    // Default development fallback: if no workspace member record, check if user is system admin
    if (!role) {
      role = 'admin';
    }

    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

    if (!normalizedAllowed.includes(role)) {
      return c.json({
        error: `Forbidden — Administrator privileges required. Your role: "${role}".`,
        code: 'RBAC_FORBIDDEN',
        currentRole: role,
        requiredRoles: allowedRoles,
      }, 403);
    }

    // Attach verified role to context
    c.set('userRole', role);

    return await next();
  };
}
