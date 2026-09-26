import 'dotenv/config';

export const env = {
  PORT: Number(process.env.PORT) || 3001,
  NODE_ENV: (process.env.NODE_ENV || 'development').trim(),
  DATABASE_URL: process.env.DATABASE_URL?.trim(),
  JWT_SECRET: (process.env.JWT_SECRET || 'fallback-secret-change-in-prod').trim(),
  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || '7d').trim(),
  OPEN_ROUTER_KEY: process.env.OPEN_ROUTER_KEY?.trim(),
  OPENROUTER_BASE_URL: (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').trim(),
  OPENROUTER_DEFAULT_MODEL: (process.env.OPENROUTER_DEFAULT_MODEL || 'openrouter/free').trim(),
  FRONTEND_URL: (process.env.FRONTEND_URL || 'http://localhost:8080').trim().replace(/\/+$/, ''),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID?.trim(),
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET?.trim(),
  GOOGLE_REDIRECT_URI: (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/google/callback').trim(),
};

// Validate critical env vars on startup
const required = ['DATABASE_URL', 'JWT_SECRET', 'OPEN_ROUTER_KEY'];
for (const key of required) {
  if (!env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}

// Validate Google OAuth env vars (warn in development, fail in production)
const googleVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'FRONTEND_URL'];
const missingGoogle = googleVars.filter((key) => !process.env[key]);
if (missingGoogle.length > 0) {
  if (env.NODE_ENV === 'production') {
    console.error(`❌ Missing Google OAuth env vars in production: ${missingGoogle.join(', ')}`);
    process.exit(1);
  } else {
    console.warn(`⚠️  Missing Google OAuth env vars (Google login will not work): ${missingGoogle.join(', ')}`);
  }
}

// Safe startup diagnostic (never log secret values)
console.log('🔐 OAuth config:', {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '✅ set' : '❌ missing',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '✅ set' : '❌ missing',
  GOOGLE_REDIRECT_URI: env.GOOGLE_REDIRECT_URI,
  FRONTEND_URL: env.FRONTEND_URL,
});
