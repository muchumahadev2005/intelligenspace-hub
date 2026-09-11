import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { env } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mockWebDir = path.resolve(__dirname, '../../mock-website');

import { authRoutes } from './routes/auth.js';
import { workspaceRoutes } from './routes/workspaces.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { agentRoutes } from './routes/agents.js';
import { templateRoutes } from './routes/templates.js';
import { phoneNumberRoutes } from './routes/phone-numbers.js';
import { callRoutes } from './routes/calls.js';
import { appointmentRoutes } from './routes/appointments.js';
import { catalogRoutes } from './routes/catalog.js';
import { orderRoutes } from './routes/orders.js';
import { webhookRoutes } from './routes/webhooks.js';
import { apiKeyRoutes } from './routes/api-keys.js';
import { usageRoutes } from './routes/usage.js';
import { teamRoutes } from './routes/team.js';
import { notificationRoutes } from './routes/notifications.js';
import { developerRoutes } from './routes/developer/index.js';
import { adminModelsRoutes } from './routes/admin/models.js';
import { adminUsersRoutes } from './routes/admin/users.js';
import { adminWorkspacesRoutes } from './routes/admin/workspaces.js';

export function createApp() {
  const app = new Hono();

  // ── Global middleware ─────────────────────────────────────────────
  app.use('*', logger());
  app.use('*', secureHeaders());
  app.use('*', cors({
    origin: (origin) => {
      if (
        !origin ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.pages.dev') ||
        env.FRONTEND_URL === '*' ||
        origin === env.FRONTEND_URL
      ) {
        return origin || '*';
      }
      return env.FRONTEND_URL;
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }));

  // ── Health check ──────────────────────────────────────────────────
  app.get('/health', (c) => c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }));

  // ── Mock Website for Testing API Keys & AI Agents ─────────────────
  const serveHtml = (c) => {
    try {
      let html = fs.readFileSync(path.join(mockWebDir, 'index.html'), 'utf-8');
      if (!html.includes('<base')) {
        html = html.replace('<head>', '<head>\n  <base href="/demo/">');
      }
      return c.html(html);
    } catch (e) {
      return c.text('Mock website not found: ' + e.message, 404);
    }
  };

  const serveCss = (c) => {
    try {
      const css = fs.readFileSync(path.join(mockWebDir, 'styles.css'), 'utf-8');
      c.header('Content-Type', 'text/css; charset=UTF-8');
      return c.body(css);
    } catch (e) {
      return c.text('Styles not found', 404);
    }
  };

  const serveJs = (c) => {
    try {
      const js = fs.readFileSync(path.join(mockWebDir, 'app.js'), 'utf-8');
      c.header('Content-Type', 'application/javascript; charset=UTF-8');
      return c.body(js);
    } catch (e) {
      return c.text('Script not found', 404);
    }
  };

  const serveAsset = (c) => {
    const filename = c.req.param('file') || 'laddu.jpg';
    try {
      const filePath = path.join(mockWebDir, 'assets', filename);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filename).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
        c.header('Content-Type', mime);
        return c.body(fs.readFileSync(filePath));
      }
      return c.text('Asset not found', 404);
    } catch (e) {
      return c.text('Image not found', 404);
    }
  };

  // Both /demo and /demo/
  app.get('/demo', serveHtml);
  app.get('/demo/', serveHtml);

  // Both /demo/styles.css and /styles.css
  app.get('/demo/styles.css', serveCss);
  app.get('/styles.css', serveCss);

  // Both /demo/app.js and /app.js
  app.get('/demo/app.js', serveJs);
  app.get('/app.js', serveJs);

  // Both /demo/assets/... and /assets/...
  app.get('/demo/assets/:file', serveAsset);
  app.get('/assets/:file', serveAsset);

  // ── API v1 ────────────────────────────────────────────────────────
  app.route('/api/v1/auth', authRoutes);
  app.route('/api/v1/workspaces', workspaceRoutes);
  app.route('/api/v1/dashboard', dashboardRoutes);
  app.route('/api/v1/agents', agentRoutes);
  app.route('/api/v1/templates', templateRoutes);
  app.route('/api/v1/phone-numbers', phoneNumberRoutes);
  app.route('/api/v1/calls', callRoutes);
  app.route('/api/v1/appointments', appointmentRoutes);
  app.route('/api/v1/catalog', catalogRoutes);
  app.route('/api/v1/orders', orderRoutes);
  app.route('/api/v1/webhooks', webhookRoutes);
  app.route('/api/v1/api-keys', apiKeyRoutes);
  app.route('/api/v1/usage', usageRoutes);
  app.route('/api/v1/team', teamRoutes);
  app.route('/api/v1/notifications', notificationRoutes);
  app.route('/api/v1/developer', developerRoutes);
  app.route('/api/v1/admin/models', adminModelsRoutes);
  app.route('/api/v1/admin/users', adminUsersRoutes);
  app.route('/api/v1/admin/workspaces', adminWorkspacesRoutes);

  // ── 404 ───────────────────────────────────────────────────────────
  app.notFound((c) => c.json({ error: 'Route not found' }, 404));

  // ── Error handler ─────────────────────────────────────────────────
  app.onError((err, c) => {
    console.error('[Error]', err.message);
    return c.json({ error: err.message || 'Internal server error' }, err.status || 500);
  });

  return app;
}
