import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { AudioLines, Download, Play, Square, Search, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRecordings } from "@/hooks/use-platform";
import { dateTime, duration } from "@/lib/format";
import type { Call } from "@/types";

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
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [activeSpeechIndex, setActiveSpeechIndex] = useState<number>(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  const stopPlayback = () => {
    isCancelledRef.current = true;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingCallId(null);
    setActiveSpeechIndex(-1);
  };

  const playRecording = (call: Call) => {
    if (playingCallId === call.id) {
      stopPlayback();
      return;
    }

    stopPlayback();
    isCancelledRef.current = false;
    setPlayingCallId(call.id);

    // If there is an external audio URL
    if (call.recordingUrl) {
      const audio = new Audio(call.recordingUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setPlayingCallId(null);
      };
      audio.onerror = () => {
        toast.error("Audio playback error", { description: "Could not load audio file." });
        setPlayingCallId(null);
      };
      audio.play().catch(() => {
        toast.error("Playback blocked", { description: "Please interact with the page first." });
        setPlayingCallId(null);
      });
      return;
    }

    // Fallback: Speak conversation transcript using Web Speech Synthesis
    const transcript = call.transcript || [];
    if (!transcript.length) {
      toast.info("No audio available", { description: "This call has no recorded transcript lines." });
      setPlayingCallId(null);
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Audio playback unsupported", { description: "Your browser does not support speech playback." });
      setPlayingCallId(null);
      return;
    }

    toast.success("Playing call conversation", { description: `${call.agentName} · ${call.reference}` });

    let index = 0;

    const playNextTurn = () => {
      if (isCancelledRef.current || index >= transcript.length) {
        setPlayingCallId(null);
        setActiveSpeechIndex(-1);
        return;
      }

      const item = transcript[index];
      if (!item) {
        setPlayingCallId(null);
        setActiveSpeechIndex(-1);
        return;
      }
      setActiveSpeechIndex(index);

      const utterance = new SpeechSynthesisUtterance(item.text);
      const isAgent = item.speaker === "agent" || item.speaker === call.agentName || item.speaker?.toLowerCase().includes("ai");
      utterance.pitch = isAgent ? 1.05 : 0.95;
      utterance.rate = 1.0;

      utterance.onend = () => {
        if (!isCancelledRef.current) {
          index++;
          setTimeout(playNextTurn, 400);
        }
      };

      utterance.onerror = () => {
        if (!isCancelledRef.current) {
          index++;
          setTimeout(playNextTurn, 200);
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    playNextTurn();
  };

  const downloadRecording = (call: Call) => {
    const lines = [
      `======================================================`,
      `INTELLIGENSPACE HUB — CALL RECORDING ARCHIVE`,
      `======================================================`,
      `Reference   : ${call.reference}`,
      `Date        : ${dateTime(call.startedAt)}`,
      `Customer    : ${call.customer} (${call.customerNumber || "Web Browser"})`,
      `Agent       : ${call.agentName}`,
      `Duration    : ${duration(call.durationSeconds)}`,
      `Sentiment   : ${call.sentiment}`,
      `Summary     : ${call.summary || "N/A"}`,
      `======================================================`,
      `TRANSCRIPT:`,
      `======================================================`,
    ];

    if (call.transcript && call.transcript.length > 0) {
      call.transcript.forEach((t) => {
        lines.push(`[${t.speaker}]: ${t.text}`);
      });
    } else {
      lines.push(`(No transcript recorded)`);
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recording-${call.reference}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Recording downloaded", { description: `${call.reference}.txt` });
  };

  const recordings = (data ?? []).filter((c) =>
    `${c.customer} ${c.agentName} ${c.reference} ${c.summary}`.toLowerCase().includes(query.toLowerCase()),
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
          {recordings.map((call) => {
            const isPlaying = playingCallId === call.id;
            const previewSnippet = call.transcript?.[call.transcript.length - 1]?.text || call.summary;

            return (
              <div
                key={call.id}
                className={`panel flex flex-col gap-3 p-5 transition-all ${
                  isPlaying ? "border-primary/50 shadow-md shadow-primary/10 ring-1 ring-primary/20" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{call.customer}</p>
                    <p className="text-xs text-muted-foreground">{call.agentName} · {call.reference}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isPlaying && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
                        <Volume2 className="size-3 animate-pulse" /> Playing
                      </span>
                    )}
                    <StatusBadge status={call.sentiment} />
                  </div>
                </div>

                {/* Animated Audio Waveform & Preview */}
                <div className="relative flex flex-col justify-center rounded-lg border border-border/40 bg-secondary/40 p-3 min-h-16">
                  {isPlaying ? (
                    <div className="flex items-center justify-center gap-1 h-8">
                      {[40, 70, 90, 45, 80, 100, 60, 85, 50, 95, 75, 40, 85, 65].map((h, i) => (
                        <div
                          key={i}
                          className="w-1 bg-primary rounded-full animate-pulse"
                          style={{
                            height: `${h}%`,
                            animationDelay: `${(i % 5) * 120}ms`,
                            animationDuration: "800ms",
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="line-clamp-2 text-xs text-muted-foreground italic">
                      "{previewSnippet || "Conversation recorded and saved."}"
                    </p>
                  )}
                  {isPlaying && activeSpeechIndex >= 0 && Boolean(call.transcript?.[activeSpeechIndex]) && (
                    <p className="mt-2 text-center text-[11px] text-foreground font-medium truncate">
                      <span className="text-primary uppercase tracking-wider text-[10px] mr-1">
                        {call.transcript?.[activeSpeechIndex]?.speaker}:
                      </span>
                      {call.transcript?.[activeSpeechIndex]?.text}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{dateTime(call.startedAt)}</span>
                  <span>{duration(call.durationSeconds)}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={isPlaying ? "destructive" : "default"}
                    onClick={() => playRecording(call)}
                  >
                    {isPlaying ? (
                      <>
                        <Square className="size-3.5 fill-current" /> Stop
                      </>
                    ) : (
                      <>
                        <Play className="size-3.5 fill-current" /> Play
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadRecording(call)}>
                    <Download className="size-3.5" /> Download
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/calls/$id" params={{ id: call.id }}>Transcript</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
