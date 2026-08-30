import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Printer } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrder } from "@/hooks/use-platform";
import { dateTime, money } from "@/lib/format";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order detail — AI Platform" },
      { name: "description", content: "Line items, fulfilment timeline and customer details for an AI-captured order." },
      { property: "og:title", content: "Order detail — AI Platform" },
      { property: "og:description", content: "Review and fulfil an order captured by an AI agent." },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { data: order, isLoading, isError, refetch } = useOrder(id);

  if (isLoading) return <AppShell><TableSkeleton /></AppShell>;
  if (isError || !order)
    return (
      <AppShell>
        <ErrorState title="Order not found" onRetry={() => refetch()} />
      </AppShell>
    );

  return (
    <AppShell>
      <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to orders
      </Link>

      <PageHeader
        eyebrow={`Order · ${order.channel}`}
        title={order.reference}
        description={`Placed by ${order.customer} via ${order.agentName}.`}
        actions={
          <>
            <Button variant="outline" onClick={() => toast.success("Invoice sent to printer")}>
              <Printer /> Print invoice
            </Button>
            <Button onClick={() => toast.success("Order marked complete")}>
              <CheckCircle2 /> Mark complete
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Status", <StatusBadge key="s" status={order.status} />],
          ["Total", money(order.total)],
          ["Customer phone", order.phone],
          ["Created", dateTime(order.createdAt)],
        ].map(([label, value], i) => (
          <div key={i} className="panel p-4">
            <p className="text-xs text-muted-foreground">{label as string}</p>
            <div className="mt-1.5 text-sm font-semibold">{value as never}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel overflow-x-auto lg:col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{money(item.price)}</TableCell>
                  <TableCell className="text-right">{money(item.price * item.quantity)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">Total</TableCell>
                <TableCell className="text-right font-semibold">{money(order.total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="panel p-6">
          <h2 className="text-sm font-semibold">Timeline</h2>
          <ol className="mt-4 space-y-4">
            {order.timeline.map((step, i) => (
              <li key={i} className="relative pl-6 text-sm">
                <span className="absolute left-0 top-1.5 size-2 rounded-full bg-primary" aria-hidden />
                <p className="font-medium">{step.label}</p>
                <p className="text-xs text-muted-foreground">{dateTime(step.at)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </AppShell>
  );
}
