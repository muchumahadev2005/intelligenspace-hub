import { useQuery } from "@tanstack/react-query";
import { devApi } from "@/services/developer-api";

export const useProjects = () => useQuery({ queryKey: ["dev", "projects"], queryFn: devApi.projects.list });
export const useProject = (id: string) =>
  useQuery({ queryKey: ["dev", "projects", id], queryFn: () => devApi.projects.get(id) });
export const useCodeReview = (projectId: string) =>
  useQuery({ queryKey: ["dev", "review", projectId], queryFn: () => devApi.review.get(projectId) });
export const useDebugSession = (projectId: string) =>
  useQuery({ queryKey: ["dev", "debug", projectId], queryFn: () => devApi.debug.get(projectId) });
export const useCodingTask = (projectId: string) =>
  useQuery({ queryKey: ["dev", "coding", projectId], queryFn: () => devApi.coding.get(projectId) });
export const useArchitecture = (projectId: string) =>
  useQuery({ queryKey: ["dev", "architecture", projectId], queryFn: () => devApi.architecture.get(projectId) });
export const useTestAnalysis = (projectId: string) =>
  useQuery({ queryKey: ["dev", "tests", projectId], queryFn: () => devApi.tests.get(projectId) });
export const useSecurityFindings = (projectId: string) =>
  useQuery({ queryKey: ["dev", "security", projectId], queryFn: () => devApi.security.list(projectId) });
export const useDocumentation = (projectId: string) =>
  useQuery({ queryKey: ["dev", "docs", projectId], queryFn: () => devApi.documentation.list(projectId) });
export const useAITasks = (projectId?: string) =>
  useQuery({ queryKey: ["dev", "tasks", projectId ?? "all"], queryFn: () => devApi.tasks.list(projectId) });
export const useDevActivity = (projectId?: string) =>
  useQuery({ queryKey: ["dev", "activity", projectId ?? "all"], queryFn: () => devApi.activity.list(projectId) });
