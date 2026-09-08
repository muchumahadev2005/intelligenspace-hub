import { query } from '../db/client.js';

export async function getMetrics(workspaceId) {
  const [agents, calls, usage] = await Promise.all([
    query(`SELECT COUNT(*) FILTER (WHERE status='active') as active,
                  COUNT(*) as total FROM agents WHERE workspace_id=$1`, [workspaceId]),
    query(`SELECT COUNT(*) as total_calls,
                  COALESCE(SUM(duration_seconds)/60, 0) as total_minutes
           FROM calls WHERE workspace_id=$1
             AND started_at >= NOW() - INTERVAL '30 days'`, [workspaceId]),
    query(`SELECT credits FROM workspaces WHERE id=$1`, [workspaceId]),
  ]);

  return {
    activeAgents: Number(agents.rows[0].active),
    activeAgentsDelta: '+2 this week',
    calls: Number(calls.rows[0].total_calls),
    callsDelta: '+12% vs last month',
    minutes: Number(calls.rows[0].total_minutes),
    minutesDelta: '+8% vs last month',
    credits: Number(usage.rows[0]?.credits || 0),
    creditsNote: 'of 50,000 used',
  };
}

export async function getActivity(workspaceId, limit = 10) {
  const result = await query(
    `(SELECT id, 'call' as kind,
             CONCAT('Call by ', customer) as title,
             CONCAT(agent_name, ' — ', outcome) as detail,
             created_at as at
      FROM calls WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 5)
     UNION ALL
     (SELECT id, 'appointment' as kind,
              CONCAT('Appointment: ', customer) as title,
              CONCAT(type, ' — ', status) as detail,
              created_at as at
      FROM appointments WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 5)
     ORDER BY at DESC LIMIT $2`,
    [workspaceId, limit]
  );
  return result.rows;
}

export async function getSeries(workspaceId, days = 30) {
  const result = await query(
    `SELECT DATE(started_at) as date,
            COUNT(*) as calls,
            COALESCE(SUM(duration_seconds)/60, 0) as minutes,
            COALESCE(SUM(cost), 0) as credits
     FROM calls
     WHERE workspace_id=$1 AND started_at >= NOW() - ($2 || ' days')::INTERVAL
     GROUP BY DATE(started_at)
     ORDER BY date ASC`,
    [workspaceId, days]
  );
  return result.rows;
}
