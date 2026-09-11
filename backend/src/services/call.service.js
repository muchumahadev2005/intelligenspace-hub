import { query } from '../db/client.js';

export async function listCalls(workspaceId, { status, direction, search, page = 1, limit = 50 } = {}) {
  let sql = `SELECT * FROM calls WHERE workspace_id = $1`;
  const params = [workspaceId];
  let idx = 2;

  if (status && status !== 'all') { sql += ` AND status = $${idx++}`; params.push(status); }
  if (direction && direction !== 'all') { sql += ` AND direction = $${idx++}`; params.push(direction); }
  if (search) {
    sql += ` AND (customer ILIKE $${idx} OR reference ILIKE $${idx} OR agent_name ILIKE $${idx})`;
    params.push(`%${search}%`); idx++;
  }

  sql += ` ORDER BY started_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, (page - 1) * limit);

  const result = await query(sql, params);
  return result.rows;
}

export async function getCall(id, workspaceId) {
  const result = await query(
    `SELECT * FROM calls WHERE id=$1 AND workspace_id=$2`,
    [id, workspaceId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Call not found'), { status: 404 });
  return result.rows[0];
}

export async function listRecordings(workspaceId) {
  const result = await query(
    `SELECT * FROM calls 
     WHERE workspace_id=$1 
       AND (has_recording=true OR (transcript IS NOT NULL AND jsonb_array_length(transcript) > 0)) 
     ORDER BY started_at DESC`,
    [workspaceId]
  );
  return result.rows;
}
