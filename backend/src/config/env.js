import 'dotenv/config';

export const env = {
  PORT: Number(process.env.PORT) || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-change-in-prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  OPEN_ROUTER_KEY: process.env.OPEN_ROUTER_KEY,
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  OPENROUTER_DEFAULT_MODEL: process.env.OPENROUTER_DEFAULT_MODEL || 'openrouter/free',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:8080',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || process.env.client_id,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || process.env.secret_id,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/google/callback',
};

// Validate critical env vars on startup
const required = ['DATABASE_URL', 'JWT_SECRET', 'OPEN_ROUTER_KEY'];
for (const key of required) {
  if (!env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}
