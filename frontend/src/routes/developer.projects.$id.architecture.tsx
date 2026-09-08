import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Panel } from "@/components/developer/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useArchitecture, useProject } from "@/hooks/use-developer";
import { devApi } from "@/services/developer-api";

export const Route = createFileRoute("/developer/projects/$id/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture — Developer AI" },
      { name: "description", content: "System design, data model, API surface, scaling and trade-offs for this project." },
      { property: "og:title", content: "Architecture — Developer AI" },
      { property: "og:description", content: "AI-generated system design and data model." },
    ],
  }),
  component: ArchitecturePage,
});

function ArchitecturePage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: project } = useProject(id);
  const { data: arch, isLoading } = useArchitecture(id);
  const [running, setRunning] = useState(false);

  if (isLoading || !arch) return <Skeleton className="h-96 w-full" />;

  const nodes = arch.nodes || [];
  const rows = nodes.length ? Math.max(...nodes.map((n) => n.row || 0)) + 1 : 0;

  const handleReanalyze = async () => {
    setRunning(true);
    const toastId = toast.loading("Synthesizing system architecture with AI...", {
      description: "Evaluating microservice boundaries, schemas, and scaling trade-offs.",
    });

    try {
      const prompt = arch.prompt || `Architecture analysis for ${project?.name || id}: full system diagram, microservices, and database model.`;
      const updated = await devApi.architecture.run(id, prompt);
      queryClient.setQueryData(["dev", "architecture", id], updated);
      toast.success("Architecture analysis refreshed", {
        id: toastId,
        description: `Generated ${updated.nodes?.length || 0} nodes and ${updated.edges?.length || 0} connections.`,
      });
    } catch (err: any) {
      console.error("Architecture analysis failed", err);
      toast.error("Failed to analyze architecture", {
        id: toastId,
        description: err?.message || "Please check backend connection.",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel
        title="System diagram"
        description={arch.prompt}
        actions={
          <Button size="sm" onClick={handleReanalyze} disabled={running} className="gap-1.5">
            {running ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                Analyze Architecture
              </>
            )}
          </Button>
        }
      >
        <div className="space-y-4">
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {nodes
                .filter((n) => n.row === row)
                .sort((a, b) => a.col - b.col)
                .map((n) => (
                  <div key={n.id} className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-sm font-medium">{n.label}</p>
                    {n.sublabel ? <p className="text-xs text-muted-foreground">{n.sublabel}</p> : null}
                  </div>
                ))}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          {(arch.edges || []).length} connections between {nodes.length} components.
        </p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Stack choices">
          <ul className="divide-y divide-border">
            {arch.stack.map((s) => (
              <li key={s.layer} className="py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{s.layer}</span>
                  <Badge variant="secondary">{s.choice}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.reason}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Components">
          <ul className="space-y-3">
            {arch.explanation.map((e) => (
              <li key={e.component}>
                <p className="text-sm font-medium">{e.component}</p>
                <p className="text-xs text-muted-foreground">{e.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Data model">
          <div className="space-y-4">
            {arch.entities.map((e) => (
              <div key={e.name} className="rounded-lg border border-border p-3">
                <p className="text-sm font-semibold">{e.name}</p>
                <ul className="mt-1 font-mono text-xs text-muted-foreground">
                  {e.fields.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="API endpoints">
          <ul className="divide-y divide-border">
            {arch.endpoints.map((e) => (
              <li key={`${e.method}${e.path}`} className="flex flex-wrap items-center gap-3 py-2.5 text-xs">
                <Badge variant="secondary">{e.method}</Badge>
                <span className="font-mono">{e.path}</span>
                <span className="text-muted-foreground">{e.purpose}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Scaling">
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
            {arch.scaling.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Panel>

        <Panel title="Security">
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
            {arch.security.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Trade-offs">
        <ul className="space-y-3">
          {arch.tradeoffs.map((t) => (
            <li key={t.option}>
              <p className="text-sm font-medium">{t.option}</p>
              <p className="text-xs text-muted-foreground">{t.detail}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
