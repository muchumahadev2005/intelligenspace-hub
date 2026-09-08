import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import * as webhookService from '../services/webhook.service.js';

export const webhookRoutes = new Hono();
webhookRoutes.use('*', authMiddleware);

webhookRoutes.get('/', async (c) => {
  const { workspaceId } = c.get('user');
  return c.json(await webhookService.listWebhooks(workspaceId));
});

webhookRoutes.post('/', async (c) => {
  const { workspaceId } = c.get('user');
  const data = await c.req.json();
  if (!data.url) return c.json({ error: 'url is required' }, 400);
  return c.json(await webhookService.createWebhook(workspaceId, data), 201);
});

webhookRoutes.post('/:id/test', async (c) => {
  const { workspaceId } = c.get('user');
  const result = await webhookService.testWebhook(c.req.param('id'), workspaceId);
  return c.json(result);
});

webhookRoutes.delete('/:id', async (c) => {
  const { workspaceId } = c.get('user');
  return c.json(await webhookService.deleteWebhook(c.req.param('id'), workspaceId));
});
