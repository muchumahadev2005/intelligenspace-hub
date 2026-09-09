import { useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCode,
  ExternalLink,
  RefreshCw,
  Play,
  Square,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import { DiffView, Panel, SeverityBadge, CodeBlock } from "@/components/developer/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCodeReview, useProject } from "@/hooks/use-developer";
import { devApi } from "@/services/developer-api";
import { fetchRawFileContent, detectLanguage, getProjectCodeFiles } from "@/lib/github-tree";
import { useDeveloperModel } from "@/hooks/use-developer-model";
import { applyAndSaveProjectPatch } from "@/lib/patch-applier";
import { relative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CodeReview, ProjectFile, ReviewFinding, Severity } from "@/types/developer";

export const Route = createFileRoute("/developer/projects/$id/review")({
  head: () => ({
    meta: [
      { title: "Code review — Developer AI" },
      { name: "description", content: "AI file-by-file code review with severity, impact and suggested patches." },
      { property: "og:title", content: "Code review — Developer AI" },
      { property: "og:description", content: "Inspect code file by file with AI code review agents." },
    ],
  }),
  component: ReviewPage,
});

const filters: (Severity | "all")[] = ["all", "critical", "high", "medium", "low"];

// Flatten nested project tree into list of code files
function extractCodeFiles(nodes: ProjectFile[]): ProjectFile[] {
  const list: ProjectFile[] = [];
  function recurse(items: ProjectFile[]) {
    for (const node of items) {
      if (node.type === "file") {
        const p = node.path.toLowerCase();
        if (
          !p.endsWith(".png") &&
          !p.endsWith(".jpg") &&
          !p.endsWith(".jpeg") &&
          !p.endsWith(".gif") &&
          !p.endsWith(".ico") &&
          !p.endsWith(".svg") &&
          !p.endsWith(".pdf") &&
          !p.endsWith(".lock") &&
          !p.endsWith("-lock.json")
        ) {
          list.push(node);
        }
      }
      if (node.children && node.children.length > 0) {
        recurse(node.children);
      }
    }
  }
  recurse(nodes);
  return list;
}

function ReviewPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: project, isLoading: isProjectLoading } = useProject(id);
  const { data: review, isLoading: isReviewLoading } = useCodeReview(id);
  const { selectedModel, assertCanRun, invalidateQuota } = useDeveloperModel();

  // File navigation state
  const [selectedPath, setSelectedPath] = useState<string>("");
  const fileContentCacheRef = useRef<Record<string, string>>({});
  const [fileContentCache, setFileContentCache] = useState<Record<string, string>>({});
  const [isLoadingFileContent, setIsLoadingFileContent] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // Review execution states
  const [isReviewingCurrent, setIsReviewingCurrent] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const stopBatchRef = useRef(false);

  // Filter & details states
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [openFindingId, setOpenFindingId] = useState<string | null>(null);

  // Track which files have been reviewed in this session
  const [reviewedFiles, setReviewedFiles] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`project_reviewed_files_${id}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  // Extract all reviewable code files
  const allFiles = useMemo(() => {
    return getProjectCodeFiles(project, id);
  }, [project, id]);

  // Set default selected file when files load
  useEffect(() => {
    if (allFiles.length > 0 && !selectedPath) {
      // Prioritize entry file or app.js or README
      const preferred = allFiles.find((f) => {
        const p = f.path.toLowerCase();
        return p.includes("app.") || p.includes("index.") || p.includes("main.") || p.includes("server.");
      }) || allFiles[0];
      if (preferred) setSelectedPath(preferred.path);
    }
  }, [allFiles, selectedPath]);

  // Current active file object
  const activeFile = useMemo(() => {
    return allFiles.find((f) => f.path === selectedPath) || allFiles[0] || null;
  }, [allFiles, selectedPath]);

  const activeIndex = useMemo(() => {
    if (!activeFile) return -1;
    return allFiles.findIndex((f) => f.path === activeFile.path);
  }, [allFiles, activeFile]);

  // Load active file's code on demand (from GitHub if needed)
  useEffect(() => {
    if (!project || !activeFile) return;
    const path = activeFile.path;
    let isMounted = true;

    if (fileContentCacheRef.current[path] !== undefined) return;

    if (activeFile.content && !activeFile.content.startsWith("// Source from GitHub repository:")) {
      fileContentCacheRef.current[path] = activeFile.content;
      setFileContentCache((prev) => ({ ...prev, [path]: activeFile.content! }));
      return;
    }

    if (project.repository?.provider === "github" && project.repository?.fullName?.includes("/")) {
      setIsLoadingFileContent(true);
      fetchRawFileContent(project.repository.fullName, project.repository.branch || "main", path)
        .then((text) => {
          fileContentCacheRef.current[path] = text;
          if (isMounted) {
            setFileContentCache((prev) => ({ ...prev, [path]: text }));
          }
        })
        .finally(() => {
          if (isMounted) setIsLoadingFileContent(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [activeFile?.path, project]);

  const currentCode = activeFile ? fileContentCache[activeFile.path] || activeFile.content || "" : "";

  // Filter findings for the active file
  const activeFileFindings = useMemo(() => {
    if (!review || !activeFile) return [];
    return (review.findings || []).filter((f) => {
      const p = (f.file || "").toLowerCase();
      const target = activeFile.path.toLowerCase();
      const targetName = activeFile.name.toLowerCase();
      return p === target || p.endsWith("/" + targetName) || target.endsWith("/" + p) || p === targetName;
    });
  }, [review, activeFile]);

  const filteredFindings = useMemo(() => {
    if (severity === "all") return activeFileFindings;
    return activeFileFindings.filter((f) => f.severity === severity);
  }, [activeFileFindings, severity]);

  // Review a single specific file
  const handleReviewSingleFile = async (targetFile: ProjectFile, silent = false) => {
    if (!project) return;
    setIsReviewingCurrent(true);

    let code = fileContentCache[targetFile.path] || targetFile.content || "";

    // Fetch code if not in cache
    if (!code || code.startsWith("// Source from GitHub repository:")) {
      if (project.repository?.provider === "github") {
        try {
          code = await fetchRawFileContent(project.repository.fullName, project.repository.branch || "main", targetFile.path);
          setFileContentCache((prev) => ({ ...prev, [targetFile.path]: code }));
        } catch (e: any) {
          if (!silent) toast.error(`Could not read ${targetFile.name}: ${e.message}`);
          setIsReviewingCurrent(false);
          return;
        }
      }
    }

    if (!code.trim()) {
      if (!silent) toast.warning(`${targetFile.name} is empty, skipping AI review.`);
      setIsReviewingCurrent(false);
      return;
    }

    if (!assertCanRun()) {
      setIsReviewingCurrent(false);
      return;
    }

    const toastId = silent
      ? undefined
      : toast.loading(`Reviewing ${targetFile.name} with ${selectedModel.name}...`, {
          description: "Analyzing code for bugs, security risks, and optimizations.",
        });

    try {
      const fileLang = targetFile.language || detectLanguage(targetFile.name);
      const res = await devApi.review.run(
        id,
        code,
        fileLang,
        1,
        targetFile.path,
        selectedModel.id,
      );

      // Invalidate quota
      invalidateQuota();

      // Refresh review queries
      queryClient.setQueryData(["dev", "review", id], (old: any) => {
        if (!old) return res;
        const otherFindings = (old.findings || []).filter((f: any) => f.file !== targetFile.path);
        return {
          ...old,
          filesReviewed: (old.filesReviewed || 0) + 1,
          findings: [...otherFindings, ...(res.findings || [])],
        };
      });

      // Mark file as reviewed
      const newReviewedState = { ...reviewedFiles, [targetFile.path]: true };
      setReviewedFiles(newReviewedState);
      if (typeof window !== "undefined") {
        localStorage.setItem(`project_reviewed_files_${id}`, JSON.stringify(newReviewedState));
      }

      if (!silent) {
        if (toastId) {
          toast.success(`Review completed for ${targetFile.name}`, {
            id: toastId,
            description: res.findings?.length
              ? `Found ${res.findings.length} findings to review.`
              : `Clean file! No issues detected.`,
          });
        } else {
          toast.success(`Review completed for ${targetFile.name}`);
        }
      }
    } catch (err: any) {
      console.error("Single file review failed", err);
      if (!silent) {
        if (toastId) {
          toast.error(`Failed to review ${targetFile.name}`, {
            id: toastId,
            description: err.message || "AI Service or Network issue",
          });
        } else {
          toast.error(`Failed to review ${targetFile.name}`);
        }
      }
    } finally {
      setIsReviewingCurrent(false);
    }
  };

  // Review all files sequentially (one after another)
  const handleReviewAllSequentially = async () => {
    if (allFiles.length === 0 || isBatchRunning) return;
    if (!assertCanRun()) return;
    setIsBatchRunning(true);
    stopBatchRef.current = false;

    toast.info(`Starting sequential review of ${allFiles.length} files...`, {
      description: `Analyzing one file at a time using ${selectedModel.name}.`,
    });

    for (let i = 0; i < allFiles.length; i++) {
      if (stopBatchRef.current) {
        toast.info("Sequential review paused.");
        break;
      }
      const file = allFiles[i];
      if (!file) continue;

      setSelectedPath(file.path);
      await handleReviewSingleFile(file, true);

      // Brief pause between requests to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    setIsBatchRunning(false);
    toast.success("Completed sequential review process!");
  };

  const handleApplyFix = async (findingId: string, filePath: string) => {
    if (!review) return;
    const finding = review.findings.find((f) => f.id === findingId);
    if (!finding) return;

    setApplyingId(findingId);
    try {
      const targetPath = filePath || activeFile?.path || "";
      const currentFileCode = fileContentCache[targetPath] || (activeFile?.path === targetPath ? currentCode : "");

      const res = await applyAndSaveProjectPatch({
        projectId: id,
        filePath: targetPath,
        diff: finding.diff,
        originalCode: currentFileCode,
        project,
        queryClient,
      });

      if (res.success) {
        // Update local file code cache
        fileContentCacheRef.current[targetPath] = res.newContent;
        setFileContentCache((prev) => ({ ...prev, [targetPath]: res.newContent }));

        // Update finding status to applied
        const updatedFindings: ReviewFinding[] = review.findings.map((f) =>
          f.id === findingId ? { ...f, status: "applied" as const } : f,
        );
        const updatedReview: CodeReview = { ...review, findings: updatedFindings };
        queryClient.setQueryData(["dev", "review", id], updatedReview);
        if (typeof window !== "undefined") {
          localStorage.setItem(`project_review_${id}`, JSON.stringify(updatedReview));
        }

        toast.success("Fix applied & saved!", {
          description: `Patched issue in ${targetPath} and updated project file.`,
        });
      } else {
        toast.error("Could not apply fix", { description: res.message });
      }
    } catch (err: any) {
      toast.error("Failed to apply patch", { description: err?.message || "Unknown error" });
    } finally {
      setApplyingId(null);
    }
  };

  const handleIgnore = (findingId: string, title: string) => {
    if (!review) return;
    const updatedFindings: ReviewFinding[] = review.findings.map((f) =>
      f.id === findingId ? { ...f, status: "ignored" as const } : f,
    );
    const updatedReview: CodeReview = { ...review, findings: updatedFindings };
    queryClient.setQueryData(["dev", "review", id], updatedReview);
    if (typeof window !== "undefined") {
      localStorage.setItem(`project_review_${id}`, JSON.stringify(updatedReview));
    }
    toast("Finding ignored", { description: title });
  };

  if (isProjectLoading || isReviewLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const reviewedCount = Object.keys(reviewedFiles).filter((p) => allFiles.some((f) => f.path === p)).length;
  const isCurrentReviewed = activeFile ? Boolean(reviewedFiles[activeFile.path]) : false;

  return (
    <div className="space-y-6">
      {/* Top File Navigation & Control Bar */}
      <Panel
        title="File-by-File Code Review"
        description="Inspect and review each source file individually with AI engineering agents."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isBatchRunning ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  stopBatchRef.current = true;
                }}
                className="gap-1.5 h-8 text-xs"
              >
                <Square className="size-3.5 fill-current" /> Stop Review
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReviewAllSequentially}
                disabled={isReviewingCurrent || allFiles.length === 0}
                className="gap-1.5 h-8 text-xs"
                title="Automatically inspects one file after another"
              >
                <Play className="size-3.5" /> Review All One-by-One
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => activeFile && handleReviewSingleFile(activeFile)}
              disabled={isReviewingCurrent || isBatchRunning || !activeFile}
              className="gap-1.5 h-8 text-xs"
            >
              {isReviewingCurrent ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Reviewing file...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  {isCurrentReviewed ? "Re-review this file" : "Review this file"}
                </>
              )}
            </Button>
          </div>
        }
      >
        {/* Navigation row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            {/* Previous File Button */}
            <Button
              variant="outline"
              size="sm"
              disabled={activeIndex <= 0 || isBatchRunning}
              onClick={() => {
                if (activeIndex > 0 && allFiles[activeIndex - 1]) {
                  setSelectedPath(allFiles[activeIndex - 1]!.path);
                }
              }}
              className="h-8 gap-1 text-xs"
            >
              <ChevronLeft className="size-3.5" /> Prev
            </Button>

            {/* File Selector Dropdown */}
            <div className="min-w-[240px] max-w-[360px]">
              <Select
                value={selectedPath}
                onValueChange={(val) => {
                  setSelectedPath(val);
                }}
                disabled={isBatchRunning}
              >
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue placeholder="Select file to review" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {allFiles.map((file, idx) => {
                    const hasFindings = (review?.findings || []).some((f) => {
                      const p = (f.file || "").toLowerCase();
                      return p.endsWith(file.name.toLowerCase());
                    });
                    const isDone = reviewedFiles[file.path];

                    return (
                      <SelectItem key={file.id || file.path} value={file.path} className="text-xs font-mono">
                        <span className="flex items-center gap-2">
                          <span className="text-muted-foreground">{idx + 1}.</span>
                          <span className="truncate">{file.path}</span>
                          {isDone ? (
                            hasFindings ? (
                              <span className="size-1.5 rounded-full bg-amber-400 shrink-0" />
                            ) : (
                              <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                            )
                          ) : (
                            <span className="size-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Next File Button */}
            <Button
              variant="outline"
              size="sm"
              disabled={activeIndex >= allFiles.length - 1 || isBatchRunning}
              onClick={() => {
                if (activeIndex < allFiles.length - 1 && allFiles[activeIndex + 1]) {
                  setSelectedPath(allFiles[activeIndex + 1]!.path);
                }
              }}
              className="h-8 gap-1 text-xs"
            >
              Next <ChevronRight className="size-3.5" />
            </Button>
          </div>

          {/* Progress stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              File <strong>{activeIndex + 1}</strong> of <strong>{allFiles.length}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <FileCheck2 className="size-3.5 text-emerald-400" />
              Reviewed: <strong>{reviewedCount}</strong>/{allFiles.length}
            </span>
          </div>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <Button
                key={f}
                size="sm"
                variant={severity === f ? "default" : "ghost"}
                onClick={() => setSeverity(f)}
                className="h-7 text-xs capitalize px-2.5"
              >
                {f}
              </Button>
            ))}
          </div>

          {activeFile && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                {activeFile.language || detectLanguage(activeFile.name)}
              </Badge>
              {isCurrentReviewed ? (
                <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs gap-1">
                  <Check className="size-3" /> Reviewed
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-xs">
                  Pending review
                </Badge>
              )}
            </div>
          )}
        </div>
      </Panel>

      {/* Main Grid: Code Preview & File Findings with Independent Scrolling */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
        {/* Left: Active File Code Preview */}
        <Panel
          title={activeFile?.path || "Source Code"}
          description={activeFile?.language || "Preview file contents for this step"}
          className="flex flex-col h-[calc(100vh-270px)] min-h-[520px] p-5"
          actions={
            <div className="flex items-center gap-2">
              {project?.repository?.provider === "github" && activeFile?.path && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <a
                    href={`https://github.com/${project.repository.fullName}/blob/${project.repository.branch || "main"}/${activeFile.path}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="size-3" /> View on GitHub
                  </a>
                </Button>
              )}
            </div>
          }
        >
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {isLoadingFileContent ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground gap-2">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-xs font-medium">Fetching file content from GitHub...</p>
              </div>
            ) : currentCode ? (
              <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border bg-muted/40 p-4">
                <pre className="font-mono text-xs leading-6 select-text whitespace-pre">
                  <code>{currentCode}</code>
                </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground">
                <FileCode className="size-8 opacity-40 mb-2" />
                <p className="text-xs">No code content available for {activeFile?.name}.</p>
              </div>
            )}
          </div>
        </Panel>

        {/* Right: AI Findings for this specific file with Independent Scrolling */}
        <div className="flex flex-col h-[calc(100vh-270px)] min-h-[520px] overflow-y-auto pr-1.5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              AI Findings ({activeFileFindings.length})
            </h3>
            {activeFileFindings.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Filtered: {filteredFindings.length}
              </span>
            )}
          </div>

          {/* Finding Cards */}
          {isReviewingCurrent ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center">
              <Loader2 className="mx-auto size-8 animate-spin text-primary mb-3" />
              <h4 className="text-sm font-semibold">AI is analyzing {activeFile?.name}...</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Checking for logic flaws, security vulnerabilities, edge cases, and code style.
              </p>
            </div>
          ) : filteredFindings.length > 0 ? (
            <div className="space-y-3.5">
              {filteredFindings.map((f) => (
                <Panel key={f.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={f.severity} />
                        <Badge variant="secondary" className="text-[11px]">{f.category}</Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          line {f.line}
                        </span>
                        {f.status === "applied" && (
                          <Badge variant="outline" className="text-emerald-500 border-emerald-500/40 gap-1 text-[11px]">
                            <Check className="size-3" /> Applied
                          </Badge>
                        )}
                        {f.status === "ignored" && (
                          <Badge variant="outline" className="text-muted-foreground text-[11px]">
                            Ignored
                          </Badge>
                        )}
                      </div>
                      <h4 className="mt-2 text-sm font-semibold">{f.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{f.problem}</p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenFindingId(openFindingId === f.id ? null : f.id)}
                      className="h-7 text-xs"
                      aria-expanded={openFindingId === f.id}
                    >
                      {openFindingId === f.id ? "Hide details" : "View fix"}
                    </Button>
                  </div>

                  {openFindingId === f.id ? (
                    <div className="mt-4 space-y-3 border-t border-border pt-4">
                      <p className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">Impact: </span>
                        {f.impact}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">Recommendation: </span>
                        {f.recommendation}
                      </p>
                      <DiffView lines={f.diff} />
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          disabled={f.status === "applied" || applyingId === f.id}
                          onClick={() => handleApplyFix(f.id, f.file)}
                          className="h-7 text-xs gap-1.5"
                        >
                          {applyingId === f.id ? (
                            <>
                              <Loader2 className="size-3 animate-spin" />
                              Applying fix...
                            </>
                          ) : (
                            <>
                              <Check className="size-3" />
                              {f.status === "applied" ? "Applied" : "Apply fix"}
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={f.status === "ignored"}
                          onClick={() => handleIgnore(f.id, f.title)}
                          className="h-7 text-xs"
                        >
                          {f.status === "ignored" ? "Ignored" : "Ignore"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </Panel>
              ))}
            </div>
          ) : isCurrentReviewed ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center text-emerald-300">
              <CheckCircle2 className="mx-auto size-8 text-emerald-400 mb-2" />
              <h4 className="text-sm font-semibold">Clean File — No Issues Detected!</h4>
              <p className="mt-1 text-xs text-emerald-300/80 max-w-sm mx-auto">
                {activeFile?.name} follows security standards, clean code principles, and best practices.
              </p>
              {activeIndex < allFiles.length - 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (allFiles[activeIndex + 1]) {
                      setSelectedPath(allFiles[activeIndex + 1]!.path);
                    }
                  }}
                  className="mt-4 gap-1.5 h-8 text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20"
                >
                  Proceed to Next File <ChevronRight className="size-3.5" />
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <AlertCircle className="mx-auto size-8 text-muted-foreground/60 mb-2" />
              <h4 className="text-sm font-semibold">Ready for Review</h4>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                {activeFile?.name} has not been inspected yet. Click below to analyze this file individually.
              </p>
              <Button
                size="sm"
                onClick={() => activeFile && handleReviewSingleFile(activeFile)}
                className="mt-4 gap-1.5 h-8 text-xs"
              >
                <Sparkles className="size-3.5" /> Review {activeFile?.name}
              </Button>
            </div>
          )}

          {/* Next File Quick Navigator Footer */}
          {activeIndex < allFiles.length - 1 && (
            <div className="flex justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (allFiles[activeIndex + 1]) {
                    setSelectedPath(allFiles[activeIndex + 1]!.path);
                  }
                }}
                className="text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                Next file: {allFiles[activeIndex + 1]?.name} <ChevronRight className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
