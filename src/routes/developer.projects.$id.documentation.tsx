import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CodeBlock, Panel } from "@/components/developer/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { useDocumentation } from "@/hooks/use-developer";
import { relative } from "@/lib/format";

export const Route = createFileRoute("/developer/projects/$id/documentation")({
  head: () => ({
    meta: [
      { title: "Documentation — Developer AI" },
      { name: "description", content: "Generated READMEs, API references, setup and deployment guides." },
      { property: "og:title", content: "Documentation — Developer AI" },
      { property: "og:description", content: "AI-written docs kept in sync with the codebase." },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  const { id } = Route.useParams();
  const { data: docs, isLoading } = useDocumentation(id);
  const [activeId, setActiveId] = useState<string | null>(null);

  if (isLoading || !docs) return <Skeleton className="h-96 w-full" />;
  if (docs.length === 0) return <EmptyState title="No documents yet" description="Generate a README to get started." />;

  const active = docs.find((d) => d.id === activeId) ?? docs[0]!;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <Panel title="Documents">
        <ul className="space-y-1">
          {docs.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => setActiveId(d.id)}
                className={
                  d.id === active.id
                    ? "w-full rounded-md bg-primary/12 px-3 py-2 text-left text-xs text-primary"
                    : "w-full rounded-md px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent"
                }
              >
                <span className="block font-medium">{d.kind}</span>
                <span className="block text-[11px] opacity-70">Updated {relative(d.updatedAt)}</span>
              </button>
            </li>
          ))}
        </ul>
        <Button
          size="sm"
          className="mt-4 w-full"
          onClick={() => toast.success("Documentation generated", { description: "Docs refreshed from the latest code." })}
        >
          Generate docs
        </Button>
      </Panel>

      <Panel title={active.kind} description={`Updated ${relative(active.updatedAt)}`}>
        <CodeBlock code={active.content} />
      </Panel>
    </div>
  );
}
