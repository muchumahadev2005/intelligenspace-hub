import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import * as agentService from '../services/agent.service.js';
import { chatCompletion, buildAgentSystemPrompt } from '../services/openrouter.service.js';
import { query } from '../db/client.js';

export const agentRoutes = new Hono();
agentRoutes.use('*', authMiddleware);

// GET /api/v1/agents
agentRoutes.get('/', async (c) => {
  const { workspaceId } = c.get('user');
  const { status, type, search, page, limit } = c.req.query();
  const agents = await agentService.listAgents(workspaceId, { status, type, search, page, limit });
  return c.json(agents);
});

// POST /api/v1/agents
agentRoutes.post('/', async (c) => {
  const { workspaceId } = c.get('user');
  const data = await c.req.json();
  if (!data.name) return c.json({ error: 'name is required' }, 400);
  const agent = await agentService.createAgent(workspaceId, data);
  return c.json(agent, 201);
});

// GET /api/v1/agents/:id
agentRoutes.get('/:id', async (c) => {
  const { workspaceId } = c.get('user');
  const agent = await agentService.getAgent(c.req.param('id'), workspaceId);
  return c.json(agent);
});

// PATCH /api/v1/agents/:id
agentRoutes.patch('/:id', async (c) => {
  const { workspaceId } = c.get('user');
  const data = await c.req.json();
  const agent = await agentService.updateAgent(c.req.param('id'), workspaceId, data);
  return c.json(agent);
});

// PATCH /api/v1/agents/:id/status
agentRoutes.patch('/:id/status', async (c) => {
  const { workspaceId } = c.get('user');
  const { status } = await c.req.json();
  const validStatuses = ['active', 'paused', 'draft'];
  if (!validStatuses.includes(status)) return c.json({ error: 'Invalid status' }, 400);
  const agent = await agentService.updateAgentStatus(c.req.param('id'), workspaceId, status);
  return c.json(agent);
});

// DELETE /api/v1/agents/:id
agentRoutes.delete('/:id', async (c) => {
  const { workspaceId } = c.get('user');
  const result = await agentService.deleteAgent(c.req.param('id'), workspaceId);
  return c.json(result);
});

// GET /api/v1/agents/:id/stats
agentRoutes.get('/:id/stats', async (c) => {
  const { workspaceId } = c.get('user');
  const stats = await agentService.getAgentStats(c.req.param('id'), workspaceId);
  return c.json(stats);
});

// POST /api/v1/agents/:id/chat  — CORE: talk to agent via OpenRouter
agentRoutes.post('/:id/chat', async (c) => {
  const { workspaceId } = c.get('user');
  const { messages } = await c.req.json();

  const agent = await agentService.getAgent(c.req.param('id'), workspaceId);
  if (agent.status !== 'active') return c.json({ error: 'Agent is not active' }, 400);

  // Get workspace name for system prompt
  const ws = await query(`SELECT name FROM workspaces WHERE id=$1`, [workspaceId]);
  const workspaceName = ws.rows[0]?.name || '';

  const systemPrompt = buildAgentSystemPrompt(agent, workspaceName);

  const { reply, toolCalls, usage } = await chatCompletion({
    model: agent.model,
    systemPrompt,
    messages: messages || [],
  });

  // Update last_active_at
  await query(`UPDATE agents SET last_active_at=NOW() WHERE id=$1`, [agent.id]);

  return c.json({ reply, toolCalls, usage });
});
