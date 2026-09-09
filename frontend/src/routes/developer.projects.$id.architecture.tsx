import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles, Network, Layers, Database, ArrowRight, Server, Shield, Cpu } from "lucide-react";
import { Panel } from "@/components/developer/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useArchitecture, useProject } from "@/hooks/use-developer";
import { useDeveloperModel } from "@/hooks/use-developer-model";
import { devApi } from "@/services/developer-api";
import { getProjectCodeFiles } from "@/lib/github-tree";

export const Route = createFileRoute("/developer/projects/$id/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture — Developer AI" },
      { name: "description", content: "AI architecture analysis, component graphs, scaling and database schemas." },
      { property: "og:title", content: "Architecture — Developer AI" },
      { property: "og:description", content: "AI architecture blueprint and system topology." },
    ],
  }),
  component: ArchitecturePage,
});

function ArchitecturePage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: project } = useProject(id);
  const { data: arch, isLoading } = useArchitecture(id);
  const { selectedModel, assertCanRun, invalidateQuota } = useDeveloperModel();
  const [running, setRunning] = useState(false);

  const files = useMemo(() => getProjectCodeFiles(project, id), [project, id]);

  const nodes = arch?.nodes || [];
  const rows = nodes.length ? Math.max(...nodes.map((n) => n.row || 0)) + 1 : 0;

  const handleReanalyze = async () => {
    if (!assertCanRun()) return;

    setRunning(true);
    const toastId = toast.loading(`Synthesizing system architecture with ${selectedModel.name}...`, {
      description: "Evaluating component graphs, database schemas, and service boundaries.",
    });

    try {
      const filePaths = files.map((f) => f.path);
      const prompt =
        arch?.prompt ||
        `Architecture blueprint for ${project?.name || id}: system diagram, microservices, database entities, and API endpoints based on repository structure.`;
      const updated = await devApi.architecture.run(id, prompt, filePaths, selectedModel.id);
      invalidateQuota();

      queryClient.setQueryData(["dev", "architecture", id], updated);
      toast.success("Architecture analysis completed", {
        id: toastId,
        description: `Generated ${updated.nodes?.length || 0} system components and ${updated.endpoints?.length || 0} endpoints.`,
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

  if (!arch && !isLoading) {
    return (
      <div className="space-y-6">
        <Panel
          title="Architecture Blueprint"
          description="Inspect high-level architecture, module graphs, and system design."
        >
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
              <Network className="size-6" />
            </div>
            <h3 className="text-base font-semibold">Generate Architecture Blueprint</h3>
            <p className="mt-1.5 text-xs text-muted-foreground max-w-md">
              Let the AI architect agent analyze your {files.length > 0 ? `${files.length} project files` : "repository"}{" "}
              to map out system components, database schemas, microservice boundaries, and communication flows.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              <Button onClick={handleReanalyze} disabled={running} className="gap-2">
                {running ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Synthesizing Architecture...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Synthesize Architecture Blueprint
                  </>
                )}
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Panel
        title="System Diagram & Microservices"
        description={arch?.prompt || "Architecture blueprint synthesized from source files"}
        actions={
          <Button size="sm" onClick={handleReanalyze} disabled={running} className="gap-1.5 text-xs">
            {running ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                Re-analyze Architecture
              </>
            )}
          </Button>
        }
      >
        <div className="space-y-4">
          {Array.from({ length: rows || 1 }, (_, row) => (
            <div key={row} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {nodes
                .filter((n) => (n.row ?? 0) === row)
                .sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
                .map((n) => (
                  <div key={n.id} className="rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40">
                    <div className="flex items-center gap-2 mb-1">
                      <Server className="size-3.5 text-primary" />
                      <p className="text-sm font-medium">{n.label}</p>
                    </div>
                    {n.sublabel ? <p className="text-xs text-muted-foreground">{n.sublabel}</p> : null}
                  </div>
                ))}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1.5">
          <Layers className="size-3.5" />
          {(arch?.edges || []).length} connections between {nodes.length} components across {files.length} repository files.
        </p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        {arch?.stack && arch.stack.length > 0 && (
          <Panel title="Technology Stack Decisions">
            <ul className="divide-y divide-border">
              {arch.stack.map((s, idx) => (
                <li key={idx} className="py-3 text-xs">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="font-semibold text-foreground">{s.layer}</span>
                    <Badge variant="secondary">{s.choice}</Badge>
                  </div>
                  <p className="text-muted-foreground">{s.reason}</p>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {arch?.endpoints && arch.endpoints.length > 0 && (
          <Panel title="Core API Endpoints">
            <ul className="divide-y divide-border">
              {arch.endpoints.map((ep, idx) => (
                <li key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="outline"
                      className={
                        ep.method === "GET"
                          ? "text-blue-400 border-blue-500/30"
                          : ep.method === "POST"
                          ? "text-emerald-400 border-emerald-500/30"
                          : ep.method === "DELETE"
                          ? "text-destructive border-destructive/30"
                          : "text-amber-400 border-amber-500/30"
                      }
                    >
                      {ep.method}
                    </Badge>
                    <span className="font-mono text-foreground truncate">{ep.path}</span>
                  </div>
                  <span className="text-muted-foreground truncate">{ep.purpose}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {arch?.entities && arch.entities.length > 0 && (
          <Panel title="Database Entities & Models">
            <div className="grid gap-3 sm:grid-cols-2">
              {arch.entities.map((e, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-card/40 p-3 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-foreground mb-2">
                    <Database className="size-3.5 text-primary" />
                    {e.name}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {e.fields?.map((f, fIdx) => (
                      <Badge key={fIdx} variant="secondary" className="text-[10px] font-mono">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {arch?.scaling && arch.scaling.length > 0 && (
          <Panel title="Scaling & Security Blueprint">
            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Scalability Strategies
                </span>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {arch.scaling.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Cpu className="size-3.5 text-primary mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {arch.security && arch.security.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Security Architecture
                  </span>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {arch.security.map((sec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Shield className="size-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{sec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
