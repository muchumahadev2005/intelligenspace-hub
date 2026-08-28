import { useNavigate } from "@tanstack/react-router";
import { Bot, PhoneCall, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { navGroups } from "./nav";
import { useAgents, useCalls } from "@/hooks/use-platform";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: agents } = useAgents();
  const { data: calls } = useCalls();

  const go = (to: string) => {
    onOpenChange(false);
    void navigate({ to: to as "/" });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, agents, calls or run an action…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/agents/new")}>
            <Plus /> Create agent
          </CommandItem>
          <CommandItem onSelect={() => go("/templates")}>
            <Sparkles /> Start from a template
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              toast.success("Draft order created", {
                description: "Order #1050 is ready for items.",
              });
            }}
          >
            <Plus /> Create order
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {navGroups.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => (
              <CommandItem key={item.to} value={`${group.label} ${item.label}`} onSelect={() => go(item.to)}>
                <item.icon /> {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {agents?.length ? (
          <CommandGroup heading="Agents">
            {agents.slice(0, 6).map((agent) => (
              <CommandItem
                key={agent.id}
                value={`agent ${agent.name} ${agent.type}`}
                onSelect={() => go(`/agents/${agent.id}`)}
              >
                <Bot /> {agent.name}
                <span className="ml-auto text-xs text-muted-foreground">{agent.type}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {calls?.length ? (
          <CommandGroup heading="Recent calls">
            {calls.slice(0, 6).map((call) => (
              <CommandItem
                key={call.id}
                value={`call ${call.reference} ${call.customer}`}
                onSelect={() => go(`/calls/${call.id}`)}
              >
                <PhoneCall /> {call.customer}
                <span className="ml-auto text-xs text-muted-foreground">{call.reference}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
