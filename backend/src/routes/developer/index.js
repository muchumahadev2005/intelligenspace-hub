import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.js';
import { query } from '../../db/client.js';
import { projectRoutes } from './projects.js';
import {
  codeReviewRoutes,
  debugRoutes,
  codingRoutes,
  architectureRoutes,
  testRoutes,
  securityRoutes,
  documentationRoutes,
  checkDeveloperLimit,
} from './ai-agents.js';

export const developerRoutes = new Hono();
developerRoutes.use('*', authMiddleware);

// GET /api/v1/developer/limits — usage quota for Developer AI
developerRoutes.get('/limits', async (c) => {
  const { workspaceId } = c.get('user');
  const limits = await checkDeveloperLimit(workspaceId);
  return c.json(limits);
});

// Mount sub-routes
developerRoutes.route('/projects', projectRoutes);
developerRoutes.route('/code-review', codeReviewRoutes);
developerRoutes.route('/debug', debugRoutes);
developerRoutes.route('/coding', codingRoutes);
developerRoutes.route('/architecture', architectureRoutes);
developerRoutes.route('/tests', testRoutes);
developerRoutes.route('/security', securityRoutes);
developerRoutes.route('/documentation', documentationRoutes);

// GET /api/v1/developer/tasks — all AI tasks across projects
developerRoutes.get('/tasks', async (c) => {
  const { workspaceId } = c.get('user');
  const projectId = c.req.query('projectId');
  const querySql = projectId
    ? `SELECT t.*, p.name as project_name FROM ai_tasks t
       LEFT JOIN developer_projects p ON p.id = t.project_id
       WHERE t.workspace_id=$1 AND t.project_id=$2 ORDER BY t.created_at DESC LIMIT 100`
    : `SELECT t.*, p.name as project_name FROM ai_tasks t
       LEFT JOIN developer_projects p ON p.id = t.project_id
       WHERE t.workspace_id=$1 ORDER BY t.created_at DESC LIMIT 100`;
  const params = projectId ? [workspaceId, projectId] : [workspaceId];
  const result = await query(querySql, params);
  return c.json(result.rows);
});

// GET /api/v1/developer/activity — activity feed across all projects
developerRoutes.get('/activity', async (c) => {
  const { workspaceId } = c.get('user');
  const projectId = c.req.query('projectId');
  const querySql = projectId
    ? `SELECT da.*, p.name as project_name FROM dev_activity da
       LEFT JOIN developer_projects p ON p.id = da.project_id
       WHERE da.workspace_id=$1 AND da.project_id=$2 ORDER BY da.created_at DESC LIMIT 50`
    : `SELECT da.*, p.name as project_name FROM dev_activity da
       LEFT JOIN developer_projects p ON p.id = da.project_id
       WHERE da.workspace_id=$1 ORDER BY da.created_at DESC LIMIT 50`;
  const params = projectId ? [workspaceId, projectId] : [workspaceId];
  const result = await query(querySql, params);
  return c.json(result.rows);
});
