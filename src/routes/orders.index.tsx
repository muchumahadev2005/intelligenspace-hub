import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ShoppingCart } from "lucide-react";
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
import { useOrders } from "@/hooks/use-platform";
import { dateTime, money } from "@/lib/format";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Orders — AI Platform" },
      { name: "description", content: "Orders placed through voice, chat and API channels by your AI agents." },
      { property: "og:title", content: "Orders — AI Platform" },
      { property: "og:description", content: "Track orders your AI agents captured end to end." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { data, isLoading, isError, refetch } = useOrders();
  const [status, setStatus] = useState("all");

  const orders = (data ?? []).filter((o) => status === "all" || o.status === status);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Business"
        title="Orders"
        description="Everything your agents sold across voice, chat and API."
        actions={
          <Button onClick={() => toast.success("Order created", { description: "Draft order ready to confirm." })}>
            <Plus /> New order
          </Button>
        }
      />

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="sm:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="processing">Processing</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : orders.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No orders" description="Orders captured by agents will land here." />
      ) : (
        <div className="panel overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden lg:table-cell">Channel</TableHead>
                <TableHead className="hidden md:table-cell">Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden xl:table-cell">Created</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link to="/orders/$id" params={{ id: o.id }} className="font-medium hover:underline">
                      {o.reference}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span>{o.customer}</span>
                    <span className="block text-xs text-muted-foreground">{o.agentName}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground capitalize">{o.channel}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{o.items.length}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell className="hidden xl:table-cell text-muted-foreground">{dateTime(o.createdAt)}</TableCell>
                  <TableCell className="text-right font-medium">{money(o.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
