/**
 * Service layer. The UI and hooks only ever talk to this module, so the mock
 * implementation below can be swapped for real HTTP calls (Node/Express API)
 * without touching any component.
 */
import * as db from "@/mock/data";
import type {
  ActivityItem,
  Agent,
  AgentTemplate,
  ApiKey,
  Appointment,
  Call,
  DashboardMetrics,
  NotificationItem,
  Order,
  PhoneNumber,
  Product,
  SeriesPoint,
  TeamMember,
  UsageRecord,
  WebhookEndpoint,
  Workspace,
} from "@/types";

const LATENCY = 220;

function respond<T>(data: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms));
}

function notFound(entity: string): never {
  throw new Error(`${entity} not found`);
}

export const api = {
  workspaces: {
    list: () => respond<Workspace[]>(db.workspaces),
  },
  session: {
    current: () => respond(db.currentUser),
  },
  dashboard: {
    metrics: () => respond<DashboardMetrics>(db.metrics),
    activity: () => respond<ActivityItem[]>(db.activity),
    series: (range: 7 | 30 | 90) => respond<SeriesPoint[]>(db.series.slice(-range)),
  },
  agents: {
    list: () => respond<Agent[]>(db.agents),
    get: (id: string) => {
      const agent = db.agents.find((a) => a.id === id);
      return agent ? respond<Agent>(agent) : Promise.reject(new Error("Agent not found"));
    },
    create: (input: Partial<Agent>) =>
      respond<Agent>({
        ...db.agents[0]!,
        ...input,
        id: `agt_${Math.random().toString(36).slice(2, 8)}`,
        calls: 0,
        createdAt: new Date().toISOString(),
      } as Agent),
    update: (id: string, input: Partial<Agent>) => {
      const agent = db.agents.find((a) => a.id === id) ?? notFound("Agent");
      return respond<Agent>({ ...agent, ...input });
    },
  },
  templates: {
    list: () => respond<AgentTemplate[]>(db.templates),
  },
  phoneNumbers: {
    list: () => respond<PhoneNumber[]>(db.phoneNumbers),
  },
  calls: {
    list: () => respond<Call[]>(db.calls),
    get: (id: string) => {
      const call = db.calls.find((c) => c.id === id);
      return call ? respond<Call>(call) : Promise.reject(new Error("Call not found"));
    },
    recordings: () => respond<Call[]>(db.calls.filter((c) => c.hasRecording)),
  },
  appointments: {
    list: () => respond<Appointment[]>(db.appointments),
  },
  catalog: {
    list: () => respond<Product[]>(db.products),
  },
  orders: {
    list: () => respond<Order[]>(db.orders),
    get: (id: string) => {
      const order = db.orders.find((o) => o.id === id);
      return order ? respond<Order>(order) : Promise.reject(new Error("Order not found"));
    },
  },
  webhooks: {
    list: () => respond<WebhookEndpoint[]>(db.webhooks),
    test: (id: string) => respond({ id, statusCode: 200, durationMs: 138 }, 700),
  },
  developer: {
    keys: () => respond<ApiKey[]>(db.apiKeys),
    createKey: (name: string, permission: ApiKey["permission"]) =>
      respond<ApiKey & { secret: string }>({
        id: `key_${Math.random().toString(36).slice(2, 8)}`,
        name,
        maskedKey: "sk_live_••••••••••••b7e2",
        permission,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        requests30d: 0,
        secret: `sk_live_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
      }),
  },
  usage: {
    records: () => respond<UsageRecord[]>(db.usageRecords),
  },
  team: {
    list: () => respond<TeamMember[]>(db.team),
  },
  notifications: {
    list: () => respond<NotificationItem[]>(db.notifications),
  },
};

export type Api = typeof api;
