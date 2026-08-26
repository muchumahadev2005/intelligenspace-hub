import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export const useAgents = () => useQuery({ queryKey: ["agents"], queryFn: api.agents.list });
export const useAgent = (id: string) =>
  useQuery({ queryKey: ["agents", id], queryFn: () => api.agents.get(id) });
export const useTemplates = () =>
  useQuery({ queryKey: ["templates"], queryFn: api.templates.list });
export const usePhoneNumbers = () =>
  useQuery({ queryKey: ["phone-numbers"], queryFn: api.phoneNumbers.list });
export const useCalls = () => useQuery({ queryKey: ["calls"], queryFn: api.calls.list });
export const useCall = (id: string) =>
  useQuery({ queryKey: ["calls", id], queryFn: () => api.calls.get(id) });
export const useRecordings = () =>
  useQuery({ queryKey: ["recordings"], queryFn: api.calls.recordings });
export const useAppointments = () =>
  useQuery({ queryKey: ["appointments"], queryFn: api.appointments.list });
export const useCatalog = () => useQuery({ queryKey: ["catalog"], queryFn: api.catalog.list });
export const useOrders = () => useQuery({ queryKey: ["orders"], queryFn: api.orders.list });
export const useOrder = (id: string) =>
  useQuery({ queryKey: ["orders", id], queryFn: () => api.orders.get(id) });
export const useWebhooks = () => useQuery({ queryKey: ["webhooks"], queryFn: api.webhooks.list });
export const useApiKeys = () =>
  useQuery({ queryKey: ["api-keys"], queryFn: api.developer.keys });
export const useUsage = () => useQuery({ queryKey: ["usage"], queryFn: api.usage.records });
export const useTeam = () => useQuery({ queryKey: ["team"], queryFn: api.team.list });
export const useNotifications = () =>
  useQuery({ queryKey: ["notifications"], queryFn: api.notifications.list });
export const useWorkspaces = () =>
  useQuery({ queryKey: ["workspaces"], queryFn: api.workspaces.list });
export const useMetrics = () =>
  useQuery({ queryKey: ["metrics"], queryFn: api.dashboard.metrics });
export const useActivity = () =>
  useQuery({ queryKey: ["activity"], queryFn: api.dashboard.activity });
export const useSeries = (range: 7 | 30 | 90) =>
  useQuery({ queryKey: ["series", range], queryFn: () => api.dashboard.series(range) });
