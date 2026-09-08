import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit2,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  Webhook as WebhookIcon,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWebhooks, useWebhookDeliveries } from "@/hooks/use-platform";
import { api } from "@/services/api";
import { relative } from "@/lib/format";
import type { WebhookEndpoint, WebhookDelivery } from "@/types";

export const Route = createFileRoute("/webhooks")({
  head: () => ({
    meta: [
      { title: "Webhooks — AI Platform" },
      {
        name: "description",
        content: "Send real-time events from IntelligenSpace Hub to your external applications and CRMs with signed deliveries.",
      },
      { property: "og:title", content: "Webhooks — AI Platform" },
      { property: "og:description", content: "Configure endpoints, signing secrets, and inspect real-time webhook delivery logs." },
    ],
  }),
  component: WebhooksPage,
});

const ALL_EVENTS = [
  { id: "appointment.created", label: "appointment.created", group: "Appointments" },
  { id: "appointment.updated", label: "appointment.updated", group: "Appointments" },
  { id: "appointment.cancelled", label: "appointment.cancelled", group: "Appointments" },
  { id: "order.created", label: "order.created", group: "Orders" },
  { id: "order.updated", label: "order.updated", group: "Orders" },
  { id: "call.completed", label: "call.completed", group: "Voice Calls" },
  { id: "agent.created", label: "agent.created", group: "AI Agents" },
  { id: "agent.updated", label: "agent.updated", group: "AI Agents" },
];

function WebhooksPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useWebhooks();
  const endpoints = data ?? [];

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [createdSecretData, setCreatedSecretData] = useState<{ name: string; secret: string } | null>(null);
  const [editWebhook, setEditWebhook] = useState<WebhookEndpoint | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deliveriesWebhook, setDeliveriesWebhook] = useState<WebhookEndpoint | null>(null);
  const [inspectDelivery, setInspectDelivery] = useState<WebhookDelivery | null>(null);

  // Form states for Create
  const [createName, setCreateName] = useState("");
  const [createUrl, setCreateUrl] = useState("");
  const [createEvents, setCreateEvents] = useState<string[]>([
    "appointment.created",
    "order.created",
    "call.completed",
  ]);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Form states for Edit
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editEvents, setEditEvents] = useState<string[]>([]);
  const [editActive, setEditActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Testing state
  const [testingId, setTestingId] = useState<string | null>(null);

  // Deliveries query
  const { data: deliveries, isLoading: deliveriesLoading, refetch: refetchDeliveries } =
    useWebhookDeliveries(deliveriesWebhook?.id ?? null);

  const handleOpenCreate = () => {
    setCreateName("");
    setCreateUrl("");
    setCreateEvents(["appointment.created", "order.created", "call.completed"]);
    setCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      toast.error("Please enter a webhook name");
      return;
    }
    if (!createUrl.trim()) {
      toast.error("Please enter a valid destination URL");
      return;
    }
    if (createEvents.length === 0) {
      toast.error("Please select at least one event");
      return;
    }

    setCreateSubmitting(true);
    try {
      const created = await api.webhooks.createWebhook({
        name: createName.trim(),
        url: createUrl.trim(),
        events: createEvents,
      });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setCreatedSecretData({ name: created.name, secret: created.secret });
      toast.success("Webhook created successfully", {
        description: "Copy your signing secret now.",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to create webhook");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenEdit = (w: WebhookEndpoint) => {
    setEditWebhook(w);
    setEditName(w.name);
    setEditUrl(w.url);
    setEditEvents([...w.events]);
    setEditActive(w.isActive);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWebhook) return;
    if (!editName.trim()) {
      toast.error("Please enter a name");
      return;
    }
    if (!editUrl.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }
    if (editEvents.length === 0) {
      toast.error("Please select at least one event");
      return;
    }

    setEditSubmitting(true);
    try {
      await api.webhooks.updateWebhook(editWebhook.id, {
        name: editName.trim(),
        url: editUrl.trim(),
        events: editEvents,
        isActive: editActive,
      });
      setEditWebhook(null);
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update webhook");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleActive = async (w: WebhookEndpoint) => {
    const nextState = !w.isActive;
    try {
      await api.webhooks.updateWebhook(w.id, { isActive: nextState });
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success(nextState ? "Webhook enabled" : "Webhook disabled", {
        description: nextState ? "Real-time events will be delivered." : "Event deliveries paused.",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle webhook");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await api.webhooks.deleteWebhook(deleteId);
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete webhook");
    }
  };

  const handleTestWebhook = async (w: WebhookEndpoint) => {
    setTestingId(w.id);
    try {
      const res = await api.webhooks.testWebhook(w.id);
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["webhook-deliveries", w.id] });

      if (res.success) {
        toast.success("Webhook test delivered successfully", {
          description: `HTTP ${res.statusCode} · ${res.durationMs}ms`,
        });
      } else {
        toast.error("Webhook test delivery failed", {
          description: res.error || `Destination returned HTTP ${res.statusCode} (${res.durationMs}ms)`,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to test webhook");
    } finally {
      setTestingId(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard", { description: label });
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Platform"
        title="Webhooks"
        description="Send real-time events from IntelligenSpace Hub to your applications."
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="size-4" /> Add Webhook
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : endpoints.length === 0 ? (
        <EmptyState
          icon={WebhookIcon}
          title="No webhooks configured"
          description="Add an endpoint to start receiving real-time event notifications for appointments, orders, calls, and agents."
          action={
            <Button onClick={handleOpenCreate}>
              <Plus className="size-4" /> Add Webhook
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {endpoints.map((w) => (
            <div
              key={w.id}
              className={`panel p-6 transition-all ${
                !w.isActive ? "opacity-75 bg-surface-2/40 border-dashed" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-semibold tracking-tight">{w.name}</h3>
                    {w.isActive ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[11px]">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-muted-foreground text-[11px]">
                        Disabled
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="font-mono text-xs text-muted-foreground break-all">{w.url}</span>
                    <button
                      onClick={() => copyToClipboard(w.url, w.url)}
                      aria-label="Copy endpoint URL"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 mr-2">
                    <span className="text-xs text-muted-foreground">{w.isActive ? "Enabled" : "Disabled"}</span>
                    <Switch
                      checked={w.isActive}
                      onCheckedChange={() => handleToggleActive(w)}
                      aria-label="Toggle webhook active status"
                    />
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={testingId === w.id}
                    onClick={() => handleTestWebhook(w)}
                  >
                    {testingId === w.id ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" /> Testing…
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" /> Test
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDeliveriesWebhook(w);
                      setInspectDelivery(null);
                    }}
                  >
                    <Clock className="size-3.5" /> View Deliveries
                  </Button>

                  <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(w)} aria-label="Edit webhook">
                    <Edit2 className="size-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(w.id)}
                    aria-label="Delete webhook"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {w.events.map((ev) => (
                  <Badge key={ev} variant="secondary" className="font-mono text-[11px]">
                    {ev}
                  </Badge>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  HMAC-SHA256 Signed
                </span>
                <span>•</span>
                <span>
                  Last delivery:{" "}
                  <strong className="font-medium text-foreground">
                    {w.lastDeliveryAt ? relative(w.lastDeliveryAt) : "Never"}
                  </strong>
                </span>
                <span>•</span>
                <span>Created {relative(w.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE WEBHOOK DIALOG ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>
              Configure an external endpoint to receive real-time JSON event notifications with HMAC signatures.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                placeholder="e.g., Laddu Store Website or CRM Integration"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-url">Endpoint URL</Label>
              <Input
                id="create-url"
                type="url"
                placeholder="https://example.com/api/webhooks/intelligenspace"
                value={createUrl}
                onChange={(e) => setCreateUrl(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Must be an HTTP/HTTPS endpoint reachable from IntelligenSpace Hub.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Subscribed Events</Label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setCreateEvents(ALL_EVENTS.map((e) => e.id))}
                  >
                    Select all
                  </button>
                  <span className="text-muted-foreground">/</span>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setCreateEvents([])}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-lg border border-border bg-surface-2/30">
                {ALL_EVENTS.map((ev) => {
                  const checked = createEvents.includes(ev.id);
                  return (
                    <label
                      key={ev.id}
                      className={`flex items-center gap-2.5 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                        checked
                          ? "border-primary/50 bg-primary/10 text-foreground font-medium"
                          : "border-border/60 hover:bg-surface-2 text-muted-foreground"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => {
                          if (c) {
                            setCreateEvents((prev) => [...prev, ev.id]);
                          } else {
                            setCreateEvents((prev) => prev.filter((x) => x !== ev.id));
                          }
                        }}
                      />
                      <span className="font-mono text-[11px]">{ev.id}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSubmitting}>
                {createSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Creating…
                  </>
                ) : (
                  "Create Webhook"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── SECRET CREATED MODAL (SHOWN ONCE) ── */}
      <Dialog open={Boolean(createdSecretData)} onOpenChange={(open) => !open && setCreatedSecretData(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-500 font-semibold mb-1">
              <CheckCircle2 className="size-5" />
              <span>Webhook Created</span>
            </div>
            <DialogTitle>{createdSecretData?.name}</DialogTitle>
            <DialogDescription>
              Your signing secret has been generated. This secret is used to verify that incoming webhook requests originate from IntelligenSpace Hub.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 space-y-3">
            <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <p>
                <strong>Copy this secret now.</strong> For your security, it will not be displayed again.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Webhook Signing Secret</Label>
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-surface-2 font-mono text-xs select-all">
                <span className="flex-1 truncate">{createdSecretData?.secret}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 px-2.5 text-xs gap-1 shrink-0"
                  onClick={() =>
                    createdSecretData?.secret &&
                    copyToClipboard(createdSecretData.secret, "Webhook signing secret copied")
                  }
                >
                  <Copy className="size-3" /> Copy Secret
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setCreatedSecretData(null)}>I have stored this secret safely</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT WEBHOOK DIALOG ── */}
      <Dialog open={Boolean(editWebhook)} onOpenChange={(open) => !open && setEditWebhook(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Webhook</DialogTitle>
            <DialogDescription>Update the endpoint name, destination URL, subscribed events, or active status.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-url">Endpoint URL</Label>
              <Input
                id="edit-url"
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-2/40">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Active Status</p>
                <p className="text-xs text-muted-foreground">Deliver real-time events to this endpoint.</p>
              </div>
              <Switch checked={editActive} onCheckedChange={setEditActive} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Subscribed Events</Label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setEditEvents(ALL_EVENTS.map((e) => e.id))}
                  >
                    Select all
                  </button>
                  <span className="text-muted-foreground">/</span>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setEditEvents([])}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-lg border border-border bg-surface-2/30">
                {ALL_EVENTS.map((ev) => {
                  const checked = editEvents.includes(ev.id);
                  return (
                    <label
                      key={ev.id}
                      className={`flex items-center gap-2.5 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                        checked
                          ? "border-primary/50 bg-primary/10 text-foreground font-medium"
                          : "border-border/60 hover:bg-surface-2 text-muted-foreground"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => {
                          if (c) {
                            setEditEvents((prev) => [...prev, ev.id]);
                          } else {
                            setEditEvents((prev) => prev.filter((x) => x !== ev.id));
                          }
                        }}
                      />
                      <span className="font-mono text-[11px]">{ev.id}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setEditWebhook(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the webhook endpoint and stop future event deliveries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete Webhook
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── DELIVERIES HISTORY SHEET ── */}
      <Sheet open={Boolean(deliveriesWebhook)} onOpenChange={(open) => !open && setDeliveriesWebhook(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-6 overflow-y-auto">
          <SheetHeader className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle>Delivery History</SheetTitle>
                <SheetDescription className="mt-1">
                  Recent deliveries for <strong className="text-foreground">{deliveriesWebhook?.name}</strong>
                </SheetDescription>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => refetchDeliveries()}
                className="gap-1 text-xs"
              >
                <RefreshCw className="size-3.5" /> Refresh
              </Button>
            </div>
          </SheetHeader>

          {inspectDelivery ? (
            /* ── DELIVERY DETAIL INSPECTOR ── */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => setInspectDelivery(null)}
                >
                  ← Back to deliveries
                </Button>
                <span className="font-mono text-xs text-muted-foreground">{inspectDelivery.id}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg border border-border bg-surface-2/40 text-xs">
                <div>
                  <span className="text-muted-foreground block">Event</span>
                  <span className="font-mono font-medium">{inspectDelivery.eventType || inspectDelivery.event}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Status</span>
                  <span className="font-medium capitalize">{inspectDelivery.status || inspectDelivery.state}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">HTTP Status</span>
                  <span className="font-mono font-medium">{inspectDelivery.httpStatus || inspectDelivery.statusCode || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Duration</span>
                  <span className="font-mono font-medium">{inspectDelivery.durationMs ? `${inspectDelivery.durationMs}ms` : "—"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block">Event ID</span>
                  <span className="font-mono text-[11px] truncate block">{inspectDelivery.eventId}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block">Attempt</span>
                  <span className="font-medium">{inspectDelivery.attempt ?? 1} of 5</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Event Payload</Label>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(inspectDelivery.payload, null, 2),
                        "Payload JSON copied"
                      )
                    }
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Copy className="size-3" /> Copy JSON
                  </button>
                </div>
                <pre className="p-3 rounded-lg border border-border bg-surface-2/80 font-mono text-[11px] overflow-x-auto max-h-60">
                  {JSON.stringify(inspectDelivery.payload, null, 2) || "No payload stored"}
                </pre>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Response Body</Label>
                  {inspectDelivery.response && (
                    <button
                      onClick={() =>
                        copyToClipboard(inspectDelivery.response || "", "Response copied")
                      }
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Copy className="size-3" /> Copy
                    </button>
                  )}
                </div>
                <pre className="p-3 rounded-lg border border-border bg-surface-2/80 font-mono text-[11px] overflow-x-auto max-h-40">
                  {inspectDelivery.response || "No response received"}
                </pre>
              </div>
            </div>
          ) : (
            /* ── DELIVERIES LIST ── */
            <div className="space-y-3">
              {deliveriesLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Loading deliveries…
                </div>
              ) : !deliveries || deliveries.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <p>No deliveries recorded yet.</p>
                  <p className="text-xs mt-1">
                    Click <strong>Test</strong> on the webhook card or trigger an event in IntelligenSpace Hub.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                  {deliveries.map((d) => {
                    const st = d.status || d.state;
                    const isSuccess = st === "delivered";
                    const isRetrying = st === "retrying";
                    return (
                      <div
                        key={d.id}
                        onClick={() => setInspectDelivery(d)}
                        className="p-3.5 hover:bg-surface-2/60 transition-colors cursor-pointer flex items-center gap-3 text-xs"
                      >
                        <span className="shrink-0">
                          {isSuccess ? (
                            <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                              <CheckCircle2 className="size-3.5" />
                            </span>
                          ) : isRetrying ? (
                            <span className="flex size-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                              <RefreshCw className="size-3.5 animate-spin" />
                            </span>
                          ) : (
                            <span className="flex size-6 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                              <XCircle className="size-3.5" />
                            </span>
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-foreground">
                              {d.eventType || d.event}
                            </span>
                            {d.httpStatus ? (
                              <span
                                className={`font-mono text-[10px] px-1.5 py-0.2 rounded border ${
                                  d.httpStatus >= 200 && d.httpStatus < 300
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    : "bg-destructive/10 text-destructive border-destructive/20"
                                }`}
                              >
                                HTTP {d.httpStatus}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-muted-foreground text-[11px] truncate mt-0.5">
                            {d.response || (isSuccess ? "Delivered successfully" : "Delivery pending")}
                          </p>
                        </div>

                        <div className="text-right shrink-0 text-muted-foreground">
                          <div>{d.durationMs ? `${d.durationMs}ms` : "—"}</div>
                          <div className="text-[10px]">{relative(d.createdAt || d.at || "")}</div>
                        </div>

                        <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
