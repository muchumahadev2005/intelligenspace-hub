import { createFileRoute } from "@tanstack/react-router";
import { Phone, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePhoneNumbers } from "@/hooks/use-platform";
import { money } from "@/lib/format";

export const Route = createFileRoute("/phone-numbers")({
  head: () => ({
    meta: [
      { title: "Phone numbers — AI Platform" },
      { name: "description", content: "Provision and assign phone numbers so your voice agents can take and place calls." },
      { property: "og:title", content: "Phone numbers — AI Platform" },
      { property: "og:description", content: "Manage the numbers routed to your AI voice agents." },
    ],
  }),
  component: PhoneNumbersPage,
});

function PhoneNumbersPage() {
  const { data, isLoading, isError, refetch } = usePhoneNumbers();
  const numbers = data ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Agents"
        title="Phone numbers"
        description="Numbers routed to your voice agents, with capabilities and monthly cost."
        actions={
          <Button onClick={() => toast.success("Number reserved", { description: "Assign it to an agent to go live." })}>
            <Plus /> Buy number
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : numbers.length === 0 ? (
        <EmptyState icon={Phone} title="No numbers yet" description="Buy a number to start receiving calls." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {numbers.map((n) => (
            <div key={n.id} className="panel flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold tabular-nums">{n.number}</p>
                  <p className="text-xs text-muted-foreground">{n.region}, {n.country}</p>
                </div>
                <StatusBadge status={n.status} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {n.capabilities.map((c) => (
                  <Badge key={c} variant="secondary">{c}</Badge>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {n.assignedAgentName ?? "Unassigned"}
                </span>
                <span className="font-medium">{money(n.monthlyCost)}/mo</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-auto"
                onClick={() => toast.success("Routing updated", { description: n.number })}
              >
                Manage routing
              </Button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
