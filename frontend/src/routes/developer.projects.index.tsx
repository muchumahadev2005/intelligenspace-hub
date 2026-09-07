import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderGit2, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { CardsSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { ScoreBar } from "@/components/developer/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/hooks/use-developer";
import { relative } from "@/lib/format";

export const Route = createFileRoute("/developer/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — Developer AI" },
      {
        name: "description",
        content: "Every repository connected to the Developer AI workspace with quality, security and coverage scores.",
      },
      { property: "og:title", content: "Projects — Developer AI" },
      { property: "og:description", content: "Connected repositories and their AI health scores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { data, isLoading, isError, refetch } = useProjects();
  const [q, setQ] = useState("");
  const projects = (data ?? []).filter((p) =>
    `${p.name} ${p.repository.fullName} ${p.language}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Developer AI"
        title="Projects"
        description="Connect a repository to unlock every AI engineering agent for that codebase."
        actions={
          <Button asChild>
            <Link to={"/developer/projects/new" as "/"}>
              <Plus /> New project
            </Link>
          </Button>
        }
      />

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search projects…"
          className="pl-9"
          aria-label="Search projects"
        />
      </div>

      <div className="mt-6">
        {isLoading ? (
          <CardsSkeleton count={3} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderGit2}
            title="No projects found"
            description="Connect a repository to start using the AI engineering agents."
            action={
              <Button asChild size="sm">
                <Link to={"/developer/projects/new" as "/"}>Connect repository</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                to={"/developer/projects/$id" as "/"}
                params={{ id: p.id } as never}
                className="panel p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold">{p.name}</h2>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {p.repository.fullName}
                    </p>
                  </div>
                  <Badge variant="secondary">{p.framework}</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                <div className="mt-4 space-y-2.5">
                  <ScoreBar label="Code quality" value={p.codeQuality} />
                  <ScoreBar label="Security" value={p.security} />
                  <ScoreBar label="Coverage" value={p.coverage} />
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground">
                  Analysed {relative(p.lastAnalyzedAt)} · {p.repository.branch}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
