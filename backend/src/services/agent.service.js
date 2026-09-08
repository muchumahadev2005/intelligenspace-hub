import { query } from '../db/client.js';
import * as eventService from './event.service.js';

export async function listAgents(workspaceId, { status, type, search, page = 1, limit = 50 } = {}) {
  let sql = `SELECT * FROM agents WHERE workspace_id = $1`;
  const params = [workspaceId];
  let idx = 2;

  if (status && status !== 'all') { sql += ` AND status = $${idx++}`; params.push(status); }
  if (type && type !== 'all') { sql += ` AND type = $${idx++}`; params.push(type); }
  if (search) { sql += ` AND (name ILIKE $${idx} OR description ILIKE $${idx})`; params.push(`%${search}%`); idx++; }

  sql += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, (page - 1) * limit);

  const result = await query(sql, params);
  return result.rows;
}

export async function getAgent(id, workspaceId) {
  const result = await query(
    `SELECT * FROM agents WHERE id = $1 AND workspace_id = $2`,
    [id, workspaceId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Agent not found'), { status: 404 });
  return result.rows[0];
}

export async function createAgent(workspaceId, data) {
  const { name, description, type, status, model, voice, language, instructions, greeting, tone, personality, tools } = data;
  const result = await query(
    `INSERT INTO agents (workspace_id, name, description, type, status, model, voice, language, instructions, greeting, tone, personality, tools)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [workspaceId, name, description, type || 'voice', status || 'active', model || 'openai/gpt-4o-mini',
     voice, language || 'en', instructions, greeting, tone, personality, JSON.stringify(tools || [])]
  );
  const agent = result.rows[0];

  eventService.emit('agent.created', {
    agent: {
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.status,
      model: agent.model,
    },
  }, workspaceId);

  return agent;
}

export async function updateAgent(id, workspaceId, data) {
  const agent = await getAgent(id, workspaceId);
  const updated = { ...agent, ...data };
  const result = await query(
    `UPDATE agents SET name=$1, description=$2, type=$3, model=$4, voice=$5, language=$6,
     instructions=$7, greeting=$8, tone=$9, personality=$10, tools=$11, updated_at=NOW()
     WHERE id=$12 AND workspace_id=$13 RETURNING *`,
    [updated.name, updated.description, updated.type, updated.model, updated.voice,
     updated.language, updated.instructions, updated.greeting, updated.tone,
     updated.personality, JSON.stringify(updated.tools || []), id, workspaceId]
  );
  const updatedAgent = result.rows[0];

  eventService.emit('agent.updated', {
    agent: {
      id: updatedAgent.id,
      name: updatedAgent.name,
      type: updatedAgent.type,
      status: updatedAgent.status,
      model: updatedAgent.model,
    },
  }, workspaceId);

  return updatedAgent;
}

export async function updateAgentStatus(id, workspaceId, status) {
  const result = await query(
    `UPDATE agents SET status=$1, updated_at=NOW() WHERE id=$2 AND workspace_id=$3 RETURNING *`,
    [status, id, workspaceId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Agent not found'), { status: 404 });
  const updatedAgent = result.rows[0];

  eventService.emit('agent.updated', {
    agent: {
      id: updatedAgent.id,
      name: updatedAgent.name,
      type: updatedAgent.type,
      status: updatedAgent.status,
      model: updatedAgent.model,
    },
  }, workspaceId);

  return updatedAgent;
}

export async function deleteAgent(id, workspaceId) {
  const result = await query(
    `DELETE FROM agents WHERE id=$1 AND workspace_id=$2 RETURNING id`,
    [id, workspaceId]
  );
  if (result.rows.length === 0) throw Object.assign(new Error('Agent not found'), { status: 404 });
  return { deleted: true };
}

export async function getAgentStats(id, workspaceId) {
  await getAgent(id, workspaceId); // ownership check
  const result = await query(
    `SELECT COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            ROUND(AVG(duration_seconds)) as avg_duration,
            COALESCE(SUM(cost), 0) as total_cost
     FROM calls WHERE agent_id = $1`,
    [id]
  );
  return result.rows[0];
}
