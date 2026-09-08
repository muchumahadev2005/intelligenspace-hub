import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

const server = serve({
  fetch: app.fetch,
  port: env.PORT,
}, (info) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 Intelligenspace Hub API server running on port ${info.port}`);
  console.log(`📡 Health Check:  http://localhost:${info.port}/health`);
  console.log(`📚 API Base:      http://localhost:${info.port}/api/v1`);
  console.log(`🌐 Frontend CORS: ${env.FRONTEND_URL}`);
  console.log(`⚡ Environment:   ${env.NODE_ENV}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n🛑 Gracefully shutting down server...');
  server.close(() => {
    console.log('Server shut down successfully.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
