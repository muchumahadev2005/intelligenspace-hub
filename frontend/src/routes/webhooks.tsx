import { createFileRoute } from "@tanstack/react-router";
import { Plus, Send, Webhook } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWebhooks } from "@/hooks/use-platform";
import { relative } from "@/lib/format";

export const Route = createFileRoute("/webhooks")({
  head: () => ({
    meta: [
      { title: "Webhooks — AI Platform" },
      { name: "description", content: "Stream call, order and appointment events to your systems with signed webhook deliveries." },
      { property: "og:title", content: "Webhooks — AI Platform" },
      { property: "og:description", content: "Configure endpoints and inspect webhook delivery history." },
    ],
  }),
  component: WebhooksPage,
});

function WebhooksPage() {
  const { data, isLoading, isError, refetch } = useWebhooks();
  const endpoints = data ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Platform"
        title="Webhooks"
        description="Push agent events into your CRM, helpdesk or data warehouse."
        actions={
          <Button onClick={() => toast.success("Endpoint added", { description: "Signing secret generated." })}>
            <Plus /> Add endpoint
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : endpoints.length === 0 ? (
        <EmptyState icon={Webhook} title="No endpoints" description="Add an endpoint to start receiving events." />
      ) : (
        <div className="space-y-4">
          {endpoints.map((e) => (
            <div key={e.id} className="panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-medium">{e.url}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{e.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={e.status} />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.success("Test event sent", { description: "200 OK · 138ms" })}
                  >
                    <Send /> Send test
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {e.events.map((ev) => (
                  <Badge key={ev} variant="secondary" className="font-mono text-[11px]">{ev}</Badge>
                ))}
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                {e.successRate}% delivered over the last 30 days
              </p>

              <div className="mt-3 divide-y divide-border rounded-lg border border-border">
                {e.deliveries.slice(0, 4).map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-xs">
                    <span className="font-mono">{d.event}</span>
                    <StatusBadge status={d.state} />
                    <span className="text-muted-foreground">HTTP {d.statusCode}</span>
                    <span className="ml-auto text-muted-foreground">{d.durationMs}ms · {relative(d.at)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
