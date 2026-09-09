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

  const token = signToken({ userId: user.id, workspaceId, email: user.email, role: 'owner' });
  return { user: { id: user.id, name: user.name, email: user.email, role: 'owner' }, workspaceId, token };
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
    `SELECT u.id, u.name, u.email, u.avatar_url, u.created_at,
            wm.workspace_id, wm.role
     FROM users u
     LEFT JOIN workspace_members wm ON wm.user_id = u.id
     WHERE u.id = $1
     ORDER BY wm.created_at ASC LIMIT 1`,
    [userId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('User not found'), { status: 404 });
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    workspaceId: row.workspace_id,
    role: row.role || 'member',
    createdAt: row.created_at,
  };
}

export async function loginOrRegisterWithGoogle({ googleId, email, name, avatarUrl }) {
  if (!email) throw Object.assign(new Error('Email is required from Google profile'), { status: 400 });

  let userResult = await query(
    `SELECT u.id, u.name, u.email, u.avatar_url, wm.workspace_id, wm.role
     FROM users u
     LEFT JOIN workspace_members wm ON wm.user_id = u.id
     WHERE u.google_id = $1 OR u.email = $2
     ORDER BY wm.created_at ASC LIMIT 1`,
    [googleId, email]
  );

  let user;
  let workspaceId;
  let role = 'owner';

  if (userResult.rows.length > 0) {
    user = userResult.rows[0];
    workspaceId = user.workspace_id;
    role = user.role || 'owner';

    await query(
      `UPDATE users SET google_id = COALESCE(google_id, $1), avatar_url = COALESCE(avatar_url, $2), updated_at = NOW() WHERE id = $3`,
      [googleId, avatarUrl || '', user.id]
    );

    if (!workspaceId) {
      const wsResult = await query(
        `INSERT INTO workspaces (name, plan, credits, owner_id) VALUES ($1, 'starter', 10000, $2) RETURNING id`,
        [`${user.name}'s Workspace`, user.id]
      );
      workspaceId = wsResult.rows[0].id;
      await query(
        `INSERT INTO workspace_members (workspace_id, user_id, role, status) VALUES ($1, $2, 'owner', 'active')`,
        [workspaceId, user.id]
      );
    }
  } else {
    const newUser = await query(
      `INSERT INTO users (name, email, avatar_url, google_id, auth_provider)
       VALUES ($1, $2, $3, $4, 'google')
       RETURNING id, name, email, avatar_url, created_at`,
      [name || email.split('@')[0], email, avatarUrl || '', googleId]
    );
    user = newUser.rows[0];

    const wsResult = await query(
      `INSERT INTO workspaces (name, plan, credits, owner_id)
       VALUES ($1, 'starter', 10000, $2) RETURNING id`,
      [`${user.name}'s Workspace`, user.id]
    );
    workspaceId = wsResult.rows[0].id;

    await query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'active')`,
      [workspaceId, user.id]
    );
  }

  const token = signToken({ userId: user.id, workspaceId, email: user.email, role });
  return {
    user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatar_url, role },
    workspaceId,
    token,
  };
}

