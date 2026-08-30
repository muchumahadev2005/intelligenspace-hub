import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AudioLines, Download, Play, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRecordings } from "@/hooks/use-platform";
import { dateTime, duration } from "@/lib/format";

export const Route = createFileRoute("/recordings")({
  head: () => ({
    meta: [
      { title: "Recordings — AI Platform" },
      { name: "description", content: "Listen back to recorded AI conversations with transcripts and downloadable audio." },
      { property: "og:title", content: "Recordings — AI Platform" },
      { property: "og:description", content: "Archive of recorded AI agent conversations." },
    ],
  }),
  component: RecordingsPage,
});

function RecordingsPage() {
  const { data, isLoading, isError, refetch } = useRecordings();
  const [query, setQuery] = useState("");

  const recordings = (data ?? []).filter((c) =>
    `${c.customer} ${c.agentName} ${c.reference}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operations"
        title="Recordings"
        description="Every recorded conversation, ready to review, share or download."
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search recordings…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search recordings"
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : recordings.length === 0 ? (
        <EmptyState icon={AudioLines} title="No recordings" description="Recorded calls will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recordings.map((call) => (
            <div key={call.id} className="panel flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{call.customer}</p>
                  <p className="text-xs text-muted-foreground">{call.agentName} · {call.reference}</p>
                </div>
                <StatusBadge status={call.sentiment} />
              </div>
              <div className="h-10 rounded-md bg-secondary/70" aria-hidden />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{dateTime(call.startedAt)}</span>
                <span>{duration(call.durationSeconds)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => toast.success("Playing recording", { description: call.reference })}>
                  <Play /> Play
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast.success("Download started")}>
                  <Download /> Download
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/calls/$id" params={{ id: call.id }}>Transcript</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
