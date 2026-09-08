import { query } from '../db/client.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { signToken } from '../utils/jwt.js';

export async function register({ name, email, password }) {
  // Check if user already exists
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }

  const password_hash = await hashPassword(password);

  // Create user
  const userResult = await query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at`,
    [name, email, password_hash]
  );
  const user = userResult.rows[0];

  // Create default workspace
  const wsResult = await query(
    `INSERT INTO workspaces (name, plan, credits, owner_id) VALUES ($1, $2, $3, $4) RETURNING id`,
    [`${name}'s Workspace`, 'starter', 10000, user.id]
  );
  const workspaceId = wsResult.rows[0].id;

  // Add as owner member
  await query(
    `INSERT INTO workspace_members (workspace_id, user_id, role, status) VALUES ($1, $2, 'owner', 'active')`,
    [workspaceId, user.id]
  );

  const token = signToken({ userId: user.id, workspaceId, email: user.email });
  return { user: { id: user.id, name: user.name, email: user.email }, workspaceId, token };
}

export async function login({ email, password }) {
  const result = await query(
    `SELECT u.id, u.name, u.email, u.password_hash,
            wm.workspace_id, wm.role
     FROM users u
     JOIN workspace_members wm ON wm.user_id = u.id
     WHERE u.email = $1
     ORDER BY wm.created_at ASC LIMIT 1`,
    [email]
  );

  if (result.rows.length === 0) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const row = result.rows[0];
  const valid = await comparePassword(password, row.password_hash);
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });
  }

  const token = signToken({ userId: row.id, workspaceId: row.workspace_id, email: row.email });
  return {
    user: { id: row.id, name: row.name, email: row.email, role: row.role },
    workspaceId: row.workspace_id,
    token,
  };
}

export async function getMe(userId) {
  const result = await query(
    `SELECT id, name, email, avatar_url, created_at FROM users WHERE id = $1`,
    [userId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('User not found'), { status: 404 });
  return result.rows[0];
}
