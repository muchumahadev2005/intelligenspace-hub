import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Bot, Clock, CreditCard, PhoneCall, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { CardsSkeleton, ChartSkeleton, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { useActivity, useMetrics, useSeries } from "@/hooks/use-platform";
import { num, relative } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Platform" },
      {
        name: "description",
        content:
          "Monitor AI voice and chat agents, call volume, minutes and credits from one operations dashboard.",
      },
      { property: "og:title", content: "Dashboard — AI Platform" },
      {
        property: "og:description",
        content: "Real-time overview of your AI agents, calls and credits.",
      },
    ],
  }),
  component: Dashboard,
});

const ranges = [7, 30, 90] as const;

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-soft">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-muted-foreground">
          {p.dataKey}: <span className="text-foreground">{num(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function Dashboard() {
  const [range, setRange] = useState<(typeof ranges)[number]>(30);
  const metrics = useMetrics();
  const series = useSeries(range);
  const activity = useActivity();

  const data =
    series.data?.map((p) => ({ ...p, date: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) })) ??
    [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Overview"
        title="Operations dashboard"
        description="Live view of agent activity, call volume and credit consumption across your workspace."
        actions={
          <Button asChild>
            <Link to={"/agents/new" as "/"}>
              <Plus /> New agent
            </Link>
          </Button>
        }
      />

      {metrics.isLoading ? (
        <CardsSkeleton />
      ) : metrics.isError ? (
        <ErrorState onRetry={() => metrics.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active agents" value={metrics.data!.activeAgents} delta={metrics.data!.activeAgentsDelta} icon={Bot} />
          <StatCard label="Calls (30d)" value={num(metrics.data!.calls)} delta={metrics.data!.callsDelta} icon={PhoneCall} />
          <StatCard label="Minutes" value={num(metrics.data!.minutes)} delta={metrics.data!.minutesDelta} icon={Clock} />
          <StatCard label="Credits" value={num(metrics.data!.credits)} note={metrics.data!.creditsNote} icon={CreditCard} />
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Call volume</h2>
              <p className="text-xs text-muted-foreground">Calls handled per day</p>
            </div>
            <div className="flex rounded-lg border border-border p-0.5">
              {ranges.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    range === r ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}d
                </button>
              ))}
            </div>
          </div>
          {series.isLoading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="callsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" width={36} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="calls" stroke="var(--chart-1)" strokeWidth={2} fill="url(#callsFill)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-semibold">Credits burned</h2>
          <p className="mb-4 text-xs text-muted-foreground">Daily consumption</p>
          {series.isLoading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" minTickGap={30} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--grid-line)" }} />
                <Bar dataKey="credits" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="text-sm font-semibold">Recent activity</h2>
        <ul className="mt-4 divide-y divide-border">
          {activity.data?.map((item) => (
            <li key={item.id} className="flex items-start gap-3 py-3">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary live-dot" />
              <div className="min-w-0">
                <p className="text-sm text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">{relative(item.at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
