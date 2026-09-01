import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, PhoneCall, Timer, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { useMetrics, useSeries, useUsage } from "@/hooks/use-platform";
import { dateTime, num, rupees } from "@/lib/format";

export const Route = createFileRoute("/usage")({
  head: () => ({
    meta: [
      { title: "Usage & credits — AI Platform" },
      {
        name: "description",
        content: "Track voice minutes, call volume and credit consumption across your AI agent workspace.",
      },
      { property: "og:title", content: "Usage & credits — AI Platform" },
      { property: "og:description", content: "Monitor spend and top up workspace credits." },
    ],
  }),
  component: UsagePage,
});

function UsagePage() {
  const { data: metrics } = useMetrics();
  const { data: series } = useSeries(30);
  const { data, isLoading, isError, refetch } = useUsage();
  const records = data ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Platform"
        title="Usage & credits"
        description="Every minute, call and credit consumed by your agents."
        actions={
          <Button onClick={() => toast.success("Top-up started", { description: "Demo mode — no payment is processed." })}>
            <Wallet /> Top up credits
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Credit balance" value={rupees(metrics?.credits ?? 0)} note={metrics?.creditsNote ?? ""} icon={CreditCard} />
        <StatCard label="Calls this month" value={num(metrics?.calls ?? 0)} delta={metrics?.callsDelta ?? ""} icon={PhoneCall} />
        <StatCard label="Voice minutes" value={num(metrics?.minutes ?? 0)} delta={metrics?.minutesDelta ?? ""} icon={Timer} />
        <StatCard label="Avg. cost / call" value={rupees(4.6)} note="Last 30 days" icon={Wallet} />
      </div>

      <div className="panel mt-6 p-6">
        <p className="text-eyebrow mb-4">Credit burn — last 30 days</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series ?? []}>
              <defs>
                <linearGradient id="creditFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} minTickGap={28} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={36} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="credits" stroke="hsl(var(--primary))" fill="url(#creditFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Description</th>
                  <th className="p-4 font-medium">Usage</th>
                  <th className="p-4 font-medium text-right">Amount</th>
                  <th className="p-4 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="p-4 text-muted-foreground">{dateTime(r.date)}</td>
                    <td className="p-4 font-medium">{r.description}</td>
                    <td className="p-4 text-muted-foreground">{r.usage}</td>
                    <td className="p-4 text-right tabular-nums">{rupees(r.amount)}</td>
                    <td className="p-4 text-right tabular-nums text-muted-foreground">{rupees(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
