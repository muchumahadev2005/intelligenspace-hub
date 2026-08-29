import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Download, PhoneCall, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCalls } from "@/hooks/use-platform";
import { dateTime, duration, money } from "@/lib/format";

export const Route = createFileRoute("/calls/")({
  head: () => ({
    meta: [
      { title: "Calls — AI Platform" },
      { name: "description", content: "Browse every AI-handled call with transcripts, outcomes and sentiment." },
      { property: "og:title", content: "Calls — AI Platform" },
      { property: "og:description", content: "Searchable call history with transcripts and outcomes." },
    ],
  }),
  component: CallsPage,
});

function CallsPage() {
  const { data, isLoading, isError, refetch } = useCalls();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [direction, setDirection] = useState("all");

  const calls = (data ?? []).filter(
    (c) =>
      (status === "all" || c.status === status) &&
      (direction === "all" || c.direction === direction) &&
      `${c.customer} ${c.reference} ${c.agentName} ${c.intent}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operations"
        title="Call history"
        description="Every inbound and outbound conversation your agents handled."
        actions={
          <Button variant="outline" onClick={() => toast.success("Export queued", { description: "CSV will be emailed shortly." })}>
            <Download /> Export CSV
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by customer, reference or agent…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search calls" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="voicemail">Voicemail</SelectItem>
          </SelectContent>
        </Select>
        <Select value={direction} onValueChange={setDirection}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Direction" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All calls</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : calls.length === 0 ? (
        <EmptyState icon={PhoneCall} title="No calls found" description="Adjust your filters to see more conversations." />
      ) : (
        <div className="panel overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Agent</TableHead>
                <TableHead className="hidden lg:table-cell">Intent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Duration</TableHead>
                <TableHead className="hidden xl:table-cell">Started</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => (
                <TableRow key={call.id} className="cursor-pointer">
                  <TableCell>
                    <Link to="/calls/$id" params={{ id: call.id }} className="block">
                      <span className="font-medium">{call.customer}</span>
                      <span className="block text-xs text-muted-foreground">{call.reference} · {call.direction}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{call.agentName}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{call.intent}</TableCell>
                  <TableCell><StatusBadge status={call.status} /></TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{duration(call.durationSeconds)}</TableCell>
                  <TableCell className="hidden xl:table-cell text-muted-foreground">{dateTime(call.startedAt)}</TableCell>
                  <TableCell className="text-right">{money(call.cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
