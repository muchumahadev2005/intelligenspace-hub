import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
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
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "voice",
    language: "en-IN",
    model: "aurora-voice-1",
    voice: "Meera",
    tone: "Warm and professional",
    greeting: "Hi, thanks for calling! How can I help you today?",
    instructions: "",
    tools: ["Book appointment"] as string[],
    recording: true,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canContinue = step !== 0 || form.name.trim().length > 1;

  const submit = () => {
    toast.success("Agent created", { description: `${form.name} is ready to take calls.` });
    void navigate({ to: "/agents" });
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
                <Label>Model</Label>
                <Select value={form.model} onValueChange={(v) => set("model", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aurora-voice-1">aurora-voice-1</SelectItem>
                    <SelectItem value="aurora-voice-mini">aurora-voice-mini</SelectItem>
                    <SelectItem value="aurora-chat-1">aurora-chat-1</SelectItem>
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
            <Button onClick={submit}>
              <Check /> Create agent
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
