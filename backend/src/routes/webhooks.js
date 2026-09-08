import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitMiddleware } from '../middleware/rate-limit.js';
import * as webhookService from '../services/webhook.service.js';

export const webhookRoutes = new Hono();
webhookRoutes.use('*', authMiddleware);

// GET /api/v1/webhooks — List all webhooks for authenticated workspace (never returns secrets)
webhookRoutes.get('/', async (c) => {
  const { workspaceId } = c.get('user');
  const webhooks = await webhookService.listWebhooks(workspaceId);
  return c.json(webhooks);
});

// POST /api/v1/webhooks — Create webhook (returns secret ONCE)
webhookRoutes.post('/', rateLimitMiddleware(30, 60000), async (c) => {
  const { workspaceId } = c.get('user');
  const data = await c.req.json();
  const webhook = await webhookService.createWebhook(workspaceId, data);
  return c.json(webhook, 201);
});

// PATCH /api/v1/webhooks/:id — Update webhook name, url, events, or is_active
webhookRoutes.patch('/:id', rateLimitMiddleware(60, 60000), async (c) => {
  const { workspaceId } = c.get('user');
  const data = await c.req.json();
  const updated = await webhookService.updateWebhook(c.req.param('id'), workspaceId, data);
  return c.json(updated);
});

// DELETE /api/v1/webhooks/:id — Delete webhook
webhookRoutes.delete('/:id', rateLimitMiddleware(30, 60000), async (c) => {
  const { workspaceId } = c.get('user');
  const result = await webhookService.deleteWebhook(c.req.param('id'), workspaceId);
  return c.json(result);
});

// POST /api/v1/webhooks/:id/test — Send test webhook event and return delivery result
webhookRoutes.post('/:id/test', rateLimitMiddleware(10, 60000), async (c) => {
  const { workspaceId } = c.get('user');
  const result = await webhookService.testWebhook(c.req.param('id'), workspaceId);
  return c.json(result);
});

// GET /api/v1/webhooks/:id/deliveries — Get delivery history for a webhook
webhookRoutes.get('/:id/deliveries', async (c) => {
  const { workspaceId } = c.get('user');
  const limit = c.req.query('limit');
  const deliveries = await webhookService.getDeliveries(c.req.param('id'), workspaceId, limit);
  return c.json(deliveries);
});

// GET /api/v1/webhooks/:id/deliveries/:deliveryId — Get single delivery details with payload/response
webhookRoutes.get('/:id/deliveries/:deliveryId', async (c) => {
  const { workspaceId } = c.get('user');
  const delivery = await webhookService.getDeliveryDetails(
    c.req.param('id'),
    c.req.param('deliveryId'),
    workspaceId
  );
  return c.json(delivery);
});
