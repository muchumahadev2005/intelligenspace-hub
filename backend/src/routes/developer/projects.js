import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.js';
import { query } from '../../db/client.js';
import { chatCompletion } from '../../services/openrouter.service.js';

export const projectRoutes = new Hono();
projectRoutes.use('*', authMiddleware);

projectRoutes.get('/', async (c) => {
  const { workspaceId } = c.get('user');
  const result = await query(`SELECT * FROM developer_projects WHERE workspace_id=$1 ORDER BY created_at DESC`, [workspaceId]);
  return c.json(result.rows);
});

projectRoutes.post('/', async (c) => {
  const { workspaceId } = c.get('user');
  const d = await c.req.json();
  if (!d.name) return c.json({ error: 'name is required' }, 400);

  const id = d.id || `prj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const codeQuality = d.code_quality !== undefined ? d.code_quality : (d.codeQuality !== undefined ? d.codeQuality : 88);
  const security = d.security !== undefined ? d.security : 92;
  const coverage = d.coverage !== undefined ? d.coverage : 75;
  const architectureRating = d.architecture_rating || d.architectureRating || 'Good';
  const findingsSummary = d.findings_summary || d.findingsSummary || {
    securityIssues: 0,
    reviewSuggestions: 2,
    missingTests: 1,
    architectureWarnings: 0,
  };

  const result = await query(
    `INSERT INTO developer_projects (
      id, workspace_id, name, description, provider, full_name, branch, 
      language, framework, stack, files, structure,
      code_quality, security, coverage, architecture_rating, findings_summary
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
    [
      id,
      workspaceId,
      d.name,
      d.description || '',
      d.provider || 'github',
      d.full_name || d.name,
      d.branch || 'main',
      d.language || 'TypeScript',
      d.framework || 'React',
      JSON.stringify(d.stack || []),
      JSON.stringify(d.files || []),
      JSON.stringify(d.structure || []),
      codeQuality,
      security,
      coverage,
      architectureRating,
      JSON.stringify(findingsSummary),
    ]
  );

  // Log activity
  await query(
    `INSERT INTO dev_activity (workspace_id, project_id, label, detail, agent)
     VALUES ($1,$2,$3,$4,$5)`,
    [workspaceId, id, 'Project connected', `Connected repository ${d.name} (${d.provider || 'github'})`, 'Developer AI']
  ).catch(() => {});

  return c.json(result.rows[0], 201);
});

projectRoutes.get('/:id', async (c) => {
  const { workspaceId } = c.get('user');
  const result = await query(
    `SELECT * FROM developer_projects WHERE id=$1 AND workspace_id=$2`,
    [c.req.param('id'), workspaceId]
  );
  if (result.rows.length === 0) return c.json({ error: 'Project not found' }, 404);
  return c.json(result.rows[0]);
});

projectRoutes.patch('/:id', async (c) => {
  const { workspaceId } = c.get('user');
  const id = c.req.param('id');
  const d = await c.req.json();

  const updates = [];
  const values = [id, workspaceId];
  let idx = 3;

  if (d.name !== undefined) { updates.push(`name = $${idx++}`); values.push(d.name); }
  if (d.description !== undefined) { updates.push(`description = $${idx++}`); values.push(d.description); }
  if (d.files !== undefined) { updates.push(`files = $${idx++}`); values.push(JSON.stringify(d.files)); }
  if (d.structure !== undefined) { updates.push(`structure = $${idx++}`); values.push(JSON.stringify(d.structure)); }
  if (d.stack !== undefined) { updates.push(`stack = $${idx++}`); values.push(JSON.stringify(d.stack)); }
  if (d.findings_summary !== undefined) { updates.push(`findings_summary = $${idx++}`); values.push(JSON.stringify(d.findings_summary)); }
  if (d.code_quality !== undefined) { updates.push(`code_quality = $${idx++}`); values.push(d.code_quality); }
  if (d.security !== undefined) { updates.push(`security = $${idx++}`); values.push(d.security); }
  if (d.coverage !== undefined) { updates.push(`coverage = $${idx++}`); values.push(d.coverage); }

  updates.push(`updated_at = NOW()`);

  const result = await query(
    `UPDATE developer_projects SET ${updates.join(', ')} WHERE id = $1 AND workspace_id = $2 RETURNING *`,
    values
  );

  if (result.rows.length === 0) return c.json({ error: 'Project not found' }, 404);
  return c.json(result.rows[0]);
});

projectRoutes.delete('/:id', async (c) => {
  const { workspaceId } = c.get('user');
  await query(`DELETE FROM developer_projects WHERE id=$1 AND workspace_id=$2`, [c.req.param('id'), workspaceId]);
  return c.json({ deleted: true });
});
