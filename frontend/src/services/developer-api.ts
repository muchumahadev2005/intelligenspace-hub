/**
 * Developer AI workspace service layer.
 * Connects the UI directly to backend PostgreSQL and AI endpoints.
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

  limits: {
    get: async (): Promise<{ runsToday: number; dailyLimit: number; remaining: number; hasReachedLimit: boolean }> => {
      return apiRequest("/developer/limits");
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
      try {
        const res = await apiRequest<CodeReview>(`/developer/code-review/${projectId}`);
        if (res && typeof window !== "undefined") {
          localStorage.setItem(`project_review_${projectId}`, JSON.stringify(res));
        }
        return res;
      } catch {
        return {
          id: `review_empty_${projectId}`,
          projectId,
          type: "Full review",
          createdAt: new Date().toISOString(),
          filesReviewed: 0,
          findings: [],
        };
      }
    },
    run: async (
      projectId: string,
      code: string,
      language = "TypeScript",
      filesCount = 1,
      filePath?: string,
      model?: string,
    ): Promise<CodeReview> => {
      const res = await apiRequest<CodeReview>("/developer/code-review", {
        method: "POST",
        body: JSON.stringify({ projectId, code, language, filesCount, filePath, model }),
      });
      if (res && typeof window !== "undefined") {
        localStorage.setItem(`project_review_${projectId}`, JSON.stringify(res));
      }
      return res;
    },
  },

  debug: {
    get: async (projectId: string): Promise<DebugSession | null> => {
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(`project_debug_${projectId}`);
          if (cached) return JSON.parse(cached);
        } catch {}
      }
      try {
        const res = await apiRequest<DebugSession>(`/developer/debug/${projectId}`);
        if (res && typeof window !== "undefined") {
          localStorage.setItem(`project_debug_${projectId}`, JSON.stringify(res));
        }
        return res;
      } catch {
        return null;
      }
    },
    run: async (projectId: string, errorMessage: string, code?: string, model?: string): Promise<DebugSession> => {
      const res = await apiRequest<DebugSession>("/developer/debug", {
        method: "POST",
        body: JSON.stringify({ projectId, errorMessage, code, model }),
      });
      if (res && typeof window !== "undefined") {
        localStorage.setItem(`project_debug_${projectId}`, JSON.stringify(res));
      }
      return res;
    },
  },

  coding: {
    get: async (projectId: string): Promise<CodingTask | null> => {
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(`project_coding_${projectId}`);
          if (cached) return JSON.parse(cached);
        } catch {}
      }
      try {
        const res = await apiRequest<CodingTask>(`/developer/coding/${projectId}`);
        if (res && typeof window !== "undefined") {
          localStorage.setItem(`project_coding_${projectId}`, JSON.stringify(res));
        }
        return res;
      } catch {
        return null;
      }
    },
    run: async (projectId: string, prompt: string, filePath?: string, code?: string, model?: string): Promise<CodingTask> => {
      const res = await apiRequest<CodingTask>("/developer/coding", {
        method: "POST",
        body: JSON.stringify({ projectId, prompt, filePath, code, model }),
      });
      if (res && typeof window !== "undefined") {
        localStorage.setItem(`project_coding_${projectId}`, JSON.stringify(res));
      }
      return res;
    },
  },

  architecture: {
    get: async (projectId: string): Promise<ArchitectureAnalysis | null> => {
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(`project_arch_${projectId}`);
          if (cached) return JSON.parse(cached);
        } catch {}
      }
      try {
        const res = await apiRequest<ArchitectureAnalysis>(`/developer/architecture/${projectId}`);
        if (res && typeof window !== "undefined") {
          localStorage.setItem(`project_arch_${projectId}`, JSON.stringify(res));
        }
        return res;
      } catch {
        return null;
      }
    },
    run: async (projectId: string, prompt: string, fileList?: string[], model?: string): Promise<ArchitectureAnalysis> => {
      const res = await apiRequest<ArchitectureAnalysis>("/developer/architecture", {
        method: "POST",
        body: JSON.stringify({ projectId, prompt, fileList, model }),
      });
      if (res && typeof window !== "undefined") {
        localStorage.setItem(`project_arch_${projectId}`, JSON.stringify(res));
      }
      return res;
    },
  },

  tests: {
    get: async (projectId: string): Promise<TestAnalysis | null> => {
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(`project_tests_${projectId}`);
          if (cached) return JSON.parse(cached);
        } catch {}
      }
      try {
        const res = await apiRequest<TestAnalysis>(`/developer/tests/${projectId}`);
        if (res && typeof window !== "undefined") {
          localStorage.setItem(`project_tests_${projectId}`, JSON.stringify(res));
        }
        return res;
      } catch {
        return null;
      }
    },
    run: async (projectId: string, code: string, framework = "vitest", filePath?: string, model?: string): Promise<TestAnalysis> => {
      const res = await apiRequest<TestAnalysis>("/developer/tests", {
        method: "POST",
        body: JSON.stringify({ projectId, code, framework, filePath, model }),
      });
      if (res && typeof window !== "undefined") {
        localStorage.setItem(`project_tests_${projectId}`, JSON.stringify(res));
      }
      return res;
    },
  },

  security: {
    list: async (projectId: string): Promise<SecurityFinding[]> => {
      try {
        const res = await apiRequest<SecurityFinding[]>(`/developer/security/${projectId}`);
        return res || [];
      } catch {
        return [];
      }
    },
    run: async (projectId: string, code: string, filePath?: string, model?: string): Promise<SecurityFinding[]> => {
      const res = await apiRequest<SecurityFinding[]>("/developer/security", {
        method: "POST",
        body: JSON.stringify({ projectId, code, filePath, model }),
      });
      return res || [];
    },
  },

  documentation: {
    list: async (projectId: string): Promise<DocumentationDoc[]> => {
      try {
        const res = await apiRequest<DocumentationDoc[]>(`/developer/documentation/${projectId}`);
        return res || [];
      } catch {
        return [];
      }
    },
    generate: async (projectId: string, code: string, kind = "README", filePath?: string, model?: string): Promise<DocumentationDoc> => {
      return apiRequest<DocumentationDoc>("/developer/documentation", {
        method: "POST",
        body: JSON.stringify({ projectId, code, kind, filePath, model }),
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

  adminModels: {
    list: async (activeOnly?: boolean): Promise<SystemAIModel[]> => {
      const url = activeOnly ? "/admin/models?activeOnly=true" : "/admin/models";
      const res = await apiRequest<{ models: SystemAIModel[] }>(url);
      return res.models || [];
    },
    create: async (data: Partial<SystemAIModel>): Promise<SystemAIModel> => {
      const res = await apiRequest<{ model: SystemAIModel }>("/admin/models", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.model;
    },
    update: async (id: string, data: Partial<SystemAIModel>): Promise<SystemAIModel> => {
      const res = await apiRequest<{ model: SystemAIModel }>(`/admin/models/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return res.model;
    },
    delete: async (id: string): Promise<{ success: boolean; message?: string }> => {
      return apiRequest<{ success: boolean; message?: string }>(`/admin/models/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
    test: async (modelId: string, prompt?: string, maxTokens?: number): Promise<ModelPingResult> => {
      return apiRequest<ModelPingResult>("/admin/models/test", {
        method: "POST",
        body: JSON.stringify({ modelId, prompt, maxTokens }),
      });
    },
  },
};

export interface SystemAIModel {
  id: string;
  name: string;
  description: string;
  speed: "Ultra fast" | "Fast" | "Balanced" | "Deep reasoning";
  badge?: string;
  isDefault: boolean;
  isEnabled: boolean;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModelPingResult {
  ok: boolean;
  latencyMs: number;
  response?: string;
  error?: string;
  modelId: string;
  prompt?: string;
  tokensUsed?: number;
}


