import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import * as orderService from '../services/order.service.js';

export const orderRoutes = new Hono();
orderRoutes.use('*', authMiddleware);

orderRoutes.get('/', async (c) => {
  const { workspaceId } = c.get('user');
  const orders = await orderService.listOrders(workspaceId, c.req.query());
  return c.json(orders);
});

orderRoutes.post('/', async (c) => {
  const { workspaceId } = c.get('user');
  const data = await c.req.json();
  const order = await orderService.createOrder(workspaceId, data);
  return c.json(order, 201);
});

orderRoutes.get('/:id', async (c) => {
  const { workspaceId } = c.get('user');
  const order = await orderService.getOrder(c.req.param('id'), workspaceId);
  return c.json(order);
});

orderRoutes.patch('/:id/status', async (c) => {
  const { workspaceId } = c.get('user');
  const { status } = await c.req.json();
  const order = await orderService.updateOrderStatus(c.req.param('id'), workspaceId, status);
  return c.json(order);
});
