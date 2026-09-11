import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Bot,
  PhoneCall,
  Layers,
  Terminal,
  ArrowRight,
  CheckCircle2,
  Zap,
  Gauge,
  Lock,
  Activity,
  ChevronRight,
  Globe,
  Sliders,
  Code2,
  Database,
  Key,
  Play,
  Volume2,
  Mic,
  Server,
  Radio,
  BarChart3,
  Check,
  X,
  Clock,
  Sparkle,
  Headphones,
  ArrowUpRight,
  Workflow,
  Cpu,
  Boxes,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStoredToken } from "@/lib/api-client";
import { useSession } from "@/hooks/use-platform";
import { isUserAdmin } from "@/components/layout/admin-shell";

const API_BASE = (import.meta.env["VITE_API_URL"] as string) || "/api/v1";

function GoogleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

// ── Interactive Platform Pillars (Zero External Models) ──────────────────
const PLATFORM_PILLARS = [
  {
    id: "voice",
    navLabel: "Voice Fleets",
    badge: "Sub-350ms Cadence",
    title: "Autonomous Voice Telephony",
    description:
      "Deploy intelligent phone agents connected directly to your existing E.164 phone numbers. Built for natural conversational turn-taking, ambient noise cancellation, and automated CRM booking.",
    bullets: [
      "Direct SIP trunk and telephone carrier integration",
      "Instant turn-taking without awkward latency pauses",
      "Automated calendar booking and CRM contact syncing",
    ],
    accent: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  {
    id: "workflows",
    navLabel: "Fleet Workflows",
    badge: "Event-Driven",
    title: "Multi-Agent Workflow Orchestration",
    description:
      "Chain specialized agents into reliable enterprise pipelines. Automatically trigger triage, database mutations, and notifications from inbound voice calls or API webhooks.",
    bullets: [
      "Dynamic multi-step agent pipelines with zero data leaks",
      "Real-time event webhooks with automatic retries",
      "Circuit-breaker protection with deterministic failover",
    ],
    accent: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  },
  {
    id: "developer",
    navLabel: "Developer Studio",
    badge: "TypeScript & Python",
    title: "Type-Safe Developer Sandboxes",
    description:
      "Engineered for rapid developer iteration. Write agent logic in TypeScript or Python, test in live local sandboxes, and deploy production fleets with a single CLI command.",
    bullets: [
      "Full TypeScript & Python SDK with autocompletion",
      "Hot-reloading local sandboxes with real-time logs",
      "Single-command CLI deployment with zero downtime",
    ],
    accent: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  },
  {
    id: "security",
    navLabel: "Security & Vault",
    badge: "PostgreSQL Isolation",
    title: "Enterprise Governance & Audit Vault",
    description:
      "Ensure airtight tenant data privacy. Every workspace is cryptographically isolated in PostgreSQL with granular role-based permissions and immutable compliance audit trails.",
    bullets: [
      "Granular RBAC with Owner, Admin, and Developer tiers",
      "PostgreSQL row-level isolation and encrypted secrets",
      "Streaming compliance audit ledger for complete visibility",
    ],
    accent: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  },
];

export interface LandingPageProps {
  onGoToDashboard?: () => void;
}

export function LandingPage({ onGoToDashboard }: LandingPageProps = {}) {
  const [token] = useState(() => getStoredToken());
  const { data: session } = useSession();
  const isAdmin = isUserAdmin(session?.email);
  const [activePillarIndex, setActivePillarIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("hero");

  // Track scroll position for top progress bar and active section spy
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const currentProgress = (window.scrollY / totalScroll) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      }

      // Determine active section
      const sections = ["security", "developer", "platform", "voice"];
      let current = "hero";
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200) {
            current = sectionId;
            break;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleGoogleSignIn = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const handleDashboardNav = () => {
    if (onGoToDashboard) {
      onGoToDashboard();
    } else {
      window.location.href = "/?view=dashboard";
    }
  };

  const activePillar = PLATFORM_PILLARS[activePillarIndex] ?? PLATFORM_PILLARS[0]!;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary relative overflow-x-hidden font-sans scroll-smooth">
      {/* ── Scroll Progress Line ─────────────────────────────────── */}
      <div
        className="fixed top-0 left-0 h-[2.5px] bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 z-50 transition-all duration-150 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* ── Background Subtle Mesh & Radiant Glow ────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[900px] rounded-full bg-gradient-to-b from-blue-600/12 via-cyan-500/8 to-transparent blur-[150px]" />
        <div className="absolute top-[900px] -left-52 size-[700px] rounded-full bg-emerald-500/8 blur-[160px]" />
        <div className="absolute top-[1800px] -right-52 size-[750px] rounded-full bg-blue-600/10 blur-[170px]" />
        <div className="absolute inset-0 grid-backdrop opacity-20" />
      </div>

      {/* ── Top Fixed Navigation Bar ──────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-2xl transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo & Title */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="size-10 rounded-xl p-0.5 bg-gradient-to-br from-primary/40 via-cyan-400/30 to-blue-600/40 ring-1 ring-white/15 group-hover:ring-primary/50 transition-all shadow-md">
              <img
                src="/brand-logo.jpg"
                alt="IntelligenSpace Hub Logo"
                className="size-full rounded-[10px] object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                IntelligenSpace Hub
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/40 text-primary bg-primary/10 font-mono font-semibold">
                  v2.4
                </Badge>
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> Autonomous Voice & Operations Platform
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Neat, Editorial, Smooth Anchors) */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-full border border-white/10 bg-surface-1/70 backdrop-blur-xl text-xs font-medium text-muted-foreground">
            <a
              href="#voice"
              className={`px-3.5 py-1.5 rounded-full transition-all ${
                activeSection === "voice"
                  ? "bg-white/10 text-foreground font-semibold shadow-xs"
                  : "hover:text-foreground"
              }`}
            >
              Voice Fleets
            </a>
            <a
              href="#platform"
              className={`px-3.5 py-1.5 rounded-full transition-all ${
                activeSection === "platform"
                  ? "bg-white/10 text-foreground font-semibold shadow-xs"
                  : "hover:text-foreground"
              }`}
            >
              Capabilities
            </a>
            <a
              href="#developer"
              className={`px-3.5 py-1.5 rounded-full transition-all ${
                activeSection === "developer"
                  ? "bg-white/10 text-foreground font-semibold shadow-xs"
                  : "hover:text-foreground"
              }`}
            >
              Developer Studio
            </a>
            <a
              href="#security"
              className={`px-3.5 py-1.5 rounded-full transition-all ${
                activeSection === "security"
                  ? "bg-white/10 text-foreground font-semibold shadow-xs"
                  : "hover:text-foreground"
              }`}
            >
              Enterprise Security
            </a>
            {isAdmin && (
              <Link
                to="/admin/models"
                className="px-3.5 py-1.5 rounded-full hover:text-foreground transition-all flex items-center gap-1.5 text-amber-400 font-semibold border border-amber-500/30 bg-amber-500/10"
              >
                <ShieldCheck className="size-3" /> Admin Console
              </Link>
            )}
          </nav>

          {/* Right Action: Sign In With Google / Enter Workspace */}
          <div className="flex items-center gap-3">
            {token ? (
              <Button
                type="button"
                onClick={handleDashboardNav}
                size="sm"
                className="h-9 gap-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 via-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 border border-blue-400/40 shadow-lg shadow-blue-500/35 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Bot className="size-3.5" />
                <span>Open Operations Hub</span>
              </Button>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground hidden sm:inline-block px-2"
                >
                  Sign In
                </Link>
                <Button
                  type="button"
                  onClick={handleGoogleSignIn}
                  size="sm"
                  className="h-9 gap-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 via-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 border border-blue-400/40 shadow-lg shadow-blue-500/35 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <span className="flex size-5 items-center justify-center rounded-full bg-white shadow-xs shrink-0">
                    <GoogleIcon className="size-3" />
                  </span>
                  <span>Sign in with Google</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Landing Content ──────────────────────────────────── */}
      <main className="relative z-10 space-y-28 sm:space-y-36 pb-28">
        {/* ── Hero Section ────────────────────────────────────────── */}
        <section id="hero" className="relative px-4 pt-16 sm:px-6 sm:pt-24 lg:px-8 text-center max-w-5xl mx-auto space-y-8">
          {/* Top Pill Announcement Badge */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/30 bg-surface-2/90 px-4 py-1.5 text-xs font-medium backdrop-blur-xl shadow-md ring-1 ring-white/10 hover:border-primary/50 transition-all">
            <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-foreground font-semibold">IntelligenSpace Hub v2.4</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-primary flex items-center gap-1 font-semibold">
              <Zap className="size-3.5 fill-current" /> Autonomous Voice Fleets & Enterprise Operations
            </span>
          </div>

          {/* Hero Headline (Simple, Neat, Ultra-Premium Typography) */}
          <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.08]">
              The Autonomous Platform for{" "}
              <span className="bg-gradient-to-r from-white via-cyan-300 to-primary bg-clip-text text-transparent">
                Intelligent Operations
              </span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-normal">
              A unified operating system for real-time voice agents, automated fleet workflows, developer sandboxes, and cryptographic PostgreSQL tenant isolation.
            </p>
          </div>

          {/* Hero Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            {token ? (
              <Button
                type="button"
                size="lg"
                onClick={handleDashboardNav}
                className="w-full sm:w-auto h-12 px-8 gap-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 border border-blue-400/40 shadow-xl shadow-blue-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Bot className="size-4" />
                <span>Open Operations Hub</span>
                <ArrowRight className="size-4 ml-1 opacity-80" />
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                onClick={handleGoogleSignIn}
                className="w-full sm:w-auto h-12 px-8 gap-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 border border-blue-400/40 shadow-xl shadow-blue-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-white shadow-xs shrink-0">
                  <GoogleIcon className="size-3.5" />
                </span>
                <span>Continue with Google</span>
                <ArrowRight className="size-4 ml-1 opacity-80" />
              </Button>
            )}

            <Button
              variant="outline"
              size="lg"
              asChild
              className="w-full sm:w-auto h-12 px-7 text-sm font-medium border-white/15 bg-surface-1/90 hover:bg-surface-2 hover:border-primary/40 shadow-sm transition-all"
            >
              <a href="#platform">
                <Play className="size-4 mr-2 text-primary fill-primary/20" />
                Explore Platform Capabilities
              </a>
            </Button>
          </div>

          {/* Social Proof & Guarantees */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>Zero-Password Google SSO</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>10,000 Free Starter Credits</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>Sub-350ms Telephony Cadence</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
              <span>PostgreSQL Multi-Tenant Encrypted</span>
            </div>
          </div>

          {/* ── Metric Highlights Ribbon - Clean, Simple, Neat Cards ── */}
          <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-3.5 max-w-4xl mx-auto text-left">
            <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.07] via-surface-1/80 to-background/80 p-5 backdrop-blur-xl space-y-1.5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl group">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <div className="text-2xl font-black tracking-tight text-foreground flex items-center gap-1">
                312<span className="text-xs font-semibold text-primary font-mono">ms</span>
              </div>
              <div className="text-xs font-bold text-foreground">Voice Telephony Latency</div>
              <div className="text-[11px] text-muted-foreground">E.164 direct SIP turnaround</div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.07] via-surface-1/80 to-background/80 p-5 backdrop-blur-xl space-y-1.5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-xl group">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <div className="text-2xl font-black tracking-tight text-foreground flex items-center gap-1">
                99.99<span className="text-xs font-semibold text-cyan-400 font-mono">%</span>
              </div>
              <div className="text-xs font-bold text-foreground">Production Uptime SLA</div>
              <div className="text-[11px] text-muted-foreground">Automated multi-region failover</div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.07] via-surface-1/80 to-background/80 p-5 backdrop-blur-xl space-y-1.5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/50 hover:shadow-xl group">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <div className="text-2xl font-black tracking-tight text-foreground flex items-center gap-1">
                100<span className="text-xs font-semibold text-emerald-400 font-mono">%</span>
              </div>
              <div className="text-xs font-bold text-foreground">Tenant Data Privacy</div>
              <div className="text-[11px] text-muted-foreground">PostgreSQL row-level isolation</div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.07] via-surface-1/80 to-background/80 p-5 backdrop-blur-xl space-y-1.5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/50 hover:shadow-xl group">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <div className="text-2xl font-black tracking-tight text-foreground flex items-center gap-1">
                10,000<span className="text-xs font-semibold text-blue-400 font-mono">pts</span>
              </div>
              <div className="text-xs font-bold text-foreground">Free Starter Credits</div>
              <div className="text-[11px] text-muted-foreground">Credited immediately on sign-in</div>
            </div>
          </div>
        </section>

        {/* ── Section 1: Autonomous Voice Fleets ───────────────────── */}
        <section id="voice" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-24">
          <div className="max-w-3xl space-y-3">
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 bg-emerald-500/10 text-xs px-3 py-1 font-mono">
              01 / VOICE INFRASTRUCTURE
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
              Conversational Voice Agents with Sub-350ms Telephony
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Deploy autonomous voice agents directly connected to standard E.164 phone numbers. Engineered with real-time audio streams for natural conversational turn-taking, ambient noise suppression, and real-time CRM updates.
            </p>
          </div>

          {/* Voice Showcase Card */}
          <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.06] via-surface-1/90 to-background/95 p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full blur-3xl opacity-20 bg-emerald-500" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
              <div className="p-4 rounded-xl border border-white/10 bg-background/60 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Inbound Trunk Line</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                    Live Call (00:42)
                  </Badge>
                </div>
                <div className="text-sm font-bold text-foreground font-mono">+1 (415) 890-2341</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Globe className="size-3 text-primary" /> San Francisco, CA · Direct SIP Trunk
                </div>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-background/60 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Assigned Agent</span>
                  <span className="font-mono text-[10px] text-primary">Autonomous Core</span>
                </div>
                <div className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Headphones className="size-4 text-primary" />
                  <span>Enterprise Concierge Fleet</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Dynamic conversational turn-taking active
                </div>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-background/60 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Turnaround Latency</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Ultra Low</span>
                </div>
                <div className="text-sm font-bold text-foreground font-mono flex items-center gap-2">
                  <Gauge className="size-4 text-emerald-400" />
                  <span>312ms Total Turnaround</span>
                </div>
                <div className="text-xs text-muted-foreground">99.8% Speech Accuracy</div>
              </div>
            </div>

            {/* Audio Waveform Visualizer */}
            <div className="p-5 rounded-xl border border-white/10 bg-background/80 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Volume2 className="size-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Live Telephony Audio Stream</div>
                  <div className="text-[11px] text-muted-foreground font-mono">Sampling: 24kHz 16-bit PCM Direct Stream</div>
                </div>
              </div>

              {/* Dynamic Equalizer Bars */}
              <div className="flex items-center gap-1.5 h-9 px-4 py-1 rounded-lg bg-surface-2/60 border border-white/10">
                {[12, 24, 18, 28, 14, 22, 10, 26, 16, 24, 30, 18, 12, 22, 16].map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-gradient-to-t from-emerald-500 to-cyan-400 animate-pulse"
                    style={{
                      height: `${h}px`,
                      animationDuration: `${0.6 + (i % 5) * 0.15}s`,
                    }}
                  />
                ))}
              </div>

              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-xs gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                Active Call Audio
              </Badge>
            </div>

            {/* Conversational Transcript Bubble */}
            <div className="rounded-xl border border-white/10 bg-background/70 p-4 space-y-3 font-mono text-xs relative z-10">
              <div className="flex items-start gap-3">
                <span className="px-2 py-0.5 rounded bg-surface-2 text-muted-foreground text-[10px] shrink-0">
                  CALLER [00:28]
                </span>
                <p className="text-muted-foreground">
                  "Hi, I need to reschedule our enterprise onboarding consultation to Thursday at 3 PM EST."
                </p>
              </div>

              <div className="flex items-start gap-3 pl-4 border-l-2 border-primary/40">
                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-semibold shrink-0">
                  INTELLIGEN CONCIERGE [00:31]
                </span>
                <p className="text-foreground">
                  "I've verified your reservation for Thursday at 3:00 PM EST. An updated calendar invitation and security compliance packet have been sent to your primary email address. Would you like me to reserve executive conference room B as well?"
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 2: Interactive Platform Capabilities Showcase ─ */}
        <section id="platform" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-24">
          <div className="max-w-3xl space-y-3">
            <Badge variant="outline" className="text-cyan-400 border-cyan-500/40 bg-cyan-500/10 text-xs px-3 py-1 font-mono">
              02 / CAPABILITIES SHOWCASE
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
              Everything Needed to Run Autonomous Operations
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Explore the four core pillars of the platform. Click through each pillar or scroll to inspect real-time fleet orchestration, developer tooling, and enterprise governance.
            </p>
          </div>

          {/* Interactive Tab Switcher */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-white/10 pb-4">
            {PLATFORM_PILLARS.map((pillar, idx) => (
              <button
                key={pillar.id}
                type="button"
                onClick={() => setActivePillarIndex(idx)}
                className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activePillarIndex === idx
                    ? "bg-surface-2 border-primary/50 shadow-md ring-1 ring-primary/20"
                    : "border-transparent hover:bg-surface-1 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  0{idx + 1}
                </span>
                <span className={`text-xs sm:text-sm font-bold ${activePillarIndex === idx ? "text-foreground" : ""}`}>
                  {pillar.navLabel}
                </span>
              </button>
            ))}
          </div>

          {/* Active Pillar Display - Side-by-Side Presentation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Text-First Narrative */}
            <div className="lg:col-span-5 space-y-6">
              <Badge variant="outline" className={`text-xs px-2.5 py-1 ${activePillar.accent}`}>
                {activePillar.badge}
              </Badge>

              <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
                {activePillar.title}
              </h3>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {activePillar.description}
              </p>

              <div className="space-y-3 pt-2">
                {activePillar.bullets.map((bullet, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <Button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="h-10 px-5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 border border-blue-400/40 shadow-md shadow-blue-500/25 cursor-pointer"
                >
                  <span>Launch {activePillar.navLabel}</span>
                  <ArrowRight className="size-3.5 ml-2" />
                </Button>
              </div>
            </div>

            {/* Right Column: Visual Component Preview */}
            <div className="lg:col-span-7">
              <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.05] via-surface-1/90 to-background/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                {activePillarIndex === 0 && (
                  /* Pillar 0: Voice Preview */
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <PhoneCall className="size-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">Active Telephony Trunk</div>
                          <div className="text-[11px] text-muted-foreground font-mono">E.164 Inbound/Outbound Ready</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-xs">
                        Turnaround: 312ms
                      </Badge>
                    </div>

                    <div className="p-4 rounded-xl border border-white/10 bg-background/60 space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                        <span>TELEPHONY CADENCE</span>
                        <span className="text-emerald-400 font-bold">LIVE SESSION</span>
                      </div>
                      <div className="text-slate-300">
                        Caller: "Can you confirm our SLA guarantee for multi-region failover?"
                      </div>
                      <div className="text-primary font-semibold pl-3 border-l-2 border-primary/40">
                        Agent: "All enterprise tier fleets include 99.99% uptime with automated circuit-breaker switching across regions."
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg border border-white/10 bg-surface-2/60">
                        <div className="text-muted-foreground text-[10px]">CARRIER STATUS</div>
                        <div className="text-sm font-bold text-foreground mt-0.5">SIP Direct (Live)</div>
                      </div>
                      <div className="p-3 rounded-lg border border-white/10 bg-surface-2/60">
                        <div className="text-muted-foreground text-[10px]">SPEECH ACCURACY</div>
                        <div className="text-sm font-bold text-emerald-400 mt-0.5">99.8% Verified</div>
                      </div>
                    </div>
                  </div>
                )}

                {activePillarIndex === 1 && (
                  /* Pillar 1: Workflow Preview */
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                          <Workflow className="size-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">Orchestration Pipeline</div>
                          <div className="text-[11px] text-muted-foreground font-mono">Event-Driven Automation Flow</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-500/10 text-xs">
                        Auto-Routing
                      </Badge>
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-background/60">
                        <span className="size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="text-muted-foreground text-[11px]">01 / TRIGGER</span>
                        <span className="text-foreground font-bold">Inbound Telephony Event</span>
                        <span className="ml-auto text-emerald-400 text-[10px]">2ms</span>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5">
                        <span className="size-2 rounded-full bg-primary animate-pulse shrink-0" />
                        <span className="text-primary text-[11px]">02 / PIPELINE</span>
                        <span className="text-foreground font-bold">Intent Verification & Triage</span>
                        <span className="ml-auto text-primary text-[10px]">18ms</span>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-background/60">
                        <span className="size-2 rounded-full bg-cyan-400 shrink-0" />
                        <span className="text-muted-foreground text-[11px]">03 / DISPATCH</span>
                        <span className="text-foreground font-bold">PostgreSQL Record & Webhook</span>
                        <span className="ml-auto text-cyan-400 text-[10px]">42ms</span>
                      </div>
                    </div>
                  </div>
                )}

                {activePillarIndex === 2 && (
                  /* Pillar 2: Developer Preview */
                  <div className="space-y-4 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="size-2.5 rounded-full bg-[#ff5f56]" />
                        <div className="size-2.5 rounded-full bg-[#ffbd2e]" />
                        <div className="size-2.5 rounded-full bg-[#27c93f]" />
                        <span className="text-muted-foreground text-[11px] ml-2">fleet-config.ts</span>
                      </div>
                      <Badge variant="outline" className="text-purple-400 border-purple-500/30 bg-purple-500/10 text-[10px]">
                        TypeScript SDK
                      </Badge>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0a0d14] text-slate-300 leading-relaxed overflow-x-auto text-[11px]">
                      <p className="text-purple-400">import &#123; createFleet &#125; from "@intelligenspace/sdk";</p>
                      <br />
                      <p className="text-purple-400">export const fleet = await createFleet(&#123;</p>
                      <p className="pl-4">name: <span className="text-emerald-300">"Customer Support Fleet"</span>,</p>
                      <p className="pl-4">telephony: &#123; enabled: <span className="text-orange-400">true</span>, maxLatencyMs: <span className="text-orange-400">350</span> &#125;,</p>
                      <p className="pl-4">tenantIsolation: <span className="text-orange-400">true</span>,</p>
                      <p>&#125;);</p>
                    </div>

                    <div className="p-3 rounded-lg bg-black/60 border border-white/10 text-[11px] text-emerald-400 space-y-1">
                      <div>$ intelligen fleet:deploy --env=production</div>
                      <div className="text-slate-400">✓ Validated workspace schema isolation</div>
                      <div className="text-emerald-400 font-bold">● Deployed successfully in 0.8s</div>
                    </div>
                  </div>
                )}

                {activePillarIndex === 3 && (
                  /* Pillar 3: Security Preview */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                          <Lock className="size-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">PostgreSQL Vault</div>
                          <div className="text-[11px] text-muted-foreground font-mono">Row-Level Tenant Isolation</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/10 text-xs">
                        SOC2 Compliant
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-background/60">
                        <span className="font-semibold text-foreground">Workspace Boundary</span>
                        <span className="text-emerald-400">Strictly Isolated</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-background/60">
                        <span className="font-semibold text-foreground">Role Permissions</span>
                        <span className="text-cyan-400">Granular RBAC (Admin, Dev)</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-background/60">
                        <span className="font-semibold text-foreground">Audit Retention</span>
                        <span className="text-blue-400">Immutable Ledger</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 3: Developer Neural Studio ───────────────────── */}
        <section id="developer" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-24">
          <div className="max-w-3xl space-y-3">
            <Badge variant="outline" className="text-purple-400 border-purple-500/40 bg-purple-500/10 text-xs px-3 py-1 font-mono">
              03 / DEVELOPER WORKBENCH
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
              Integrated Code Sandboxes & Instant Deployment
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Engineered for developer velocity. Build agent logic, inspect file structures, and deploy production voice fleets with zero infrastructure overhead.
            </p>
          </div>

          {/* IDE Editor Visual Window */}
          <div className="rounded-2xl border border-white/15 bg-[#0a0d14] overflow-hidden font-mono text-xs shadow-2xl relative">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="flex items-center justify-between border-b border-white/10 bg-surface-2/80 px-4 py-2.5 text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-[#ff5f56]" />
                <div className="size-3 rounded-full bg-[#ffbd2e]" />
                <div className="size-3 rounded-full bg-[#27c93f]" />
                <span className="ml-2 text-foreground font-semibold flex items-center gap-1.5">
                  <Code2 className="size-3.5 text-primary" /> src/agents/telephony-agent.ts
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">TypeScript · Strict RBAC Active</span>
            </div>

            <div className="p-5 text-slate-300 leading-relaxed overflow-x-auto">
              <p className="text-slate-500">// Configure Enterprise Autonomous Agent with Sub-350ms Telephony</p>
              <p>
                <span className="text-purple-400">import</span> &#123; IntelligenVoiceFleet, FleetOrchestrator &#125;{" "}
                <span className="text-purple-400">from</span>{" "}
                <span className="text-emerald-300">"@intelligenspace/sdk"</span>;
              </p>
              <br />
              <p>
                <span className="text-purple-400">export const</span>{" "}
                <span className="text-yellow-300">executiveOnboardingFleet</span> ={" "}
                <span className="text-purple-400">new</span>{" "}
                <span className="text-cyan-300">IntelligenVoiceFleet</span>(&#123;
              </p>
              <p className="pl-4">
                name: <span className="text-emerald-300">"Executive Concierge"</span>,
              </p>
              <p className="pl-4">
                telephony: &#123; maxLatencyMs: <span className="text-orange-400">350</span>, webhook: <span className="text-emerald-300">"/api/v1/crm/lead"</span> &#125;,
              </p>
              <p className="pl-4">
                orchestrator: <span className="text-purple-400">new</span>{" "}
                <span className="text-cyan-300">FleetOrchestrator</span>(&#123;
              </p>
              <p className="pl-8">
                tenantIsolation: <span className="text-orange-400">true</span>, // PostgreSQL workspace bound
              </p>
              <p className="pl-8">
                autoFailover: <span className="text-orange-400">true</span>,
              </p>
              <p className="pl-4">&#125;),
              </p>
              <p>&#125;);</p>
            </div>

            <div className="border-t border-white/10 bg-black/50 p-4 text-[11px] text-emerald-400 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Terminal className="size-3" /> Console Output
              </div>
              <div>$ intelligen-cli agent:deploy --fleet=telephony-agent</div>
              <div className="text-slate-400">✓ Workspace tenant validated (PostgreSQL schema isolated)</div>
              <div className="text-slate-400">✓ SIP trunk connected · Turnaround latency: 18ms</div>
              <div className="text-emerald-400 font-bold">● Deployment successful in 1.1s · Live for calls</div>
            </div>
          </div>
        </section>

        {/* ── Section 4: Enterprise RBAC & Security Vault ──────────── */}
        <section id="security" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-24">
          <div className="max-w-3xl space-y-3">
            <Badge variant="outline" className="text-rose-400 border-rose-500/40 bg-rose-500/10 text-xs px-3 py-1 font-mono">
              04 / GOVERNANCE & PRIVACY
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
              Cryptographic Isolation & PostgreSQL Session Vault
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Enterprise tenant protection with role-based access control (Owner, Admin, Member), workspace quota limits, and permanent compliance audit persistence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* RBAC Directory */}
            <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.06] via-surface-1/90 to-background/95 p-6 sm:p-8 space-y-6 hover:border-rose-500/40 transition-all">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <div className="flex items-center justify-between">
                <div className="size-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Lock className="size-5" />
                </div>
                <Badge variant="outline" className="text-xs text-rose-400 border-rose-500/30 bg-rose-500/10 font-mono">
                  RBAC Matrix
                </Badge>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Granular Tenant Permissions</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Enforce least-privilege security across engineering and operations teams.
                </p>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-background/60">
                  <span className="font-semibold text-foreground">Owner / Admin</span>
                  <span className="text-emerald-400">Full Fleet Governance</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-background/60">
                  <span className="font-semibold text-foreground">Developer</span>
                  <span className="text-cyan-400">Code Sandbox & Telemetry</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-background/60">
                  <span className="font-semibold text-foreground">Viewer / Auditor</span>
                  <span className="text-muted-foreground">Read-Only Audit Trail</span>
                </div>
              </div>
            </div>

            {/* PostgreSQL Audit Vault */}
            <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.06] via-surface-1/90 to-background/95 p-6 sm:p-8 space-y-6 hover:border-blue-500/40 transition-all">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <div className="flex items-center justify-between">
                <div className="size-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Database className="size-5" />
                </div>
                <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30 bg-blue-500/10 font-mono">
                  PostgreSQL Vault
                </Badge>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Real-Time Compliance Audit Ledger</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Immutable session persistence with encrypted tenant bounds and instant failover.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-background/80 p-3 space-y-2 font-mono text-xs text-muted-foreground">
                <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-white/10">
                  <span>LIVE COMPLIANCE AUDIT FEED</span>
                  <span className="text-emerald-400 font-bold">ALL SESSIONS ENCRYPTED</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">22:42:01</span>
                  <span className="text-primary font-semibold">auth.google_sso</span>
                  <span className="text-slate-400">workspace: Enterprise</span>
                  <span className="ml-auto text-emerald-400 font-bold">200 OK</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">22:42:15</span>
                  <span className="text-cyan-400 font-semibold">voice.call_initiated</span>
                  <span className="text-slate-400">trunk: E.164 +1(415)...</span>
                  <span className="ml-auto text-emerald-400 font-bold">200 OK</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── High-Impact Bottom Call to Action ───────────────────── */}
        <section className="py-24 border-t border-white/10 bg-gradient-to-b from-surface-1/40 to-background relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[700px] rounded-full bg-blue-600/15 blur-[160px]" />
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
            <div className="size-16 rounded-2xl p-1 bg-gradient-to-br from-primary/40 via-cyan-400/30 to-blue-600/40 ring-1 ring-white/20 shadow-2xl mx-auto flex items-center justify-center">
              <img
                src="/brand-logo.jpg"
                alt="Logo"
                className="size-full rounded-xl object-cover"
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
                Ready to deploy your autonomous operations?
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Sign in with Google to get instant access to autonomous voice fleets, developer sandboxes, and 10,000 free starter credits.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              {token ? (
                <Button
                  type="button"
                  size="lg"
                  onClick={handleDashboardNav}
                  className="w-full sm:w-auto h-12 px-9 gap-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 border border-blue-400/40 shadow-xl shadow-blue-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Bot className="size-4" />
                  <span>Launch Operations Hub</span>
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={handleGoogleSignIn}
                  className="w-full sm:w-auto h-12 px-9 gap-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 border border-blue-400/40 shadow-xl shadow-blue-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-white shadow-xs shrink-0">
                    <GoogleIcon className="size-3.5" />
                  </span>
                  <span>Get Started with Google</span>
                  <ArrowRight className="size-4" />
                </Button>
              )}

              <Button
                variant="outline"
                size="lg"
                asChild
                className="w-full sm:w-auto h-12 px-7 text-sm font-medium border-white/15 bg-surface-1 hover:bg-surface-2 shadow-xs transition-colors"
              >
                <a href="#voice">
                  <Play className="size-4 mr-2 text-primary" />
                  Inspect Voice Fleet
                </a>
              </Button>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check className="size-4 text-emerald-400" /> No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-4 text-emerald-400" /> Setup in 10 seconds
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-4 text-emerald-400" /> PostgreSQL tenant encrypted
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-surface-1/90 py-12 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/brand-logo.jpg"
                alt="IntelligenSpace Logo"
                className="size-8 rounded-lg object-cover ring-1 ring-white/15"
              />
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-sm">IntelligenSpace Hub</span>
                <span className="text-[11px] text-muted-foreground">Autonomous AI Operations & Voice Telephony</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <a href="#voice" className="hover:text-foreground transition-colors">
                Voice Fleets
              </a>
              <a href="#platform" className="hover:text-foreground transition-colors">
                Capabilities
              </a>
              <a href="#developer" className="hover:text-foreground transition-colors">
                Developer Studio
              </a>
              <a href="#security" className="hover:text-foreground transition-colors">
                Security & RBAC
              </a>
              {isAdmin && (
                <Link to="/admin/models" className="hover:text-foreground transition-colors text-amber-400 font-semibold">
                  Admin Console
                </Link>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational · Gateway US-East</span>
            </div>
            <div>
              &copy; {new Date().getFullYear()} IntelligenSpace Hub. All rights reserved. Enterprise Privacy Guaranteed.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
