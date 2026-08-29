import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bot, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgents } from "@/hooks/use-platform";
import { num, relative } from "@/lib/format";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agents — AI Platform" },
      { name: "description", content: "Create, configure and monitor your AI voice and chat agents." },
      { property: "og:title", content: "Agents — AI Platform" },
      { property: "og:description", content: "Manage every AI voice and chat agent in your workspace." },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const { data, isLoading, isError, refetch } = useAgents();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");

  const agents = useMemo(
    () =>
      (data ?? []).filter(
        (a) =>
          (tab === "all" || a.status === tab) &&
          `${a.name} ${a.description} ${a.type}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [data, query, tab],
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Agents"
        title="Your AI agents"
        description="Voice and chat agents handling conversations for your business, 24/7."
        actions={
          <Button asChild>
            <Link to="/agents/new">
              <Plus /> New agent
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="paused">Paused</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search agents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search agents"
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : agents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No agents found"
          description="Try a different filter, or spin up a new agent from a template."
          action={
            <Button asChild size="sm">
              <Link to="/templates">Browse templates</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              to="/agents/$id"
              params={{ id: agent.id }}
              className="panel group flex flex-col gap-4 p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Bot className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{agent.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {agent.type} · {agent.model}
                    </p>
                  </div>
                </div>
                <StatusBadge status={agent.status} />
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{agent.description}</p>
              <div className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Calls</p>
                  <p className="font-medium">{num(agent.calls)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Success</p>
                  <p className="font-medium">{agent.successRate}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Active</p>
                  <p className="font-medium">{relative(agent.lastActiveAt)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
