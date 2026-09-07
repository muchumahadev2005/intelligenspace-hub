import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bot, Pause, Play, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAgent, useCalls } from "@/hooks/use-platform";
import { dateTime, duration, num } from "@/lib/format";

export const Route = createFileRoute("/agents/$id")({
  head: ({ params }) => {
    const agent = agents.find((a) => a.id === params.id);
    const title = agent ? `${agent.name} — AI Platform` : "Agent details — AI Platform";
    const description = agent
      ? `${agent.description} ${agent.type === "voice" ? "Voice" : "Chat"} agent on ${agent.model}, ${agent.successRate}% success across ${agent.calls} conversations.`
      : "Inspect configuration, performance and recent conversations for an AI agent.";
    const url = `https://intelligenspace-hub.lovable.app/agents/${params.id}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: AgentDetail,
});


function AgentDetail() {
  const { id } = Route.useParams();
  const { data: agent, isLoading, isError, refetch } = useAgent(id);
  const { data: calls } = useCalls();

  if (isLoading) return <AppShell><TableSkeleton /></AppShell>;
  if (isError || !agent)
    return (
      <AppShell>
        <ErrorState title="Agent not found" onRetry={() => refetch()} />
      </AppShell>
    );

  const agentCalls = (calls ?? []).filter((c) => c.agentId === agent.id).slice(0, 8);

  return (
    <AppShell>
      <Link to="/agents" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to agents
      </Link>

      <PageHeader
        eyebrow={agent.type === "voice" ? "Voice agent" : "Chat agent"}
        title={agent.name}
        description={agent.description}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                toast.success(agent.status === "active" ? "Agent paused" : "Agent resumed")
              }
            >
              {agent.status === "active" ? <Pause /> : <Play />}
              {agent.status === "active" ? "Pause" : "Resume"}
            </Button>
            <Button onClick={() => toast.success("Changes saved", { description: "Configuration updated." })}>
              <Save /> Save changes
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Status", <StatusBadge key="s" status={agent.status} />],
          ["Total calls", num(agent.calls)],
          ["Success rate", `${agent.successRate}%`],
          ["Phone number", agent.phoneNumber ?? "Not assigned"],
        ].map(([label, value], i) => (
          <div key={i} className="panel p-4">
            <p className="text-xs text-muted-foreground">{label as string}</p>
            <div className="mt-1.5 text-sm font-semibold">{value as never}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="calls">Recent calls</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-4">
          <div className="panel max-w-3xl space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Model</Label>
                <Input defaultValue={agent.model} />
              </div>
              <div className="space-y-2">
                <Label>Voice</Label>
                <Input defaultValue={agent.voice ?? "—"} />
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Input defaultValue={agent.language} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Greeting</Label>
              <Textarea rows={2} defaultValue={agent.greeting} />
            </div>
            <div className="space-y-2">
              <Label>System instructions</Label>
              <Textarea rows={8} defaultValue={agent.instructions} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tone</Label>
                <Input defaultValue={agent.tone} />
              </div>
              <div className="space-y-2">
                <Label>Personality</Label>
                <Input defaultValue={agent.personality} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tools" className="mt-4">
          <div className="panel p-6">
            <p className="text-sm text-muted-foreground">Actions this agent can perform mid-conversation.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {agent.tools.map((tool) => (
                <Badge key={tool} variant="secondary" className="gap-1.5">
                  <Bot className="size-3.5" /> {tool}
                </Badge>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calls" className="mt-4">
          <div className="panel divide-y divide-border">
            {agentCalls.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No calls handled yet.</p>
            ) : (
              agentCalls.map((call) => (
                <Link
                  key={call.id}
                  to="/calls/$id"
                  params={{ id: call.id }}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{call.customer}</p>
                    <p className="text-xs text-muted-foreground">{call.intent}</p>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">{dateTime(call.startedAt)}</span>
                  <span className="text-xs text-muted-foreground">{duration(call.durationSeconds)}</span>
                  <StatusBadge status={call.status} />
                </Link>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
