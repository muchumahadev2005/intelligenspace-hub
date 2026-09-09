import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { devApi } from "@/services/developer-api";
import { toast } from "sonner";

export interface DeveloperAIModel {
  id: string;
  name: string;
  description: string;
  badge?: string;
  speed: "Ultra fast" | "Fast" | "Balanced" | "Deep reasoning";
  recommended?: boolean;
}

export const DEVELOPER_AI_MODELS: DeveloperAIModel[] = [
  {
    id: "openrouter/free",
    name: "Free Auto Router",
    description: "Smart load-balanced router across active models ($0/M tokens)",
    badge: "100% Free",
    speed: "Fast",
    recommended: true,
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B Instruct",
    description: "30.7B multimodal instruction model ($0/M tokens)",
    badge: "100% Free",
    speed: "Balanced",
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "Nemotron 3.5 Lightning",
    description: "Ultra-fast mixture-of-experts with 1M context ($0/M tokens)",
    badge: "100% Free",
    speed: "Ultra fast",
  },
  {
    id: "cohere/north-mini-code:free",
    name: "North Mini Code",
    description: "Dedicated agentic coding model for code analysis ($0/M tokens)",
    badge: "100% Free",
    speed: "Fast",
  },
  {
    id: "poolside/laguna-s-2.1:free",
    name: "Laguna S 2.1",
    description: "Specialized software engineering agent ($0/M tokens)",
    badge: "100% Free",
    speed: "Balanced",
  },
  {
    id: "nex-agi/nex-n2.5-pro:free",
    name: "Nex-N2.5 Pro",
    description: "Autonomous verified outcomes coding agent ($0/M tokens)",
    badge: "100% Free",
    speed: "Deep reasoning",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron 3 Ultra",
    description: "Frontier reasoning & orchestration 55B active params ($0/M tokens)",
    badge: "100% Free",
    speed: "Deep reasoning",
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Gemma 4 26B MoE",
    description: "High-efficiency mixture-of-experts ($0/M tokens)",
    badge: "100% Free",
    speed: "Ultra fast",
  },
  {
    id: "liquid/lfm-2.5-2.6b:free",
    name: "LiquidAI LFM 2.6B",
    description: "Compact rapid reasoning model for data extraction ($0/M tokens)",
    badge: "100% Free",
    speed: "Ultra fast",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Google next-gen multimodal reasoning with ultra-low latency & 1M context",
    badge: "Pro",
    speed: "Ultra fast",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "OpenAI high-speed intelligence for coding, analysis & agent workflows",
    badge: "Pro",
    speed: "Fast",
  },
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    description: "Anthropic rapid, compact intelligence for instant responses & tool execution",
    badge: "Pro",
    speed: "Ultra fast",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o Omnimodal",
    description: "OpenAI flagship frontier model for deep reasoning, complex code & architecture",
    badge: "Frontier",
    speed: "Deep reasoning",
  },
];

const STORAGE_KEY = "developer_ai_selected_model";
const DEFAULT_MODEL = "openrouter/free";

export function useDeveloperModel() {
  const queryClient = useQueryClient();

  // Query live enabled models from admin management
  const { data: dbModels } = useQuery({
    queryKey: ["admin", "models", "active"],
    queryFn: () => devApi.adminModels.list(true),
    staleTime: 60000,
  });

  const models: DeveloperAIModel[] = (dbModels && dbModels.length > 0)
    ? dbModels.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        badge: m.badge || "Free",
        speed: m.speed,
        recommended: m.isDefault,
      }))
    : DEVELOPER_AI_MODELS;

  const [selectedModelId, setSelectedModelIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return saved;
      } catch {}
    }
    return DEFAULT_MODEL;
  });

  // Listen for storage events across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setSelectedModelIdState(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setSelectedModelId = useCallback((id: string) => {
    setSelectedModelIdState(id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {}
    }
    const found = models.find((m) => m.id === id) || DEVELOPER_AI_MODELS.find((m) => m.id === id);
    if (found) {
      toast.success(`Active AI Model: ${found.name}`, {
        description: "Now powering all Developer AI agents",
      });
    }
  }, [models]);

  const selectedModel =
    models.find((m) => m.id === selectedModelId) ||
    models[0] ||
    DEVELOPER_AI_MODELS[0]!;

  // Quota & limits query
  const {
    data: quota,
    isLoading: isLoadingQuota,
    refetch: refetchQuota,
  } = useQuery({
    queryKey: ["dev", "limits"],
    queryFn: devApi.limits.get,
    staleTime: 10000,
    refetchInterval: 30000,
  });

  const runsToday = quota?.runsToday ?? 0;
  const dailyLimit = quota?.dailyLimit ?? 30;
  const remaining = quota?.remaining ?? Math.max(0, dailyLimit - runsToday);
  const hasReachedLimit = quota?.hasReachedLimit ?? (runsToday >= dailyLimit);

  const invalidateQuota = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["dev", "limits"] });
  }, [queryClient]);

  const assertCanRun = useCallback((): boolean => {
    if (hasReachedLimit) {
      toast.error("Developer AI daily quota reached", {
        description: `You have completed ${runsToday}/${dailyLimit} agent runs today. Limit resets in 24 hours.`,
      });
      return false;
    }
    return true;
  }, [hasReachedLimit, runsToday, dailyLimit]);

  return {
    models: DEVELOPER_AI_MODELS,
    selectedModel,
    selectedModelId,
    setSelectedModelId,
    quota: {
      runsToday,
      dailyLimit,
      remaining,
      hasReachedLimit,
      isLoading: isLoadingQuota,
      refetch: refetchQuota,
    },
    invalidateQuota,
    assertCanRun,
  };
}
