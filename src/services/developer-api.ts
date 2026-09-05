/**
 * Developer AI workspace service layer (mock).
 * Components and hooks only talk to this module, so the mock implementation
 * can later be replaced with real HTTP calls without touching the UI.
 */
import * as db from "@/mock/developer";
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
  TestAnalysis,
} from "@/types/developer";

const LATENCY = 240;

function respond<T>(data: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms));
}

/** Returns the record for a project, falling back to a re-keyed sample. */
function forProject<T extends { projectId: string }>(rows: T[], projectId: string): T {
  const found = rows.find((r) => r.projectId === projectId) ?? rows[0]!;
  return { ...found, projectId };
}

export const devApi = {
  projects: {
    list: () => respond<Project[]>(db.projects),
    get: (id: string) => {
      const project = db.projects.find((p) => p.id === id);
      return project
        ? respond<Project>(project)
        : Promise.reject(new Error("Project not found"));
    },
    create: (input: Partial<Project>) =>
      respond<Project>({
        ...db.projects[0]!,
        ...input,
        id: `prj_${Math.random().toString(36).slice(2, 8)}`,
        lastAnalyzedAt: new Date().toISOString(),
      }),
  },
  review: {
    get: (projectId: string) => respond<CodeReview>(forProject(db.codeReviews, projectId)),
  },
  debug: {
    get: (projectId: string) => respond<DebugSession>(forProject(db.debugSessions, projectId)),
    run: (projectId: string, errorMessage: string) =>
      respond<DebugSession>(
        { ...forProject(db.debugSessions, projectId), errorMessage, createdAt: new Date().toISOString() },
        900,
      ),
  },
  coding: {
    get: (projectId: string) => respond<CodingTask>(forProject(db.codingTasks, projectId)),
    run: (projectId: string, prompt: string) =>
      respond<CodingTask>(
        { ...forProject(db.codingTasks, projectId), prompt, createdAt: new Date().toISOString() },
        1100,
      ),
  },
  architecture: {
    get: (projectId: string) =>
      respond<ArchitectureAnalysis>(forProject(db.architectureAnalyses, projectId)),
    run: (projectId: string, prompt: string) =>
      respond<ArchitectureAnalysis>(
        { ...forProject(db.architectureAnalyses, projectId), prompt, createdAt: new Date().toISOString() },
        1200,
      ),
  },
  tests: {
    get: (projectId: string) => respond<TestAnalysis>(forProject(db.testAnalyses, projectId)),
  },
  security: {
    list: (projectId: string) => {
      const rows = db.securityFindings.filter((f) => f.projectId === projectId);
      return respond<SecurityFinding[]>(
        rows.length ? rows : db.securityFindings.map((f) => ({ ...f, projectId })),
      );
    },
  },
  documentation: {
    list: (projectId: string) => {
      const rows = db.documentationDocs.filter((d) => d.projectId === projectId);
      return respond<DocumentationDoc[]>(
        rows.length ? rows : db.documentationDocs.map((d) => ({ ...d, projectId })),
      );
    },
  },
  tasks: {
    list: (projectId?: string) =>
      respond<AITask[]>(projectId ? db.aiTasks.filter((t) => t.projectId === projectId) : db.aiTasks),
  },
  activity: {
    list: (projectId?: string) =>
      respond<DevActivity[]>(
        projectId ? db.devActivity.filter((a) => a.projectId === projectId) : db.devActivity,
      ),
  },
};
