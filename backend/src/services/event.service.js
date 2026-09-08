import crypto from 'crypto';
import * as webhookService from './webhook.service.js';

export const SUPPORTED_EVENTS = [
  'appointment.created',
  'appointment.updated',
  'appointment.cancelled',
  'order.created',
  'order.updated',
  'call.completed',
  'agent.created',
  'agent.updated',
];

/**
 * Emits an internal domain event to subscribed webhooks.
 * Asynchronous, non-blocking to caller routes.
 * 
 * @param {string} eventType - One of SUPPORTED_EVENTS
 * @param {object} data - Domain payload (appointment, order, call, agent)
 * @param {string} workspaceId - Workspace identifier
 * @returns {string} eventId
 */
export function emit(eventType, data, workspaceId) {
  if (!SUPPORTED_EVENTS.includes(eventType)) {
    console.warn(`[EventService] Ignored unsupported event type: ${eventType}`);
    return null;
  }

  if (!workspaceId) {
    console.warn(`[EventService] Cannot emit event ${eventType}: missing workspaceId`);
    return null;
  }

  const eventId = `evt_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;

  // Fire-and-forget: do not block the HTTP request that triggered this event
  Promise.resolve()
    .then(() => webhookService.handleEvent(workspaceId, eventType, eventId, data))
    .catch((err) => {
      console.error(`[EventService] Error dispatching event ${eventType} (${eventId}):`, err.message);
    });

  return eventId;
}

export default { emit, SUPPORTED_EVENTS };
