import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Phone,
  PhoneCall,
  Sparkles,
  Clock,
  Globe,
  Bot,
  MessageSquare,
  ShieldCheck,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/phone-numbers")({
  head: () => ({
    meta: [
      { title: "Phone numbers — AI Platform (Coming Soon)" },
      { name: "description", content: "Provision and assign phone numbers so your voice agents can take and place calls." },
      { property: "og:title", content: "Phone numbers — AI Platform" },
      { property: "og:description", content: "Manage the numbers routed to your AI voice agents." },
    ],
  }),
  component: PhoneNumbersPage,
});

function PhoneNumbersPage() {
  const [email, setEmail] = useState("");
  const [isJoined, setIsJoined] = useState(false);

  const handleJoinWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setIsJoined(true);
    toast.success("You're on the waitlist!", {
      description: `We'll notify ${email} as soon as Phone Numbers are live.`,
    });
  };

  const upcomingFeatures = [
    {
      icon: Globe,
      title: "Global Numbers in 50+ Countries",
      description: "Instantly provision local, national, and toll-free numbers across US, India, UK, and worldwide.",
    },
    {
      icon: Bot,
      title: "Direct AI Agent Binding",
      description: "Route incoming and outbound mobile calls directly to your configured AI agents with zero latency.",
    },
    {
      icon: ShieldCheck,
      title: "Carrier-Grade SIP & WebRTC",
      description: "Enterprise telephony trunking with HD voice codecs, active spam protection, and failover routing.",
    },
    {
      icon: MessageSquare,
      title: "SMS & WhatsApp Follow-ups",
      description: "Automatically send order confirmations, booking links, and summaries immediately after each phone call.",
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Agents"
        title="Phone numbers"
        description="Physical carrier numbers routed to your voice agents, with smart IVR and capabilities."
        actions={
          <Badge
            variant="outline"
            className="border-primary/40 bg-primary/10 text-primary px-3 py-1 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
          >
            <Clock className="size-3 animate-spin" /> Coming Soon
          </Badge>
        }
      />

      {/* Main "This section will come soon" Banner Card */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card/90 via-card/70 to-primary/5 p-8 shadow-xl">
        <div className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 size-64 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            <span>Telephony Integration in Progress</span>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              This section will come soon! 📞
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              We are actively integrating direct carrier PSTN and SIP trunking. Soon, you will be able to buy real phone numbers, link your existing Twilio / Telnyx carriers, and make your voice agents dial and answer physical mobile phone calls automatically.
            </p>
          </div>

          {/* Waitlist Form */}
          {!isJoined ? (
            <form onSubmit={handleJoinWaitlist} className="flex flex-col sm:flex-row gap-2.5 max-w-md pt-2">
              <Input
                type="email"
                placeholder="Enter your email for early access…"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/80 border-border/80 focus-visible:ring-primary"
                required
              />
              <Button type="submit" className="shrink-0 gap-2">
                <Bell className="size-4" /> Notify Me
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary max-w-md">
              <CheckCircle2 className="size-5 shrink-0" />
              <span>You're on the early access list! We'll email you at launch.</span>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Features Grid */}
      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          What you'll be able to do
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {upcomingFeatures.map((f, i) => (
            <div key={i} className="panel flex flex-col gap-3 p-5 transition-all hover:border-primary/40 hover:shadow-sm">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <f.icon className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">{f.title}</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-normal">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instant browser testing reminder */}
      <div className="rounded-xl border border-border/50 bg-secondary/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <PhoneCall className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">In the meantime, try Live Voice Calls</p>
            <p className="text-xs text-muted-foreground">
              You can talk directly with any agent right now through your web browser using real-time AI voice.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/agents">Go to Agents</a>
        </Button>
      </div>
    </AppShell>
  );
}
