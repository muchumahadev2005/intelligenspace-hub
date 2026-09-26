import { Hono } from 'hono';
import crypto from 'crypto';
import { rateLimitMiddleware } from '../middleware/rate-limit.js';
import { authMiddleware } from '../middleware/auth.js';
import * as authService from '../services/auth.service.js';
import { env } from '../config/env.js';

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
  const result = await authService.getMe(user.userId || user.id);
  return c.json(result);
});

// ── Google OAuth helpers ──────────────────────────────────────────────

/**
 * Returns the Google OAuth redirect URI from environment.
 * Deterministic & trimmed: uses only GOOGLE_REDIRECT_URI, stripped of whitespace or trailing newlines.
 */
function getGoogleRedirectUri() {
  const uri = (env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || '').trim();
  if (!uri) {
    throw new Error('GOOGLE_REDIRECT_URI environment variable is not configured');
  }
  return uri;
}

/**
 * In-memory OAuth state store.
 * Maps state → { createdAt }. States expire after 10 minutes.
 * For a single-instance deployment (Render free tier) this is sufficient.
 */
const oauthStates = new Map();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateOAuthState() {
  const state = crypto.randomBytes(32).toString('hex');
  oauthStates.set(state, { createdAt: Date.now() });
  // Prune expired states to prevent memory leak
  for (const [key, val] of oauthStates) {
    if (Date.now() - val.createdAt > OAUTH_STATE_TTL_MS) {
      oauthStates.delete(key);
    }
  }
  return state;
}

function validateAndConsumeOAuthState(state) {
  if (!state || !oauthStates.has(state)) return false;
  const entry = oauthStates.get(state);
  oauthStates.delete(state); // one-time use
  return (Date.now() - entry.createdAt) < OAUTH_STATE_TTL_MS;
}

// ── GET /api/v1/auth/google (Initiate Google OAuth Flow) ─────────────
authRoutes.get('/google', (c) => {
  const clientId = (env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '').trim();
  const frontendUrl = (env.FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:8080').trim().replace(/\/+$/, '');

  if (!clientId) {
    console.error('[OAuth] GOOGLE_CLIENT_ID is not configured');
    return c.redirect(`${frontendUrl}/auth?error=${encodeURIComponent('Google OAuth is not configured on the server')}`);
  }

  let redirectUri;
  try {
    redirectUri = getGoogleRedirectUri();
  } catch (err) {
    console.error('[OAuth]', err.message);
    return c.redirect(`${frontendUrl}/auth?error=${encodeURIComponent('Google OAuth redirect URI is not configured')}`);
  }

  const state = generateOAuthState();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    state,
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  // Safe diagnostic log (no secrets)
  console.log('[OAuth] Initiating Google OAuth flow:', {
    clientIdConfigured: !!clientId,
    clientIdPrefix: clientId.substring(0, 12) + '...',
    redirectUri,
    frontendUrl,
    stateGenerated: true,
  });

  return c.redirect(googleAuthUrl);
});

// ── GET /api/v1/auth/google/callback (Google OAuth Redirect Callback) ─
authRoutes.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');
  const state = c.req.query('state');
  const frontendUrl = (env.FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:8080').trim().replace(/\/+$/, '');

  // Handle Google-side errors (user cancelled, etc.)
  if (error || !code) {
    console.warn('[OAuth] Google returned error or no code:', { error, hasCode: !!code });
    return c.redirect(`${frontendUrl}/auth?error=${encodeURIComponent(error || 'Google login was cancelled')}`);
  }

  // Validate OAuth state (CSRF protection)
  if (!validateAndConsumeOAuthState(state)) {
    console.warn('[OAuth] Invalid or expired OAuth state');
    return c.redirect(`${frontendUrl}/auth?error=${encodeURIComponent('OAuth session expired or invalid. Please try again.')}`);
  }

  try {
    const clientId = (env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = (env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '').trim();
    const redirectUri = getGoogleRedirectUri();

    if (!clientId || !clientSecret) {
      console.error('[OAuth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
      return c.redirect(`${frontendUrl}/auth?error=${encodeURIComponent('Server OAuth configuration is incomplete')}`);
    }

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      // Log error details without exposing tokens
      console.error('[OAuth] Token exchange failed:', {
        status: tokenRes.status,
        error: tokenData.error,
        errorDescription: tokenData.error_description,
      });
      return c.redirect(`${frontendUrl}/auth?error=${encodeURIComponent('Failed to exchange Google authorization code')}`);
    }

    // Fetch user profile from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    if (!profileRes.ok || !profile.sub || !profile.email) {
      console.error('[OAuth] Failed to fetch Google profile:', {
        status: profileRes.status,
        hasSub: !!profile.sub,
        hasEmail: !!profile.email,
      });
      return c.redirect(`${frontendUrl}/auth?error=${encodeURIComponent('Failed to retrieve Google profile')}`);
    }

    const authResult = await authService.loginOrRegisterWithGoogle({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
    });

    console.log('[OAuth] Google sign-in successful for:', profile.email);

    return c.redirect(
      `${frontendUrl}/auth?token=${encodeURIComponent(authResult.token)}&user=${encodeURIComponent(JSON.stringify(authResult.user))}`
    );
  } catch (err) {
    console.error('[OAuth] Callback error:', err.message);
    return c.redirect(`${frontendUrl}/auth?error=${encodeURIComponent('Google authentication failed')}`);
  }
});

// POST /api/v1/auth/google/verify (Verify Google In-App Credential Token)
authRoutes.post('/google/verify', rateLimitMiddleware(20, 60000), async (c) => {
  try {
    const { credential } = await c.req.json();
    if (!credential) {
      return c.json({ error: 'Google credential token is required' }, 400);
    }

    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const profile = await tokenInfoRes.json();

    if (!tokenInfoRes.ok || !profile.email) {
      return c.json({ error: 'Invalid Google credential token' }, 401);
    }

    const authResult = await authService.loginOrRegisterWithGoogle({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
    });

    return c.json(authResult);
  } catch (err) {
    console.error('Google token verification error:', err);
    return c.json({ error: err.message || 'Failed to verify Google token' }, 500);
  }
});

// ── GET /api/v1/auth/google/config-check (Dev-only diagnostic) ────────
authRoutes.get('/google/config-check', (c) => {
  // Only available in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'Not available in production' }, 403);
  }

  return c.json({
    googleClientIdConfigured: !!process.env.GOOGLE_CLIENT_ID,
    googleClientSecretConfigured: !!process.env.GOOGLE_CLIENT_SECRET,
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || '(NOT SET)',
    frontendUrl: process.env.FRONTEND_URL || '(NOT SET)',
    nodeEnv: process.env.NODE_ENV || '(NOT SET)',
  });
});
