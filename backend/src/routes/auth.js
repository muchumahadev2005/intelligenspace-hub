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
  const result = await authService.getMe(user.userId || user.id);
  return c.json(result);
});

// Helper to get consistent Google OAuth redirect URI
function getGoogleRedirectUri(c) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  try {
    const url = new URL(c.req.url);
    return `${url.origin}/api/v1/auth/google/callback`;
  } catch {
    return 'http://localhost:3001/api/v1/auth/google/callback';
  }
}

// GET /api/v1/auth/google (Initiate Google OAuth Flow)
authRoutes.get('/google', (c) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.client_id;
  const redirectUri = getGoogleRedirectUri(c);
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account`;
  return c.redirect(googleAuthUrl);
});

// GET /api/v1/auth/google/callback (Google OAuth Redirect Callback)
authRoutes.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

  if (error || !code) {
    return c.redirect(`${frontendUrl}/auth?error=${encodeURIComponent(error || 'Google login was cancelled')}`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.client_id;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.secret_id;
    const redirectUri = getGoogleRedirectUri(c);

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
      console.error('Google token exchange failed:', tokenData);
      return c.redirect(`${frontendUrl}/auth?error=Failed+to+exchange+Google+token`);
    }

    // Fetch user profile from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    const authResult = await authService.loginOrRegisterWithGoogle({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
    });

    return c.redirect(
      `${frontendUrl}/auth?token=${encodeURIComponent(authResult.token)}&user=${encodeURIComponent(JSON.stringify(authResult.user))}`
    );
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return c.redirect(`${frontendUrl}/auth?error=Google+authentication+failed`);
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

