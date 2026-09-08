import dns from 'dns/promises';
import net from 'net';
import { env } from '../config/env.js';

/**
 * Checks if an IPv4 address is in a private, loopback, or link-local range.
 */
function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;

  // 0.0.0.0/8 (Current network)
  if (parts[0] === 0) return true;

  // 10.0.0.0/8 (Private)
  if (parts[0] === 10) return true;

  // 172.16.0.0/12 (Private: 172.16.x.x - 172.31.x.x)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (parts[0] === 192 && parts[1] === 168) return true;

  // 169.254.0.0/16 (Link-local & AWS/GCP cloud metadata)
  if (parts[0] === 169 && parts[1] === 254) return true;

  // 255.255.255.255 (Broadcast)
  if (parts[0] === 255 && parts[1] === 255 && parts[2] === 255 && parts[3] === 255) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in a private, loopback, or link-local range.
 */
function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  // Loopback ::1
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;

  // Unique local fc00::/7 (fc00... or fd00...)
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

  // Link-local fe80::/10
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;

  // IPv4 mapped IPv6 (e.g., ::ffff:127.0.0.1)
  if (lower.includes(':ffff:')) {
    const ipv4 = lower.split(':ffff:')[1];
    if (ipv4 && net.isIPv4(ipv4)) {
      return isPrivateIPv4(ipv4);
    }
  }

  return false;
}

/**
 * Validates a webhook destination URL against SSRF vulnerabilities.
 * 
 * @param {string} urlString
 * @param {boolean} [allowLocalDev] - In development mode, localhost and local IP destinations are allowed for testing.
 * @returns {Promise<{ valid: boolean, error?: string, parsedUrl?: URL }>}
 */
export async function validateWebhookUrl(urlString, allowLocalDev = (env.NODE_ENV !== 'production')) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(urlString.trim());
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Protocol check
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { valid: false, error: 'Protocol must be HTTP or HTTPS' };
  }

  if (env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
    return { valid: false, error: 'HTTPS is required for webhooks in production' };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Known metadata hostnames
  const blockedHostnames = ['metadata.google.internal', 'instance-data', '169.254.169.254'];
  if (blockedHostnames.includes(hostname)) {
    return { valid: false, error: 'Access to cloud metadata endpoints is blocked' };
  }

  // Localhost check
  const isLocalhost = hostname === 'localhost' || hostname.endsWith('.localhost');
  if (isLocalhost && !allowLocalDev) {
    return { valid: false, error: 'Requests to localhost are not permitted' };
  }

  // If local testing is explicitly allowed in non-production, allow localhost/127.0.0.1 directly
  if (allowLocalDev && (isLocalhost || hostname === '127.0.0.1' || hostname === '::1')) {
    return { valid: true, parsedUrl };
  }

  // Resolve hostname to IP to check for private / restricted network destinations
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { valid: false, error: 'Could not resolve hostname' };
    }

    for (const addr of addresses) {
      if (addr.family === 4 && isPrivateIPv4(addr.address)) {
        if (!allowLocalDev) {
          return { valid: false, error: `Destination IP ${addr.address} is in a private network range` };
        }
      } else if (addr.family === 6 && isPrivateIPv6(addr.address)) {
        if (!allowLocalDev) {
          return { valid: false, error: `Destination IP ${addr.address} is in a private IPv6 network range` };
        }
      }
    }
  } catch (err) {
    return { valid: false, error: `DNS resolution failed: ${err.message}` };
  }

  return { valid: true, parsedUrl };
}
