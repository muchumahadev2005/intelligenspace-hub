import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import { useTemplates } from "@/hooks/use-platform";
import type { AgentType } from "@/types";

export const Route = createFileRoute("/agents/new")({
  head: () => ({
    meta: [
      { title: "Create agent — AI Platform" },
      { name: "description", content: "Guided wizard to configure a new AI voice or chat agent." },
      { property: "og:title", content: "Create agent — AI Platform" },
      { property: "og:description", content: "Name, train and launch a new AI agent in minutes." },
    ],
  }),
  component: NewAgentPage,
});

const steps = ["Basics", "Personality", "Capabilities", "Review"];
const toolOptions = [
  "Book appointment",
  "Look up order",
  "Take payment link",
  "Transfer to human",
  "Send SMS follow-up",
  "Create support ticket",
];

function NewAgentPage() {
  const navigate = useNavigate();
  const { data: templates } = useTemplates();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "voice",
    language: "en-IN",
    model: "openrouter/free",
    voice: "Meera",
    tone: "Warm and professional",
    greeting: "Hi, thanks for calling! How can I help you today?",
    instructions: "",
    tools: ["Book appointment"] as string[],
    recording: true,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const templateId = new URLSearchParams(window.location.search).get("templateId");
    if (templateId && templates) {
      const t = templates.find((item) => item.id === templateId);
      if (t) {
        setForm((f) => ({
          ...f,
          name: t.name,
          description: t.description,
          type: t.type || "voice",
          model: t.model || "openai/gpt-4o-mini",
          tone: t.tone || "Warm and professional",
          greeting: t.greeting || f.greeting,
          instructions: t.instructions || f.instructions,
          tools: t.tools && t.tools.length > 0 ? t.tools : f.tools,
        }));
      }
    }
  }, [templates]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canContinue = step !== 0 || form.name.trim().length > 1;

  const submit = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      await api.agents.create({
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type as AgentType,
        status: "active",
        language: form.language,
        model: form.model || "openai/gpt-4o-mini",
        voice: form.voice,
        tone: form.tone,
        greeting: form.greeting,
        instructions: form.instructions,
        tools: form.tools,
      });
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent created", { description: `${form.name} is now active and ready.` });
      void navigate({ to: "/agents" });
    } catch (err: any) {
      toast.error("Failed to create agent", { description: err.message || "An error occurred" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Agents"
        title="Create a new agent"
        description="Four quick steps to configure how your agent sounds, thinks and acts."
      />

      <ol className="flex flex-wrap items-center gap-3">
        {steps.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full border text-xs font-medium",
                i < step && "border-primary bg-primary/15 text-primary",
                i === step && "border-primary bg-primary text-primary-foreground",
                i > step && "border-border text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("text-sm", i === step ? "text-foreground" : "text-muted-foreground")}>
              {label}
            </span>
            {i < steps.length - 1 ? <span className="hidden h-px w-8 bg-border sm:block" /> : null}
          </li>
        ))}
      </ol>

      <div className="panel max-w-3xl space-y-5 p-6">
        {step === 0 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Agent name</Label>
              <Input
                id="name"
                placeholder="Front desk receptionist"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Short description</Label>
              <Input
                id="description"
                placeholder="Answers inbound calls and books appointments"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voice">Voice</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="both">Both (Voice & Chat)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={form.language} onValueChange={(v) => set("language", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-IN">English (India)</SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="hi-IN">Hindi</SelectItem>
                    <SelectItem value="es-ES">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select value={form.model} onValueChange={(v) => set("model", v)}>
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
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Voice</Label>
                <Select value={form.voice} onValueChange={(v) => set("voice", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Meera">Meera — warm, Indian English</SelectItem>
                    <SelectItem value="Arjun">Arjun — confident, neutral</SelectItem>
                    <SelectItem value="Nova">Nova — bright, US English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Input id="tone" value={form.tone} onChange={(e) => set("tone", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="greeting">Greeting</Label>
              <Textarea id="greeting" rows={3} value={form.greeting} onChange={(e) => set("greeting", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">System instructions</Label>
              <Textarea
                id="instructions"
                rows={6}
                placeholder="Describe how the agent should behave, what it must never do, and how to escalate."
                value={form.instructions}
                onChange={(e) => set("instructions", e.target.value)}
              />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="space-y-3">
              <Label>Tools the agent can use</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {toolOptions.map((tool) => {
                  const on = form.tools.includes(tool);
                  return (
                    <button
                      key={tool}
                      type="button"
                      onClick={() =>
                        set("tools", on ? form.tools.filter((t) => t !== tool) : [...form.tools, tool])
                      }
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                        on ? "border-primary/50 bg-primary/10 text-foreground" : "border-border hover:bg-accent",
                      )}
                      aria-pressed={on}
                    >
                      {tool}
                      {on ? <Check className="size-4 text-primary" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Record calls</p>
                <p className="text-xs text-muted-foreground">Store audio and transcripts for review.</p>
              </div>
              <Switch checked={form.recording} onCheckedChange={(v) => set("recording", v)} />
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Name", form.name || "—"],
              ["Description", form.description || "—"],
              ["Channel", form.type],
              ["Language", form.language],
              ["Model", form.model],
              ["Voice", form.voice],
              ["Tone", form.tone],
              ["Tools", form.tools.join(", ") || "None"],
              ["Recording", form.recording ? "Enabled" : "Disabled"],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-lg border border-border p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            variant="ghost"
            onClick={() => (step === 0 ? navigate({ to: "/agents" }) : setStep(step - 1))}
          >
            <ArrowLeft /> {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < steps.length - 1 ? (
            <Button disabled={!canContinue} onClick={() => setStep(step + 1)}>
              Continue <ArrowRight />
            </Button>
          ) : (
            <Button onClick={submit} disabled={saving || !form.name.trim()}>
              <Check /> {saving ? "Creating…" : "Create agent"}
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
