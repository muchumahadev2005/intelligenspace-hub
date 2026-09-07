/** Developer AI workspace domain models (frontend-only). */

export type Severity = "critical" | "high" | "medium" | "low";
export type TaskStatus = "waiting" | "running" | "completed" | "failed";

export interface Repository {
  provider: "github" | "gitlab" | "bitbucket" | "upload" | "empty";
  fullName: string;
  branch: string;
  branches: string[];
  visibility: "private" | "public";
}

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  language?: string;
  children?: ProjectFile[];
  content?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  repository: Repository;
  language: string;
  framework: string;
  stack: string[];
  codeQuality: number;
  security: number;
  coverage: number;
  architectureRating: "Good" | "Needs work" | "Excellent";
  lastAnalyzedAt: string;
  files: ProjectFile[];
  structure: string[];
  findingsSummary: { securityIssues: number; reviewSuggestions: number; missingTests: number; architectureWarnings: number };
}

export interface ReviewFinding {
  id: string;
  projectId: string;
  title: string;
  severity: Severity;
  category: "Security" | "Performance" | "Code quality" | "Best practices";
  file: string;
  line: number;
  problem: string;
  impact: string;
  recommendation: string;
  diff: DiffLine[];
  status: "open" | "applied" | "ignored";
}

export interface DiffLine {
  type: "add" | "remove" | "context";
  text: string;
}

export interface CodeReview {
  id: string;
  projectId: string;
  type: "Full review" | "Security" | "Performance" | "Code quality" | "Best practices";
  createdAt: string;
  filesReviewed: number;
  findings: ReviewFinding[];
}

export interface DebugSession {
  id: string;
  projectId: string;
  title: string;
  errorMessage: string;
  createdAt: string;
  rootCause: string;
  reasoning: string[];
  suggestedFix: string;
  confidence: number;
  patch: DiffLine[];
}

export interface CodingTask {
  id: string;
  projectId: string;
  prompt: string;
  createdAt: string;
  steps: { id: string; label: string; status: TaskStatus }[];
  plan: { id: string; label: string; done: boolean }[];
  changes: { path: string; change: "added" | "modified" | "deleted"; additions: number; deletions: number }[];
  diff: DiffLine[];
}

export interface ArchNode {
  id: string;
  label: string;
  sublabel?: string;
  row: number;
  col: number;
}

export interface ArchitectureAnalysis {
  id: string;
  projectId: string;
  prompt: string;
  createdAt: string;
  nodes: ArchNode[];
  edges: { from: string; to: string }[];
  stack: { layer: string; choice: string; reason: string }[];
  explanation: { component: string; detail: string }[];
  entities: { name: string; fields: string[] }[];
  endpoints: { method: string; path: string; purpose: string }[];
  scaling: string[];
  security: string[];
  tradeoffs: { option: string; detail: string }[];
}

export interface TestAnalysis {
  id: string;
  projectId: string;
  framework: string;
  coverage: number;
  missing: { area: string; count: number }[];
  suggested: { id: string; name: string; area: string }[];
  generatedDiff: DiffLine[];
}

export interface SecurityFinding {
  id: string;
  projectId: string;
  title: string;
  severity: Severity;
  category:
    | "Authentication"
    | "Authorization"
    | "Dependencies"
    | "Secrets"
    | "API"
    | "Database"
    | "Configuration";
  file: string;
  line: number;
  description: string;
  impact: string;
  recommendation: string;
  diff: DiffLine[];
}

export interface DocumentationDoc {
  id: string;
  projectId: string;
  kind:
    | "README"
    | "API docs"
    | "Architecture docs"
    | "Setup guide"
    | "Developer guide"
    | "Deployment guide";
  updatedAt: string;
  content: string;
}

export interface AITask {
  id: string;
  projectId: string;
  title: string;
  agent:
    | "Code Review"
    | "Debugger"
    | "Coding Agent"
    | "Architecture"
    | "Test Agent"
    | "Security"
    | "Documentation";
  status: TaskStatus;
  filesChanged: number;
  createdAt: string;
  user: string;
}

export interface DevActivity {
  id: string;
  projectId: string;
  label: string;
  detail: string;
  agent: string;
  at: string;
}
