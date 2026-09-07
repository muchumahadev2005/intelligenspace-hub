import type {
  AITask,
  ArchitectureAnalysis,
  CodeReview,
  CodingTask,
  DebugSession,
  DevActivity,
  DocumentationDoc,
  Project,
  ProjectFile,
  ReviewFinding,
  SecurityFinding,
  TestAnalysis,
} from "@/types/developer";

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

const userServiceCode = `import { db } from "../db";
import type { User } from "../types";

export async function getUserById(id: string): Promise<User | null> {
  // WARNING: string concatenation, no parameter binding
  const query = "SELECT * FROM users WHERE id = " + id;
  const result = await db.raw(query);
  return result.rows[0] ?? null;
}

export async function listUsers(limit = 100) {
  const rows = await db.raw("SELECT * FROM users LIMIT " + limit);
  return rows.rows;
}

export async function getProfileEmail(id: string) {
  const user = await getUserById(id);
  return user.profile.email;
}
`;

const authCode = `import jwt from "jsonwebtoken";

const SECRET = "dev-secret-2024";

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, SECRET);
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
`;

const apiCode = `import express from "express";
import { getUserById, listUsers } from "../services/user";

const app = express();

app.get("/users", async (req, res) => {
  const users = await listUsers(Number(req.query.limit));
  res.json(users);
});

app.get("/users/:id", async (req, res) => {
  const user = await getUserById(req.params.id);
  res.json(user);
});

export default app;
`;

const navbarCode = `import { Link } from "react-router";

export function Navbar({ user }: { user: { name: string } }) {
  return (
    <nav className="navbar">
      <Link to="/">Storefront</Link>
      <span>{user.name}</span>
    </nav>
  );
}
`;

const dashboardCode = `import { useEffect, useState } from "react";
import { fetchMetrics } from "../services/api";

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetchMetrics().then(setMetrics);
  }, []);

  return <section>{metrics ? metrics.orders : "Loading"}</section>;
}
`;

const file = (path: string, language: string, content: string): ProjectFile => ({
  id: path,
  name: path.split("/").pop()!,
  path,
  type: "file",
  language,
  content,
});

const folder = (path: string, children: ProjectFile[]): ProjectFile => ({
  id: path,
  name: path.split("/").pop()!,
  path,
  type: "folder",
  children,
});

const ecommerceFiles: ProjectFile[] = [
  folder("src", [
    folder("src/components", [
      file("src/components/Navbar.tsx", "tsx", navbarCode),
      file("src/components/Dashboard.tsx", "tsx", dashboardCode),
    ]),
    folder("src/services", [
      file("src/services/user.ts", "ts", userServiceCode),
      file("src/services/auth.ts", "ts", authCode),
    ]),
    folder("src/pages", [
      file("src/pages/Login.tsx", "tsx", navbarCode),
      file("src/pages/Dashboard.tsx", "tsx", dashboardCode),
    ]),
    folder("src/api", [file("src/api/index.ts", "ts", apiCode)]),
    file("src/App.tsx", "tsx", `export default function App() {\n  return <Routes />;\n}\n`),
  ]),
  file("package.json", "json", `{\n  "name": "ecommerce-platform",\n  "version": "2.4.1"\n}\n`),
  file("README.md", "md", `# E-Commerce Platform\n\nStorefront, checkout and fulfilment services.\n`),
  file(".env.example", "env", `DATABASE_URL=\nJWT_SECRET=\nSTRIPE_KEY=\n`),
];

const genericFiles: ProjectFile[] = [
  folder("src", [
    folder("src/components", [file("src/components/Navbar.tsx", "tsx", navbarCode)]),
    folder("src/services", [file("src/services/api.ts", "ts", apiCode)]),
    file("src/App.tsx", "tsx", `export default function App() {\n  return <Routes />;\n}\n`),
  ]),
  file("package.json", "json", `{\n  "name": "app",\n  "version": "1.0.0"\n}\n`),
  file("README.md", "md", `# Project\n`),
];

export const projects: Project[] = [
  {
    id: "prj_ecom",
    name: "E-Commerce Platform",
    description: "Storefront, checkout, payments and fulfilment for a multi-vendor marketplace.",
    repository: {
      provider: "github",
      fullName: "northwind/ecommerce-platform",
      branch: "main",
      branches: ["main", "develop", "release/2.5"],
      visibility: "private",
    },
    language: "TypeScript",
    framework: "React + Express",
    stack: ["React", "TypeScript", "Node.js", "Express", "PostgreSQL", "Docker"],
    codeQuality: 86,
    security: 91,
    coverage: 72,
    architectureRating: "Good",
    lastAnalyzedAt: ago(12),
    files: ecommerceFiles,
    structure: [
      "src/",
      "├── components/",
      "├── pages/",
      "├── services/",
      "├── hooks/",
      "├── utils/",
      "└── api/",
    ],
    findingsSummary: { securityIssues: 2, reviewSuggestions: 5, missingTests: 8, architectureWarnings: 1 },
  },
  {
    id: "prj_exam",
    name: "AI Exam System",
    description: "Adaptive assessment engine with proctoring signals and automated grading.",
    repository: {
      provider: "github",
      fullName: "northwind/ai-exam-system",
      branch: "main",
      branches: ["main", "feature/proctoring"],
      visibility: "private",
    },
    language: "TypeScript",
    framework: "React + Express",
    stack: ["React", "Express", "PostgreSQL", "Redis"],
    codeQuality: 78,
    security: 83,
    coverage: 64,
    architectureRating: "Needs work",
    lastAnalyzedAt: ago(60 * 26),
    files: genericFiles,
    structure: ["src/", "├── components/", "├── exams/", "├── grading/", "└── api/"],
    findingsSummary: { securityIssues: 3, reviewSuggestions: 9, missingTests: 14, architectureWarnings: 2 },
  },
  {
    id: "prj_portfolio",
    name: "Portfolio",
    description: "Personal engineering portfolio and writing archive.",
    repository: {
      provider: "github",
      fullName: "sahana/portfolio",
      branch: "main",
      branches: ["main"],
      visibility: "public",
    },
    language: "TypeScript",
    framework: "React",
    stack: ["React", "TypeScript", "Vite"],
    codeQuality: 92,
    security: 95,
    coverage: 41,
    architectureRating: "Excellent",
    lastAnalyzedAt: ago(60 * 24 * 3),
    files: genericFiles,
    structure: ["src/", "├── components/", "├── content/", "└── styles/"],
    findingsSummary: { securityIssues: 0, reviewSuggestions: 3, missingTests: 6, architectureWarnings: 0 },
  },
];

const sqlDiff = [
  { type: "remove" as const, text: `const query = "SELECT * FROM users WHERE id = " + id;` },
  { type: "remove" as const, text: `const result = await db.raw(query);` },
  { type: "add" as const, text: `const query = "SELECT * FROM users WHERE id = $1";` },
  { type: "add" as const, text: `const result = await db.query(query, [id]);` },
];

const findings = (projectId: string): ReviewFinding[] => [
  {
    id: `${projectId}_rf1`,
    projectId,
    title: "SQL injection risk",
    severity: "critical",
    category: "Security",
    file: "src/services/user.ts",
    line: 6,
    problem: "User input is concatenated directly into the database query string.",
    impact: "An attacker can manipulate the query and read or destroy arbitrary rows.",
    recommendation: "Use parameterized queries and never interpolate request values into SQL.",
    diff: sqlDiff,
    status: "open",
  },
  {
    id: `${projectId}_rf2`,
    projectId,
    title: "Unchecked property access on possibly-null user",
    severity: "high",
    category: "Code quality",
    file: "src/services/user.ts",
    line: 18,
    problem: "getUserById can return null but the caller reads user.profile.email directly.",
    impact: "Requests for missing users crash the route with a TypeError instead of a 404.",
    recommendation: "Guard the null case and return a typed not-found result.",
    diff: [
      { type: "remove", text: `  return user.profile.email;` },
      { type: "add", text: `  if (!user?.profile) return null;` },
      { type: "add", text: `  return user.profile.email;` },
    ],
    status: "open",
  },
  {
    id: `${projectId}_rf3`,
    projectId,
    title: "Hardcoded JWT signing secret",
    severity: "critical",
    category: "Security",
    file: "src/services/auth.ts",
    line: 3,
    problem: "The signing secret is committed in source control.",
    impact: "Anyone with repository access can mint valid sessions for any user.",
    recommendation: "Read the secret from the environment and rotate the leaked value.",
    diff: [
      { type: "remove", text: `const SECRET = "dev-secret-2024";` },
      { type: "add", text: `const SECRET = process.env.JWT_SECRET!;` },
    ],
    status: "open",
  },
  {
    id: `${projectId}_rf4`,
    projectId,
    title: "Unbounded list query",
    severity: "medium",
    category: "Performance",
    file: "src/services/user.ts",
    line: 12,
    problem: "listUsers accepts an unvalidated limit from the query string.",
    impact: "A single request can pull the entire users table into memory.",
    recommendation: "Clamp the limit and paginate with a cursor.",
    diff: [
      { type: "remove", text: `export async function listUsers(limit = 100) {` },
      { type: "add", text: `export async function listUsers(limit = 100) {` },
      { type: "add", text: `  const safeLimit = Math.min(Math.max(limit || 100, 1), 200);` },
    ],
    status: "open",
  },
  {
    id: `${projectId}_rf5`,
    projectId,
    title: "Effect fetch without cleanup",
    severity: "low",
    category: "Best practices",
    file: "src/components/Dashboard.tsx",
    line: 8,
    problem: "The effect sets state after unmount when the request resolves late.",
    impact: "Noisy console warnings and possible stale renders.",
    recommendation: "Move the read to TanStack Query or abort with an AbortController.",
    diff: [
      { type: "context", text: `useEffect(() => {` },
      { type: "remove", text: `  fetchMetrics().then(setMetrics);` },
      { type: "add", text: `  const c = new AbortController();` },
      { type: "add", text: `  fetchMetrics({ signal: c.signal }).then(setMetrics);` },
      { type: "add", text: `  return () => c.abort();` },
      { type: "context", text: `}, []);` },
    ],
    status: "open",
  },
];

export const codeReviews: CodeReview[] = projects.map((p, i) => ({
  id: `rev_${p.id}`,
  projectId: p.id,
  type: "Full review",
  createdAt: ago(18 + i * 400),
  filesReviewed: 42 - i * 9,
  findings: findings(p.id),
}));

export const debugSessions: DebugSession[] = [
  {
    id: "dbg_1",
    projectId: "prj_ecom",
    title: "TypeError on checkout profile read",
    errorMessage: "TypeError: Cannot read properties of undefined (reading 'email')",
    createdAt: ago(31),
    rootCause: "user.profile is undefined for accounts created before the profile migration.",
    reasoning: [
      "The user object is returned from the API without an embedded profile relation.",
      "Checkout code assumes profile always exists on the session user.",
      "email is accessed without any null validation on the render path.",
    ],
    suggestedFix:
      "Load the profile relation in the query, then guard the access so missing profiles fall back to the account email.",
    confidence: 92,
    patch: [
      { type: "remove", text: `const email = user.profile.email;` },
      { type: "add", text: `const email = user.profile?.email ?? user.email;` },
      { type: "add", text: `if (!email) throw new HttpError(422, "Missing contact email");` },
    ],
  },
];

export const codingTasks: CodingTask[] = [
  {
    id: "task_jwt",
    projectId: "prj_ecom",
    prompt:
      "Create JWT authentication for this project with registration, login and protected routes.",
    createdAt: ago(120),
    steps: [
      { id: "s1", label: "Analyzing project", status: "completed" },
      { id: "s2", label: "Creating plan", status: "completed" },
      { id: "s3", label: "Editing files", status: "completed" },
      { id: "s4", label: "Running checks", status: "completed" },
      { id: "s5", label: "Generating tests", status: "completed" },
      { id: "s6", label: "Completed", status: "completed" },
    ],
    plan: [
      { id: "p1", label: "Analyze existing authentication", done: true },
      { id: "p2", label: "Create auth service", done: true },
      { id: "p3", label: "Add JWT middleware", done: true },
      { id: "p4", label: "Add registration endpoint", done: false },
      { id: "p5", label: "Add login endpoint", done: false },
      { id: "p6", label: "Add validation", done: false },
      { id: "p7", label: "Generate tests", done: false },
    ],
    changes: [
      { path: "src/auth/auth.service.ts", change: "added", additions: 88, deletions: 0 },
      { path: "src/auth/auth.controller.ts", change: "added", additions: 64, deletions: 0 },
      { path: "src/middleware/auth.ts", change: "added", additions: 31, deletions: 0 },
      { path: "src/routes/index.ts", change: "modified", additions: 9, deletions: 2 },
      { path: "tests/auth.test.ts", change: "added", additions: 120, deletions: 0 },
    ],
    diff: [
      { type: "context", text: `import express from "express";` },
      { type: "add", text: `import { requireAuth } from "../middleware/auth";` },
      { type: "add", text: `import { authRouter } from "../auth/auth.controller";` },
      { type: "context", text: `` },
      { type: "add", text: `app.use("/auth", authRouter);` },
      { type: "remove", text: `app.get("/orders", listOrders);` },
      { type: "add", text: `app.get("/orders", requireAuth, listOrders);` },
    ],
  },
];

export const architectureAnalyses: ArchitectureAnalysis[] = [
  {
    id: "arch_1",
    projectId: "prj_ecom",
    prompt: "Build a food delivery application for 1 million users.",
    createdAt: ago(90),
    nodes: [
      { id: "users", label: "Users", sublabel: "Web + mobile clients", row: 0, col: 1 },
      { id: "gateway", label: "API Gateway", sublabel: "Routing, rate limits", row: 1, col: 1 },
      { id: "auth", label: "Auth Service", sublabel: "JWT, sessions", row: 2, col: 0 },
      { id: "orders", label: "Orders Service", sublabel: "Cart, checkout", row: 2, col: 2 },
      { id: "cache", label: "Redis Cache", sublabel: "Hot reads, sessions", row: 3, col: 0 },
      { id: "db", label: "PostgreSQL", sublabel: "Primary + replicas", row: 3, col: 2 },
    ],
    edges: [
      { from: "users", to: "gateway" },
      { from: "gateway", to: "auth" },
      { from: "gateway", to: "orders" },
      { from: "auth", to: "cache" },
      { from: "orders", to: "db" },
      { from: "orders", to: "cache" },
    ],
    stack: [
      { layer: "Frontend", choice: "React", reason: "Shared component model across web and admin." },
      { layer: "Backend", choice: "Node.js", reason: "Non-blocking IO fits fan-out order workloads." },
      { layer: "Database", choice: "PostgreSQL", reason: "Transactional integrity for orders and payments." },
      { layer: "Cache", choice: "Redis", reason: "Sub-millisecond menu and session reads." },
      { layer: "Storage", choice: "Object storage", reason: "Menu imagery and invoices served via CDN." },
    ],
    explanation: [
      { component: "API Gateway", detail: "Single ingress for auth, throttling and request routing." },
      { component: "Auth Service", detail: "Issues short-lived access tokens with refresh rotation." },
      { component: "Orders Service", detail: "Owns cart, checkout and fulfilment state machines." },
      { component: "PostgreSQL", detail: "Writes go to primary; reporting reads hit replicas." },
      { component: "Redis", detail: "Caches menus and rider availability with short TTLs." },
    ],
    entities: [
      { name: "Users", fields: ["id", "email", "phone", "created_at"] },
      { name: "Orders", fields: ["id", "user_id", "status", "total", "placed_at"] },
      { name: "Products", fields: ["id", "vendor_id", "name", "price", "available"] },
      { name: "Payments", fields: ["id", "order_id", "provider", "status", "amount"] },
    ],
    endpoints: [
      { method: "POST", path: "/auth/login", purpose: "Issue access and refresh tokens" },
      { method: "GET", path: "/restaurants", purpose: "List nearby vendors with cached menus" },
      { method: "POST", path: "/orders", purpose: "Create an order and reserve inventory" },
      { method: "GET", path: "/orders/:id", purpose: "Track fulfilment status" },
      { method: "POST", path: "/payments/webhook", purpose: "Reconcile provider payment events" },
    ],
    scaling: [
      "Cache menus and vendor listings in Redis with 60s TTL.",
      "Horizontally scale stateless services behind the gateway load balancer.",
      "Move notifications and receipts onto a queue with retry semantics.",
      "Add read replicas and partition orders by month.",
    ],
    security: [
      "Short-lived JWT access tokens with refresh rotation.",
      "Role-based authorization enforced at the service layer.",
      "Encryption in transit and at rest for payment metadata.",
      "Per-IP and per-account rate limiting at the gateway.",
    ],
    tradeoffs: [
      { option: "Monolith first", detail: "Simpler to operate, but scaling couples all domains." },
      { option: "Event-driven orders", detail: "Better burst tolerance at the cost of eventual consistency." },
      { option: "Managed database", detail: "Less operational load, higher unit cost at scale." },
    ],
  },
];

export const testAnalyses: TestAnalysis[] = projects.map((p) => ({
  id: `test_${p.id}`,
  projectId: p.id,
  framework: "Vitest",
  coverage: p.coverage,
  missing: [
    { area: "Authentication", count: 4 },
    { area: "Payments", count: 7 },
    { area: "Orders", count: 5 },
    { area: "API", count: 8 },
  ],
  suggested: [
    { id: "t1", name: "Login success returns a signed token", area: "Authentication" },
    { id: "t2", name: "Invalid password is rejected", area: "Authentication" },
    { id: "t3", name: "Expired token returns 401", area: "Authentication" },
    { id: "t4", name: "Unauthorized request cannot read orders", area: "API" },
    { id: "t5", name: "Order creation reserves inventory", area: "Orders" },
  ],
  generatedDiff: [
    { type: "add", text: `import { describe, expect, it } from "vitest";` },
    { type: "add", text: `import { login } from "../src/auth/auth.service";` },
    { type: "add", text: `` },
    { type: "add", text: `describe("login", () => {` },
    { type: "add", text: `  it("returns a signed token for valid credentials", async () => {` },
    { type: "add", text: `    const token = await login("ada@example.com", "correct-horse");` },
    { type: "add", text: `    expect(token).toMatch(/^ey/);` },
    { type: "add", text: `  });` },
    { type: "add", text: `});` },
  ],
}));

export const securityFindings: SecurityFinding[] = [
  {
    id: "sec_1",
    projectId: "prj_ecom",
    title: "Hardcoded secret in auth service",
    severity: "critical",
    category: "Secrets",
    file: "src/services/auth.ts",
    line: 3,
    description: "A JWT signing secret is committed to the repository.",
    impact: "Session forgery for any account, including administrators.",
    recommendation: "Move the secret to environment configuration and rotate it.",
    diff: [
      { type: "remove", text: `const SECRET = "dev-secret-2024";` },
      { type: "add", text: `const SECRET = process.env.JWT_SECRET!;` },
    ],
  },
  {
    id: "sec_2",
    projectId: "prj_ecom",
    title: "SQL injection in user lookup",
    severity: "high",
    category: "Database",
    file: "src/services/user.ts",
    line: 6,
    description: "Request parameters are concatenated into raw SQL.",
    impact: "Full read and write access to the users table.",
    recommendation: "Use parameterized queries.",
    diff: sqlDiff,
  },
  {
    id: "sec_3",
    projectId: "prj_ecom",
    title: "Weak authentication on password reset",
    severity: "high",
    category: "Authentication",
    file: "src/api/index.ts",
    line: 24,
    description: "Reset tokens are six digits with no attempt throttling.",
    impact: "Brute-force account takeover in minutes.",
    recommendation: "Use 32-byte random tokens and rate-limit attempts.",
    diff: [
      { type: "remove", text: `const token = String(Math.floor(Math.random() * 1e6));` },
      { type: "add", text: `const token = crypto.randomBytes(32).toString("hex");` },
    ],
  },
  {
    id: "sec_4",
    projectId: "prj_ecom",
    title: "Missing authorization on admin routes",
    severity: "high",
    category: "Authorization",
    file: "src/api/index.ts",
    line: 40,
    description: "Admin endpoints only check authentication, not role.",
    impact: "Any signed-in customer can read admin reports.",
    recommendation: "Add a role guard middleware to the admin router.",
    diff: [
      { type: "remove", text: `app.use("/admin", requireAuth, adminRouter);` },
      { type: "add", text: `app.use("/admin", requireAuth, requireRole("admin"), adminRouter);` },
    ],
  },
  {
    id: "sec_5",
    projectId: "prj_ecom",
    title: "Unsafe CORS configuration",
    severity: "medium",
    category: "Configuration",
    file: "src/api/index.ts",
    line: 8,
    description: "CORS reflects any origin with credentials enabled.",
    impact: "Cross-site requests can act on behalf of signed-in users.",
    recommendation: "Allow-list known origins explicitly.",
    diff: [
      { type: "remove", text: `app.use(cors({ origin: true, credentials: true }));` },
      { type: "add", text: `app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));` },
    ],
  },
  {
    id: "sec_6",
    projectId: "prj_ecom",
    title: "Dependency vulnerability in jsonwebtoken",
    severity: "medium",
    category: "Dependencies",
    file: "package.json",
    line: 14,
    description: "jsonwebtoken 8.5.1 has a known algorithm-confusion advisory.",
    impact: "Tokens signed with an unexpected algorithm may be accepted.",
    recommendation: "Upgrade to 9.x and pin the verification algorithm.",
    diff: [
      { type: "remove", text: `"jsonwebtoken": "^8.5.1",` },
      { type: "add", text: `"jsonwebtoken": "^9.0.2",` },
    ],
  },
  {
    id: "sec_7",
    projectId: "prj_ecom",
    title: "Exposed API key in client bundle",
    severity: "low",
    category: "API",
    file: "src/services/api.ts",
    line: 4,
    description: "A analytics API key ships to the browser bundle.",
    impact: "Quota abuse against the analytics account.",
    recommendation: "Proxy the call through the server and keep the key server-side.",
    diff: [
      { type: "remove", text: `const ANALYTICS_KEY = "ak_live_9f2c...";` },
      { type: "add", text: `// moved to server proxy: POST /api/analytics/track` },
    ],
  },
];

export const documentationDocs: DocumentationDoc[] = [
  {
    id: "doc_readme",
    projectId: "prj_ecom",
    kind: "README",
    updatedAt: ago(240),
    content: `# E-Commerce Platform

Multi-vendor storefront with checkout, payments and fulfilment.

## Stack
- React + TypeScript (web)
- Node.js + Express (API)
- PostgreSQL (primary datastore)
- Redis (cache and sessions)
- Docker (local and CI parity)

## Getting started
\`\`\`bash
pnpm install
cp .env.example .env
pnpm dev
\`\`\`

## Project structure
\`\`\`
src/
├── components/
├── pages/
├── services/
├── hooks/
├── utils/
└── api/
\`\`\`

## Testing
\`\`\`bash
pnpm test
\`\`\`
`,
  },
];

export const aiTasks: AITask[] = [
  {
    id: "at1",
    projectId: "prj_ecom",
    title: "JWT authentication",
    agent: "Coding Agent",
    status: "completed",
    filesChanged: 5,
    createdAt: ago(120),
    user: "Sahana R.",
  },
  {
    id: "at2",
    projectId: "prj_ecom",
    title: "Security scan",
    agent: "Security",
    status: "completed",
    filesChanged: 0,
    createdAt: ago(71),
    user: "Sahana R.",
  },
  {
    id: "at3",
    projectId: "prj_ecom",
    title: "Payment architecture",
    agent: "Architecture",
    status: "completed",
    filesChanged: 0,
    createdAt: ago(90),
    user: "Dev Patel",
  },
  {
    id: "at4",
    projectId: "prj_ecom",
    title: "Login bug",
    agent: "Debugger",
    status: "completed",
    filesChanged: 1,
    createdAt: ago(31),
    user: "Dev Patel",
  },
  {
    id: "at5",
    projectId: "prj_exam",
    title: "Grading module review",
    agent: "Code Review",
    status: "completed",
    filesChanged: 0,
    createdAt: ago(600),
    user: "Meera K.",
  },
  {
    id: "at6",
    projectId: "prj_exam",
    title: "Generate missing tests",
    agent: "Test Agent",
    status: "running",
    filesChanged: 3,
    createdAt: ago(9),
    user: "Meera K.",
  },
];

export const devActivity: DevActivity[] = [
  { id: "a1", projectId: "prj_ecom", label: "Code review completed", detail: "5 findings across 42 files", agent: "Code Review", at: ago(18) },
  { id: "a2", projectId: "prj_ecom", label: "Security scan completed", detail: "1 critical, 3 high", agent: "Security", at: ago(29) },
  { id: "a3", projectId: "prj_ecom", label: "Debugger found root cause", detail: "user.profile undefined", agent: "Debugger", at: ago(48) },
  { id: "a4", projectId: "prj_ecom", label: "Architecture updated", detail: "Added Redis cache layer", agent: "Architecture", at: ago(70) },
  { id: "a5", projectId: "prj_ecom", label: "5 tests generated", detail: "Authentication suite", agent: "Test Agent", at: ago(1000) },
  { id: "a6", projectId: "prj_exam", label: "Documentation updated", detail: "README and setup guide", agent: "Documentation", at: ago(1400) },
];
