import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bot,
  Copy,
  MessageSquare,
  Mic,
  MicOff,
  Pause,
  Phone,
  PhoneOff,
  Play,
  Radio,
  RotateCcw,
  Save,
  Sparkles,
  Volume2,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgent, useCalls } from "@/hooks/use-platform";
import { dateTime, duration, num } from "@/lib/format";
import { api } from "@/services/api";
import type { Agent, AgentType } from "@/types";

export const Route = createFileRoute("/agents/$id")({
  head: ({ params }) => {
    const title = `Agent Details · ${params.id} — AI Platform`;
    const description = "Inspect configuration, performance and recent conversations for an AI agent.";
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

function AgentLiveChat({ agent }: { agent: Agent }) {
  const storageKey = `intelligenspace_agent_chat_${agent.id}`;

  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`intelligenspace_agent_chat_${agent.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [{ role: "assistant", content: agent.greeting || "Hello! How can I help you today?" }];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync to localStorage whenever messages change
  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [storageKey, messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const clearChat = () => {
    const initial = [{ role: "assistant" as const, content: agent.greeting || "Hello! How can I help you today?" }];
    setMessages(initial);
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
    toast.success("Chat history cleared");
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: "user" as const, content: input.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await api.agents.chat(agent.id, newHistory);
      setMessages([...newHistory, { role: "assistant", content: res.reply }]);
    } catch (err: any) {
      toast.error("Chat error", { description: err.message || "Failed to reach agent" });
      setMessages([
        ...newHistory,
        { role: "assistant", content: "I am having trouble connecting to the AI service right now. Please check your backend connection." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel flex h-[520px] max-w-3xl flex-col overflow-hidden">
      <div className="border-b border-border bg-muted/30 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Bot className="size-5 text-primary" />
            <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
          </div>
          <div>
            <p className="text-sm font-semibold">{agent.name} — Live Agent Chat</p>
            <p className="text-xs text-muted-foreground">{agent.model} · {agent.language}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
            title="Reset conversation"
          >
            <RotateCcw className="size-3" /> Clear chat
          </Button>
          <Badge variant="outline" className="text-xs gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live AI Engine
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-start gap-2.5 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div className={`size-7 rounded-full flex items-center justify-center text-xs shrink-0 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {m.role === "user" ? "You" : "AI"}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted/70 text-foreground border border-border/50 rounded-tl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            {agent.name} is thinking…
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={sendMessage} className="border-t border-border p-3 flex gap-2 bg-background/80">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Talk to ${agent.name}…`}
          disabled={loading}
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}

function AgentLiveVoiceCall({ agent }: { agent: Agent }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"idle" | "active" | "ended">("idle");
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [speakerStatus, setSpeakerStatus] = useState("Ready to start call");
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState<Array<{ role: string; content: string }>>([]);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const conversationHistoryRef = useRef<Array<{ role: string; content: string }>>([]);
  const durationRef = useRef<number>(0);
  const isMutedRef = useRef<boolean>(false);
  const statusRef = useRef<string>("idle");

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    clearInterval(timerRef.current);
  };

  const speakText = (text: string, onDone?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onDone?.();
      return;
    }

    setIsAiSpeaking(true);
    setSpeakerStatus(`${agent.name} is speaking…`);

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\*\*/g, "").replace(/#/g, "").replace(/[•\*]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const voiceMatch = voices.find(
      (v) =>
        v.lang.includes(agent.language || "en") ||
        v.name.toLowerCase().includes(agent.voice?.toLowerCase() || "") ||
        v.lang.includes("en-US") ||
        v.lang.includes("en-GB")
    );
    if (voiceMatch) utterance.voice = voiceMatch;

    utterance.onend = () => {
      setIsAiSpeaking(false);
      setSpeakerStatus("Listening to you… 🎙️");
      onDone?.();
    };

    utterance.onerror = () => {
      setIsAiSpeaking(false);
      setSpeakerStatus("Listening to you… 🎙️");
      onDone?.();
    };

    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (typeof window === "undefined" || isMutedRef.current || statusRef.current !== "active") return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeakerStatus("Voice active (Speech recognition requires Chrome or Edge)");
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }

      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = agent.language?.includes("in") ? "en-IN" : "en-US";

      rec.onstart = () => {
        setSpeakerStatus("Listening to your microphone… 🎙️");
      };

      rec.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (final) {
          rec.stop();
          handleUserMessage(final.trim());
        }
      };

      rec.onerror = (err: any) => {
        if (err.error === "not-allowed") {
          toast.error("Microphone permission denied");
        }
      };

      rec.onend = () => {
        if (statusRef.current === "active" && !isAiSpeaking && !isMutedRef.current) {
          setTimeout(() => {
            if (statusRef.current === "active" && !isMutedRef.current) {
              try { rec.start(); } catch {}
            }
          }, 300);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUserMessage = async (userText: string) => {
    if (!userText.trim()) return;

    const newHistory = [...conversationHistoryRef.current, { role: "user", content: userText }];
    conversationHistoryRef.current = newHistory;
    setTranscript(newHistory);
    setSpeakerStatus(`${agent.name} is thinking… 🧠`);

    try {
      const res = await api.agents.chat(agent.id, newHistory);
      const reply = res.reply || "I am here to help. What would you like to know?";

      const updatedHistory = [...newHistory, { role: "assistant", content: reply }];
      conversationHistoryRef.current = updatedHistory;
      setTranscript(updatedHistory);

      speakText(reply, () => {
        startListening();
      });
    } catch (err: any) {
      toast.error("AI Response error", { description: err.message });
      speakText("I had trouble hearing that. Could you please repeat?", () => {
        startListening();
      });
    }
  };

  const startVoiceCall = async () => {
    setStatus("active");
    statusRef.current = "active";
    setTranscript([]);
    setDuration(0);
    durationRef.current = 0;
    conversationHistoryRef.current = [];

    timerRef.current = setInterval(() => {
      setDuration((d) => {
        durationRef.current = d + 1;
        return d + 1;
      });
    }, 1000);

    toast.success(`Voice call connected!`, { description: `Speaking with ${agent.name}.` });

    const greeting = agent.greeting || `Hello! I am ${agent.name}. How can I help you today?`;
    const initialHistory = [{ role: "assistant", content: greeting }];
    conversationHistoryRef.current = initialHistory;
    setTranscript(initialHistory);

    speakText(greeting, () => {
      startListening();
    });
  };

  const endVoiceCall = async () => {
    cleanupAudio();
    setStatus("ended");
    statusRef.current = "ended";

    if (conversationHistoryRef.current.length > 0) {
      try {
        await api.calls.logCall({
          agentId: agent.id,
          customer: "Admin User",
          durationSeconds: durationRef.current,
          transcript: conversationHistoryRef.current.map((m) => ({
            speaker: m.role === "user" ? "You" : agent.name,
            text: m.content,
          })),
          summary: `Browser voice call with ${conversationHistoryRef.current.length} messages.`,
          sentiment: "positive",
          intent: "Browser Voice Session",
        });
        queryClient.invalidateQueries({ queryKey: ["calls"] });
        toast.info("Call saved to history", { description: "Transcript and duration saved to database." });
      } catch (e) {
        console.error("Failed to log call:", e);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      toast.info("Microphone muted");
    } else {
      toast.info("Microphone active");
      startListening();
    }
  };

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60).toString().padStart(2, "0");
    const secs = (s % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <div className="panel flex h-[540px] max-w-3xl flex-col overflow-hidden">
      {/* Top Header */}
      <div className="border-b border-border bg-muted/30 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Radio className="size-5 text-emerald-500 animate-pulse" />
            <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
          </div>
          <div>
            <p className="text-sm font-semibold">{agent.name} — Direct Browser Voice Call</p>
            <p className="text-xs text-muted-foreground">
              Native Web Audio · Voice: {agent.voice || "Natural"} · {agent.language || "en"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === "active" && (
            <Badge variant="outline" className="text-xs gap-1 font-mono text-emerald-500 border-emerald-500/40 bg-emerald-500/10">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              LIVE {formatTimer(duration)}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs gap-1">
            <Sparkles className="size-3 text-primary" /> Live AI Engine
          </Badge>
        </div>
      </div>

      {/* Main Calling Stage */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
        {status === "idle" && (
          <div className="max-w-md space-y-4">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary shadow-lg ring-8 ring-primary/5">
              <Phone className="size-9" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Speak Live with {agent.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your microphone will connect directly inside your browser. Talk normally and {agent.name} will reply in real-time with voice.
              </p>
            </div>
            <Button size="lg" className="gap-2 text-sm px-6 shadow-md" onClick={startVoiceCall}>
              <Mic className="size-4" /> Start Voice Call
            </Button>
          </div>
        )}

        {status === "active" && (
          <div className="w-full flex-1 flex flex-col justify-between items-center py-2">
            {/* Pulsing Audio Sphere */}
            <div className="space-y-2">
              <div
                className={`relative mx-auto flex size-24 items-center justify-center rounded-full transition-all duration-300 shadow-2xl ${
                  isAiSpeaking
                    ? "bg-amber-500/20 text-amber-400 ring-8 ring-amber-500/15 scale-110"
                    : "bg-emerald-500/15 text-emerald-400 ring-8 ring-emerald-500/10"
                }`}
              >
                <Volume2 className={`size-10 ${isAiSpeaking ? "animate-bounce" : ""}`} />
                <span
                  className={`absolute inset-0 rounded-full border-2 animate-ping opacity-75 ${
                    isAiSpeaking ? "border-amber-500" : "border-emerald-500"
                  }`}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{speakerStatus}</p>
                <p className="font-mono text-lg text-emerald-500 font-bold">{formatTimer(duration)}</p>
              </div>
            </div>

            {/* Live Subtitle Transcript */}
            <div className="w-full max-w-xl max-h-36 overflow-y-auto rounded-xl bg-muted/40 p-3 border border-border/60 text-left space-y-1.5 my-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Live Transcript</p>
              {transcript.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">Start speaking into your microphone…</p>
              ) : (
                transcript.map((t, i) => (
                  <div key={i} className="text-xs leading-relaxed">
                    <strong className={t.role === "assistant" ? "text-primary" : "text-foreground"}>
                      {t.role === "assistant" ? agent.name : "You"}:{" "}
                    </strong>
                    <span>{t.content}</span>
                  </div>
                ))
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                size="lg"
                className={`gap-2 ${isMuted ? "bg-amber-500/20 text-amber-400 border-amber-500/40" : ""}`}
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                {isMuted ? "Unmute Mic" : "Mute Mic"}
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="gap-2 px-6"
                onClick={endVoiceCall}
              >
                <PhoneOff className="size-4" /> End Call
              </Button>
            </div>
          </div>
        )}

        {status === "ended" && (
          <div className="space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <PhoneOff className="size-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Call Completed ({formatTimer(duration)})</h3>
              <p className="text-xs text-muted-foreground mt-1">
                The call transcript and duration have been saved to your Calls history.
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Button onClick={startVoiceCall} className="gap-2">
                <Mic className="size-4" /> Call Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentDetail() {
  const { id } = Route.useParams();
  const { data: agent, isLoading, isError, refetch } = useAgent(id);
  const { data: calls } = useCalls();

  const [testMode, setTestMode] = useState<"voice" | "chat">("voice");
  const [type, setType] = useState<AgentType>("both");
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [voice, setVoice] = useState("");
  const [language, setLanguage] = useState("en");
  const [greeting, setGreeting] = useState("");
  const [instructions, setInstructions] = useState("");
  const [tone, setTone] = useState("");
  const [personality, setPersonality] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (agent) {
      const aType = (agent.type as AgentType) || "both";
      setType(aType);
      if (aType === "chat") {
        setTestMode("chat");
      } else {
        setTestMode("voice");
      }
      setModel(agent.model || "openai/gpt-4o-mini");
      setVoice(agent.voice ?? "");
      setLanguage(agent.language || "en");
      setGreeting(agent.greeting || "");
      setInstructions(agent.instructions || "");
      setTone(agent.tone || "");
      setPersonality(agent.personality || "");
    }
  }, [agent]);

  if (isLoading) return <AppShell><TableSkeleton /></AppShell>;
  if (isError || !agent)
    return (
      <AppShell>
        <ErrorState title="Agent not found" onRetry={() => refetch()} />
      </AppShell>
    );

  const agentCalls = (calls ?? []).filter((c) => c.agentId === agent.id).slice(0, 8);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.agents.update(agent.id, {
        type,
        model,
        voice,
        language,
        greeting,
        instructions,
        tone,
        personality,
      });
      await refetch();
      toast.success("Changes saved", { description: "Agent configuration updated in database." });
    } catch (err: any) {
      toast.error("Save failed", { description: err.message || "Failed to update agent" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = agent.status === "active" ? "paused" : "active";
    try {
      await api.agents.update(agent.id, { status: newStatus });
      await refetch();
      toast.success(newStatus === "active" ? "Agent resumed" : "Agent paused");
    } catch (err: any) {
      toast.error("Status update failed", { description: err.message });
    }
  };

  return (
    <AppShell>
      <Link to="/agents" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to agents
      </Link>

      <PageHeader
        eyebrow={
          agent.type === "both"
            ? "Voice & Chat agent"
            : agent.type === "chat"
              ? "Chat agent"
              : "Voice agent"
        }
        title={agent.name}
        description={agent.description}
        actions={
          <>
            <Button variant="outline" onClick={handleToggleStatus}>
              {agent.status === "active" ? <Pause /> : <Play />}
              {agent.status === "active" ? "Pause" : "Resume"}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save /> {saving ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      />

      {/* ── Agent ID Quick Copy Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Agent ID</span>
          <code className="rounded-md bg-muted px-2.5 py-1 font-mono text-xs font-semibold text-foreground select-all">
            {agent.id}
          </code>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => {
              navigator.clipboard.writeText(agent.id);
              toast.success("Agent ID copied to clipboard!", { description: agent.id });
            }}
          >
            <Copy className="size-3.5" /> Copy ID
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use in your website widget or API requests: <code className="font-mono text-foreground text-[11px]">/api/v1/agents/{agent.id.slice(0, 8)}…/chat</code>
        </p>
      </div>

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

      <Tabs defaultValue="test">
        <TabsList>
          <TabsTrigger value="test" className="gap-1.5">
            <MessageSquare className="size-3.5" /> Test Agent (Live)
          </TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="calls">Recent calls</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="mt-4 space-y-3">
          {agent.type === "both" && (
            <div className="flex items-center gap-2 max-w-3xl">
              <Button
                size="sm"
                variant={testMode === "voice" ? "default" : "outline"}
                onClick={() => setTestMode("voice")}
                className="gap-2 text-xs"
              >
                <Mic className="size-3.5 text-emerald-400" /> Direct Voice Call (Mic & Speaker)
              </Button>
              <Button
                size="sm"
                variant={testMode === "chat" ? "default" : "outline"}
                onClick={() => setTestMode("chat")}
                className="gap-2 text-xs"
              >
                <MessageSquare className="size-3.5" /> Text Chat
              </Button>
            </div>
          )}

          {(agent.type === "voice" || (agent.type === "both" && testMode === "voice")) && (
            <AgentLiveVoiceCall agent={agent} />
          )}

          {(agent.type === "chat" || (agent.type === "both" && testMode === "chat")) && (
            <AgentLiveChat agent={agent} />
          )}
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <div className="panel max-w-3xl space-y-5 p-6">
            {/* Agent ID Field in Configuration */}
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5 space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Agent ID (for Website & API Integration)</Label>
              <div className="flex gap-2">
                <Input value={agent.id} readOnly className="font-mono text-xs bg-muted/40 cursor-text select-all" />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5 shrink-0 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(agent.id);
                    toast.success("Agent ID copied to clipboard!", { description: agent.id });
                  }}
                >
                  <Copy className="size-3.5" /> Copy ID
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Paste this ID into your external website or script to connect directly to this agent.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={type} onValueChange={(v) => setType(v as AgentType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voice">Voice</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="both">Both (Voice & Chat)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openrouter/free">Free Auto Router</SelectItem>
                    <SelectItem value="google/gemma-4-31b-it:free">Gemma 4 31B Instruct</SelectItem>
                    <SelectItem value="nvidia/nemotron-3.5-lightning:free">Nemotron 3.5 Lightning</SelectItem>
                    <SelectItem value="cohere/north-mini-code:free">North Mini Code</SelectItem>
                    <SelectItem value="poolside/laguna-s-2.1:free">Laguna S 2.1</SelectItem>
                    <SelectItem value="nex-agi/nex-n2.5-pro:free">Nex-N2.5 Pro</SelectItem>
                    <SelectItem value="liquid/lfm-2.5-2.6b:free">LiquidAI LFM 2.6B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Voice</Label>
                <Input value={voice} onChange={(e) => setVoice(e.target.value)} placeholder="e.g. Meera" />
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Greeting</Label>
              <Textarea rows={2} value={greeting} onChange={(e) => setGreeting(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>System instructions</Label>
              <Textarea rows={8} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tone</Label>
                <Input value={tone} onChange={(e) => setTone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Personality</Label>
                <Input value={personality} onChange={(e) => setPersonality(e.target.value)} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tools" className="mt-4">
          <div className="panel p-6">
            <p className="text-sm text-muted-foreground">Actions this agent can perform mid-conversation.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {agent.tools.map((tool: string) => (
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
