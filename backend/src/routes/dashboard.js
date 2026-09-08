import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import * as dashboardService from '../services/dashboard.service.js';

export const dashboardRoutes = new Hono();
dashboardRoutes.use('*', authMiddleware);

// GET /api/v1/dashboard/metrics
dashboardRoutes.get('/metrics', async (c) => {
  const { workspaceId } = c.get('user');
  const data = await dashboardService.getMetrics(workspaceId);
  return c.json(data);
});

// GET /api/v1/dashboard/activity
dashboardRoutes.get('/activity', async (c) => {
  const { workspaceId } = c.get('user');
  const data = await dashboardService.getActivity(workspaceId);
  return c.json(data);
});

// GET /api/v1/dashboard/series?range=30
dashboardRoutes.get('/series', async (c) => {
  const { workspaceId } = c.get('user');
  const range = Number(c.req.query('range')) || 30;
  const data = await dashboardService.getSeries(workspaceId, range);
  return c.json(data);
});
