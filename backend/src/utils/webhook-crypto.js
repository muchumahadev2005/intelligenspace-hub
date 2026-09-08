import crypto from 'crypto';

/**
 * Generates a cryptographically secure webhook secret string.
 * Example: whsec_8f92a1... (48 hex chars)
 */
export function generateWebhookSecret() {
  return `whsec_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Computes an HMAC-SHA256 signature for outgoing webhook payload.
 * Signature payload format: "${timestamp}.${rawBody}"
 * 
 * @param {string} secret - Webhook signing secret
 * @param {string|number} timestamp - Unix epoch in seconds
 * @param {string} rawBody - The exact raw JSON string being transmitted
 * @returns {string} Formatted signature string "sha256=<hex>"
 */
export function generateSignature(secret, timestamp, rawBody) {
  if (!secret) throw new Error('Webhook secret is required for signing');
  const signatureInput = `${timestamp}.${rawBody}`;
  const hmac = crypto.createHmac('sha256', secret).update(signatureInput).digest('hex');
  return `sha256=${hmac}`;
}

/**
 * Verifies an incoming webhook signature using constant-time comparison.
 * Useful for external verification or test receivers.
 * 
 * @param {string} secret
 * @param {string|number} timestamp
 * @param {string} rawBody
 * @param {string} headerSignature - "sha256=<hex>"
 * @returns {boolean}
 */
export function verifySignature(secret, timestamp, rawBody, headerSignature) {
  if (!secret || !headerSignature || !headerSignature.startsWith('sha256=')) return false;
  const expectedSignature = generateSignature(secret, timestamp, rawBody);
  const expectedBuffer = Buffer.from(expectedSignature);
  const headerBuffer = Buffer.from(headerSignature);

  if (expectedBuffer.length !== headerBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, headerBuffer);
}
