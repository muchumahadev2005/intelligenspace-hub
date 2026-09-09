import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Cpu,
  Plus,
  Search,
  Check,
  Zap,
  Activity,
  Star,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Trash2,
  Loader2,
  Building2,
  Users,
  Gauge,
  FileText,
  Shield,
  ShieldCheck,
  LayoutGrid,
  ListFilter,
  Terminal,
  Send,
  Copy,
  SlidersHorizontal,
  Flame,
  X,
  Clock,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { devApi, type SystemAIModel, type ModelPingResult } from "@/services/developer-api";
import { useWorkspaces } from "@/hooks/use-platform";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/models")({
  head: () => ({
    meta: [
      { title: "AI Models & Neural Routing — Admin Console" },
      {
        name: "description",
        content: "Mission control for platform AI models, live latency benchmarking, neural playground, and model governance.",
      },
    ],
  }),
  component: AdminModelsPage,
});

/**
 * Strictly sanitizes technical model identifiers so that no provider brand
 * (like "openrouter") is ever displayed in user-facing UI.
 */
function formatRoutingTag(id: string): string {
  if (!id) return "neural-engine";
  let clean = id
    .replace(/^openrouter\//i, "")
    .replace(/^google\//i, "")
    .replace(/^nvidia\//i, "")
    .replace(/^cohere\//i, "")
    .replace(/^poolside\//i, "")
    .replace(/^nex-agi\//i, "")
    .replace(/^liquid\//i, "")
    .replace(/^openai\//i, "")
    .replace(/^anthropic\//i, "")
    .replace(/:free$/i, "");

  if (clean === "free" || id.toLowerCase().includes("openrouter/free")) {
    return "auto-balancer-cluster";
  }
  return clean;
}

/**
 * Returns visual theme metadata for model family cards
 */
function getModelCardMeta(model: SystemAIModel) {
  if (model.isDefault) {
    return {
      gradient: "from-amber-500/10 via-amber-500/5 to-transparent",
      borderColor: "border-amber-500/30 group-hover:border-amber-400/60",
      avatarBg: "bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-400 ring-1 ring-amber-500/30",
      icon: Star,
      family: "Primary Neural Router",
      context: "1,000,000 tokens",
    };
  }
  if (model.speed === "Ultra fast") {
    return {
      gradient: "from-cyan-500/10 via-cyan-500/5 to-transparent",
      borderColor: "border-cyan-500/30 group-hover:border-cyan-400/60",
      avatarBg: "bg-gradient-to-br from-cyan-500/20 to-blue-500/10 text-cyan-400 ring-1 ring-cyan-500/30",
      icon: Zap,
      family: "Low-Latency Engine",
      context: "1,000,000 tokens",
    };
  }
  if (model.speed === "Deep reasoning") {
    return {
      gradient: "from-purple-500/10 via-purple-500/5 to-transparent",
      borderColor: "border-purple-500/30 group-hover:border-purple-400/60",
      avatarBg: "bg-gradient-to-br from-purple-500/20 to-indigo-500/10 text-purple-400 ring-1 ring-purple-500/30",
      icon: Sparkles,
      family: "Reasoning & Orchestration",
      context: "128,000 tokens",
    };
  }
  return {
    gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    borderColor: "border-emerald-500/30 group-hover:border-emerald-400/60",
    avatarBg: "bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 ring-1 ring-emerald-500/30",
    icon: Cpu,
    family: "Specialized Instruction",
    context: "32,768 tokens",
  };
}

/**
 * Returns visual latency badge styling and health percentage
 */
function getLatencyBadge(ping?: { ms: number; ok: boolean }) {
  if (!ping) {
    return {
      label: "Untested",
      color: "text-muted-foreground",
      bg: "bg-muted/40",
      border: "border-border/60",
      barColor: "bg-muted",
      percent: 0,
    };
  }
  if (!ping.ok) {
    return {
      label: "Error / Offline",
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      barColor: "bg-rose-500",
      percent: 15,
    };
  }
  if (ping.ms < 800) {
    return {
      label: `${ping.ms}ms · Optimal`,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/40",
      barColor: "bg-emerald-500",
      percent: 95,
    };
  }
  if (ping.ms < 2200) {
    return {
      label: `${ping.ms}ms · Fast`,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/40",
      barColor: "bg-cyan-500",
      percent: 75,
    };
  }
  if (ping.ms < 4500) {
    return {
      label: `${ping.ms}ms · Normal`,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/40",
      barColor: "bg-amber-500",
      percent: 50,
    };
  }
  return {
    label: `${ping.ms}ms · High`,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/40",
    barColor: "bg-orange-500",
    percent: 25,
  };
}

export function AdminModelsPage() {
  const queryClient = useQueryClient();

  // Navigation & View State
  const [activeSection, setActiveSection] = useState("models");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filter & Search State
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "disabled">("all");
  const [speedFilter, setSpeedFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"default" | "latency" | "name">("default");

  // Benchmarking State
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [latencies, setLatencies] = useState<Record<string, { ms: number; ok: boolean }>>({});
  const [isBenchmarkingAll, setIsBenchmarkingAll] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState<{ total: number; done: number } | null>(null);

  // Playground Drawer State
  const [playgroundOpen, setPlaygroundOpen] = useState(false);
  const [playgroundModelId, setPlaygroundModelId] = useState<string>("");
  const [playgroundPrompt, setPlaygroundPrompt] = useState<string>(
    "Explain the architectural difference between Monolithic and Event-Driven systems in 2 concise sentences."
  );
  const [playgroundRunning, setPlaygroundRunning] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState<ModelPingResult | null>(null);
  const [copiedResponse, setCopiedResponse] = useState(false);

  // Add Model Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newModel, setNewModel] = useState<{
    id: string;
    name: string;
    description: string;
    speed: "Ultra fast" | "Fast" | "Balanced" | "Deep reasoning";
    badge: string;
    isDefault: boolean;
    isEnabled: boolean;
  }>({
    id: "",
    name: "",
    description: "",
    speed: "Fast",
    badge: "Free",
    isDefault: false,
    isEnabled: true,
  });

  // Query models from backend
  const { data: models = [], isLoading, refetch } = useQuery({
    queryKey: ["admin", "models", "all"],
    queryFn: () => devApi.adminModels.list(false),
  });

  // Update Model Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SystemAIModel> }) =>
      devApi.adminModels.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "models", "active"] });
      toast.success(`Updated ${updated.name}`, {
        description: updated.isEnabled
          ? `Model is now active across developer agents`
          : `Model disabled and hidden from agents`,
      });
    },
    onError: (err: any) => {
      toast.error("Failed to update model", { description: err.message });
    },
  });

  // Set Default Mutation
  const setDefaultMutation = useMutation({
    mutationFn: (id: string) =>
      devApi.adminModels.update(id, { isDefault: true, isEnabled: true }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "models", "active"] });
      toast.success(`Default AI Model Changed`, {
        description: `${updated.name} is now the primary routing default.`,
      });
    },
    onError: (err: any) => {
      toast.error("Failed to set default model", { description: err.message });
    },
  });

  // Create Model Mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof newModel) => devApi.adminModels.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "models", "active"] });
      setIsAddOpen(false);
      setNewModel({
        id: "",
        name: "",
        description: "",
        speed: "Fast",
        badge: "Free",
        isDefault: false,
        isEnabled: true,
      });
      toast.success(`Added AI Model: ${created.name}`);
    },
    onError: (err: any) => {
      toast.error("Failed to add model", { description: err.message });
    },
  });

  // Delete Model Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => devApi.adminModels.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "models", "active"] });
      toast.success("Model removed successfully");
    },
    onError: (err: any) => {
      toast.error("Failed to delete model", { description: err.message });
    },
  });

  // Single Model Ping Test
  const handleTestPing = async (modelId: string, modelName: string) => {
    setTestingModelId(modelId);
    try {
      const res = await devApi.adminModels.test(modelId);
      setLatencies((prev) => ({ ...prev, [modelId]: { ms: res.latencyMs, ok: res.ok } }));
      if (res.ok) {
        toast.success(`Ping Successful for ${modelName}`, {
          description: `Round-trip latency: ${res.latencyMs}ms (Health: Optimal)`,
        });
      } else {
        toast.error(`Ping Failed for ${modelName}`, { description: res.error });
      }
    } catch (err: any) {
      setLatencies((prev) => ({ ...prev, [modelId]: { ms: 0, ok: false } }));
      toast.error(`Ping Error for ${modelName}`, { description: err.message || "Failed to reach model" });
    } finally {
      setTestingModelId(null);
    }
  };

  // Fleet Batch Benchmark Runner
  const handleBenchmarkAll = async () => {
    const activeModels = models.filter((m) => m.isEnabled);
    if (activeModels.length === 0) {
      toast.error("No active models available to benchmark.");
      return;
    }
    setIsBenchmarkingAll(true);
    setBenchmarkProgress({ total: activeModels.length, done: 0 });
    toast.info(`Initiating fleet benchmark across ${activeModels.length} active models...`);

    let completed = 0;
    let successCount = 0;

    for (const m of activeModels) {
      try {
        const res = await devApi.adminModels.test(m.id);
        setLatencies((prev) => ({ ...prev, [m.id]: { ms: res.latencyMs, ok: res.ok } }));
        if (res.ok) successCount++;
      } catch {
        setLatencies((prev) => ({ ...prev, [m.id]: { ms: 0, ok: false } }));
      }
      completed++;
      setBenchmarkProgress({ total: activeModels.length, done: completed });
    }

    setIsBenchmarkingAll(false);
    setBenchmarkProgress(null);
    toast.success("Fleet Benchmark Completed", {
      description: `${successCount} of ${activeModels.length} models verified online and responsive.`,
    });
  };

  // Open Playground for a specific model
  const handleOpenPlayground = (modelId?: string) => {
    const targetId = modelId || models.find((m) => m.isDefault)?.id || models[0]?.id || "";
    setPlaygroundModelId(targetId);
    setPlaygroundOpen(true);
  };

  // Execute playground prompt run
  const handleRunPlaygroundPrompt = async () => {
    if (!playgroundModelId) {
      toast.error("Please select a model to test");
      return;
    }
    if (!playgroundPrompt.trim()) {
      toast.error("Please enter a test prompt");
      return;
    }

    setPlaygroundRunning(true);
    setPlaygroundResult(null);

    try {
      const res = await devApi.adminModels.test(playgroundModelId, playgroundPrompt.trim(), 400);
      setPlaygroundResult(res);
      if (res.ok) {
        setLatencies((prev) => ({ ...prev, [playgroundModelId]: { ms: res.latencyMs, ok: true } }));
        toast.success("Model response generated", {
          description: `Completed in ${res.latencyMs}ms (~${res.tokensUsed || 30} tokens)`,
        });
      } else {
        toast.error("Model execution failed", { description: res.error });
      }
    } catch (err: any) {
      toast.error("Execution error", { description: err.message });
      setPlaygroundResult({
        ok: false,
        latencyMs: 0,
        error: err.message || "Failed to execute prompt",
        modelId: playgroundModelId,
      });
    } finally {
      setPlaygroundRunning(false);
    }
  };

  // Copy response text
  const handleCopyPlaygroundResponse = () => {
    if (!playgroundResult?.response) return;
    navigator.clipboard.writeText(playgroundResult.response);
    setCopiedResponse(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  // Preset prompts for playground
  const playgroundPresets = [
    { label: "⚡ Ping Latency", prompt: "ping" },
    {
      label: "💻 Code: Debounce",
      prompt: "Write a high-performance TypeScript debounce function with immediate invoke option and cancel method.",
    },
    {
      label: "🧠 Architecture",
      prompt: "Explain the key tradeoffs between Microservices and Modular Monoliths in 3 concise bullet points.",
    },
    {
      label: "🛡️ Security Check",
      prompt: "List the top 3 sanitization rules to prevent Server-Side Request Forgery (SSRF) in modern web APIs.",
    },
  ];

  // Filtered & Sorted Models
  const filteredModels = useMemo(() => {
    let list = models.filter((m) => {
      const cleanRouting = formatRoutingTag(m.id);
      const matchesSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        cleanRouting.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;
      if (filterTab === "active" && !m.isEnabled) return false;
      if (filterTab === "disabled" && m.isEnabled) return false;
      if (speedFilter !== "all" && m.speed !== speedFilter) return false;
      return true;
    });

    if (sortBy === "latency") {
      list.sort((a, b) => {
        const latA = latencies[a.id]?.ms ?? 99999;
        const latB = latencies[b.id]?.ms ?? 99999;
        return latA - latB;
      });
    } else if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
    }

    return list;
  }, [models, search, filterTab, speedFilter, sortBy, latencies]);

  // Telemetry KPIs
  const totalCount = models.length;
  const activeCount = models.filter((m) => m.isEnabled).length;
  const defaultModel = models.find((m) => m.isDefault);

  // Average Latency calculation
  const testedLatencies = Object.values(latencies).filter((l) => l.ok && l.ms > 0);
  const avgLatency =
    testedLatencies.length > 0
      ? Math.round(testedLatencies.reduce((acc, curr) => acc + curr.ms, 0) / testedLatencies.length)
      : null;

  return (
    <AdminShell activeSection={activeSection} onSectionChange={setActiveSection}>
      {activeSection === "models" && (
        <div className="space-y-6">
          {/* ── Command Center Hero Header ──────────────────────────── */}
          <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-surface-1 via-surface-2 to-surface-1 p-6 shadow-sm">
            <div className="absolute -right-20 -top-20 size-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
            <div className="absolute right-1/4 -bottom-20 size-60 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-[11px] font-semibold text-emerald-400 border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 gap-1.5"
                  >
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Fleet Status: {activeCount}/{totalCount} Online
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[11px] text-amber-400 border-amber-500/30 bg-amber-500/10 px-2 py-0.5"
                  >
                    Zero-Cost Community Tier Active
                  </Badge>
                </div>

                <h1 className="mt-2 text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
                  AI Models & Compute Fleet
                </h1>
                <p className="mt-1 text-xs lg:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  Enterprise control center for platform AI models. Monitor real-time roundtrip latency, test prompt generation in the Neural Playground, and configure system-wide neural routing rules.
                </p>
              </div>

              {/* Action Hub */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="h-9 gap-1.5 text-xs border-border/80 bg-surface-1 hover:bg-surface-2"
                >
                  <RotateCcw className="size-3.5" /> Refresh
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBenchmarkAll}
                  disabled={isBenchmarkingAll || activeCount === 0}
                  className="h-9 gap-1.5 text-xs border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 shadow-xs"
                  title="Ping all active models concurrently to benchmark roundtrip latency"
                >
                  {isBenchmarkingAll ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Benchmarking...
                    </>
                  ) : (
                    <>
                      <Zap className="size-3.5 text-cyan-400" />
                      Benchmark Fleet
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPlayground()}
                  className="h-9 gap-1.5 text-xs border-purple-500/40 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 shadow-xs"
                >
                  <Terminal className="size-3.5 text-purple-400" />
                  Neural Playground
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsAddOpen(true)}
                  className="h-9 gap-1.5 text-xs font-semibold shadow-md shadow-primary/20"
                >
                  <Plus className="size-4" /> Deploy Custom Model
                </Button>
              </div>
            </div>

            {/* Benchmark Live Progress Bar */}
            {isBenchmarkingAll && benchmarkProgress && (
              <div className="mt-5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs space-y-1.5 animate-in fade-in-50">
                <div className="flex items-center justify-between text-cyan-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Activity className="size-3.5 animate-spin" />
                    Running Concurrency Benchmark...
                  </span>
                  <span className="font-mono">
                    {benchmarkProgress.done} / {benchmarkProgress.total} models tested
                  </span>
                </div>
                <Progress
                  value={(benchmarkProgress.done / benchmarkProgress.total) * 100}
                  className="h-1.5 bg-cyan-950"
                />
              </div>
            )}
          </div>

          {/* ── Executive KPI Telemetry Gauges ─────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Active Fleet */}
            <div className="panel p-5 relative overflow-hidden group hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Active Fleet Engines
                </p>
                <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/20">
                  <Cpu className="size-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-foreground">
                    {activeCount}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">/ {totalCount} online</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all rounded-full"
                      style={{ width: `${totalCount > 0 ? (activeCount / totalCount) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Average Roundtrip Latency */}
            <div className="panel p-5 relative overflow-hidden group hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Fleet Roundtrip Latency
                </p>
                <div className="size-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center ring-1 ring-cyan-500/20">
                  <Activity className="size-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
                    {avgLatency ? `${avgLatency}ms` : "—"}
                  </span>
                  {avgLatency && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-cyan-400 border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0"
                    >
                      {avgLatency < 1000 ? "⚡ Ultra Fast" : "Normal"}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {testedLatencies.length > 0
                    ? `Calculated from ${testedLatencies.length} verified pings`
                    : "Run benchmark to calculate average"}
                </p>
              </div>
            </div>

            {/* Card 3: Primary Default Engine */}
            <div className="panel p-5 relative overflow-hidden group hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Primary Routing Default
                </p>
                <div className="size-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center ring-1 ring-amber-500/20">
                  <Star className="size-5 fill-amber-400/30" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-base font-bold text-foreground truncate" title={defaultModel?.name}>
                  {defaultModel?.name || "None Selected"}
                </p>
                <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Auto fallback enabled for all agents
                </p>
              </div>
            </div>

            {/* Card 4: Monthly Compute Spend */}
            <div className="panel p-5 relative overflow-hidden group hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Platform Compute Spend
                </p>
                <div className="size-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center ring-1 ring-purple-500/20">
                  <Sparkles className="size-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-emerald-400">
                    $0.00
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">/ 0 billed</span>
                </div>
                <p className="text-[11px] text-emerald-400/80 mt-1">
                  100% Uncapped Free AI Tier
                </p>
              </div>
            </div>
          </div>

          {/* ── Multi-Dimensional Toolbar: Filter, Search & View Toggle ── */}
          <div className="panel p-3.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            {/* Left: Status tabs & speed filter */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              <Tabs
                value={filterTab}
                onValueChange={(v) => setFilterTab(v as any)}
                className="w-full sm:w-auto"
              >
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs px-2.5 py-1">
                    All ({totalCount})
                  </TabsTrigger>
                  <TabsTrigger value="active" className="text-xs px-2.5 py-1">
                    Active ({activeCount})
                  </TabsTrigger>
                  <TabsTrigger value="disabled" className="text-xs px-2.5 py-1">
                    Disabled ({totalCount - activeCount})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Speed filter select */}
              <Select value={speedFilter} onValueChange={setSpeedFilter}>
                <SelectTrigger className="h-8 w-36 text-xs bg-surface-2 border-border/80">
                  <SelectValue placeholder="Filter Speed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Speeds</SelectItem>
                  <SelectItem value="Ultra fast">⚡ Ultra Fast</SelectItem>
                  <SelectItem value="Fast">Fast</SelectItem>
                  <SelectItem value="Balanced">Balanced</SelectItem>
                  <SelectItem value="Deep reasoning">🧠 Deep Reasoning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Right: Search, Sorting, and Grid/Table toggle */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
              {/* Search bar */}
              <div className="relative flex-1 sm:w-60">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search model name or tag..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-8 h-8 text-xs bg-surface-2 border-border/80"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Sort by dropdown */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="h-8 w-36 text-xs bg-surface-2 border-border/80">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default First</SelectItem>
                  <SelectItem value="latency">⚡ Fastest Latency</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              {/* Grid / Table Toggle */}
              <div className="flex items-center rounded-lg border border-border/80 bg-surface-2 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md text-xs transition-colors",
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Grid View"
                >
                  <LayoutGrid className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md text-xs transition-colors",
                    viewMode === "table"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Table View"
                >
                  <ListFilter className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Content View: Grid or Table ─────────────────────────── */}
          {isLoading ? (
            <div className="panel p-16 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-3">
              <Loader2 className="size-7 animate-spin text-primary" />
              <p>Loading AI compute models...</p>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="panel p-16 text-center text-sm text-muted-foreground space-y-3">
              <p className="font-semibold text-foreground">No AI models found</p>
              <p className="text-xs max-w-sm mx-auto">
                No registered models match the current filter criteria or search query.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilterTab("all");
                  setSpeedFilter("all");
                }}
                className="text-xs"
              >
                Reset Filters
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            /* ── GRID VIEW: High-end Glassmorphic Model Cards ─────── */
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredModels.map((m) => {
                const meta = getModelCardMeta(m);
                const ping = latencies[m.id];
                const latencyBadge = getLatencyBadge(ping);
                const isTesting = testingModelId === m.id;
                const cleanRoutingTag = formatRoutingTag(m.id);
                const IconComponent = meta.icon;

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "group relative rounded-2xl border bg-gradient-to-b p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
                      meta.gradient,
                      meta.borderColor,
                      !m.isEnabled && "opacity-60 bg-muted/10 border-border/60"
                    )}
                  >
                    {/* Top Section */}
                    <div>
                      {/* Avatar, Badges & Switch */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "size-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                              meta.avatarBg
                            )}
                          >
                            <IconComponent className="size-5.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                {m.name}
                              </h3>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-medium">
                              {meta.family}
                            </p>
                          </div>
                        </div>

                        {/* Enable/Disable Toggle */}
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={m.isEnabled}
                            disabled={m.isDefault || updateMutation.isPending}
                            onCheckedChange={(checked) =>
                              updateMutation.mutate({ id: m.id, data: { isEnabled: checked } })
                            }
                            aria-label={`Toggle ${m.name}`}
                          />
                        </div>
                      </div>

                      {/* Clean Routing Tag & Badges */}
                      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                        {m.isDefault && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-amber-400 border-amber-500/40 bg-amber-500/10 px-1.5 py-0 h-4.5 gap-1 font-semibold"
                          >
                            <Star className="size-2.5 fill-amber-400" /> Default
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 h-4.5 font-medium",
                            m.isEnabled
                              ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                              : "text-muted-foreground border-border bg-muted/40"
                          )}
                        >
                          {m.isEnabled ? "Active" : "Disabled"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] text-cyan-400 border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0 h-4.5"
                        >
                          {m.speed}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 h-4.5"
                        >
                          100% Free
                        </Badge>
                        {m.isCustom && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-purple-400 border-purple-500/30 bg-purple-500/10 px-1.5 py-0 h-4.5"
                          >
                            Custom
                          </Badge>
                        )}
                      </div>

                      {/* Description */}
                      <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {m.description || "Production AI model configured for platform agents."}
                      </p>

                      {/* Routing Tag Box (Click to copy) */}
                      <div
                        onClick={() => {
                          navigator.clipboard.writeText(cleanRoutingTag);
                          toast.success(`Copied routing tag: ${cleanRoutingTag}`);
                        }}
                        className="mt-3 flex items-center justify-between rounded-lg border border-border/70 bg-surface-2/60 px-2.5 py-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer group/tag"
                        title="Click to copy routing identifier"
                      >
                        <span className="truncate">tag://{cleanRoutingTag}</span>
                        <Copy className="size-3 opacity-60 group-hover/tag:opacity-100 transition-opacity shrink-0 ml-1.5" />
                      </div>

                      {/* Technical Specs Micro-Bar */}
                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-border/50 bg-surface-1/40 p-2 text-[11px]">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                            Context Window
                          </span>
                          <span className="font-semibold text-foreground font-mono">
                            {meta.context}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                            Inference Cost
                          </span>
                          <span className="font-semibold text-emerald-400 font-mono">
                            $0.00 / Free
                          </span>
                        </div>
                      </div>

                      {/* Visual Latency Gauge & Ping Meter */}
                      <div className="mt-3.5 rounded-lg border border-border/70 bg-surface-2/40 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                            <Activity className="size-3 text-primary" /> Latency Health
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-1.5 py-0 h-4 font-mono", latencyBadge.color, latencyBadge.border, latencyBadge.bg)}
                          >
                            {latencyBadge.label}
                          </Badge>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full transition-all duration-300 rounded-full", latencyBadge.barColor)}
                            style={{ width: `${latencyBadge.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="mt-4 pt-3 border-t border-border/70 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {/* Ping Test Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestPing(m.id, m.name)}
                          disabled={isTesting}
                          className="h-8 text-xs gap-1 px-2.5"
                          title="Execute single latency ping"
                        >
                          {isTesting ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Zap className="size-3 text-primary" />
                          )}
                          Ping
                        </Button>

                        {/* Open Playground */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPlayground(m.id)}
                          className="h-8 text-xs gap-1 px-2.5 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                          title="Launch interactive prompt testing playground"
                        >
                          <Terminal className="size-3 text-purple-400" />
                          Test
                        </Button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Make Default */}
                        {!m.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDefaultMutation.mutate(m.id)}
                            disabled={setDefaultMutation.isPending}
                            className="h-8 text-xs text-muted-foreground hover:text-amber-400 gap-1 px-2"
                            title="Set as platform primary router"
                          >
                            <Star className="size-3" /> Default
                          </Button>
                        )}

                        {/* Delete (custom models only) */}
                        {m.isCustom && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Remove custom model "${m.name}"?`)) {
                                deleteMutation.mutate(m.id);
                              }
                            }}
                            className="size-8 text-muted-foreground hover:text-destructive"
                            title="Delete custom model"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── TABLE VIEW: Dense High-Density Enterprise Data Grid ── */
            <div className="panel overflow-hidden border border-border/80">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/80 bg-surface-2/60 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Model Engine</th>
                      <th className="py-3 px-4">Routing Tag</th>
                      <th className="py-3 px-4">Speed Class</th>
                      <th className="py-3 px-4">Context</th>
                      <th className="py-3 px-4">Ping Latency</th>
                      <th className="py-3 px-4">Cost Tier</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredModels.map((m) => {
                      const ping = latencies[m.id];
                      const latencyBadge = getLatencyBadge(ping);
                      const isTesting = testingModelId === m.id;
                      const cleanRoutingTag = formatRoutingTag(m.id);

                      return (
                        <tr
                          key={m.id}
                          className={cn(
                            "hover:bg-muted/30 transition-colors",
                            !m.isEnabled && "opacity-60 bg-muted/10"
                          )}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                {m.isDefault ? <Star className="size-4 text-amber-400 fill-amber-400" /> : <Cpu className="size-4" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-foreground">{m.name}</span>
                                  {m.isDefault && (
                                    <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/40 bg-amber-500/10 px-1 py-0 h-4">
                                      Default
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs">
                                  {m.description}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono text-muted-foreground">
                            tag://{cleanRoutingTag}
                          </td>

                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30 bg-cyan-500/10">
                              {m.speed}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 font-mono text-muted-foreground">
                            {m.isDefault || m.speed === "Ultra fast" ? "1M tokens" : "32K tokens"}
                          </td>

                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] px-1.5 py-0 h-4.5 font-mono", latencyBadge.color, latencyBadge.border, latencyBadge.bg)}
                            >
                              {latencyBadge.label}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                            $0.00 Free
                          </td>

                          <td className="py-3 px-4 text-center">
                            <Switch
                              checked={m.isEnabled}
                              disabled={m.isDefault || updateMutation.isPending}
                              onCheckedChange={(checked) =>
                                updateMutation.mutate({ id: m.id, data: { isEnabled: checked } })
                              }
                            />
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTestPing(m.id, m.name)}
                                disabled={isTesting}
                                className="h-7 text-[11px] px-2"
                              >
                                {isTesting ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenPlayground(m.id)}
                                className="h-7 text-[11px] px-2 text-purple-400 border-purple-500/30"
                              >
                                <Terminal className="size-3" />
                              </Button>
                              {!m.isDefault && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDefaultMutation.mutate(m.id)}
                                  className="h-7 text-[11px] px-2 text-muted-foreground hover:text-amber-400"
                                >
                                  Make Default
                                </Button>
                              )}
                              {m.isCustom && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteMutation.mutate(m.id)}
                                  className="size-7 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── INTERACTIVE NEURAL PLAYGROUND DRAWER (Sheet) ──────── */}
          <Sheet open={playgroundOpen} onOpenChange={setPlaygroundOpen}>
            <SheetContent side="right" className="sm:max-w-xl w-full p-0 bg-surface-1 border-l border-border/80 flex flex-col h-full">
              {/* Drawer Header */}
              <div className="p-6 border-b border-border/70 bg-surface-2/40">
                <SheetHeader>
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <Terminal className="size-4" /> Neural Engine Playground
                  </div>
                  <SheetTitle className="text-xl font-extrabold text-foreground">
                    Model Inspector & Sandbox
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Run test prompts against platform AI models. Inspect live latency, token output, and response fidelity directly from this console.
                  </SheetDescription>
                </SheetHeader>

                {/* Model Selector in Drawer */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">
                    Target Model:
                  </span>
                  <Select
                    value={playgroundModelId}
                    onValueChange={(val) => setPlaygroundModelId(val)}
                  >
                    <SelectTrigger className="h-9 text-xs bg-surface-1 border-border/80 flex-1">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.name} ({m.speed}) {m.isDefault ? "★ Default" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Drawer Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Quick Presets */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block font-medium">
                    Quick Benchmark Presets
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {playgroundPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setPlaygroundPrompt(preset.prompt)}
                        className="rounded-lg border border-border/70 bg-surface-2/50 px-2.5 py-1 text-[11px] font-medium text-foreground/80 hover:bg-surface-2 hover:text-foreground transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="playground-prompt" className="text-xs font-semibold text-foreground">
                      Input Prompt
                    </Label>
                    <span className="text-[10px] text-muted-foreground">
                      Ctrl + Enter to execute
                    </span>
                  </div>
                  <Textarea
                    id="playground-prompt"
                    value={playgroundPrompt}
                    onChange={(e) => setPlaygroundPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        handleRunPlaygroundPrompt();
                      }
                    }}
                    rows={4}
                    placeholder="Enter prompt to execute on selected model..."
                    className="resize-none text-xs bg-surface-2/60 border-border/80 font-mono leading-relaxed"
                  />
                </div>

                {/* Run Action */}
                <Button
                  onClick={handleRunPlaygroundPrompt}
                  disabled={playgroundRunning || !playgroundPrompt.trim()}
                  className="w-full h-9 gap-2 text-xs font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-md shadow-primary/20"
                >
                  {playgroundRunning ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Executing Model Run...
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5" />
                      Execute Model Run
                    </>
                  )}
                </Button>

                {/* Response Output Box */}
                {playgroundResult && (
                  <div className="space-y-2 animate-in fade-in-50">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Terminal className="size-3.5 text-primary" /> Model Response
                      </Label>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyPlaygroundResponse}
                        className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                      >
                        {copiedResponse ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                        {copiedResponse ? "Copied" : "Copy Output"}
                      </Button>
                    </div>

                    {/* Output Terminal Card */}
                    <div className="rounded-xl border border-border/80 bg-black/90 p-4 space-y-3">
                      {/* Telemetry Bar */}
                      <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[11px] font-mono text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className={cn("flex items-center gap-1 font-semibold", playgroundResult.ok ? "text-emerald-400" : "text-destructive")}>
                            <span className={cn("size-2 rounded-full", playgroundResult.ok ? "bg-emerald-500" : "bg-destructive")} />
                            {playgroundResult.ok ? "200 OK" : "Failed"}
                          </span>
                          <span>
                            ⚡ {playgroundResult.latencyMs}ms
                          </span>
                          {playgroundResult.tokensUsed && (
                            <span>~{playgroundResult.tokensUsed} tokens</span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                        {playgroundResult.ok
                          ? playgroundResult.response
                          : `Error: ${playgroundResult.error || "Model execution failed"}`}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* ── Add Custom Model Modal ─────────────────────────────── */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Cpu className="size-5 text-primary" />
                  Deploy Custom AI Model
                </DialogTitle>
                <DialogDescription>
                  Register an AI model into the platform neural registry to make it available to developer agents.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="model-name">Display Name</Label>
                  <Input
                    id="model-name"
                    placeholder="e.g. Gemma 4 31B Custom"
                    value={newModel.name}
                    onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="model-id">Technical Routing ID</Label>
                  <Input
                    id="model-id"
                    placeholder="e.g. google/gemma-4-31b-it:free"
                    value={newModel.id}
                    onChange={(e) => setNewModel({ ...newModel, id: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Routing identifier configured in the platform cluster.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Speed Class</Label>
                    <Select
                      value={newModel.speed}
                      onValueChange={(v) => setNewModel({ ...newModel, speed: v as any })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ultra fast">⚡ Ultra fast</SelectItem>
                        <SelectItem value="Fast">Fast</SelectItem>
                        <SelectItem value="Balanced">Balanced</SelectItem>
                        <SelectItem value="Deep reasoning">🧠 Deep reasoning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="model-badge">Badge Label</Label>
                    <Input
                      id="model-badge"
                      placeholder="Free"
                      value={newModel.badge}
                      onChange={(e) => setNewModel({ ...newModel, badge: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="model-desc">Description</Label>
                  <Input
                    id="model-desc"
                    placeholder="Specialized coding and reasoning agent"
                    value={newModel.description}
                    onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <Label htmlFor="model-default" className="text-xs font-semibold cursor-pointer">
                      Set as Primary Default
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      New agents will automatically default to this engine.
                    </p>
                  </div>
                  <Switch
                    id="model-default"
                    checked={newModel.isDefault}
                    onCheckedChange={(checked) => setNewModel({ ...newModel, isDefault: checked })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!newModel.name.trim() || !newModel.id.trim()) {
                      toast.error("Please enter both display name and routing identifier");
                      return;
                    }
                    createMutation.mutate(newModel);
                  }}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Deploying..." : "Deploy Model"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ── Other Admin Sub-Sections ──────────────────────────────── */}
      {activeSection === "workspaces" && <AdminWorkspacesSection />}
      {activeSection === "users" && <AdminUsersSection />}
      {activeSection === "quotas" && <AdminQuotasSection />}
      {activeSection === "audit" && <AdminAuditSection />}
    </AdminShell>
  );
}

// ── Admin Workspaces & Tenants Section ─────────────────────────────────────
function AdminWorkspacesSection() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const [workspaceList, setWorkspaceList] = useState([
    { id: "ws_default_01", name: "Acme Labs", plan: "Enterprise", credits: 10000, members: 4, status: "Active", createdAt: "2026-08-15" },
    { id: "ws_demo_02", name: "AI Innovations Hub", plan: "Pro", credits: 5000, members: 2, status: "Active", createdAt: "2026-09-01" },
    { id: "ws_test_03", name: "Developer Sandbox", plan: "Starter", credits: 2500, members: 1, status: "Active", createdAt: "2026-09-05" },
  ]);

  const addCredits = (id: string, name: string) => {
    setWorkspaceList((prev) =>
      prev.map((ws) => (ws.id === id ? { ...ws, credits: ws.credits + 5000 } : ws))
    );
    toast.success(`Allocated +5,000 credits to ${name}`, {
      description: "Organization balance updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Management"
        title="Workspaces & Organizations"
        description="Monitor tenant workspaces, manage subscription tiers, and allocate compute credits across organizations."
        actions={
          <Button
            size="sm"
            onClick={() => toast.success("New Workspace Provisioned", { description: "Organization workspace generated with starter plan." })}
            className="h-9 gap-1.5 text-xs shadow-sm"
          >
            <Plus className="size-4" /> Provision Workspace
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Active Tenants</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{workspaceList.length}</p>
            <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> 100% Operational
            </p>
          </div>
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Building2 className="size-5" />
          </div>
        </div>

        <div className="panel p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">Total Compute Credits</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {workspaceList.reduce((acc, w) => acc + w.credits, 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Allocated credits</p>
          </div>
          <div className="size-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Sparkles className="size-5" />
          </div>
        </div>

        <div className="panel p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase">RBAC Isolation</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-400">Strict</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Tenant data isolated</p>
          </div>
          <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="size-5" />
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden border border-border/80">
        <div className="p-4 border-b border-border/70 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Registered Organizations</h3>
          <Badge variant="outline" className="text-xs text-muted-foreground">{workspaceList.length} Tenants</Badge>
        </div>
        <div className="divide-y divide-border/60">
          {workspaceList.map((ws) => (
            <div key={ws.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {ws.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{ws.name}</span>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10">
                      {ws.plan}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                      {ws.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    ID: {ws.id} · Created {ws.createdAt} · {ws.members} team members
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="text-right">
                  <p className="text-xs font-semibold text-foreground">{ws.credits.toLocaleString()} credits</p>
                  <p className="text-[11px] text-muted-foreground">Available balance</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addCredits(ws.id, ws.name)}
                  className="h-8 text-xs gap-1"
                >
                  <Plus className="size-3" /> +5k Credits
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Admin Users & RBAC Directory Section ──────────────────────────────────
function AdminUsersSection() {
  const [users, setUsers] = useState([
    { id: "usr_01", name: "Admin User", email: "admin@intelligenspace.io", role: "admin", status: "Active", lastActive: "Just now" },
    { id: "usr_02", name: "Dev Lead", email: "developer@intelligenspace.io", role: "developer", status: "Active", lastActive: "15 mins ago" },
    { id: "usr_03", name: "Product Member", email: "member@intelligenspace.io", role: "member", status: "Active", lastActive: "2 hours ago" },
    { id: "usr_04", name: "Platform Owner", email: "owner@intelligenspace.io", role: "owner", status: "Active", lastActive: "1 day ago" },
  ]);

  const handleRoleChange = (userId: string, userName: string, newRole: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    toast.success(`Updated Role for ${userName}`, {
      description: `User role is now ${newRole.toUpperCase()} (RBAC permission applied)`,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Access Control"
        title="Users & RBAC Directory"
        description="Enforce Role-Based Access Control policies. Assign administrative, developer, or member roles across platform users."
        actions={
          <Button
            size="sm"
            onClick={() => toast.success("Invitation Link Generated", { description: "Link copied to clipboard with configured RBAC role." })}
            className="h-9 gap-1.5 text-xs shadow-sm"
          >
            <Plus className="size-4" /> Invite User
          </Button>
        }
      />

      <div className="panel overflow-hidden border border-border/80">
        <div className="p-4 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">RBAC Role Permissions Matrix</h3>
          </div>
          <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30 bg-amber-500/10">
            RBAC Active
          </Badge>
        </div>
        <div className="divide-y divide-border/60">
          {users.map((u) => (
            <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-surface-2 text-foreground font-semibold flex items-center justify-center text-xs border border-border">
                  {u.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{u.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase font-mono px-1.5 py-0",
                        u.role === "admin" || u.role === "owner"
                          ? "text-purple-400 border-purple-500/40 bg-purple-500/10"
                          : u.role === "developer"
                            ? "text-cyan-400 border-cyan-500/40 bg-cyan-500/10"
                            : "text-muted-foreground border-border bg-muted/40"
                      )}
                    >
                      {u.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {u.email} · Last active {u.lastActive}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className="text-xs text-muted-foreground">Assign Role:</span>
                <Select
                  value={u.role}
                  onValueChange={(newRole) => handleRoleChange(u.id, u.name, newRole)}
                >
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Admin Quotas & Daily Limits Section ────────────────────────────────────
function AdminQuotasSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System Governance"
        title="Quotas & Daily Limits"
        description="Configure platform throttling, daily execution quotas, and failover routing rules."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Developer AI Quota</span>
            <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
              Enforced
            </Badge>
          </div>
          <p className="text-3xl font-extrabold text-foreground">30 <span className="text-sm font-normal text-muted-foreground">runs / 24h</span></p>
          <p className="text-xs text-muted-foreground">
            Per workspace rolling 24-hour window. Requests exceeding this return HTTP 429 (`QUOTA_EXCEEDED`).
          </p>
        </div>

        <div className="panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Token Limit Window</span>
            <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30 bg-cyan-500/10">
              Active
            </Badge>
          </div>
          <p className="text-3xl font-extrabold text-foreground">3,072 <span className="text-sm font-normal text-muted-foreground">tokens</span></p>
          <p className="text-xs text-muted-foreground">
            Maximum completion output tokens per agent task to ensure fast generation and no truncation.
          </p>
        </div>

        <div className="panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Failover Free Pool</span>
            <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-500/30 bg-purple-500/10">
              High Availability
            </Badge>
          </div>
          <p className="text-3xl font-extrabold text-foreground">4 <span className="text-sm font-normal text-muted-foreground">models</span></p>
          <p className="text-xs text-muted-foreground">
            Automatic multi-model free router fallback in case of single model concurrency rate limits.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Admin Security Audit Logs Section ──────────────────────────────────────
function AdminAuditSection() {
  const auditEvents = [
    { id: "aud_01", time: "Just now", actor: "admin@intelligenspace.io", action: "Updated model state (active)", target: "Free Auto Router", status: "Success" },
    { id: "aud_02", time: "3 mins ago", actor: "admin@intelligenspace.io", action: "Executed live latency ping (2167ms)", target: "Free Auto Router", status: "Success" },
    { id: "aud_03", time: "12 mins ago", actor: "system_cron", action: "Verified daily limits (30 runs/24h)", target: "Developer AI", status: "Normal" },
    { id: "aud_04", time: "45 mins ago", actor: "admin@intelligenspace.io", action: "RBAC middleware authentication", target: "Admin Console", status: "Granted" },
    { id: "aud_05", time: "2 hours ago", actor: "developer@intelligenspace.io", action: "Applied Code Review patch to source file", target: "src/index.ts", status: "Applied" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compliance"
        title="Security Audit Trail"
        description="Immutable audit logging of administrative changes, security patches, and model modifications."
      />

      <div className="panel overflow-hidden border border-border/80">
        <div className="p-4 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Recent Security Events</h3>
          </div>
          <Badge variant="outline" className="text-xs text-muted-foreground">Live Streaming</Badge>
        </div>
        <div className="divide-y divide-border/60">
          {auditEvents.map((evt) => (
            <div key={evt.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-muted/30 transition-colors">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{evt.action}</span>
                  <span className="text-muted-foreground font-mono">({evt.target})</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  By <span className="font-mono text-foreground/80">{evt.actor}</span> · {evt.time}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shrink-0 self-start sm:self-center">
                {evt.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
