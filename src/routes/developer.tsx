import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiKeys } from "@/hooks/use-platform";
import { dateTime, num, relative } from "@/lib/format";

export const Route = createFileRoute("/developer")({
  head: () => ({
    meta: [
      { title: "Developer — AI Platform" },
      {
        name: "description",
        content: "API keys, REST endpoints and usage limits for building on the AI Platform voice agent API.",
      },
      { property: "og:title", content: "Developer — AI Platform" },
      { property: "og:description", content: "Manage API keys and explore the voice agent REST API." },
    ],
  }),
  component: DeveloperPage,
});

const endpoints = [
  { method: "GET", path: "/v1/agents", desc: "List every agent in the workspace." },
  { method: "POST", path: "/v1/agents", desc: "Create a new voice agent." },
  { method: "POST", path: "/v1/calls", desc: "Place an outbound call with an agent." },
  { method: "GET", path: "/v1/calls/{id}", desc: "Fetch a call with transcript and summary." },
  { method: "GET", path: "/v1/orders", desc: "List orders captured by agents." },
  { method: "POST", path: "/v1/webhooks", desc: "Register a signed webhook endpoint." },
];

function DeveloperPage() {
  const { data, isLoading, isError, refetch } = useApiKeys();
  const [revealed, setRevealed] = useState<string | null>(null);
  const keys = data ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Platform"
        title="Developer"
        description="Keys, endpoints and quotas for the AI Platform API."
        actions={
          <Button
            onClick={() => {
              setRevealed(`sk_live_${Math.random().toString(36).slice(2)}`);
              toast.success("API key created", { description: "Copy it now — it won't be shown again." });
            }}
          >
            <Plus /> Create key
          </Button>
        }
      />

      {revealed ? (
        <div className="panel mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
          <code className="truncate font-mono text-xs">{revealed}</code>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              navigator.clipboard?.writeText(revealed);
              toast.success("Copied to clipboard");
            }}
          >
            <Copy /> Copy
          </Button>
        </div>
      ) : null}

      <Tabs defaultValue="keys" className="mt-6">
        <TabsList>
          <TabsTrigger value="keys">API keys</TabsTrigger>
          <TabsTrigger value="docs">Reference</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="mt-6">
          {isLoading ? (
            <TableSkeleton rows={4} />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : keys.length === 0 ? (
            <EmptyState icon={KeyRound} title="No API keys" description="Create a key to start calling the API." />
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Key</th>
                    <th className="p-4 font-medium">Scope</th>
                    <th className="p-4 font-medium">Requests (30d)</th>
                    <th className="p-4 font-medium">Last used</th>
                    <th className="p-4 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className="border-b border-border/60 last:border-0">
                      <td className="p-4 font-medium">{k.name}</td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">{k.maskedKey}</td>
                      <td className="p-4">
                        <Badge variant="secondary">{k.permission}</Badge>
                      </td>
                      <td className="p-4 tabular-nums">{num(k.requests30d)}</td>
                      <td className="p-4 text-muted-foreground">
                        {k.lastUsedAt ? relative(k.lastUsedAt) : "Never"}
                      </td>
                      <td className="p-4 text-muted-foreground">{dateTime(k.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="docs" className="mt-6 space-y-4">
          <div className="panel p-6">
            <p className="text-eyebrow mb-3">Authentication</p>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
{`curl https://api.aiplatform.dev/v1/agents \\
  -H "Authorization: Bearer sk_live_..."`}
            </pre>
          </div>
          <div className="panel divide-y divide-border">
            {endpoints.map((e) => (
              <div key={e.path + e.method} className="flex flex-wrap items-center gap-3 p-4">
                <Badge variant="secondary" className="font-mono">{e.method}</Badge>
                <code className="font-mono text-sm">{e.path}</code>
                <span className="text-xs text-muted-foreground">{e.desc}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
