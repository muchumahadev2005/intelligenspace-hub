export type AgentType = "voice" | "chat";
export type AgentStatus = "active" | "paused" | "draft";

export interface Agent {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  status: AgentStatus;
  model: string;
  voice?: string;
  language: string;
  calls: number;
  successRate: number;
  lastActiveAt: string;
  phoneNumber?: string;
  instructions: string;
  greeting: string;
  tone: string;
  personality: string;
  tools: string[];
  createdAt: string;
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category:
    | "Healthcare"
    | "Legal"
    | "Real Estate"
    | "Restaurant"
    | "Retail"
    | "Home Services"
    | "Finance"
    | "General";
  useCase: string;
  type: AgentType;
  icon: string;
  popularity: number;
}

export interface PhoneNumber {
  id: string;
  number: string;
  country: string;
  region: string;
  status: "active" | "inactive";
  assignedAgentId?: string;
  assignedAgentName?: string;
  monthlyCost: number;
  capabilities: string[];
}

export type CallStatus = "completed" | "in_progress" | "failed" | "missed" | "voicemail";
export type CallDirection = "inbound" | "outbound";

export interface TranscriptLine {
  speaker: "customer" | "agent";
  text: string;
  at: string;
}

export interface Call {
  id: string;
  reference: string;
  customer: string;
  customerNumber: string;
  agentId: string;
  agentName: string;
  direction: CallDirection;
  status: CallStatus;
  durationSeconds: number;
  startedAt: string;
  cost: number;
  hasRecording: boolean;
  intent: string;
  sentiment: "positive" | "neutral" | "negative";
  outcome: string;
  summary: string;
  transcript: TranscriptLine[];
}

export interface Appointment {
  id: string;
  customer: string;
  phone: string;
  email: string;
  agentName: string;
  type: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: "confirmed" | "pending" | "cancelled" | "completed";
  notes: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: "active" | "hidden" | "out_of_stock";
  agentVisible: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  reference: string;
  customer: string;
  phone: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "processing" | "completed" | "cancelled";
  createdAt: string;
  agentName: string;
  channel: "voice" | "chat" | "api";
  timeline: { label: string; at: string }[];
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  description: string;
  status: "healthy" | "degraded" | "disabled";
  events: string[];
  successRate: number;
  createdAt: string;
  deliveries: WebhookDelivery[];
}

export interface WebhookDelivery {
  id: string;
  event: string;
  statusCode: number;
  state: "delivered" | "failed" | "retrying";
  at: string;
  durationMs: number;
}

export interface ApiKey {
  id: string;
  name: string;
  maskedKey: string;
  permission: "read" | "full";
  createdAt: string;
  lastUsedAt: string | null;
  requests30d: number;
}

export interface UsageRecord {
  id: string;
  date: string;
  description: string;
  usage: string;
  amount: number;
  balance: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Member" | "Viewer";
  status: "active" | "invited" | "suspended";
  lastActiveAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  kind: "agent" | "call" | "webhook" | "credits" | "appointment" | "order";
  at: string;
  read: boolean;
}

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  kind: "agent" | "call" | "webhook" | "order" | "appointment" | "recording";
  at: string;
}

export interface Workspace {
  id: string;
  name: string;
  plan: string;
  members: number;
}

export interface DashboardMetrics {
  activeAgents: number;
  activeAgentsDelta: string;
  calls: number;
  callsDelta: string;
  minutes: number;
  minutesDelta: string;
  credits: number;
  creditsNote: string;
}

export interface SeriesPoint {
  date: string;
  calls: number;
  minutes: number;
  agents: number;
  credits: number;
}
