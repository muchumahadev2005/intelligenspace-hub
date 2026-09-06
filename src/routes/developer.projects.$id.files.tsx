import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock, FileTree, Panel } from "@/components/developer/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/hooks/use-developer";
import type { ProjectFile } from "@/types/developer";

export const Route = createFileRoute("/developer/projects/$id/files")({
  head: () => ({
    meta: [
      { title: "Files — Developer AI" },
      { name: "description", content: "Browse the repository file tree and read source files." },
      { property: "og:title", content: "Files — Developer AI" },
      { property: "og:description", content: "Repository file explorer with source preview." },
    ],
  }),
  component: FilesPage,
});

function firstFile(nodes: ProjectFile[]): ProjectFile | undefined {
  for (const n of nodes) {
    if (n.type === "file") return n;
    const found = n.children ? firstFile(n.children) : undefined;
    if (found) return found;
  }
  return undefined;
}

function FilesPage() {
  const { id } = Route.useParams();
  const { data: project, isLoading } = useProject(id);
  const [selected, setSelected] = useState<ProjectFile | null>(null);
  const active = useMemo(
    () => selected ?? (project ? (firstFile(project.files) ?? null) : null),
    [selected, project],
  );

  if (isLoading || !project) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <Panel title="Explorer" description={project.repository.fullName}>
        <FileTree files={project.files} activeId={active?.id} onSelect={setSelected} />
      </Panel>
      <Panel title={active?.path ?? "No file selected"} description={active?.language}>
        {active?.content ? (
          <CodeBlock code={active.content} />
        ) : (
          <p className="text-sm text-muted-foreground">Select a file to preview its contents.</p>
        )}
      </Panel>
    </div>
  );
}
