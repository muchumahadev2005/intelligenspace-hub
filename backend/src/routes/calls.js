import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import * as callService from '../services/call.service.js';
import * as agentService from '../services/agent.service.js';
import * as eventService from '../services/event.service.js';
import { createWebCall, createPhoneCall } from '../services/retell.service.js';
import { query } from '../db/client.js';
import { generateRef } from '../utils/format.js';

export const callRoutes = new Hono();
callRoutes.use('*', authMiddleware);

// POST /api/v1/calls/web-call — Start live browser voice call via Retell
callRoutes.post('/web-call', async (c) => {
  const { workspaceId } = c.get('user');
  const { agentId, customerName } = await c.req.json();
  if (!agentId) return c.json({ error: 'agentId is required' }, 400);

  const agent = await agentService.getAgent(agentId, workspaceId);
  if (!agent) return c.json({ error: 'Agent not found' }, 404);

  try {
    const callData = await createWebCall({
      agent,
      customerName: customerName || 'Web User',
      workspaceId,
    });
    return c.json(callData);
  } catch (err) {
    console.error('[Web Call Error]', err.message);
    return c.json({ error: err.message || 'Failed to start web voice call' }, 500);
  }
});

// POST /api/v1/calls/phone-call — Start outbound phone call to mobile number via Retell
callRoutes.post('/phone-call', async (c) => {
  const { workspaceId } = c.get('user');
  const { agentId, phoneNumber, customerName } = await c.req.json();
  if (!agentId) return c.json({ error: 'agentId is required' }, 400);
  if (!phoneNumber) return c.json({ error: 'phoneNumber is required' }, 400);

  const agent = await agentService.getAgent(agentId, workspaceId);
  if (!agent) return c.json({ error: 'Agent not found' }, 404);

  try {
    const callData = await createPhoneCall({
      agent,
      toNumber: phoneNumber,
      customerName: customerName || 'Mobile Caller',
      workspaceId,
    });
    return c.json(callData);
  } catch (err) {
    console.error('[Phone Call Error]', err.message);
    return c.json({ error: err.message || 'Failed to place phone call' }, 400);
  }
});

// POST /api/v1/calls/log — Save browser voice call to PostgreSQL
callRoutes.post('/log', async (c) => {
  const { workspaceId } = c.get('user');
  const { agentId, customer, durationSeconds, transcript, summary, sentiment, intent } = await c.req.json();
  if (!agentId) return c.json({ error: 'agentId is required' }, 400);

  const agent = await agentService.getAgent(agentId, workspaceId);
  const reference = generateRef('CALL');

  try {
    const res = await query(
      `INSERT INTO calls (
        workspace_id, reference, customer, customer_number,
        agent_id, agent_name, direction, status, duration_seconds,
        started_at, cost, has_recording, summary,
        sentiment, intent, transcript
      ) VALUES (
        $1, $2, $3, 'Direct Browser Voice',
        $4, $5, 'inbound', 'completed', $6,
        NOW(), 0.00, false, $7,
        $8, $9, $10
      ) RETURNING *`,
      [
        workspaceId,
        reference,
        customer || 'Browser Visitor',
        agent?.id || agentId,
        agent?.name || 'AI Voice Agent',
        Number(durationSeconds || 0),
        summary || 'Direct browser voice conversation.',
        sentiment || 'positive',
        intent || 'General Voice Chat',
        JSON.stringify(transcript || []),
      ]
    );

    const callRow = res.rows[0];

    eventService.emit('call.completed', {
      call: {
        id: callRow.id,
        reference: callRow.reference,
        agentId: callRow.agent_id,
        agentName: callRow.agent_name,
        customer: callRow.customer,
        duration: Number(callRow.duration_seconds || 0),
        status: callRow.status,
        summary: callRow.summary,
        sentiment: callRow.sentiment,
        hasRecording: Boolean(callRow.has_recording),
      },
    }, workspaceId);

    return c.json({ success: true, call: callRow });
  } catch (err) {
    console.error('[Log Call Error]', err.message);
    return c.json({ error: 'Failed to log call' }, 500);
  }
});

callRoutes.get('/', async (c) => {
  const { workspaceId } = c.get('user');
  const { status, direction, search, page, limit } = c.req.query();
  const calls = await callService.listCalls(workspaceId, { status, direction, search, page, limit });
  return c.json(calls);
});

callRoutes.get('/recordings', async (c) => {
  const { workspaceId } = c.get('user');
  const recordings = await callService.listRecordings(workspaceId);
  return c.json(recordings);
});

callRoutes.get('/:id', async (c) => {
  const { workspaceId } = c.get('user');
  const call = await callService.getCall(c.req.param('id'), workspaceId);
  return c.json(call);
});
