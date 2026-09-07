import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { DiffView, Panel, SeverityBadge } from "@/components/developer/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { useCodeReview } from "@/hooks/use-developer";
import { relative } from "@/lib/format";
import type { Severity } from "@/types/developer";

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

function ReviewPage() {
  const { id } = Route.useParams();
  const { data: review, isLoading } = useCodeReview(id);
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading || !review) return <Skeleton className="h-96 w-full" />;

  const findings = review.findings.filter((f) => severity === "all" || f.severity === severity);

  return (
    <div className="space-y-6">
      <Panel
        title={`${review.type} · ${review.filesReviewed} files reviewed`}
        description={`Run ${relative(review.createdAt)}`}
        actions={
          <Button size="sm" onClick={() => toast.success("Review re-run queued", { description: "Results refresh shortly." })}>
            Run review
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
                    <span className="text-foreground">Impact: </span>
                    {f.impact}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground">Recommendation: </span>
                    {f.recommendation}
                  </p>
                  <DiffView lines={f.diff} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => toast.success("Fix applied", { description: f.file })}>
                      Apply fix
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toast("Finding ignored", { description: f.title })}>
                      Ignore
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
