/**
 * Developer AI workspace service layer.
 * Connects the UI directly to backend PostgreSQL and OpenRouter AI endpoints.
 * All mock data has been removed.
 */
import { apiRequest } from "@/lib/api-client";
import type {
  AITask,
  ArchitectureAnalysis,
  CodeReview,
  CodingTask,
  DebugSession,
  DevActivity,
  DocumentationDoc,
  Project,
  SecurityFinding,
  TaskStatus,
  TestAnalysis,
} from "@/types/developer";

function mapProject(p: any): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description || "",
    repository: {
      provider: p.provider || p.repository?.provider || "github",
      fullName: p.full_name || p.fullName || p.repository?.fullName || p.name,
      branch: p.branch || p.repository?.branch || "main",
      branches:
        typeof p.branches === "string"
          ? JSON.parse(p.branches)
          : (p.branches || p.repository?.branches || ["main"]),
      visibility: (p.visibility === "public" || p.repository?.visibility === "public") ? "public" : "private",
    },
    language: p.language || "TypeScript",
    framework: p.framework || "React",
    stack: typeof p.stack === "string" ? JSON.parse(p.stack) : (p.stack || []),
    codeQuality: Number(p.code_quality ?? p.codeQuality ?? 85),
    security: Number(p.security ?? 90),
    coverage: Number(p.coverage ?? 75),
    architectureRating: (p.architecture_rating || p.architectureRating || "Good") as "Good" | "Needs work" | "Excellent",
    findingsSummary:
      typeof p.findings_summary === "string"
        ? JSON.parse(p.findings_summary)
        : (p.findingsSummary || {
            securityIssues: 0,
            reviewSuggestions: 0,
            missingTests: 0,
            architectureWarnings: 0,
          }),
    lastAnalyzedAt: p.last_analyzed_at || p.lastAnalyzedAt || new Date().toISOString(),
    files: typeof p.files === "string" ? JSON.parse(p.files) : (p.files || []),
    structure: typeof p.structure === "string" ? JSON.parse(p.structure) : (p.structure || []),
  };
}

function mapTask(t: any): AITask {
  return {
    id: t.id,
    projectId: t.project_id || t.projectId,
    title: t.title || "AI Task",
    agent: (t.agent || "Coding Agent") as AITask["agent"],
    status: (t.status || "completed") as TaskStatus,
    filesChanged: t.files_changed || t.filesChanged || 0,
    createdAt: t.created_at || t.createdAt || new Date().toISOString(),
    user: t.user_name || t.user || "AI Platform",
  };
}

function mapActivity(a: any): DevActivity {
  return {
    id: a.id,
    projectId: a.project_id || a.projectId,
    label: a.label || a.title || "Activity",
    detail: a.detail || a.description || "",
    agent: a.agent || "Developer AI",
    at: a.created_at || a.at || new Date().toISOString(),
  };
}

export const devApi = {
  projects: {
    list: async (): Promise<Project[]> => {
      const rows = await apiRequest<any[]>("/developer/projects");
      return (rows || []).map(mapProject);
    },
    get: async (id: string): Promise<Project> => {
      const p = await apiRequest<any>(`/developer/projects/${id}`);
      return mapProject(p);
    },
    create: async (input: Partial<Project>): Promise<Project> => {
      const res = await apiRequest<any>("/developer/projects", {
        method: "POST",
        body: JSON.stringify({
          ...input,
          full_name: input.repository?.fullName || input.name,
          provider: input.repository?.provider || "github",
          branch: input.repository?.branch || "main",
        }),
      });
      return mapProject(res);
    },
    update: async (id: string, input: Partial<Project>): Promise<Project> => {
      const res = await apiRequest<any>(`/developer/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      return mapProject(res);
    },
    delete: async (id: string): Promise<void> => {
      await apiRequest(`/developer/projects/${id}`, { method: "DELETE" });
    },
  },

  review: {
    get: async (projectId: string): Promise<CodeReview> => {
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(`project_review_${projectId}`);
          if (cached) return JSON.parse(cached);
        } catch {}
      }
      const res = await apiRequest<CodeReview>(`/developer/code-review/${projectId}`);
      if (res && typeof window !== "undefined") {
        localStorage.setItem(`project_review_${projectId}`, JSON.stringify(res));
      }
      return res;
    },
    run: async (projectId: string, code: string, language = "TypeScript", filesCount = 1): Promise<CodeReview> => {
      const res = await apiRequest<CodeReview>("/developer/code-review", {
        method: "POST",
        body: JSON.stringify({ projectId, code, language, filesCount }),
      });
      if (res && typeof window !== "undefined") {
        localStorage.setItem(`project_review_${projectId}`, JSON.stringify(res));
      }
      return res;
    },
  },

  debug: {
    get: async (projectId: string): Promise<DebugSession> => {
      return apiRequest<DebugSession>(`/developer/debug/${projectId}`);
    },
    run: async (projectId: string, errorMessage: string, code?: string): Promise<DebugSession> => {
      return apiRequest<DebugSession>("/developer/debug", {
        method: "POST",
        body: JSON.stringify({ projectId, errorMessage, code }),
      });
    },
  },

  coding: {
    get: async (projectId: string): Promise<CodingTask> => {
      return apiRequest<CodingTask>(`/developer/coding/${projectId}`);
    },
    run: async (projectId: string, prompt: string): Promise<CodingTask> => {
      return apiRequest<CodingTask>("/developer/coding", {
        method: "POST",
        body: JSON.stringify({ projectId, prompt }),
      });
    },
  },

  architecture: {
    get: async (projectId: string): Promise<ArchitectureAnalysis> => {
      return apiRequest<ArchitectureAnalysis>(`/developer/architecture/${projectId}`);
    },
    run: async (projectId: string, prompt: string): Promise<ArchitectureAnalysis> => {
      return apiRequest<ArchitectureAnalysis>("/developer/architecture", {
        method: "POST",
        body: JSON.stringify({ projectId, prompt }),
      });
    },
  },

  tests: {
    get: async (projectId: string): Promise<TestAnalysis> => {
      return apiRequest<TestAnalysis>(`/developer/tests/${projectId}`);
    },
    run: async (projectId: string, code: string, framework = "vitest"): Promise<TestAnalysis> => {
      return apiRequest<TestAnalysis>("/developer/tests", {
        method: "POST",
        body: JSON.stringify({ projectId, code, framework }),
      });
    },
  },

  security: {
    list: async (projectId: string): Promise<SecurityFinding[]> => {
      const res = await apiRequest<SecurityFinding[]>(`/developer/security/${projectId}`);
      return res || [];
    },
    run: async (projectId: string, code: string): Promise<SecurityFinding[]> => {
      const res = await apiRequest<SecurityFinding[]>("/developer/security", {
        method: "POST",
        body: JSON.stringify({ projectId, code }),
      });
      return res || [];
    },
  },

  documentation: {
    list: async (projectId: string): Promise<DocumentationDoc[]> => {
      const res = await apiRequest<DocumentationDoc[]>(`/developer/documentation/${projectId}`);
      return res || [];
    },
    generate: async (projectId: string, code: string, kind = "README"): Promise<DocumentationDoc> => {
      return apiRequest<DocumentationDoc>("/developer/documentation", {
        method: "POST",
        body: JSON.stringify({ projectId, code, kind }),
      });
    },
  },

  tasks: {
    list: async (projectId?: string): Promise<AITask[]> => {
      const url = projectId ? `/developer/tasks?projectId=${encodeURIComponent(projectId)}` : "/developer/tasks";
      const rows = await apiRequest<any[]>(url);
      return (rows || []).map(mapTask);
    },
  },

  activity: {
    list: async (projectId?: string): Promise<DevActivity[]> => {
      const url = projectId ? `/developer/activity?projectId=${encodeURIComponent(projectId)}` : "/developer/activity";
      const rows = await apiRequest<any[]>(url);
      return (rows || []).map(mapActivity);
    },
  },
};
