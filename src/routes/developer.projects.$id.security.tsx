import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { DiffView, Panel, SeverityBadge } from "@/components/developer/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { useSecurityFindings } from "@/hooks/use-developer";
import type { Severity } from "@/types/developer";

export const Route = createFileRoute("/developer/projects/$id/security")({
  head: () => ({
    meta: [
      { title: "Security — Developer AI" },
      { name: "description", content: "Vulnerabilities, exposed secrets and dependency risks with remediation patches." },
      { property: "og:title", content: "Security — Developer AI" },
      { property: "og:description", content: "AI security scan results and fixes." },
    ],
  }),
  component: SecurityPage,
});

const filters: (Severity | "all")[] = ["all", "critical", "high", "medium", "low"];

function SecurityPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useSecurityFindings(id);
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;

  const findings = data.filter((f) => severity === "all" || f.severity === severity);
  const counts = (["critical", "high", "medium", "low"] as Severity[]).map((s) => ({
    s,
    n: data.filter((f) => f.severity === s).length,
  }));

  return (
    <div className="space-y-6">
      <Panel
        title="Security scan"
        description={`${data.length} findings across authentication, dependencies, secrets and configuration.`}
        actions={
          <Button size="sm" onClick={() => toast.success("Scan started", { description: "Results update shortly." })}>
            Run scan
          </Button>
        }
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          {counts.map((c) => (
            <div key={c.s} className="rounded-lg border border-border p-3">
              <p className="text-xl font-semibold tabular-nums">{c.n}</p>
              <p className="text-xs capitalize text-muted-foreground">{c.s}</p>
            </div>
          ))}
        </div>
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
                  <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setOpenId(openId === f.id ? null : f.id)}>
                  {openId === f.id ? "Hide" : "View fix"}
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
                  <Button size="sm" onClick={() => toast.success("Fix applied", { description: f.title })}>
                    Apply fix
                  </Button>
                </div>
              ) : null}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
