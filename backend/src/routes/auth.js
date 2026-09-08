import { Hono } from 'hono';
import { rateLimitMiddleware } from '../middleware/rate-limit.js';
import { authMiddleware } from '../middleware/auth.js';
import * as authService from '../services/auth.service.js';

export const authRoutes = new Hono();

// POST /api/v1/auth/register
authRoutes.post('/register', rateLimitMiddleware(10, 60000), async (c) => {
  const { name, email, password } = await c.req.json();
  if (!name || !email || !password || password.length < 6) {
    return c.json({ error: 'name, email and password (min 6 chars) are required' }, 400);
  }
  const result = await authService.register({ name, email, password });
  return c.json(result, 201);
});

// POST /api/v1/auth/login
authRoutes.post('/login', rateLimitMiddleware(20, 60000), async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: 'email and password are required' }, 400);
  const result = await authService.login({ email, password });
  return c.json(result);
});

// GET /api/v1/auth/me
authRoutes.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const result = await authService.getMe(user.userId);
  return c.json(result);
});
