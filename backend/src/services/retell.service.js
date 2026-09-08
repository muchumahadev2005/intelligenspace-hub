import { env } from '../config/env.js';
import { query } from '../db/client.js';
import { buildAgentSystemPrompt } from './openrouter.service.js';
import { generateRef } from '../utils/format.js';

const RETELL_API_URL = 'https://api.retellai.com';

/**
 * Creates a Retell Web Call (WebRTC browser voice call)
 * Injects dynamic prompt and variables from the platform agent.
 */
export async function createWebCall({ agent, customerName = 'Web Caller', workspaceId }) {
  if (!env.RETELL_API_KEY) {
    throw new Error('RETELL_API_KEY is missing from backend environment');
  }

  const prompt = buildAgentSystemPrompt(agent);
  const greeting = agent.greeting || `Hi, thanks for calling! How can I help you today?`;

  const payload = {
    agent_id: env.RETELL_AGENT_ID,
    retell_llm_dynamic_variables: {
      agent_name: agent.name,
      agent_prompt: prompt,
      agent_greeting: greeting,
      language: agent.language || 'English',
      tone: agent.tone || 'Warm and professional',
      personality: agent.personality || 'helpful',
    },
    metadata: {
      workspace_id: workspaceId,
      agent_id: agent.id,
      agent_name: agent.name,
      customer_name: customerName,
    },
  };

  const res = await fetch(`${RETELL_API_URL}/v2/create-web-call`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`Retell API error: ${err.message || res.statusText}`);
  }

  const data = await res.json();
  const reference = generateRef('CALL');

  // Insert call record into PostgreSQL
  const dbResult = await query(
    `INSERT INTO calls (
      workspace_id, reference, customer, customer_number,
      agent_id, agent_name, direction, status, started_at,
      retell_call_id
    ) VALUES ($1, $2, $3, $4, $5, $6, 'inbound', 'ongoing', NOW(), $7)
    RETURNING *`,
    [
      workspaceId,
      reference,
      customerName,
      'Web Call',
      agent.id,
      agent.name,
      data.call_id,
    ]
  );

  return {
    callId: data.call_id,
    accessToken: data.access_token,
    callRecord: dbResult.rows[0],
  };
}

/**
 * Creates a Retell Outbound Phone Call (Rings a user's physical mobile number)
 */
export async function createPhoneCall({ agent, toNumber, fromNumber, customerName = 'Mobile Customer', workspaceId }) {
  if (!env.RETELL_API_KEY) {
    throw new Error('RETELL_API_KEY is missing from backend environment');
  }
  if (!toNumber) {
    throw new Error('Phone number (toNumber) is required');
  }

  // Format to E.164 (e.g., 9392539153 -> +919392539153 if 10 digits)
  let formattedTo = String(toNumber).replace(/[^\d+]/g, '');
  if (!formattedTo.startsWith('+')) {
    if (formattedTo.length === 10) {
      formattedTo = '+91' + formattedTo;
    } else {
      formattedTo = '+' + formattedTo;
    }
  }

  // If fromNumber not passed, fetch registered numbers from Retell
  let callerId = fromNumber;
  if (!callerId) {
    try {
      const numbersRes = await fetch(`${RETELL_API_URL}/list-phone-numbers`, {
        headers: { 'Authorization': `Bearer ${env.RETELL_API_KEY}` }
      });
      const numbers = await numbersRes.json();
      if (Array.isArray(numbers) && numbers.length > 0) {
        callerId = numbers[0].phone_number;
      }
    } catch (e) {
      console.error('[Retell Phone Numbers Fetch Error]', e.message);
    }
  }

  if (!callerId) {
    throw new Error(
      `To dial physical mobile phones (like ${formattedTo}), Retell requires a registered caller phone number. ` +
      `Please purchase or link a phone number in your Retell Dashboard at https://dashboard.retellai.com/phone-numbers. ` +
      `In the meantime, you can use the instant Live WebRTC Voice Call to talk directly through your browser!`
    );
  }

  const prompt = buildAgentSystemPrompt(agent);
  const greeting = agent.greeting || `Hi, thanks for answering! How can I help you today?`;

  const payload = {
    from_number: callerId,
    to_number: formattedTo,
    override_agent_id: env.RETELL_AGENT_ID,
    retell_llm_dynamic_variables: {
      agent_name: agent.name,
      agent_prompt: prompt,
      agent_greeting: greeting,
      language: agent.language || 'English',
      tone: agent.tone || 'Warm and professional',
      personality: agent.personality || 'helpful',
    },
    metadata: {
      workspace_id: workspaceId,
      agent_id: agent.id,
      agent_name: agent.name,
      customer_name: customerName,
      phone_number: formattedTo,
    },
  };

  const res = await fetch(`${RETELL_API_URL}/v2/create-phone-call`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.error_message || err.message || `Retell call failed (${res.status})`);
  }

  const data = await res.json();
  const reference = generateRef('CALL');

  // Insert call record into PostgreSQL
  const dbResult = await query(
    `INSERT INTO calls (
      workspace_id, reference, customer, customer_number,
      agent_id, agent_name, direction, status, started_at,
      retell_call_id
    ) VALUES ($1, $2, $3, $4, $5, $6, 'outbound', 'ongoing', NOW(), $7)
    RETURNING *`,
    [
      workspaceId,
      reference,
      customerName,
      formattedTo,
      agent.id,
      agent.name,
      data.call_id,
    ]
  );

  return {
    callId: data.call_id,
    toNumber: formattedTo,
    fromNumber: callerId,
    callRecord: dbResult.rows[0],
  };
}

/**
 * Handle Retell Webhook events (call_started, call_ended, call_analyzed)
 */
export async function handleRetellWebhook(event, data) {
  console.log(`[Retell Webhook] Received ${event} for call ${data.call_id}`);

  const callId = data.call_id;
  if (!callId) return;

  const durationSeconds = data.duration_ms ? Math.round(data.duration_ms / 1000) : 0;
  const cost = data.call_cost?.combined_cost || 0;
  const recordingUrl = data.recording_url || null;
  const hasRecording = Boolean(recordingUrl);

  // Extract transcript
  let transcript = [];
  if (data.transcript_object && Array.isArray(data.transcript_object)) {
    transcript = data.transcript_object.map((t) => ({
      speaker: t.role === 'agent' ? 'AI' : 'Customer',
      text: t.content || '',
      timestamp: t.words && t.words[0] ? `${Math.round(t.words[0].start)}s` : '',
    }));
  } else if (typeof data.transcript === 'string') {
    transcript = [{ speaker: 'Transcript', text: data.transcript, timestamp: '0s' }];
  }

  // Analysis / Summary / Sentiment
  const summary = data.call_analysis?.call_summary || data.disconnection_reason || 'Web call completed.';
  const sentiment = data.call_analysis?.user_sentiment?.toLowerCase() || 'neutral';
  const intent = data.call_analysis?.custom_analysis_data?.intent || 'General Inquiry';

  // Check if call exists by retell_call_id
  const existing = await query(`SELECT id FROM calls WHERE retell_call_id=$1`, [callId]);

  if (existing.rows.length > 0) {
    await query(
      `UPDATE calls SET
        status = 'completed',
        duration_seconds = COALESCE($1, duration_seconds),
        cost = COALESCE($2, cost),
        has_recording = $3,
        recording_url = COALESCE($4, recording_url),
        summary = COALESCE($5, summary),
        sentiment = COALESCE($6, sentiment),
        intent = COALESCE($7, intent),
        transcript = $8
      WHERE retell_call_id = $9`,
      [
        durationSeconds,
        cost,
        hasRecording,
        recordingUrl,
        summary,
        sentiment,
        intent,
        JSON.stringify(transcript),
        callId,
      ]
    );
  } else {
    // If inbound phone call directly through Retell
    const workspaceId = data.metadata?.workspace_id;
    const agentId = data.metadata?.agent_id;
    const agentName = data.metadata?.agent_name || 'AI Voice Agent';

    if (workspaceId) {
      const reference = generateRef('CALL');
      await query(
        `INSERT INTO calls (
          workspace_id, reference, customer, customer_number,
          agent_id, agent_name, direction, status, duration_seconds,
          started_at, cost, has_recording, recording_url, summary,
          sentiment, intent, transcript, retell_call_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 'completed', $8,
          NOW(), $9, $10, $11, $12, $13, $14, $15, $16
        )`,
        [
          workspaceId,
          reference,
          data.metadata?.customer_name || data.from_number || 'Caller',
          data.from_number || 'Voice Call',
          agentId || null,
          agentName,
          data.direction || 'inbound',
          durationSeconds,
          cost,
          hasRecording,
          recordingUrl,
          summary,
          sentiment,
          intent,
          JSON.stringify(transcript),
          callId,
        ]
      );
    }
  }

  return { success: true };
}
