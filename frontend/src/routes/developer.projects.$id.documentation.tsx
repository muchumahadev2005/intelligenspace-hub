import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { CodeBlock, Panel } from "@/components/developer/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/states";
import { useDocumentation, useProject } from "@/hooks/use-developer";
import { devApi } from "@/services/developer-api";
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
  const queryClient = useQueryClient();
  const { data: project } = useProject(id);
  const { data: docs = [], isLoading } = useDocumentation(id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (docs.length === 0) return <EmptyState title="No documents yet" description="Generate a README to get started." />;

  const active = docs.find((d) => d.id === activeId) ?? docs[0]!;

  const handleGenerateDocs = async () => {
    setRunning(true);
    const toastId = toast.loading(`Generating ${active.kind} with AI...`, {
      description: "Extracting interfaces, routes, and installation guides.",
    });

    try {
      const codeSnippet = `// Project ${project?.name || id}\n// Framework: ${project?.framework || "React + Express"}\n// Generate markdown documentation for ${active.kind}`;
      const newDoc = await devApi.documentation.generate(id, codeSnippet, active.kind);
      const updatedDocs = [newDoc, ...docs.filter((d) => d.id !== newDoc.id && d.kind !== newDoc.kind)];
      queryClient.setQueryData(["dev", "docs", id], updatedDocs);
      setActiveId(newDoc.id);
      toast.success("Documentation generated", {
        id: toastId,
        description: `Successfully generated ${newDoc.kind}.`,
      });
    } catch (err: any) {
      console.error("Documentation generation failed", err);
      toast.error("Failed to generate documentation", {
        id: toastId,
        description: err?.message || "Please check backend connection.",
      });
    } finally {
      setRunning(false);
    }
  };

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
          className="mt-4 w-full gap-1.5"
          disabled={running}
          onClick={handleGenerateDocs}
        >
          {running ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" />
              Generate docs
            </>
          )}
        </Button>
      </Panel>

      <Panel title={active.kind} description={`Updated ${relative(active.updatedAt)}`}>
        <CodeBlock code={active.content} />
      </Panel>
    </div>
  );
}
