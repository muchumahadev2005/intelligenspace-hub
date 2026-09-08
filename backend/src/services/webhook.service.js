import { query } from '../db/client.js';

export async function listWebhooks(workspaceId) {
  const result = await query(
    `SELECT w.*, 
            json_agg(wd ORDER BY wd.created_at DESC) FILTER (WHERE wd.id IS NOT NULL) as deliveries
     FROM webhooks w
     LEFT JOIN webhook_deliveries wd ON wd.webhook_id = w.id
     WHERE w.workspace_id=$1
     GROUP BY w.id
     ORDER BY w.created_at DESC`,
    [workspaceId]
  );
  return result.rows;
}

export async function createWebhook(workspaceId, { url, description, events }) {
  const result = await query(
    `INSERT INTO webhooks (workspace_id, url, description, events) VALUES ($1,$2,$3,$4) RETURNING *`,
    [workspaceId, url, description, JSON.stringify(events || [])]
  );
  return result.rows[0];
}

export async function testWebhook(id, workspaceId) {
  // Record a test delivery
  const webhook = await query(`SELECT * FROM webhooks WHERE id=$1 AND workspace_id=$2`, [id, workspaceId]);
  if (webhook.rows.length === 0) throw Object.assign(new Error('Webhook not found'), { status: 404 });

  const start = Date.now();
  let statusCode = 200;
  let state = 'delivered';

  try {
    const res = await fetch(webhook.rows[0].url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Platform-Event': 'test' },
      body: JSON.stringify({ event: 'test', timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(5000),
    });
    statusCode = res.status;
    if (!res.ok) state = 'failed';
  } catch {
    statusCode = 0;
    state = 'failed';
  }

  const durationMs = Date.now() - start;
  await query(
    `INSERT INTO webhook_deliveries (webhook_id, event, status_code, state, duration_ms) VALUES ($1,'test',$2,$3,$4)`,
    [id, statusCode, state, durationMs]
  );

  return { statusCode, state, durationMs };
}

export async function deleteWebhook(id, workspaceId) {
  const result = await query(`DELETE FROM webhooks WHERE id=$1 AND workspace_id=$2 RETURNING id`, [id, workspaceId]);
  if (result.rows.length === 0) throw Object.assign(new Error('Webhook not found'), { status: 404 });
  return { deleted: true };
}
