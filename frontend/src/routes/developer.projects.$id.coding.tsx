import { useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles, Code2, Play, CheckCircle2, FileCode, Check, RefreshCw } from "lucide-react";
import { DiffView, Panel, TaskStatusPill } from "@/components/developer/ui";
import { FileSelectorBar } from "@/components/developer/file-selector-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useCodingTask, useProject } from "@/hooks/use-developer";
import { devApi } from "@/services/developer-api";
import { getProjectCodeFiles, loadProjectFileCode } from "@/lib/github-tree";
import { useDeveloperModel } from "@/hooks/use-developer-model";
import { applyAndSaveProjectPatch } from "@/lib/patch-applier";

export const Route = createFileRoute("/developer/projects/$id/coding")({
  head: () => ({
    meta: [
      { title: "Coding agent — Developer AI" },
      { name: "description", content: "AI agent that plans changes and generates unified diffs for your codebase." },
      { property: "og:title", content: "Coding agent — Developer AI" },
      { property: "og:description", content: "Autonomous coding agent generating diffs and tasks." },
    ],
  }),
  component: CodingPage,
});

const QUICK_PROMPTS = [
  "Add input validation and rate limiting middleware to all public API endpoints",
  "Implement secure JWT authentication and token verification",
  "Add comprehensive error boundaries and structured logging",
  "Optimize performance and remove redundant operations",
];

function CodingPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: project } = useProject(id);
  const { data: task, isLoading } = useCodingTask(id);
  const { selectedModel, assertCanRun, invalidateQuota } = useDeveloperModel();

  // File-by-file selection
  const files = useMemo(() => getProjectCodeFiles(project, id), [project, id]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const fileContentCacheRef = useRef<Record<string, string>>({});
  const [currentFileCode, setCurrentFileCode] = useState<string>("");

  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [isMerged, setIsMerged] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // Auto-select first meaningful source file if not set
  useEffect(() => {
    if (files.length > 0 && !selectedPath) {
      const preferred =
        files.find((f) => {
          const p = f.path.toLowerCase();
          return p.includes("controller") || p.includes("route") || p.includes("app.") || p.includes("server.");
        }) || files[0];
      if (preferred) setSelectedPath(preferred.path);
    }
  }, [files, selectedPath]);

  // Load code of selected file
  useEffect(() => {
    if (!selectedPath) return;
    let isMounted = true;

    if (fileContentCacheRef.current[selectedPath] !== undefined) {
      setCurrentFileCode(fileContentCacheRef.current[selectedPath]);
      return;
    }

    loadProjectFileCode(project, selectedPath, fileContentCacheRef.current)
      .then((code) => {
        if (isMounted) {
          const loaded = code || "";
          fileContentCacheRef.current[selectedPath] = loaded;
          setCurrentFileCode(loaded);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [selectedPath, project]);

  const run = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe what you want the AI agent to build or modify");
      return;
    }

    if (!assertCanRun()) return;

    setRunning(true);
    setIsMerged(false);
    const toastId = toast.loading(`Coding agent is working with ${selectedModel.name}...`, {
      description: selectedPath
        ? `Targeting file ${selectedPath}`
        : "Planning implementation steps and generating code diffs.",
    });

    try {
      const updated = await devApi.coding.run(
        id,
        prompt.trim(),
        selectedPath || undefined,
        currentFileCode || undefined,
        selectedModel.id,
      );
      invalidateQuota();

      queryClient.setQueryData(["dev", "coding", id], updated);
      toast.success("Implementation ready", {
        id: toastId,
        description: `Generated ${updated.changes?.length || 1} file changes and code diff.`,
      });
    } catch (err: any) {
      console.error("Coding task failed", err);
      toast.error("Failed to run coding agent", {
        id: toastId,
        description: err?.message || "Please check backend connection.",
      });
    } finally {
      setRunning(false);
    }
  };

  const handleMergeChanges = async () => {
    if (!task?.diff || task.diff.length === 0) {
      toast.error("No code diff to merge");
      return;
    }

    const targetPath = task.filePath || selectedPath || task.changes?.[0]?.path;
    if (!targetPath) {
      toast.error("Target file path is unknown. Please select a file above.");
      return;
    }

    setIsMerging(true);
    try {
      const codeForFile = fileContentCacheRef.current[targetPath] || (selectedPath === targetPath ? currentFileCode : "");
      const res = await applyAndSaveProjectPatch({
        projectId: id,
        filePath: targetPath,
        diff: task.diff,
        originalCode: codeForFile,
        project,
        queryClient,
      });

      if (res.success) {
        fileContentCacheRef.current[targetPath] = res.newContent;
        if (selectedPath === targetPath) setCurrentFileCode(res.newContent);
        setIsMerged(true);
        toast.success("Changes merged & saved to project!", {
          description: `Successfully patched ${targetPath}.`,
        });
      } else {
        toast.error("Could not merge changes", { description: res.message });
      }
    } catch (err: any) {
      toast.error("Failed to merge changes", { description: err?.message || "Unknown error" });
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Selector Bar for File-by-File AI coding */}
      <FileSelectorBar
        files={files}
        selectedPath={selectedPath}
        onSelectPath={setSelectedPath}
        label="Target file"
        actions={
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Modify file-by-file with full code context
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[420px_1fr] items-start">
        {/* Left Form: Instructions & Prompt */}
        <div className="space-y-6">
          <Panel
            title={selectedPath ? `Modify ${selectedPath.split("/").pop()}` : "What should we build?"}
            description={
              selectedPath
                ? `Prompt the AI coding agent to implement, refactor or update ${selectedPath}.`
                : "Describe the feature, refactor or fix for this codebase."
            }
          >
            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Quick Actions
                </span>
                <div className="flex flex-col gap-1.5">
                  {QUICK_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPrompt(p)}
                      className="text-left rounded-md border border-border bg-accent/30 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      + {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Instruction Prompt
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                  placeholder={
                    selectedPath
                      ? `e.g. Add validation rules, error handling and sanitize inputs in ${selectedPath}...`
                      : "Describe what you want built or modified..."
                  }
                  aria-label="Feature prompt"
                  className="text-xs font-mono"
                />
              </div>

              <Button className="w-full gap-2" onClick={run} disabled={running}>
                {running ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Planning & Generating Code...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Run Coding Agent
                  </>
                )}
              </Button>
            </div>
          </Panel>

          {task?.steps && task.steps.length > 0 && (
            <Panel title="Implementation Steps">
              <ul className="space-y-3">
                {task.steps.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-muted-foreground text-xs">{s.label}</span>
                    <TaskStatusPill status={s.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        {/* Right Area: Results, Plan, Diff */}
        <div className="space-y-6">
          {task ? (
            <>
              {task.plan && task.plan.length > 0 && (
                <Panel title="Implementation Plan">
                  <ul className="space-y-2 text-sm">
                    {task.plan.map((p) => (
                      <li key={p.id} className="flex items-start gap-3">
                        <span
                          className={
                            p.done
                              ? "mt-1 size-2 rounded-full bg-emerald-400"
                              : "mt-1 size-2 rounded-full bg-muted-foreground/40"
                          }
                          aria-hidden
                        />
                        <span className={p.done ? "text-muted-foreground line-through text-xs" : "text-xs"}>
                          {p.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}

              {task.changes && task.changes.length > 0 && (
                <Panel title="Changed files">
                  <ul className="divide-y divide-border">
                    {task.changes.map((c) => (
                      <li key={c.path} className="flex flex-wrap items-center gap-3 py-2.5 text-xs">
                        <span className="min-w-0 flex-1 truncate font-mono">{c.path}</span>
                        <Badge variant="secondary" className="capitalize">
                          {c.change}
                        </Badge>
                        <span className="tabular-nums text-emerald-400">+{c.additions}</span>
                        <span className="tabular-nums text-destructive">-{c.deletions}</span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}

              {task.diff && task.diff.length > 0 && (
                <Panel title="Generated Code Diff" description={task.filePath ? `Target: ${task.filePath}` : undefined}>
                  <DiffView lines={task.diff} />
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      disabled={isMerged || isMerging}
                      onClick={handleMergeChanges}
                      className="gap-1.5"
                    >
                      {isMerging ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" /> Merging...
                        </>
                      ) : isMerged ? (
                        <>
                          <Check className="size-3.5 text-emerald-400" /> Merged
                        </>
                      ) : (
                        <>
                          <Check className="size-3.5" /> Merge changes
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isMerged || isMerging}
                      onClick={() => toast("Changes discarded")}
                    >
                      Discard
                    </Button>
                  </div>
                </Panel>
              )}
            </>
          ) : (
            <Panel title="AI Coding Agent Ready" description="Autonomously plan and code features file-by-file.">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <Code2 className="size-6" />
                </div>
                <h3 className="text-base font-semibold">
                  {selectedPath ? `Ready to modify ${selectedPath.split("/").pop()}` : "Ready to implement"}
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground max-w-md">
                  Select any file above and describe the feature, enhancement, or bug fix on the left. The AI agent will
                  inspect your code and produce targeted implementation diffs.
                </p>
                {selectedPath && (
                  <Badge variant="outline" className="mt-4 font-mono text-xs">
                    Target: {selectedPath}
                  </Badge>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
