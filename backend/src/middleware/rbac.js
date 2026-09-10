import { query } from '../db/client.js';
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'mahadevmuchu9977@gmail.com').trim().toLowerCase();

/**
 * Check if the provided email matches the designated platform administrator.
 * @param {string} email
 * @returns {boolean}
 */
export function isAdminEmail(email) {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

/**
 * Super Admin Middleware.
 * Strictly verifies that the authenticated user is the designated platform administrator (mahadevmuchu9977@gmail.com).
 * No other role (including workspace owner or member) can bypass this.
 */
export function requireAdmin() {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({
        error: 'Unauthorized — Authentication required',
        code: 'UNAUTHORIZED',
      }, 401);
    }

    const email = (user.email || '').trim().toLowerCase();

    if (!isAdminEmail(email)) {
      return c.json({
        error: `Forbidden — Access to the Admin Console is strictly restricted to ${ADMIN_EMAIL}.`,
        code: 'ADMIN_ACCESS_RESTRICTED',
      }, 403);
    }

    c.set('isAdmin', true);
    c.set('userRole', 'admin');

    return await next();
  };
}

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

    // Default fallback: only the designated admin gets 'admin'; all others default to 'member'
    if (!role) {
      role = isAdminEmail(user.email) ? 'admin' : 'member';
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

