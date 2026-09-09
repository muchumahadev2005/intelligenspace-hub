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
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  RETELL_API_KEY: process.env.RETELL_API_KEY || process.env['retell-secret-key'] || 'key_301d32e79cc14be38f99a15dcffe',
  RETELL_AGENT_ID: process.env.RETELL_AGENT_ID || 'agent_8248b4b834a8410562224de3c9',
};

// Validate critical env vars on startup
const required = ['DATABASE_URL', 'JWT_SECRET', 'OPEN_ROUTER_KEY'];
for (const key of required) {
  if (!env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}
