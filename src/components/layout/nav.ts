import {
  LayoutDashboard,
  Bot,
  LayoutTemplate,
  Phone,
  PhoneCall,
  AudioLines,
  CalendarDays,
  Package,
  ShoppingCart,
  Webhook,
  Code2,
  CreditCard,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Agents",
    items: [
      { label: "Agents", to: "/agents", icon: Bot },
      { label: "Templates", to: "/templates", icon: LayoutTemplate },
      { label: "Phone numbers", to: "/phone-numbers", icon: Phone },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Calls", to: "/calls", icon: PhoneCall },
      { label: "Recordings", to: "/recordings", icon: AudioLines },
      { label: "Appointments", to: "/appointments", icon: CalendarDays },
      { label: "Catalog", to: "/catalog", icon: Package },
      { label: "Orders", to: "/orders", icon: ShoppingCart },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Webhooks", to: "/webhooks", icon: Webhook },
      { label: "Developer AI", to: "/developer", icon: Sparkles },
      { label: "Projects", to: "/developer/projects", icon: FolderGit2 },
      { label: "AI tasks", to: "/developer/tasks", icon: ListChecks },
      { label: "API keys", to: "/api-keys", icon: Code2 },
      { label: "Usage & credits", to: "/usage", icon: CreditCard },
      { label: "Team", to: "/team", icon: Users },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
];

export const mobileNav: NavItem[] = [
  { label: "Home", to: "/", icon: LayoutDashboard, exact: true },
  { label: "Agents", to: "/agents", icon: Bot },
  { label: "Calls", to: "/calls", icon: PhoneCall },
  { label: "Orders", to: "/orders", icon: ShoppingCart },
];
