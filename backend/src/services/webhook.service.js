import { query } from '../db/client.js';
import { validateWebhookUrl } from '../utils/ssrf.js';
import { generateWebhookSecret, generateSignature } from '../utils/webhook-crypto.js';
import { SUPPORTED_EVENTS } from './event.service.js';

const REQUEST_TIMEOUT_MS = 10000;
const MAX_RESPONSE_LENGTH = 2000;
const MAX_ATTEMPTS = 5;

// Backoff delays in seconds: Attempt 1 -> 30s, Attempt 2 -> 120s (2m), Attempt 3 -> 600s (10m), Attempt 4 -> 1800s (30m)
const RETRY_BACKOFF_SECONDS = [30, 120, 600, 1800];

function formatWebhook(w, includeSecret = false) {
  const formatted = {
    id: w.id,
    workspaceId: w.workspace_id,
    name: w.name || w.description || 'Webhook Endpoint',
    url: w.url,
    description: w.description || '',
    events: typeof w.events === 'string' ? JSON.parse(w.events) : (w.events || []),
    isActive: Boolean(w.is_active !== undefined ? w.is_active : true),
    status: w.status || 'healthy',
    successRate: Number(w.success_rate || 100),
    lastDeliveryAt: w.last_delivery_at || null,
    createdAt: w.created_at,
    updatedAt: w.updated_at || w.created_at,
  };

  if (includeSecret) {
    formatted.secret = w.secret;
  }

  return formatted;
}

function formatDelivery(d) {
  return {
    id: d.id,
    webhookId: d.webhook_id,
    eventId: d.event_id || d.id,
    eventType: d.event_type || d.event || 'custom',
    status: d.status || d.state || 'delivered',
    attempt: Number(d.attempt || 1),
    httpStatus: d.http_status !== null && d.http_status !== undefined ? Number(d.http_status) : (d.status_code !== undefined ? Number(d.status_code) : null),
    durationMs: d.duration_ms !== null && d.duration_ms !== undefined ? Number(d.duration_ms) : null,
    response: d.response || null,
    payload: typeof d.payload === 'string' ? JSON.parse(d.payload) : (d.payload || null),
    createdAt: d.created_at,
    deliveredAt: d.delivered_at || null,
    nextRetryAt: d.next_retry_at || null,
  };
}

/**
 * List all webhooks for a workspace. Never returns secret.
 */
export async function listWebhooks(workspaceId) {
  const result = await query(
    `SELECT id, workspace_id, name, url, description, status, events, is_active, last_delivery_at, success_rate, created_at, updated_at
     FROM webhooks
     WHERE workspace_id = $1
     ORDER BY created_at DESC`,
    [workspaceId]
  );
  return result.rows.map((r) => formatWebhook(r, false));
}

/**
 * Create a new webhook. Secret is generated and returned ONLY in this response.
 */
export async function createWebhook(workspaceId, { name, url, events }) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    throw Object.assign(new Error('Webhook name is required'), { status: 400 });
  }

  const ssrfCheck = await validateWebhookUrl(url);
  if (!ssrfCheck.valid) {
    throw Object.assign(new Error(`Invalid URL: ${ssrfCheck.error}`), { status: 400 });
  }

  if (!Array.isArray(events) || events.length === 0) {
    throw Object.assign(new Error('At least one event must be selected'), { status: 400 });
  }

  const invalidEvents = events.filter((e) => e !== '*' && !SUPPORTED_EVENTS.includes(e));
  if (invalidEvents.length > 0) {
    throw Object.assign(
      new Error(`Unsupported event(s): ${invalidEvents.join(', ')}. Supported: ${SUPPORTED_EVENTS.join(', ')}`),
      { status: 400 }
    );
  }

  const secret = generateWebhookSecret();

  const result = await query(
    `INSERT INTO webhooks (workspace_id, name, url, secret, events, is_active, status, success_rate)
     VALUES ($1, $2, $3, $4, $5, true, 'healthy', 100)
     RETURNING *`,
    [workspaceId, trimmedName, url.trim(), secret, JSON.stringify(events)]
  );

  return formatWebhook(result.rows[0], true);
}

/**
 * Update an existing webhook. Never regenerates or returns secret.
 */
export async function updateWebhook(id, workspaceId, data) {
  const existing = await query(`SELECT * FROM webhooks WHERE id = $1 AND workspace_id = $2`, [id, workspaceId]);
  if (existing.rows.length === 0) {
    throw Object.assign(new Error('Webhook not found'), { status: 404 });
  }

  const current = existing.rows[0];
  let name = current.name;
  let url = current.url;
  let events = current.events;
  let isActive = current.is_active;

  if (data.name !== undefined) {
    const trimmed = String(data.name).trim();
    if (!trimmed) throw Object.assign(new Error('Name cannot be empty'), { status: 400 });
    name = trimmed;
  }

  if (data.url !== undefined) {
    const ssrfCheck = await validateWebhookUrl(data.url);
    if (!ssrfCheck.valid) {
      throw Object.assign(new Error(`Invalid URL: ${ssrfCheck.error}`), { status: 400 });
    }
    url = data.url.trim();
  }

  if (data.events !== undefined) {
    if (!Array.isArray(data.events) || data.events.length === 0) {
      throw Object.assign(new Error('At least one event must be selected'), { status: 400 });
    }
    const invalidEvents = data.events.filter((e) => e !== '*' && !SUPPORTED_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      throw Object.assign(
        new Error(`Unsupported event(s): ${invalidEvents.join(', ')}`),
        { status: 400 }
      );
    }
    events = JSON.stringify(data.events);
  }

  if (data.isActive !== undefined) {
    isActive = Boolean(data.isActive);
  } else if (data.is_active !== undefined) {
    isActive = Boolean(data.is_active);
  }

  const result = await query(
    `UPDATE webhooks
     SET name = $1, url = $2, events = $3, is_active = $4, updated_at = NOW()
     WHERE id = $5 AND workspace_id = $6
     RETURNING *`,
    [name, url, typeof events === 'string' ? events : JSON.stringify(events), isActive, id, workspaceId]
  );

  return formatWebhook(result.rows[0], false);
}

/**
 * Delete a webhook and its deliveries.
 */
export async function deleteWebhook(id, workspaceId) {
  const result = await query(`DELETE FROM webhooks WHERE id = $1 AND workspace_id = $2 RETURNING id`, [id, workspaceId]);
  if (result.rows.length === 0) {
    throw Object.assign(new Error('Webhook not found'), { status: 404 });
  }
  return { deleted: true, id };
}

/**
 * Dispatches an HTTP request for a delivery and records response.
 */
export async function dispatchDelivery(deliveryId) {
  const res = await query(
    `SELECT wd.*, w.url, w.secret, w.is_active, w.workspace_id
     FROM webhook_deliveries wd
     JOIN webhooks w ON w.id = wd.webhook_id
     WHERE wd.id = $1`,
    [deliveryId]
  );

  if (res.rows.length === 0) return null;
  const item = res.rows[0];

  // If webhook is disabled, mark delivery failed/cancelled
  if (!item.is_active) {
    await query(
      `UPDATE webhook_deliveries SET status = 'failed', response = 'Webhook is disabled', next_retry_at = NULL WHERE id = $1`,
      [deliveryId]
    );
    return;
  }

  const ssrfCheck = await validateWebhookUrl(item.url);
  if (!ssrfCheck.valid) {
    await query(
      `UPDATE webhook_deliveries SET status = 'failed', response = $1, next_retry_at = NULL WHERE id = $2`,
      [`SSRF blocked: ${ssrfCheck.error}`, deliveryId]
    );
    return;
  }

  const payload = typeof item.payload === 'string' ? item.payload : JSON.stringify(item.payload || {});
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateSignature(item.secret, timestamp, payload);

  const start = Date.now();
  let httpStatus = null;
  let responseText = '';
  let errorMsg = null;
  let isSuccess = false;

  try {
    const response = await fetch(item.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'IntelligenSpace-Hub-Webhooks/1.0',
        'X-IS-Event': item.event_type || 'custom',
        'X-IS-Delivery': item.id,
        'X-IS-Timestamp': String(timestamp),
        'X-IS-Signature': signature,
      },
      body: payload,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    httpStatus = response.status;
    const rawText = await response.text().catch(() => '');
    responseText = rawText.slice(0, MAX_RESPONSE_LENGTH);
    isSuccess = response.ok;
  } catch (err) {
    errorMsg = err.name === 'TimeoutError' ? 'Webhook request timed out (10s limit)' : (err.message || 'Network error');
    responseText = errorMsg;
  }

  const durationMs = Date.now() - start;
  const currentAttempt = Number(item.attempt || 1);

  if (isSuccess) {
    // Delivered successfully
    await query(
      `UPDATE webhook_deliveries
       SET status = 'delivered', state = 'delivered', http_status = $1, status_code = $1,
           response = $2, duration_ms = $3, delivered_at = NOW(), next_retry_at = NULL
       WHERE id = $4`,
      [httpStatus, responseText, durationMs, deliveryId]
    );
    // Update webhook last delivery timestamp
    await query(`UPDATE webhooks SET last_delivery_at = NOW() WHERE id = $1`, [item.webhook_id]);
    return { success: true, statusCode: httpStatus, durationMs };
  }

  // Determine if failure is retryable
  // Retry on: network errors (no status), timeouts, 500, 502, 503, 504
  const isRetryable = !httpStatus || [500, 502, 503, 504].includes(httpStatus);

  if (isRetryable && currentAttempt < MAX_ATTEMPTS) {
    const backoffSeconds = RETRY_BACKOFF_SECONDS[currentAttempt - 1] || 1800;
    await query(
      `UPDATE webhook_deliveries
       SET status = 'retrying', state = 'retrying', http_status = $1, status_code = $1,
           response = $2, duration_ms = $3, attempt = $4,
           next_retry_at = NOW() + ($5 || ' seconds')::INTERVAL
       WHERE id = $6`,
      [httpStatus, responseText, durationMs, currentAttempt + 1, backoffSeconds, deliveryId]
    );
    return { success: false, statusCode: httpStatus, durationMs, retrying: true };
  }

  // Permanent failure or max attempts reached
  await query(
    `UPDATE webhook_deliveries
     SET status = 'failed', state = 'failed', http_status = $1, status_code = $1,
         response = $2, duration_ms = $3, next_retry_at = NULL
     WHERE id = $4`,
    [httpStatus, responseText, durationMs, deliveryId]
  );

  return { success: false, statusCode: httpStatus, durationMs, error: errorMsg || `HTTP ${httpStatus}` };
}

/**
 * Sends a test event to a specific webhook.
 */
export async function testWebhook(id, workspaceId) {
  const result = await query(`SELECT * FROM webhooks WHERE id = $1 AND workspace_id = $2`, [id, workspaceId]);
  if (result.rows.length === 0) {
    throw Object.assign(new Error('Webhook not found'), { status: 404 });
  }
  const webhook = result.rows[0];

  const eventId = `evt_test_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const testPayload = {
    id: eventId,
    event: 'test',
    createdAt: new Date().toISOString(),
    workspaceId: workspaceId,
    data: {
      message: 'Test webhook from IntelligenSpace Hub',
      endpoint: webhook.url,
      timestamp: new Date().toISOString(),
    },
  };

  const deliveryRes = await query(
    `INSERT INTO webhook_deliveries (webhook_id, event_id, event_type, status, attempt, payload)
     VALUES ($1, $2, 'test', 'pending', 1, $3)
     RETURNING id`,
    [webhook.id, eventId, JSON.stringify(testPayload)]
  );

  const deliveryId = deliveryRes.rows[0].id;
  const dispatchRes = await dispatchDelivery(deliveryId);

  return {
    deliveryId,
    eventId,
    success: dispatchRes?.success || false,
    statusCode: dispatchRes?.statusCode || 0,
    durationMs: dispatchRes?.durationMs || 0,
    error: dispatchRes?.error || null,
  };
}

/**
 * Fetches deliveries for a webhook (workspace scoped).
 */
export async function getDeliveries(webhookId, workspaceId, limit = 50) {
  // Check webhook belongs to workspace
  const check = await query(`SELECT id FROM webhooks WHERE id = $1 AND workspace_id = $2`, [webhookId, workspaceId]);
  if (check.rows.length === 0) {
    throw Object.assign(new Error('Webhook not found'), { status: 404 });
  }

  const result = await query(
    `SELECT * FROM webhook_deliveries
     WHERE webhook_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [webhookId, Math.min(Number(limit) || 50, 100)]
  );

  return result.rows.map(formatDelivery);
}

/**
 * Fetches a single delivery detail (workspace scoped).
 */
export async function getDeliveryDetails(webhookId, deliveryId, workspaceId) {
  const check = await query(`SELECT id FROM webhooks WHERE id = $1 AND workspace_id = $2`, [webhookId, workspaceId]);
  if (check.rows.length === 0) {
    throw Object.assign(new Error('Webhook not found'), { status: 404 });
  }

  const result = await query(
    `SELECT * FROM webhook_deliveries WHERE id = $1 AND webhook_id = $2`,
    [deliveryId, webhookId]
  );

  if (result.rows.length === 0) {
    throw Object.assign(new Error('Delivery not found'), { status: 404 });
  }

  return formatDelivery(result.rows[0]);
}

/**
 * Internal event handler. Dispatches event to all matching active webhooks in the workspace.
 */
export async function handleEvent(workspaceId, eventType, eventId, data) {
  const webhooks = await query(
    `SELECT id, url, secret, events
     FROM webhooks
     WHERE workspace_id = $1 AND is_active = true`,
    [workspaceId]
  );

  if (webhooks.rows.length === 0) return;

  const eventEnvelope = {
    id: eventId,
    event: eventType,
    createdAt: new Date().toISOString(),
    workspaceId: workspaceId,
    data: data || {},
  };

  const stringifiedPayload = JSON.stringify(eventEnvelope);

  for (const webhook of webhooks.rows) {
    const subscribedEvents = typeof webhook.events === 'string' ? JSON.parse(webhook.events) : (webhook.events || []);
    if (!subscribedEvents.includes('*') && !subscribedEvents.includes(eventType)) {
      continue;
    }

    try {
      const deliveryRes = await query(
        `INSERT INTO webhook_deliveries (webhook_id, event_id, event_type, status, attempt, payload)
         VALUES ($1, $2, $3, 'pending', 1, $4)
         RETURNING id`,
        [webhook.id, eventId, eventType, stringifiedPayload]
      );

      const deliveryId = deliveryRes.rows[0].id;
      // Execute asynchronously
      dispatchDelivery(deliveryId).catch((err) => {
        console.error(`[WebhookService] Error dispatching delivery ${deliveryId}:`, err.message);
      });
    } catch (err) {
      console.error(`[WebhookService] Failed to create delivery for webhook ${webhook.id}:`, err.message);
    }
  }
}

/**
 * Periodic retry worker processor.
 */
export async function processRetries() {
  try {
    const pending = await query(
      `SELECT wd.id
       FROM webhook_deliveries wd
       JOIN webhooks w ON w.id = wd.webhook_id
       WHERE wd.status = 'retrying'
         AND wd.next_retry_at <= NOW()
         AND w.is_active = true
       ORDER BY wd.next_retry_at ASC
       LIMIT 10`
    );

    for (const row of pending.rows) {
      dispatchDelivery(row.id).catch((err) => {
        console.error(`[WebhookService] Retry dispatch error for ${row.id}:`, err.message);
      });
    }
  } catch (err) {
    console.error('[WebhookService] Error in processRetries:', err.message);
  }
}

/**
 * Starts the in-process background retry worker.
 */
export function startWebhookRetryWorker(intervalMs = 15000) {
  const timer = setInterval(processRetries, intervalMs);
  return {
    stop: () => clearInterval(timer),
  };
}
