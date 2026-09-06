import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { GitBranch, FolderGit2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { WorkspaceTabs } from "@/components/developer/workspace-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/hooks/use-developer";

export const Route = createFileRoute("/developer/projects/$id")({
  head: () => ({
    meta: [
      { title: "Project workspace — Developer AI" },
      {
        name: "description",
        content: "Review, debug, build, test, secure and document a connected repository with AI agents.",
      },
      { property: "og:title", content: "Project workspace — Developer AI" },
      { property: "og:description", content: "AI engineering agents scoped to a single repository." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectWorkspace,
});

function ProjectWorkspace() {
  const { id } = Route.useParams();
  const { data: project, isLoading, isError, refetch } = useProject(id);

  if (isError) {
    return (
      <AppShell>
        <ErrorState
          title="Project not found"
          description="This repository is no longer connected to the workspace."
          onRetry={() => void refetch()}
        />
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link to="/developer/projects">
              <FolderGit2 /> Back to projects
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {isLoading || !project ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <PageHeader
          eyebrow="Developer AI"
          title={project.name}
          description={project.description}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{project.language}</Badge>
              <Badge variant="secondary">{project.framework}</Badge>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <GitBranch className="size-3.5" aria-hidden />
                {project.repository.fullName} · {project.repository.branch}
              </span>
            </div>
          }
        />
      )}
      <WorkspaceTabs id={id} />
      <div className="mt-6">
        <Outlet />
      </div>
    </AppShell>
  );
}
