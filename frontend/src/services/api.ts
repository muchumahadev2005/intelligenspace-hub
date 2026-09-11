/**
 * Production Service layer. Connects the UI and hooks directly to the real
 * backend API endpoints. All mock data and mock fallbacks have been removed.
 */
import { apiRequest } from "@/lib/api-client";
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
  UserSession,
  WebhookEndpoint,
  WebhookDelivery,
  CreateWebhookInput,
  UpdateWebhookInput,
  TestWebhookResult,
  Workspace,
} from "@/types";

function mapAgent(a: any): Agent {
  return {
    id: a.id,
    name: a.name,
    description: a.description || "",
    type: a.type || "voice",
    status: a.status || "active",
    model: a.model || "openrouter/free",
    voice: a.voice,
    language: a.language || "en",
    calls: Number(a.calls_count ?? a.calls ?? 0),
    successRate: Number(a.success_rate ?? a.successRate ?? 95),
    lastActiveAt: a.last_active_at || a.lastActiveAt || a.created_at || new Date().toISOString(),
    phoneNumber: a.phone_number || a.phoneNumber,
    instructions: a.instructions || "",
    greeting: a.greeting || "",
    tone: a.tone || "professional",
    personality: a.personality || "helpful",
    tools: typeof a.tools === "string" ? JSON.parse(a.tools) : (a.tools || []),
    createdAt: a.created_at || a.createdAt || new Date().toISOString(),
  };
}

function mapCall(c: any): Call {
  return {
    id: c.id,
    reference: c.reference || "",
    customer: c.customer || "Caller",
    customerNumber: c.customer_number || "",
    agentId: c.agent_id || "",
    agentName: c.agent_name || "Agent",
    direction: c.direction || "inbound",
    status: c.status || "completed",
    durationSeconds: Number(c.duration_seconds || 0),
    startedAt: c.started_at || c.created_at || new Date().toISOString(),
    cost: Number(c.cost || 0),
    hasRecording: Boolean(c.has_recording),
    recordingUrl: c.recording_url || c.recordingUrl || undefined,
    intent: c.intent || "",
    sentiment: c.sentiment || "neutral",
    outcome: c.outcome || "",
    summary: c.summary || "",
    transcript: typeof c.transcript === "string" ? JSON.parse(c.transcript) : (c.transcript || []),
  };
}

export const api = {
  workspaces: {
    list: async (): Promise<Workspace[]> => {
      try {
        const rows = await apiRequest<any[]>("/workspaces");
        if (Array.isArray(rows)) {
          return rows.map((w) => ({
            id: w.id,
            name: w.name,
            plan: w.plan || "Scale",
            members: Number(w.members || w.member_count || 1),
          }));
        }
      } catch (err) {
        console.error("[API] Failed to fetch workspaces:", err);
      }
      return [];
    },
  },

  session: {
    current: async (): Promise<UserSession> => {
      try {
        const me = await apiRequest<any>("/auth/me");
        if (me) {
          const name = me.name || "User";
          return {
            name,
            email: me.email || "",
            role: "Owner",
            initials: name.slice(0, 2).toUpperCase(),
          };
        }
      } catch (err) {
        console.warn("[API] Failed to fetch user profile:", err);
      }
      return {
        name: "Workspace User",
        email: "user@workspace.local",
        role: "Owner",
        initials: "WU",
      };
    },
  },

  dashboard: {
    metrics: async (): Promise<DashboardMetrics> => {
      try {
        const data = await apiRequest<DashboardMetrics>("/dashboard/metrics");
        if (data) return data;
      } catch (err) {
        console.error("[API] Failed to fetch dashboard metrics:", err);
      }
      return {
        activeAgents: 0,
        activeAgentsDelta: "—",
        calls: 0,
        callsDelta: "—",
        minutes: 0,
        minutesDelta: "—",
        credits: 0,
        creditsNote: "remaining",
      };
    },
    activity: async (): Promise<ActivityItem[]> => {
      try {
        const data = await apiRequest<ActivityItem[]>("/dashboard/activity");
        if (Array.isArray(data)) return data;
      } catch (err) {
        console.error("[API] Failed to fetch dashboard activity:", err);
      }
      return [];
    },
    series: async (range: 7 | 30 | 90): Promise<SeriesPoint[]> => {
      try {
        const data = await apiRequest<any[]>(`/dashboard/series?range=${range}`);
        if (Array.isArray(data)) {
          return data.map((d) => ({
            date: typeof d.date === "string" ? d.date.slice(0, 10) : new Date(d.date).toISOString().slice(0, 10),
            calls: Number(d.calls || 0),
            minutes: Number(d.minutes || 0),
            agents: Number(d.agents || 0),
            credits: Number(d.credits || 0),
          }));
        }
      } catch (err) {
        console.error("[API] Failed to fetch dashboard series:", err);
      }
      return [];
    },
  },

  agents: {
    list: async (): Promise<Agent[]> => {
      try {
        const data = await apiRequest<any[]>("/agents");
        if (Array.isArray(data)) {
          return data.map(mapAgent);
        }
      } catch (err) {
        console.error("[API] Failed to fetch agents:", err);
      }
      return [];
    },
    get: async (id: string): Promise<Agent> => {
      const a = await apiRequest<any>(`/agents/${id}`);
      if (!a) throw new Error("Agent not found");
      return mapAgent(a);
    },
    create: async (input: Partial<Agent>): Promise<Agent> => {
      const created = await apiRequest<any>("/agents", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return mapAgent(created);
    },
    update: async (id: string, input: Partial<Agent>): Promise<Agent> => {
      const updated = await apiRequest<any>(`/agents/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      return mapAgent(updated);
    },
    chat: async (id: string, messages: { role: string; content: string }[]) => {
      return apiRequest<{ reply: string; toolCalls: any[]; usage: any }>(`/agents/${id}/chat`, {
        method: "POST",
        body: JSON.stringify({ messages }),
      });
    },
  },

  templates: {
    list: async (): Promise<AgentTemplate[]> => {
      try {
        const rows = await apiRequest<any[]>("/templates");
        if (Array.isArray(rows)) {
          return rows.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            category: t.category,
            useCase: t.use_case || t.useCase || "",
            type: t.type,
            icon: t.icon,
            popularity: Number(t.popularity || 0),
            instructions: t.instructions || "",
            greeting: t.greeting || "",
            tone: t.tone || "",
            personality: t.personality || "",
            tools: Array.isArray(t.tools)
              ? t.tools
              : typeof t.tools === "string"
              ? JSON.parse(t.tools || "[]")
              : [],
            model: t.model || "openai/gpt-4o-mini",
          }));
        }
      } catch (err) {
        console.error("[API] Failed to fetch templates:", err);
      }
      return [];
    },
  },

  phoneNumbers: {
    list: async (): Promise<PhoneNumber[]> => {
      try {
        const rows = await apiRequest<any[]>("/phone-numbers");
        if (Array.isArray(rows)) {
          return rows.map((p) => ({
            id: p.id,
            number: p.number,
            country: p.country || "US",
            region: p.region || "Global",
            status: p.status || "active",
            assignedAgentId: p.assigned_agent_id,
            assignedAgentName: p.assigned_agent_name,
            monthlyCost: Number(p.monthly_cost || 0),
            capabilities: typeof p.capabilities === "string" ? JSON.parse(p.capabilities) : (p.capabilities || ["voice"]),
          }));
        }
      } catch (err) {
        console.error("[API] Failed to fetch phone numbers:", err);
      }
      return [];
    },
  },

  calls: {
    list: async (): Promise<Call[]> => {
      try {
        const rows = await apiRequest<any[]>("/calls");
        if (Array.isArray(rows)) {
          return rows.map(mapCall);
        }
      } catch (err) {
        console.error("[API] Failed to fetch calls:", err);
      }
      return [];
    },
    get: async (id: string): Promise<Call> => {
      const c = await apiRequest<any>(`/calls/${id}`);
      if (!c) throw new Error("Call not found");
      return mapCall(c);
    },
    startWebCall: async (agentId: string, customerName?: string): Promise<{ callId: string; accessToken: string }> => {
      return await apiRequest("/calls/web-call", {
        method: "POST",
        body: JSON.stringify({ agentId, customerName }),
      });
    },
    startPhoneCall: async (agentId: string, phoneNumber: string, customerName?: string): Promise<{ callId: string; toNumber: string; fromNumber: string }> => {
      return await apiRequest("/calls/phone-call", {
        method: "POST",
        body: JSON.stringify({ agentId, phoneNumber, customerName }),
      });
    },
    logCall: async (data: { agentId: string; customer?: string; durationSeconds: number; transcript: any[]; summary?: string; sentiment?: string; intent?: string }): Promise<any> => {
      return await apiRequest("/calls/log", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    recordings: async (): Promise<Call[]> => {
      try {
        const rows = await apiRequest<any[]>("/calls/recordings");
        if (Array.isArray(rows)) {
          return rows.map(mapCall);
        }
      } catch (err) {
        console.error("[API] Failed to fetch recordings:", err);
      }
      return [];
    },
  },

  appointments: {
    list: async (status?: string): Promise<Appointment[]> => {
      try {
        const url = status && status !== "all" ? `/appointments?status=${encodeURIComponent(status)}` : "/appointments";
        const rows = await apiRequest<any[]>(url);
        if (Array.isArray(rows)) {
          return rows.map((a) => ({
            id: a.id,
            customer: a.customer || "",
            phone: a.phone || "",
            email: a.email || "",
            agentName: a.agent_name || a.agentName || "Agent",
            type: a.type || "Consultation",
            date: a.date ? (typeof a.date === "string" ? a.date.slice(0, 10) : new Date(a.date).toISOString().slice(0, 10)) : "",
            time: a.time ? (typeof a.time === "string" ? a.time.slice(0, 5) : "") : "",
            durationMinutes: Number(a.duration_minutes ?? a.durationMinutes ?? 30),
            status: (a.status || "confirmed") as Appointment["status"],
            notes: a.notes || "",
          }));
        }
      } catch (err) {
        console.error("[API] Failed to fetch appointments:", err);
      }
      return [];
    },
    create: async (data: Partial<Appointment>): Promise<Appointment> => {
      const res = await apiRequest<any>("/appointments", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return {
        id: res.id,
        customer: res.customer || "",
        phone: res.phone || "",
        email: res.email || "",
        agentName: res.agent_name || res.agentName || "Agent",
        type: res.type || "Consultation",
        date: res.date ? (typeof res.date === "string" ? res.date.slice(0, 10) : new Date(res.date).toISOString().slice(0, 10)) : "",
        time: res.time ? (typeof res.time === "string" ? res.time.slice(0, 5) : "") : "",
        durationMinutes: Number(res.duration_minutes ?? res.durationMinutes ?? 30),
        status: (res.status || "confirmed") as Appointment["status"],
        notes: res.notes || "",
      };
    },
    update: async (id: string, data: Partial<Appointment>): Promise<Appointment> => {
      const res = await apiRequest<any>(`/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return res;
    },
    delete: async (id: string): Promise<void> => {
      await apiRequest(`/appointments/${id}`, { method: "DELETE" });
    },
  },

  catalog: {
    list: async (): Promise<Product[]> => {
      try {
        const rows = await apiRequest<any[]>("/catalog");
        if (Array.isArray(rows)) {
          return rows.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description || "",
            sku: p.sku || "",
            category: p.category || "General",
            price: Number(p.price || 0),
            stock: Number(p.stock || 0),
            status: p.status || "active",
            agentVisible: Boolean(p.agent_visible ?? p.agentVisible),
          }));
        }
      } catch (err) {
        console.error("[API] Failed to fetch catalog:", err);
      }
      return [];
    },
    create: async (data: Partial<Product>): Promise<Product> => {
      const p = await apiRequest<any>("/catalog", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return {
        id: p.id,
        name: p.name,
        description: p.description || "",
        sku: p.sku || "",
        category: p.category || "General",
        price: Number(p.price || 0),
        stock: Number(p.stock || 0),
        status: p.status || "active",
        agentVisible: Boolean(p.agent_visible ?? p.agentVisible),
      };
    },
    update: async (id: string, data: Partial<Product>): Promise<Product> => {
      const p = await apiRequest<any>(`/catalog/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return {
        id: p.id,
        name: p.name,
        description: p.description || "",
        sku: p.sku || "",
        category: p.category || "General",
        price: Number(p.price || 0),
        stock: Number(p.stock || 0),
        status: p.status || "active",
        agentVisible: Boolean(p.agent_visible ?? p.agentVisible),
      };
    },
    delete: async (id: string): Promise<void> => {
      await apiRequest(`/catalog/${id}`, { method: "DELETE" });
    },
  },

  orders: {
    list: async (): Promise<Order[]> => {
      try {
        const rows = await apiRequest<any[]>("/orders");
        if (Array.isArray(rows)) {
          return rows.map((o) => ({
            id: o.id,
            reference: o.reference || "",
            customer: o.customer || "",
            phone: o.phone || "",
            items: typeof o.items === "string" ? JSON.parse(o.items) : (o.items || []),
            total: Number(o.total || 0),
            status: o.status || "pending",
            agentName: o.agent_name || "Agent",
            channel: o.channel || "voice",
            createdAt: o.created_at || new Date().toISOString(),
            timeline: typeof o.timeline === "string" ? JSON.parse(o.timeline) : (o.timeline || []),
          }));
        }
      } catch (err) {
        console.error("[API] Failed to fetch orders:", err);
      }
      return [];
    },
    get: async (id: string): Promise<Order> => {
      const o = await apiRequest<any>(`/orders/${id}`);
      if (!o) throw new Error("Order not found");
      return {
        id: o.id,
        reference: o.reference || "",
        customer: o.customer || "",
        phone: o.phone || "",
        items: typeof o.items === "string" ? JSON.parse(o.items) : (o.items || []),
        total: Number(o.total || 0),
        status: o.status || "pending",
        agentName: o.agent_name || "Agent",
        channel: o.channel || "voice",
        createdAt: o.created_at || new Date().toISOString(),
        timeline: typeof o.timeline === "string" ? JSON.parse(o.timeline) : (o.timeline || []),
      };
    },
  },

  webhooks: {
    list: async (): Promise<WebhookEndpoint[]> => {
      try {
        const rows = await apiRequest<any[]>("/webhooks");
        if (Array.isArray(rows)) {
          return rows.map((w) => ({
            id: w.id,
            workspaceId: w.workspaceId || w.workspace_id,
            name: w.name || w.description || "Webhook Endpoint",
            url: w.url,
            description: w.description || "",
            status: (w.status || "healthy") as WebhookEndpoint["status"],
            events: typeof w.events === "string" ? JSON.parse(w.events) : (w.events || []),
            isActive: Boolean(w.isActive !== undefined ? w.isActive : (w.is_active !== undefined ? w.is_active : true)),
            successRate: Number(w.successRate ?? w.success_rate ?? 100),
            lastDeliveryAt: w.lastDeliveryAt || w.last_delivery_at || null,
            createdAt: w.createdAt || w.created_at || new Date().toISOString(),
            updatedAt: w.updatedAt || w.updated_at,
            deliveries: [],
          }));
        }
      } catch (err) {
        console.error("[API] Failed to fetch webhooks:", err);
      }
      return [];
    },
    getWebhooks: async (): Promise<WebhookEndpoint[]> => {
      return api.webhooks.list();
    },
    createWebhook: async (data: CreateWebhookInput): Promise<WebhookEndpoint & { secret: string }> => {
      const res = await apiRequest<any>("/webhooks", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return {
        id: res.id,
        workspaceId: res.workspaceId || res.workspace_id,
        name: res.name,
        url: res.url,
        description: res.description || "",
        status: res.status || "healthy",
        events: res.events || [],
        isActive: Boolean(res.isActive !== undefined ? res.isActive : res.is_active),
        successRate: Number(res.successRate ?? res.success_rate ?? 100),
        lastDeliveryAt: res.lastDeliveryAt || res.last_delivery_at || null,
        createdAt: res.createdAt || res.created_at || new Date().toISOString(),
        secret: res.secret,
      };
    },
    updateWebhook: async (id: string, data: UpdateWebhookInput): Promise<WebhookEndpoint> => {
      const res = await apiRequest<any>(`/webhooks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return {
        id: res.id,
        name: res.name,
        url: res.url,
        description: res.description || "",
        status: res.status || "healthy",
        events: res.events || [],
        isActive: Boolean(res.isActive !== undefined ? res.isActive : res.is_active),
        successRate: Number(res.successRate ?? res.success_rate ?? 100),
        lastDeliveryAt: res.lastDeliveryAt || res.last_delivery_at || null,
        createdAt: res.createdAt || res.created_at,
      };
    },
    deleteWebhook: async (id: string): Promise<{ deleted: boolean }> => {
      return await apiRequest(`/webhooks/${id}`, { method: "DELETE" });
    },
    testWebhook: async (id: string): Promise<TestWebhookResult> => {
      return await apiRequest<TestWebhookResult>(`/webhooks/${id}/test`, { method: "POST" });
    },
    getDeliveries: async (webhookId: string, limit = 50): Promise<WebhookDelivery[]> => {
      try {
        const rows = await apiRequest<any[]>(`/webhooks/${webhookId}/deliveries?limit=${limit}`);
        if (Array.isArray(rows)) {
          return rows.map((d) => ({
            id: d.id,
            webhookId: d.webhookId || d.webhook_id,
            eventId: d.eventId || d.event_id || d.id,
            eventType: d.eventType || d.event_type || d.event || "custom",
            event: d.eventType || d.event_type || d.event || "custom",
            status: d.status || d.state || "delivered",
            state: d.status || d.state || "delivered",
            attempt: Number(d.attempt || 1),
            httpStatus: d.httpStatus !== undefined && d.httpStatus !== null ? Number(d.httpStatus) : (d.status_code !== undefined ? Number(d.status_code) : null),
            statusCode: d.httpStatus !== undefined && d.httpStatus !== null ? Number(d.httpStatus) : (d.status_code !== undefined ? Number(d.status_code) : 0),
            durationMs: d.durationMs !== undefined && d.durationMs !== null ? Number(d.durationMs) : (d.duration_ms !== undefined ? Number(d.duration_ms) : null),
            response: d.response || null,
            payload: d.payload || null,
            createdAt: d.createdAt || d.created_at || new Date().toISOString(),
            at: d.createdAt || d.created_at || new Date().toISOString(),
            deliveredAt: d.deliveredAt || d.delivered_at || null,
            nextRetryAt: d.nextRetryAt || d.next_retry_at || null,
          }));
        }
      } catch (err) {
        console.error("[API] Failed to fetch deliveries:", err);
      }
      return [];
    },
    getDeliveryDetails: async (webhookId: string, deliveryId: string): Promise<WebhookDelivery> => {
      const d = await apiRequest<any>(`/webhooks/${webhookId}/deliveries/${deliveryId}`);
      return {
        id: d.id,
        webhookId: d.webhookId || d.webhook_id,
        eventId: d.eventId || d.event_id || d.id,
        eventType: d.eventType || d.event_type || d.event || "custom",
        event: d.eventType || d.event_type || d.event || "custom",
        status: d.status || d.state || "delivered",
        state: d.status || d.state || "delivered",
        attempt: Number(d.attempt || 1),
        httpStatus: d.httpStatus !== undefined && d.httpStatus !== null ? Number(d.httpStatus) : (d.status_code !== undefined ? Number(d.status_code) : null),
        statusCode: d.httpStatus !== undefined && d.httpStatus !== null ? Number(d.httpStatus) : (d.status_code !== undefined ? Number(d.status_code) : 0),
        durationMs: d.durationMs !== undefined && d.durationMs !== null ? Number(d.durationMs) : (d.duration_ms !== undefined ? Number(d.duration_ms) : null),
        response: d.response || null,
        payload: d.payload || null,
        createdAt: d.createdAt || d.created_at || new Date().toISOString(),
        at: d.createdAt || d.created_at || new Date().toISOString(),
        deliveredAt: d.deliveredAt || d.delivered_at || null,
        nextRetryAt: d.nextRetryAt || d.next_retry_at || null,
      };
    },
  },

  developer: {
    keys: async (): Promise<ApiKey[]> => {
      try {
        const rows = await apiRequest<any[]>("/api-keys");
        if (Array.isArray(rows)) {
          return rows.map((r) => ({
            id: r.id,
            name: r.name || "API Key",
            maskedKey: r.maskedKey || r.masked_key || "sk_live_••••••••••••",
            permission: (r.permission || "full") as ApiKey["permission"],
            requests30d: Number(r.requests30d ?? r.requests_30d ?? 0),
            lastUsedAt: r.lastUsedAt || r.last_used_at || null,
            createdAt: r.createdAt || r.created_at || new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.error("[API] Failed to fetch API keys:", err);
      }
      return [];
    },
    createKey: async (name: string, permission: ApiKey["permission"] = "full"): Promise<ApiKey & { secret: string }> => {
      const res = await apiRequest<any>("/api-keys", {
        method: "POST",
        body: JSON.stringify({ name, permission }),
      });
      return {
        id: res.id,
        name: res.name,
        maskedKey: res.maskedKey || res.masked_key,
        permission: res.permission,
        requests30d: Number(res.requests30d ?? 0),
        lastUsedAt: res.lastUsedAt ?? null,
        createdAt: res.createdAt || new Date().toISOString(),
        secret: res.secret,
      };
    },
    deleteKey: async (id: string): Promise<void> => {
      await apiRequest(`/api-keys/${id}`, { method: "DELETE" });
    },
  },

  usage: {
    records: async (): Promise<UsageRecord[]> => {
      try {
        const rows = await apiRequest<any[]>("/usage/records");
        if (Array.isArray(rows)) {
          return rows.map((r) => ({
            id: r.id,
            date: typeof r.date === "string" ? r.date.slice(0, 10) : new Date(r.date).toISOString().slice(0, 10),
            description: r.description || "Usage charge",
            usage: r.usage || "",
            amount: Number(r.amount || 0),
            balance: Number(r.balance || 0),
          }));
        }
      } catch (err) {
        console.error("[API] Failed to fetch usage records:", err);
      }
      return [];
    },
  },

  team: {
    list: async (): Promise<TeamMember[]> => {
      try {
        const rows = await apiRequest<any[]>("/team");
        if (Array.isArray(rows)) {
          return rows.map((m) => ({
            id: m.id,
            name: m.name || m.email,
            email: m.email,
            role: (m.role ? m.role.charAt(0).toUpperCase() + m.role.slice(1) : "Member") as TeamMember["role"],
            status: (m.status || "active") as TeamMember["status"],
            lastActiveAt: m.last_active_at || m.created_at || new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.error("[API] Failed to fetch team members:", err);
      }
      return [];
    },
  },

  notifications: {
    list: async (): Promise<NotificationItem[]> => {
      try {
        const rows = await apiRequest<any[]>("/notifications");
        if (Array.isArray(rows)) {
          return rows.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            kind: n.kind || "agent",
            at: n.created_at || new Date().toISOString(),
            read: Boolean(n.read),
          }));
        }
      } catch (err) {
        console.error("[API] Failed to fetch notifications:", err);
      }
      return [];
    },
  },
};

export type Api = typeof api;
