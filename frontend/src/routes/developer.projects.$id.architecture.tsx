import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "@/components/developer/ui";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useArchitecture } from "@/hooks/use-developer";

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
  const { data: arch, isLoading } = useArchitecture(id);

  if (isLoading || !arch) return <Skeleton className="h-96 w-full" />;

  const rows = Math.max(...arch.nodes.map((n) => n.row)) + 1;

  return (
    <div className="space-y-6">
      <Panel title="System diagram" description={arch.prompt}>
        <div className="space-y-4">
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {arch.nodes
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
          {arch.edges.length} connections between {arch.nodes.length} components.
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
