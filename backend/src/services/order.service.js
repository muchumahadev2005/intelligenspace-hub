import { query } from '../db/client.js';
import { generateRef } from '../utils/format.js';
import * as eventService from './event.service.js';

export async function listOrders(workspaceId, { status, search, page = 1, limit = 50 } = {}) {
  let sql = `SELECT * FROM orders WHERE workspace_id=$1`;
  const params = [workspaceId];
  let idx = 2;

  if (status && status !== 'all') { sql += ` AND status=$${idx++}`; params.push(status); }
  if (search) {
    sql += ` AND (customer ILIKE $${idx} OR reference ILIKE $${idx})`;
    params.push(`%${search}%`); idx++;
  }

  sql += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, (page - 1) * limit);

  const result = await query(sql, params);
  return result.rows;
}

export async function getOrder(id, workspaceId) {
  const result = await query(`SELECT * FROM orders WHERE id=$1 AND workspace_id=$2`, [id, workspaceId]);
  if (result.rows.length === 0) throw Object.assign(new Error('Order not found'), { status: 404 });
  return result.rows[0];
}

export async function createOrder(workspaceId, data) {
  const { customer, phone, items, agent_id, agent_name, channel } = data;
  const total = (items || []).reduce((s, i) => s + i.price * i.quantity, 0);
  const reference = generateRef('ORD');
  const timeline = [{ label: 'Order placed', at: new Date().toISOString() }];

  const result = await query(
    `INSERT INTO orders (workspace_id, reference, customer, phone, items, total, status, agent_id, agent_name, channel, timeline)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10) RETURNING *`,
    [workspaceId, reference, customer, phone, JSON.stringify(items), total, agent_id, agent_name, channel || 'api', JSON.stringify(timeline)]
  );
  const order = result.rows[0];

  eventService.emit('order.created', {
    order: {
      id: order.id,
      reference: order.reference,
      customerName: order.customer,
      customerPhone: order.phone,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []),
      total: Number(order.total || 0),
      status: order.status,
    },
  }, workspaceId);

  return order;
}

export async function updateOrderStatus(id, workspaceId, status) {
  const order = await getOrder(id, workspaceId);
  const timeline = [...(order.timeline || []), { label: `Status changed to ${status}`, at: new Date().toISOString() }];
  const result = await query(
    `UPDATE orders SET status=$1, timeline=$2, updated_at=NOW() WHERE id=$3 AND workspace_id=$4 RETURNING *`,
    [status, JSON.stringify(timeline), id, workspaceId]
  );
  const updatedOrder = result.rows[0];

  eventService.emit('order.updated', {
    order: {
      id: updatedOrder.id,
      reference: updatedOrder.reference,
      customerName: updatedOrder.customer,
      customerPhone: updatedOrder.phone,
      status: updatedOrder.status,
      total: Number(updatedOrder.total || 0),
    },
  }, workspaceId);

  return updatedOrder;
}
