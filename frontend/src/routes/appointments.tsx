import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Trash2,
  Clock,
  User,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppointments, useAgents } from "@/hooks/use-platform";
import { api } from "@/services/api";
import type { Appointment } from "@/types";

export const Route = createFileRoute("/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — AI Platform" },
      {
        name: "description",
        content: "Bookings your AI agents scheduled, with status, notes and customer contact details.",
      },
      { property: "og:title", content: "Appointments — AI Platform" },
      { property: "og:description", content: "Manage appointments booked by your AI agents." },
    ],
  }),
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const queryClient = useQueryClient();
  const { data: rawAppointments, isLoading, isError, refetch } = useAppointments();
  const { data: agents = [] } = useAgents();
  const [status, setStatus] = useState("all");

  // New Appointment Dialog State
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agentName, setAgentName] = useState("Receptionist AI");
  const [type, setType] = useState("Consultation");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:30");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [aptStatus, setAptStatus] = useState<"confirmed" | "pending">("confirmed");
  const [notes, setNotes] = useState("");

  const appointments: Appointment[] = (rawAppointments ?? []).filter(
    (a: Appointment) => status === "all" || a.status === status,
  );

  const resetForm = () => {
    setCustomer("");
    setPhone("");
    setEmail("");
    setAgentName("Receptionist AI");
    setType("Consultation");
    setDate(new Date().toISOString().slice(0, 10));
    setTime("10:30");
    setDurationMinutes(30);
    setAptStatus("confirmed");
    setNotes("");
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.appointments.create({
        customer: customer.trim(),
        phone: phone.trim(),
        email: email.trim(),
        agentName,
        type,
        date,
        time,
        durationMinutes,
        status: aptStatus,
        notes: notes.trim(),
      });

      // Optimistically update / invalidate appointments query
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setOpenNewDialog(false);
      resetForm();
      toast.success("Appointment created", {
        description: `Scheduled ${created.customer} on ${created.date} at ${created.time}.`,
      });
    } catch (err: any) {
      console.error("Failed to create appointment", err);
      toast.error("Failed to create appointment", {
        description: err?.message || "Please check database connection.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: Appointment["status"]) => {
    try {
      await api.appointments.update(id, { status: newStatus });
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(`Appointment marked as ${newStatus}`);
    } catch (err: any) {
      toast.error("Failed to update status", { description: err?.message });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.appointments.delete(id);
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment removed from schedule");
    } catch (err: any) {
      toast.error("Failed to delete appointment", { description: err?.message });
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operations"
        title="Appointments"
        description="Bookings captured by your agents during conversations."
        actions={
          <Button onClick={() => setOpenNewDialog(true)}>
            <Plus className="mr-1.5 size-4" /> New appointment
          </Button>
        }
      />

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="confirmed">Confirmed</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? (
        <TableSkeleton rows={7} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No appointments"
          description="Bookings will show up here as agents schedule them."
        />
      ) : (
        <div className="panel overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Agent</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden sm:table-cell">Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <span className="font-medium">{a.customer}</span>
                    <span className="block text-xs text-muted-foreground">{a.phone}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{a.type}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{a.agentName}</TableCell>
                  <TableCell>{a.date}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {a.time} · {a.durationMinutes}m
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUpdateStatus(a.id, "confirmed")}>
                          <CheckCircle2 className="mr-2 size-4 text-emerald-500" />
                          Mark Confirmed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(a.id, "completed")}>
                          <Clock className="mr-2 size-4 text-blue-500" />
                          Mark Completed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(a.id, "cancelled")}>
                          <XCircle className="mr-2 size-4 text-amber-500" />
                          Mark Cancelled
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(a.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* New Appointment Modal Dialog */}
      <Dialog open={openNewDialog} onOpenChange={setOpenNewDialog}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleCreateAppointment}>
            <DialogHeader>
              <DialogTitle>New appointment</DialogTitle>
              <DialogDescription>
                Schedule an appointment manually or assign it to an AI voice agent.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="customer">Customer name *</Label>
                  <Input
                    id="customer"
                    placeholder="e.g. Vikram Malhotra"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone number *</Label>
                  <Input
                    id="phone"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="customer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agent">Assigned agent</Label>
                  <Select value={agentName} onValueChange={setAgentName}>
                    <SelectTrigger id="agent">
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Receptionist AI">Receptionist AI</SelectItem>
                      <SelectItem value="Booking Assistant">Booking Assistant</SelectItem>
                      <SelectItem value="Sales Assistant">Sales Assistant</SelectItem>
                      {agents.map((ag) => (
                        <SelectItem key={ag.id} value={ag.name}>
                          {ag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="type">Appointment type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Consultation">Consultation</SelectItem>
                      <SelectItem value="Follow-up">Follow-up</SelectItem>
                      <SelectItem value="Product demo">Product demo</SelectItem>
                      <SelectItem value="Site visit">Site visit</SelectItem>
                      <SelectItem value="Discovery call">Discovery call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="duration">Duration</Label>
                  <Select
                    value={String(durationMinutes)}
                    onValueChange={(val) => setDurationMinutes(Number(val))}
                  >
                    <SelectTrigger id="duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aptStatus">Status</Label>
                  <Select
                    value={aptStatus}
                    onValueChange={(val: "confirmed" | "pending") => setAptStatus(val)}
                  >
                    <SelectTrigger id="aptStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes or preferences</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Needs directions or prefers WhatsApp confirmation"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenNewDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create appointment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
