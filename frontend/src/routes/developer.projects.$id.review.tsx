import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles, Check, CheckCircle2, RefreshCw } from "lucide-react";
import { DiffView, Panel, SeverityBadge } from "@/components/developer/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { useCodeReview, useProject } from "@/hooks/use-developer";
import { devApi } from "@/services/developer-api";
import { relative } from "@/lib/format";
import type { CodeReview, ProjectFile, ReviewFinding, Severity } from "@/types/developer";

export const Route = createFileRoute("/developer/projects/$id/review")({
  head: () => ({
    meta: [
      { title: "Code review — Developer AI" },
      { name: "description", content: "AI code review findings with severity, impact and suggested patches." },
      { property: "og:title", content: "Code review — Developer AI" },
      { property: "og:description", content: "Bugs, smells and risky patterns with ready-to-apply fixes." },
    ],
  }),
  component: ReviewPage,
});

const filters: (Severity | "all")[] = ["all", "critical", "high", "medium", "low"];

function flattenFiles(nodes: ProjectFile[]): ProjectFile[] {
  const list: ProjectFile[] = [];
  for (const node of nodes) {
    if (node.type === "file" && node.content) {
      list.push(node);
    }
    if (node.children) {
      list.push(...flattenFiles(node.children));
    }
  }
  return list;
}

function ReviewPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: project } = useProject(id);
  const { data: review, isLoading } = useCodeReview(id);

  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  if (isLoading || !review) return <Skeleton className="h-96 w-full" />;

  const handleRunReview = async () => {
    setIsRunning(true);
    const toastId = toast.loading("Analyzing codebase with AI...", {
      description: "Inspecting security, performance, and best practices.",
    });

    try {
      // 1. Gather all files (uploaded + project files)
      let customFiles: ProjectFile[] = [];
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(`project_custom_files_${id}`);
          if (raw) customFiles = JSON.parse(raw);
        } catch {}
      }

      const baseFiles = flattenFiles(project?.files || []);
      const allFiles = [...customFiles, ...baseFiles];

      let codeSnippet = "";
      if (allFiles.length > 0) {
        // Take up to 6 files to stay within comfortable token boundaries
        codeSnippet = allFiles
          .slice(0, 6)
          .map((f) => `// === File: ${f.path} ===\n${f.content || ""}`)
          .join("\n\n");
      } else {
        codeSnippet = `// Project ${project?.name || id}\n// Generic code snippet for review\nexport function checkout(cart) { return cart.total; }`;
      }

      const updatedReview = await devApi.review.run(
        id,
        codeSnippet,
        project?.language || "TypeScript",
        Math.max(1, allFiles.length),
      );

      // Update React Query state immediately
      queryClient.setQueryData(["dev", "review", id], updatedReview);

      toast.success("AI Code Review completed", {
        id: toastId,
        description: `Found ${updatedReview.findings.length} findings across ${updatedReview.filesReviewed} files.`,
      });
    } catch (err: any) {
      console.error("Code review failed", err);
      toast.error("Failed to run code review", {
        id: toastId,
        description: err?.message || "Please check your network and AI configuration.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleApplyFix = (findingId: string, file: string) => {
    if (!review) return;
    const updatedFindings: ReviewFinding[] = review.findings.map((f) =>
      f.id === findingId ? { ...f, status: "applied" as const } : f,
    );
    const updatedReview: CodeReview = { ...review, findings: updatedFindings };
    queryClient.setQueryData(["dev", "review", id], updatedReview);
    if (typeof window !== "undefined") {
      localStorage.setItem(`project_review_${id}`, JSON.stringify(updatedReview));
    }
    toast.success("Fix applied", { description: `Patched issue in ${file}` });
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

  const findings = review.findings.filter((f) => severity === "all" || f.severity === severity);

  return (
    <div className="space-y-6">
      <Panel
        title={`${review.type} · ${review.filesReviewed} files reviewed`}
        description={`Run ${relative(review.createdAt)}`}
        actions={
          <Button
            size="sm"
            onClick={handleRunReview}
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Analyzing code...
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                Run review
              </>
            )}
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={severity === f ? "default" : "outline"}
              onClick={() => setSeverity(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </Panel>

      {findings.length === 0 ? (
        <EmptyState title="No findings" description="Nothing matches this severity filter." />
      ) : (
        <div className="space-y-4">
          {findings.map((f) => (
            <Panel key={f.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={f.severity} />
                    <Badge variant="secondary">{f.category}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {f.file}:{f.line}
                    </span>
                    {f.status === "applied" && (
                      <Badge variant="outline" className="text-emerald-500 border-emerald-500/40 gap-1">
                        <Check className="size-3" /> Applied
                      </Badge>
                    )}
                    {f.status === "ignored" && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Ignored
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{f.problem}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenId(openId === f.id ? null : f.id)}
                  aria-expanded={openId === f.id}
                >
                  {openId === f.id ? "Hide details" : "View fix"}
                </Button>
              </div>

              {openId === f.id ? (
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
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={f.status === "applied"}
                      onClick={() => handleApplyFix(f.id, f.file)}
                      className="gap-1.5"
                    >
                      <Check className="size-3.5" />
                      {f.status === "applied" ? "Applied" : "Apply fix"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={f.status === "ignored"}
                      onClick={() => handleIgnore(f.id, f.title)}
                    >
                      {f.status === "ignored" ? "Ignored" : "Ignore"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
