import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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
import { useAppointments } from "@/hooks/use-platform";

export const Route = createFileRoute("/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — AI Platform" },
      { name: "description", content: "Bookings your AI agents scheduled, with status, notes and customer contact details." },
      { property: "og:title", content: "Appointments — AI Platform" },
      { property: "og:description", content: "Manage appointments booked by your AI agents." },
    ],
  }),
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const { data, isLoading, isError, refetch } = useAppointments();
  const [status, setStatus] = useState("all");

  const appointments = (data ?? []).filter((a) => status === "all" || a.status === status);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operations"
        title="Appointments"
        description="Bookings captured by your agents during conversations."
        actions={
          <Button onClick={() => toast.success("Appointment created", { description: "Added to the schedule." })}>
            <Plus /> New appointment
          </Button>
        }
      />

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="sm:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
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
        <EmptyState icon={CalendarDays} title="No appointments" description="Bookings will show up here as agents schedule them." />
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
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
