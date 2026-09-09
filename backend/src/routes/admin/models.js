import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { query } from '../../db/client.js';
import { chatCompletion } from '../../services/openrouter.service.js';

export const adminModelsRoutes = new Hono();

// Protect all admin model endpoints with auth
adminModelsRoutes.use('*', authMiddleware);

// Enforce RBAC (admin or owner) on mutation and testing endpoints
adminModelsRoutes.use('/test', requireRole(['admin', 'owner']));
adminModelsRoutes.post('/', requireRole(['admin', 'owner']));
adminModelsRoutes.patch('/:id', requireRole(['admin', 'owner']));
adminModelsRoutes.delete('/:id', requireRole(['admin', 'owner']));

// GET /api/v1/admin/models
adminModelsRoutes.get('/', async (c) => {
  try {
    const activeOnly = c.req.query('activeOnly') === 'true';

    // If requesting full admin management list (activeOnly is not true), require admin role
    if (!activeOnly) {
      const user = c.get('user');
      const role = (user.role || 'admin').toLowerCase();
      if (!['admin', 'owner'].includes(role)) {
        return c.json({
          error: 'Forbidden — Administrator role required to access AI Models console',
          code: 'RBAC_FORBIDDEN',
        }, 403);
      }
    }

    let sql = `SELECT * FROM system_ai_models`;
    if (activeOnly) {
      sql += ` WHERE is_enabled = true`;
    }
    sql += ` ORDER BY is_default DESC, created_at ASC`;

    const result = await query(sql);
    return c.json({
      models: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        speed: row.speed || 'Fast',
        badge: row.badge || 'Free',
        isDefault: Boolean(row.is_default),
        isEnabled: Boolean(row.is_enabled),
        isCustom: Boolean(row.is_custom),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (err) {
    console.error('Failed to list system AI models:', err);
    return c.json({ error: 'Failed to fetch AI models' }, 500);
  }
});

// POST /api/v1/admin/models (Add custom model)
adminModelsRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { id, name, description, speed = 'Fast', badge = 'Free', isDefault = false, isEnabled = true } = body;

    if (!id || !name) {
      return c.json({ error: 'Model ID and display name are required' }, 400);
    }

    // Check if model already exists
    const existing = await query(`SELECT id FROM system_ai_models WHERE id = $1`, [id.trim()]);
    if (existing.rows.length > 0) {
      return c.json({ error: `Model with ID "${id}" already exists` }, 409);
    }

    if (isDefault) {
      await query(`UPDATE system_ai_models SET is_default = false`);
    }

    const result = await query(
      `INSERT INTO system_ai_models (id, name, description, speed, badge, is_default, is_enabled, is_custom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [id.trim(), name.trim(), description || '', speed, badge, Boolean(isDefault), Boolean(isEnabled)]
    );

    const row = result.rows[0];
    return c.json({
      model: {
        id: row.id,
        name: row.name,
        description: row.description,
        speed: row.speed,
        badge: row.badge,
        isDefault: Boolean(row.is_default),
        isEnabled: Boolean(row.is_enabled),
        isCustom: Boolean(row.is_custom),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    }, 201);
  } catch (err) {
    console.error('Failed to create model:', err);
    return c.json({ error: err.message || 'Failed to create AI model' }, 500);
  }
});

// PATCH /api/v1/admin/models/:id (Update model state, toggle enabled, or set default)
adminModelsRoutes.patch('/:id', async (c) => {
  try {
    const id = decodeURIComponent(c.req.param('id'));
    const body = await c.req.json();

    const current = await query(`SELECT * FROM system_ai_models WHERE id = $1`, [id]);
    if (current.rows.length === 0) {
      return c.json({ error: 'Model not found' }, 404);
    }
    const model = current.rows[0];

    let newIsDefault = body.isDefault !== undefined ? Boolean(body.isDefault) : model.is_default;
    let newIsEnabled = body.isEnabled !== undefined ? Boolean(body.isEnabled) : model.is_enabled;
    let newName = body.name !== undefined ? body.name.trim() : model.name;
    let newDescription = body.description !== undefined ? body.description : model.description;
    let newSpeed = body.speed !== undefined ? body.speed : model.speed;
    let newBadge = body.badge !== undefined ? body.badge : model.badge;

    // Prevent disabling the default model without reassigning
    if (model.is_default && !newIsEnabled && !body.isDefault) {
      return c.json({ error: 'Cannot disable the default model. Please set another active model as default first.' }, 400);
    }

    if (newIsDefault) {
      await query(`UPDATE system_ai_models SET is_default = false WHERE id != $1`, [id]);
      newIsEnabled = true; // Default model must be enabled
    }

    const updated = await query(
      `UPDATE system_ai_models 
       SET name = $1, description = $2, speed = $3, badge = $4, is_default = $5, is_enabled = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [newName, newDescription, newSpeed, newBadge, newIsDefault, newIsEnabled, id]
    );

    const row = updated.rows[0];
    return c.json({
      model: {
        id: row.id,
        name: row.name,
        description: row.description,
        speed: row.speed,
        badge: row.badge,
        isDefault: Boolean(row.is_default),
        isEnabled: Boolean(row.is_enabled),
        isCustom: Boolean(row.is_custom),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    console.error('Failed to update model:', err);
    return c.json({ error: err.message || 'Failed to update model' }, 500);
  }
});

// DELETE /api/v1/admin/models/:id (Delete custom model only)
adminModelsRoutes.delete('/:id', async (c) => {
  try {
    const id = decodeURIComponent(c.req.param('id'));
    const current = await query(`SELECT * FROM system_ai_models WHERE id = $1`, [id]);
    if (current.rows.length === 0) {
      return c.json({ error: 'Model not found' }, 404);
    }
    const model = current.rows[0];

    if (!model.is_custom) {
      return c.json({ error: 'Cannot delete system core model. You can disable it instead.' }, 400);
    }

    if (model.is_default) {
      return c.json({ error: 'Cannot delete the default model. Set another model as default first.' }, 400);
    }

    await query(`DELETE FROM system_ai_models WHERE id = $1`, [id]);
    return c.json({ success: true, message: `Model ${id} deleted successfully` });
  } catch (err) {
    console.error('Failed to delete model:', err);
    return c.json({ error: err.message || 'Failed to delete model' }, 500);
  }
});

// POST /api/v1/admin/models/test (Latency ping test & Neural Playground test runner)
adminModelsRoutes.post('/test', async (c) => {
  const startTime = Date.now();
  try {
    const body = await c.req.json();
    const { modelId, prompt, maxTokens } = body;
    if (!modelId) {
      return c.json({ error: 'modelId is required' }, 400);
    }

    const isCustomPrompt = Boolean(prompt && typeof prompt === 'string' && prompt.trim() && prompt.trim().toLowerCase() !== 'ping');
    const systemPrompt = isCustomPrompt
      ? 'You are an advanced AI assistant running inside the Admin Neural Playground. Provide a concise, high-quality, and direct response.'
      : 'You are an AI model ping responder. Reply ONLY with the exact single word "pong".';
    const userMessage = isCustomPrompt ? prompt.trim() : 'ping';
    const tokenLimit = maxTokens ? Math.min(Number(maxTokens), 500) : (isCustomPrompt ? 300 : 10);

    const { reply } = await chatCompletion({
      model: modelId,
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: tokenLimit,
    });

    const elapsed = Date.now() - startTime;
    return c.json({
      ok: true,
      latencyMs: elapsed,
      response: reply.trim() || 'pong',
      modelId,
      prompt: userMessage,
      tokensUsed: Math.max(1, Math.round((reply.length + userMessage.length) / 4)),
    });
  } catch (err) {
    const elapsed = Date.now() - startTime;
    return c.json({
      ok: false,
      error: err.message || 'Model execution failed',
      latencyMs: elapsed,
    }, 500);
  }
});

