import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — AI Platform" },
      {
        name: "description",
        content: "Set up your workspace, pick a use case and launch your first AI voice agent in minutes.",
      },
      { property: "og:title", content: "Get started — AI Platform" },
      { property: "og:description", content: "Three quick steps to your first voice agent." },
    ],
  }),
  component: OnboardingPage,
});

const steps = ["Workspace", "Use case", "First agent"];
const useCases = [
  { id: "reception", label: "Reception & routing", desc: "Answer, qualify and transfer inbound calls." },
  { id: "booking", label: "Appointment booking", desc: "Fill the calendar without a receptionist." },
  { id: "orders", label: "Order taking", desc: "Capture food and retail orders over the phone." },
  { id: "support", label: "Customer support", desc: "Resolve FAQs and escalate the rest." },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [workspace, setWorkspace] = useState("Acme Labs");
  const [useCase, setUseCase] = useState("reception");
  const [agentName, setAgentName] = useState("Receptionist AI");

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }
    toast.success("Workspace ready", { description: `${agentName} is set up and ready to test.` });
    navigate({ to: "/" });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center p-6">
      <p className="text-eyebrow">Getting started</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Launch your first agent</h1>

      <ol className="mt-6 flex items-center gap-3">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full border text-xs font-medium",
                i <= step ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn("text-xs", i <= step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
          </li>
        ))}
      </ol>

      <div className="panel mt-6 space-y-5 p-6">
        {step === 0 ? (
          <div className="space-y-2">
            <Label htmlFor="ws">What should we call your workspace?</Label>
            <Input id="ws" value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
          </div>
        ) : step === 1 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {useCases.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setUseCase(u.id)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  useCase === u.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                )}
                aria-pressed={useCase === u.id}
              >
                <p className="text-sm font-medium">{u.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{u.desc}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="agent">Name your first agent</Label>
            <Input id="agent" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              You can refine the voice, prompt and tools right after setup.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => (step === 0 ? navigate({ to: "/" }) : setStep(step - 1))}>
          <ArrowLeft /> {step === 0 ? "Skip" : "Back"}
        </Button>
        <Button onClick={next}>
          {step === steps.length - 1 ? "Finish setup" : "Continue"} <ArrowRight />
        </Button>
      </div>
    </main>
  );
}
