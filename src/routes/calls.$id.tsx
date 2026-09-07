import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Play, Share2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCall } from "@/hooks/use-platform";
import { dateTime, duration, money } from "@/lib/format";

export const Route = createFileRoute("/calls/$id")({
  head: ({ params }) => {
    const call = calls.find((c) => c.id === params.id);
    const title = call
      ? `Call ${call.reference} · ${call.customer} — AI Platform`
      : "Call detail — AI Platform";
    const description = call
      ? `${call.summary} ${call.direction} call handled by an AI agent.`
      : "Full transcript, sentiment, outcome and cost breakdown for a single AI-handled call.";
    const url = `https://intelligenspace-hub.lovable.app/calls/${params.id}`;
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
  component: CallDetail,
});


function CallDetail() {
  const { id } = Route.useParams();
  const { data: call, isLoading, isError, refetch } = useCall(id);

  if (isLoading) return <AppShell><TableSkeleton /></AppShell>;
  if (isError || !call)
    return (
      <AppShell>
        <ErrorState title="Call not found" onRetry={() => refetch()} />
      </AppShell>
    );

  return (
    <AppShell>
      <Link to="/calls" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to calls
      </Link>

      <PageHeader
        eyebrow={`${call.direction} call · ${call.reference}`}
        title={call.customer}
        description={call.summary}
        actions={
          <>
            <Button variant="outline" onClick={() => toast.success("Link copied", { description: "Share link valid for 7 days." })}>
              <Share2 /> Share
            </Button>
            {call.hasRecording ? (
              <Button onClick={() => toast.success("Playing recording")}>
                <Play /> Play recording
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Status", <StatusBadge key="s" status={call.status} />],
          ["Sentiment", <StatusBadge key="p" status={call.sentiment} />],
          ["Duration", duration(call.durationSeconds)],
          ["Started", dateTime(call.startedAt)],
          ["Cost", money(call.cost)],
        ].map(([label, value], i) => (
          <div key={i} className="panel p-4">
            <p className="text-xs text-muted-foreground">{label as string}</p>
            <div className="mt-1.5 text-sm font-semibold">{value as never}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel space-y-4 p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold">Transcript</h2>
          <div className="space-y-4">
            {call.transcript.map((line, i) => (
              <div key={i} className={cn("flex", line.speaker === "agent" ? "justify-start" : "justify-end")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-4 py-2.5 text-sm",
                    line.speaker === "agent"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary/10 text-foreground",
                  )}
                >
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {line.speaker} · {line.at}
                  </p>
                  {line.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel space-y-3 p-6">
            <h2 className="text-sm font-semibold">Details</h2>
            {[
              ["Agent", call.agentName],
              ["Intent", call.intent],
              ["Outcome", call.outcome],
              ["Customer number", call.customerNumber],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-right font-medium">{v}</span>
              </div>
            ))}
            <Link
              to="/agents/$id"
              params={{ id: call.agentId }}
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              View agent →
            </Link>
          </div>
          <div className="panel p-6">
            <h2 className="text-sm font-semibold">Recording</h2>
            {call.hasRecording ? (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => toast.success("Download started")}>
                <Download /> Download audio
              </Button>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No recording captured for this call.</p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
