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

const now = Date.UTC(2026, 7, 26, 16, 40, 0);
const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
const day = (offset: number) => new Date(now - offset * 86_400_000).toISOString();

export const workspaces: Workspace[] = [
  { id: "ws_acme", name: "Acme Labs", plan: "Scale", members: 8 },
  { id: "ws_personal", name: "Personal Workspace", plan: "Starter", members: 1 },
  { id: "ws_demo", name: "Demo Workspace", plan: "Trial", members: 3 },
];

export const currentUser = {
  name: "Mahadev Rao",
  email: "mahadev@acmelabs.io",
  role: "Owner",
  initials: "MR",
};

export const agents: Agent[] = [
  {
    id: "agt_receptionist",
    name: "Receptionist AI",
    description: "Front-desk agent that answers calls, screens intent and books appointments.",
    type: "voice",
    status: "active",
    model: "gpt-4.1-mini",
    voice: "Aurora (Indian English)",
    language: "en-IN",
    calls: 248,
    successRate: 94,
    lastActiveAt: ago(4),
    phoneNumber: "+91 80 4718 0142",
    instructions:
      "You are the virtual receptionist for Acme Labs. Greet callers warmly, identify why they are calling, and either book an appointment or route them to the right team. Never invent pricing. If the caller is upset, offer a human transfer immediately.",
    greeting: "Thanks for calling Acme Labs, this is Aurora. How can I help you today?",
    tone: "Warm, concise, professional",
    personality: "Calm and efficient front-desk professional",
    tools: ["calendar", "appointments", "knowledge", "transfer"],
    createdAt: day(112),
  },
  {
    id: "agt_sales",
    name: "Sales Assistant",
    description: "Qualifies inbound leads, captures budget and timeline, books demos.",
    type: "voice",
    status: "active",
    model: "gpt-4.1",
    voice: "Kiran (Neutral)",
    language: "en-IN",
    calls: 164,
    successRate: 88,
    lastActiveAt: ago(21),
    phoneNumber: "+91 22 6188 0930",
    instructions:
      "You qualify inbound leads for Acme Labs. Capture company size, use case, timeline and budget. Book a demo when the lead is qualified.",
    greeting: "Hi, this is Kiran from Acme Labs. Are you exploring AI agents for your team?",
    tone: "Confident, curious",
    personality: "Consultative sales professional",
    tools: ["calendar", "appointments", "knowledge", "web_search"],
    createdAt: day(88),
  },
  {
    id: "agt_support",
    name: "Support Copilot",
    description: "Chat agent handling product questions with a grounded knowledge base.",
    type: "chat",
    status: "active",
    model: "gpt-4.1-mini",
    language: "en",
    calls: 512,
    successRate: 91,
    lastActiveAt: ago(2),
    instructions:
      "Answer product questions using only the connected knowledge base. If confidence is low, escalate to a human agent with a summary.",
    greeting: "Hey! I'm the Acme support copilot. What are you stuck on?",
    tone: "Friendly, direct",
    personality: "Patient technical support specialist",
    tools: ["knowledge", "transfer", "custom_api"],
    createdAt: day(64),
  },
  {
    id: "agt_booking",
    name: "Booking Assistant",
    description: "Handles rescheduling, cancellations and reminders across clinics.",
    type: "voice",
    status: "paused",
    model: "gpt-4.1-mini",
    voice: "Meera (Hindi/English)",
    language: "hi-IN",
    calls: 96,
    successRate: 86,
    lastActiveAt: ago(320),
    phoneNumber: "+91 40 4900 7781",
    instructions:
      "Confirm, reschedule or cancel appointments. Always read back the final date and time to the caller.",
    greeting: "Namaste, I can help you with your appointment. May I have your name?",
    tone: "Polite, reassuring",
    personality: "Attentive scheduling coordinator",
    tools: ["calendar", "appointments"],
    createdAt: day(45),
  },
  {
    id: "agt_restaurant",
    name: "Restaurant Ordering AI",
    description: "Takes phone orders, upsells sides and pushes orders to the kitchen.",
    type: "voice",
    status: "draft",
    model: "gpt-4.1-mini",
    voice: "Nova (Warm)",
    language: "en-IN",
    calls: 0,
    successRate: 0,
    lastActiveAt: day(3),
    instructions:
      "Take food orders accurately. Repeat the order before confirming. Suggest one relevant side per order.",
    greeting: "Thanks for calling Spice Route! Ready to place an order?",
    tone: "Energetic, friendly",
    personality: "Fast and accurate order taker",
    tools: ["catalog", "orders"],
    createdAt: day(9),
  },
];

export const templates: AgentTemplate[] = [
  { id: "tpl_law", name: "Law Firm Receptionist", description: "Screens legal intake calls, captures matter type and conflicts information.", category: "Legal", useCase: "Intake & routing", type: "voice", icon: "scale", popularity: 92 },
  { id: "tpl_dental", name: "Dental Receptionist", description: "Books cleanings, handles insurance questions and sends reminders.", category: "Healthcare", useCase: "Appointment booking", type: "voice", icon: "stethoscope", popularity: 88 },
  { id: "tpl_restaurant", name: "Restaurant Ordering Agent", description: "Takes takeaway orders from the live menu and confirms totals.", category: "Restaurant", useCase: "Order capture", type: "voice", icon: "utensils", popularity: 84 },
  { id: "tpl_realestate", name: "Real Estate Assistant", description: "Qualifies buyers, shares listing details and schedules viewings.", category: "Real Estate", useCase: "Lead qualification", type: "voice", icon: "home", popularity: 79 },
  { id: "tpl_hvac", name: "HVAC Booking Agent", description: "Dispatches service calls with address capture and slot booking.", category: "Home Services", useCase: "Dispatch", type: "voice", icon: "wrench", popularity: 71 },
  { id: "tpl_support", name: "Customer Support Agent", description: "Answers product questions grounded in your documentation.", category: "General", useCase: "Deflection", type: "chat", icon: "life-buoy", popularity: 95 },
  { id: "tpl_sales", name: "Sales Qualification Agent", description: "Runs a BANT-style qualification and books demos automatically.", category: "General", useCase: "Qualification", type: "voice", icon: "target", popularity: 90 },
  { id: "tpl_retail", name: "Retail Order Tracker", description: "Looks up orders, shares delivery status and handles returns.", category: "Retail", useCase: "Order status", type: "chat", icon: "package", popularity: 68 },
  { id: "tpl_finance", name: "Loan Pre-Qualification", description: "Collects income and eligibility details with compliance guardrails.", category: "Finance", useCase: "Pre-qualification", type: "voice", icon: "landmark", popularity: 64 },
  { id: "tpl_medical", name: "Medical Receptionist", description: "Triages patient calls and routes urgent cases to staff instantly.", category: "Healthcare", useCase: "Triage", type: "voice", icon: "heart-pulse", popularity: 81 },
  { id: "tpl_personal", name: "Personal Assistant", description: "Manages your calendar, callbacks and daily reminders.", category: "General", useCase: "Productivity", type: "chat", icon: "sparkles", popularity: 60 },
  { id: "tpl_property", name: "Property Manager Agent", description: "Handles tenant maintenance requests and schedules technicians.", category: "Real Estate", useCase: "Maintenance", type: "voice", icon: "building", popularity: 58 },
];

export const phoneNumbers: PhoneNumber[] = [
  { id: "pn_1", number: "+91 80 4718 0142", country: "India", region: "Bengaluru", status: "active", assignedAgentId: "agt_receptionist", assignedAgentName: "Receptionist AI", monthlyCost: 249, capabilities: ["Voice", "SMS"] },
  { id: "pn_2", number: "+91 22 6188 0930", country: "India", region: "Mumbai", status: "active", assignedAgentId: "agt_sales", assignedAgentName: "Sales Assistant", monthlyCost: 249, capabilities: ["Voice"] },
  { id: "pn_3", number: "+91 40 4900 7781", country: "India", region: "Hyderabad", status: "inactive", assignedAgentId: "agt_booking", assignedAgentName: "Booking Assistant", monthlyCost: 249, capabilities: ["Voice", "SMS"] },
  { id: "pn_4", number: "+1 415 555 0148", country: "United States", region: "San Francisco", status: "active", monthlyCost: 420, capabilities: ["Voice", "SMS", "MMS"] },
  { id: "pn_5", number: "+44 20 7946 0312", country: "United Kingdom", region: "London", status: "active", monthlyCost: 380, capabilities: ["Voice"] },
];

const transcriptA = [
  { speaker: "customer" as const, text: "Hi, I'd like to schedule an appointment for next week.", at: "00:04" },
  { speaker: "agent" as const, text: "Absolutely. What day works best for you?", at: "00:07" },
  { speaker: "customer" as const, text: "Wednesday afternoon if possible.", at: "00:12" },
  { speaker: "agent" as const, text: "I have Wednesday at 3:00 PM or 4:30 PM open. Which would you prefer?", at: "00:16" },
  { speaker: "customer" as const, text: "3 PM works.", at: "00:24" },
  { speaker: "agent" as const, text: "Booked for Wednesday at 3:00 PM. I've sent a confirmation to your phone. Anything else?", at: "00:27" },
  { speaker: "customer" as const, text: "That's all, thank you.", at: "00:38" },
];

const names = [
  ["Arjun Rao", "+91 98450 11234"],
  ["Priya Sharma", "+91 99860 44210"],
  ["Rahul Verma", "+91 91760 55831"],
  ["Ananya Reddy", "+91 97400 22019"],
  ["Daniel Okafor", "+1 415 555 0193"],
  ["Sofia Marchetti", "+44 20 7946 0821"],
  ["Vikram Nair", "+91 90080 71145"],
  ["Meera Iyer", "+91 96320 90045"],
];

const statuses: Call["status"][] = ["completed", "completed", "completed", "missed", "in_progress", "failed", "voicemail", "completed"];
const intents = ["Appointment booking", "Pricing enquiry", "Order status", "Support request", "Reschedule", "New lead", "Complaint", "Callback request"];
const outcomes = ["Appointment scheduled", "Info provided", "Order placed", "Escalated to human", "Rescheduled", "Demo booked", "Unresolved", "Callback logged"];

export const calls: Call[] = Array.from({ length: 24 }, (_, i) => {
  const [customer, number] = names[i % names.length] as [string, string];
  const agent = agents[i % 4] as Agent;
  const status = statuses[i % statuses.length] as Call["status"];
  const duration = status === "missed" ? 0 : 60 + ((i * 37) % 420);
  return {
    id: `call_${10284 - i}`,
    reference: `#${10284 - i}`,
    customer,
    customerNumber: number,
    agentId: agent.id,
    agentName: agent.name,
    direction: i % 3 === 0 ? "outbound" : "inbound",
    status,
    durationSeconds: duration,
    startedAt: ago(i * 47 + 3),
    cost: Math.round(duration * 0.04 * 100) / 100,
    hasRecording: status === "completed",
    intent: intents[i % intents.length]!,
    sentiment: i % 5 === 0 ? "neutral" : i % 7 === 0 ? "negative" : "positive",
    outcome: outcomes[i % outcomes.length]!,
    summary:
      "Caller reached the agent regarding scheduling. The agent confirmed availability, booked the slot and sent a confirmation message.",
    transcript: transcriptA,
  };
});

export const appointments: Appointment[] = [
  { id: "apt_1", customer: "Arjun Rao", phone: "+91 98450 11234", email: "arjun.rao@example.in", agentName: "Receptionist AI", type: "Consultation", date: day(-1).slice(0, 10), time: "10:30", durationMinutes: 30, status: "confirmed", notes: "Prefers a call before arrival." },
  { id: "apt_2", customer: "Priya Sharma", phone: "+91 99860 44210", email: "priya.sharma@example.in", agentName: "Booking Assistant", type: "Follow-up", date: day(-1).slice(0, 10), time: "14:00", durationMinutes: 45, status: "pending", notes: "Insurance details pending." },
  { id: "apt_3", customer: "Daniel Okafor", phone: "+1 415 555 0193", email: "d.okafor@example.com", agentName: "Sales Assistant", type: "Product demo", date: day(-2).slice(0, 10), time: "18:00", durationMinutes: 30, status: "confirmed", notes: "Wants API walkthrough." },
  { id: "apt_4", customer: "Ananya Reddy", phone: "+91 97400 22019", email: "ananya.reddy@example.in", agentName: "Receptionist AI", type: "Site visit", date: day(-3).slice(0, 10), time: "11:15", durationMinutes: 60, status: "confirmed", notes: "Bring updated floor plan." },
  { id: "apt_5", customer: "Rahul Verma", phone: "+91 91760 55831", email: "rahul.verma@example.in", agentName: "Booking Assistant", type: "Consultation", date: day(0).slice(0, 10), time: "16:45", durationMinutes: 30, status: "completed", notes: "" },
  { id: "apt_6", customer: "Sofia Marchetti", phone: "+44 20 7946 0821", email: "sofia@example.co.uk", agentName: "Sales Assistant", type: "Discovery call", date: day(-4).slice(0, 10), time: "13:30", durationMinutes: 45, status: "cancelled", notes: "Rescheduling next month." },
];

export const products: Product[] = [
  { id: "prd_1", name: "Butter Chicken Thali", description: "Signature thali with butter chicken, naan, rice and dessert.", sku: "SR-THL-001", category: "Mains", price: 480, stock: 120, status: "active", agentVisible: true },
  { id: "prd_2", name: "Paneer Tikka Platter", description: "Char-grilled paneer with mint chutney and salad.", sku: "SR-STR-014", category: "Starters", price: 320, stock: 64, status: "active", agentVisible: true },
  { id: "prd_3", name: "Hyderabadi Biryani", description: "Slow-cooked dum biryani served with raita and salan.", sku: "SR-MNS-022", category: "Mains", price: 540, stock: 0, status: "out_of_stock", agentVisible: false },
  { id: "prd_4", name: "Filter Coffee", description: "South Indian filter coffee, freshly brewed.", sku: "SR-BEV-003", category: "Beverages", price: 90, stock: 400, status: "active", agentVisible: true },
  { id: "prd_5", name: "Gulab Jamun (2 pcs)", description: "Warm milk dumplings in saffron syrup.", sku: "SR-DST-007", category: "Desserts", price: 140, stock: 88, status: "active", agentVisible: true },
  { id: "prd_6", name: "Family Feast Bundle", description: "Serves four — two mains, two starters, dessert.", sku: "SR-BDL-100", category: "Bundles", price: 1650, stock: 25, status: "hidden", agentVisible: false },
];

export const orders: Order[] = [
  {
    id: "ord_1048", reference: "#1048", customer: "Arjun Rao", phone: "+91 98450 11234",
    items: [ { productId: "prd_1", name: "Butter Chicken Thali", quantity: 2, price: 480 }, { productId: "prd_4", name: "Filter Coffee", quantity: 2, price: 90 } ],
    total: 1140, status: "processing", createdAt: ago(24), agentName: "Restaurant Ordering AI", channel: "voice",
    timeline: [ { label: "Order created by agent", at: ago(24) }, { label: "Payment link sent", at: ago(22) }, { label: "Kitchen accepted", at: ago(19) } ],
  },
  {
    id: "ord_1047", reference: "#1047", customer: "Priya Sharma", phone: "+91 99860 44210",
    items: [ { productId: "prd_2", name: "Paneer Tikka Platter", quantity: 1, price: 320 } ],
    total: 320, status: "completed", createdAt: ago(180), agentName: "Restaurant Ordering AI", channel: "voice",
    timeline: [ { label: "Order created by agent", at: ago(180) }, { label: "Payment captured", at: ago(176) }, { label: "Delivered", at: ago(140) } ],
  },
  {
    id: "ord_1046", reference: "#1046", customer: "Vikram Nair", phone: "+91 90080 71145",
    items: [ { productId: "prd_5", name: "Gulab Jamun (2 pcs)", quantity: 3, price: 140 }, { productId: "prd_1", name: "Butter Chicken Thali", quantity: 1, price: 480 } ],
    total: 900, status: "pending", createdAt: ago(320), agentName: "Support Copilot", channel: "chat",
    timeline: [ { label: "Order created via chat", at: ago(320) } ],
  },
  {
    id: "ord_1045", reference: "#1045", customer: "Meera Iyer", phone: "+91 96320 90045",
    items: [ { productId: "prd_6", name: "Family Feast Bundle", quantity: 1, price: 1650 } ],
    total: 1650, status: "cancelled", createdAt: day(2), agentName: "Restaurant Ordering AI", channel: "api",
    timeline: [ { label: "Order created via API", at: day(2) }, { label: "Cancelled by customer", at: day(2) } ],
  },
];

export const webhooks: WebhookEndpoint[] = [
  {
    id: "whk_1", url: "https://api.acmelabs.io/hooks/ai-events", description: "Primary production event sink",
    status: "healthy", events: ["call.completed", "order.created", "appointment.created"], successRate: 99.4, createdAt: day(70),
    deliveries: [
      { id: "dlv_1", event: "call.completed", statusCode: 200, state: "delivered", at: ago(3), durationMs: 142 },
      { id: "dlv_2", event: "order.created", statusCode: 200, state: "delivered", at: ago(26), durationMs: 118 },
      { id: "dlv_3", event: "appointment.created", statusCode: 500, state: "retrying", at: ago(52), durationMs: 3021 },
    ],
  },
  {
    id: "whk_2", url: "https://hooks.internal.acmelabs.io/crm-sync", description: "CRM sync for qualified leads",
    status: "degraded", events: ["call.completed", "agent.deployed"], successRate: 87.1, createdAt: day(30),
    deliveries: [
      { id: "dlv_4", event: "call.completed", statusCode: 500, state: "failed", at: ago(12), durationMs: 5000 },
      { id: "dlv_5", event: "agent.deployed", statusCode: 200, state: "delivered", at: ago(240), durationMs: 210 },
    ],
  },
  {
    id: "whk_3", url: "https://staging.acmelabs.io/hooks/test", description: "Staging sandbox endpoint",
    status: "disabled", events: ["call.completed"], successRate: 0, createdAt: day(14), deliveries: [],
  },
];

export const apiKeys: ApiKey[] = [
  { id: "key_1", name: "Production server", maskedKey: "sk_live_••••••••••••4f21", permission: "full", createdAt: day(90), lastUsedAt: ago(6), requests30d: 84210 },
  { id: "key_2", name: "Analytics reader", maskedKey: "sk_live_••••••••••••9ab3", permission: "read", createdAt: day(41), lastUsedAt: ago(190), requests30d: 12044 },
  { id: "key_3", name: "Local development", maskedKey: "sk_test_••••••••••••01cd", permission: "full", createdAt: day(12), lastUsedAt: null, requests30d: 0 },
];

export const usageRecords: UsageRecord[] = [
  { id: "usg_1", date: ago(6), description: "Voice call · Receptionist AI", usage: "3m 12s", amount: -2.4, balance: 83.4 },
  { id: "usg_2", date: ago(48), description: "Agent test · Sales Assistant", usage: "18s", amount: -0.2, balance: 85.8 },
  { id: "usg_3", date: ago(190), description: "Voice call · Sales Assistant", usage: "6m 04s", amount: -4.85, balance: 86.0 },
  { id: "usg_4", date: day(1), description: "Credit added", usage: "—", amount: 50, balance: 90.85 },
  { id: "usg_5", date: day(2), description: "Chat session · Support Copilot", usage: "42 messages", amount: -1.15, balance: 40.85 },
  { id: "usg_6", date: day(3), description: "Voice call · Booking Assistant", usage: "2m 48s", amount: -2.1, balance: 42.0 },
];

export const team: TeamMember[] = [
  { id: "tm_1", name: "Mahadev Rao", email: "mahadev@acmelabs.io", role: "Owner", status: "active", lastActiveAt: ago(1) },
  { id: "tm_2", name: "Priya Sharma", email: "priya@acmelabs.io", role: "Admin", status: "active", lastActiveAt: ago(35) },
  { id: "tm_3", name: "Daniel Okafor", email: "daniel@acmelabs.io", role: "Member", status: "active", lastActiveAt: ago(420) },
  { id: "tm_4", name: "Ananya Reddy", email: "ananya@acmelabs.io", role: "Viewer", status: "invited", lastActiveAt: day(2) },
  { id: "tm_5", name: "Sofia Marchetti", email: "sofia@acmelabs.io", role: "Member", status: "suspended", lastActiveAt: day(21) },
];

export const notifications: NotificationItem[] = [
  { id: "ntf_1", title: "Agent deployed", body: "Support Copilot v4 is now serving live traffic.", kind: "agent", at: ago(5), read: false },
  { id: "ntf_2", title: "Webhook failed", body: "CRM sync returned 500 for call.completed.", kind: "webhook", at: ago(12), read: false },
  { id: "ntf_3", title: "Low credits", body: "Balance is ₹83.40 — about 16 minutes of voice remaining.", kind: "credits", at: ago(40), read: false },
  { id: "ntf_4", title: "Appointment scheduled", body: "Arjun Rao booked a consultation for tomorrow 10:30.", kind: "appointment", at: ago(74), read: true },
  { id: "ntf_5", title: "Order created", body: "Order #1048 created by Restaurant Ordering AI.", kind: "order", at: ago(24), read: true },
];

export const activity: ActivityItem[] = [
  { id: "act_1", title: "Receptionist AI completed a call", detail: "Arjun Rao · 3m 12s · Appointment scheduled", kind: "call", at: ago(2) },
  { id: "act_2", title: "Order #1048 created", detail: "Restaurant Ordering AI · ₹1,140", kind: "order", at: ago(8) },
  { id: "act_3", title: "Appointment scheduled", detail: "Priya Sharma · Follow-up · 14:00", kind: "appointment", at: ago(14) },
  { id: "act_4", title: "Sales Assistant went live", detail: "Deployed to +91 22 6188 0930", kind: "agent", at: ago(26) },
  { id: "act_5", title: "Webhook delivered", detail: "call.completed → api.acmelabs.io · 200 in 142ms", kind: "webhook", at: ago(33) },
  { id: "act_6", title: "Call recording processed", detail: "Call #10281 · transcript and summary ready", kind: "recording", at: ago(41) },
];

export const metrics: DashboardMetrics = {
  activeAgents: 12,
  activeAgentsDelta: "+2 this month",
  calls: 248,
  callsDelta: "+18.4%",
  minutes: 1842,
  minutesDelta: "+12.7%",
  credits: 83.4,
  creditsNote: "16 minutes remaining",
};

export const series: SeriesPoint[] = Array.from({ length: 90 }, (_, i) => {
  const d = new Date(now - (89 - i) * 86_400_000);
  const wave = Math.sin(i / 4) * 12 + Math.sin(i / 11) * 22;
  return {
    date: d.toISOString().slice(0, 10),
    calls: Math.max(6, Math.round(48 + wave + (i % 7 === 0 ? -14 : 0))),
    minutes: Math.max(20, Math.round(190 + wave * 5)),
    agents: 6 + Math.round(i / 14),
    credits: Math.max(4, Math.round((32 + wave) * 10) / 10),
  };
});
