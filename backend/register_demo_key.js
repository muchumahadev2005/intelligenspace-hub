import crypto from 'crypto';
import { query } from './src/db/client.js';

async function main() {
  const rawKey = 'sk_live_demo_satvik_sweets_key_2026';
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const wsRes = await query('SELECT id FROM workspaces LIMIT 1');
  const workspaceId = wsRes.rows[0].id;
  await query(
    `INSERT INTO api_keys (workspace_id, name, key_hash, masked_key, permission, requests_30d, last_used_at)
     VALUES ($1, 'Demo Key (Satvik Sweets)', $2, 'sk_live_••••••••••••2026', 'full', 1, NOW())
     ON CONFLICT DO NOTHING`,
    [workspaceId, hash]
  );
  console.log('✅ Registered demo key in DB with hash:', hash);
  process.exit(0);
}
main().catch(console.error);
