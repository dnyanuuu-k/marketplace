"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ShoppingBag,
  DollarSign,
  Wallet,
  Briefcase,
  Star,
  MessageSquare,
  Settings,
  Users,
  Receipt,
  Banknote,
  Percent,
  AlertTriangle,
  Bell,
  FileText,
  ClipboardList,
  Search,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  User,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Crown,
  HelpCircle,
  BarChart3,
  Heart,
  Truck,
  ChevronDown,
  Home,
  Package,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigationStore } from "@/store/navigation";
import { useAuthStore, type UserRole } from "@/store/auth";
import { cn } from "@/lib/utils";
import { apiFetch, apiPatch } from "@/lib/api-client";
import { CommandPalette, useCommandPalette } from "@/components/shared/command-palette";
import { NotificationDropdown, type Notification } from "@/components/shared/notification-dropdown";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  section?: string;
  badge?: number;
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  SUPER_ADMIN: [
    { id: "admin", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
    { id: "admin/users", label: "Users", icon: Users, section: "Overview" },
    { id: "admin/transactions", label: "Transactions", icon: Receipt, section: "Finance" },
    { id: "admin/payouts", label: "Payouts", icon: Banknote, section: "Finance" },
    { id: "admin/commissions", label: "Commissions", icon: Percent, section: "Finance" },
    { id: "admin/disputes", label: "Disputes", icon: AlertTriangle, section: "Moderation" },
    { id: "admin/reviews", label: "Reviews", icon: Star, section: "Moderation" },
    { id: "admin/notifications", label: "Notifications", icon: Bell, section: "System" },
    { id: "admin/settings", label: "Settings", icon: Settings, section: "System" },
    { id: "admin/audit-log", label: "Audit Log", icon: FileText, section: "System" },
    { id: "notifications", label: "Notifications", icon: Bell, section: "Support" },
    { id: "help", label: "Help & Support", icon: HelpCircle, section: "Support" },
  ],
  MODERATOR: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
    { id: "mod/applications", label: "Applications", icon: ClipboardList, section: "Moderation" },
    { id: "mod/reviews", label: "Reviews", icon: Star, section: "Moderation" },
    { id: "mod/users", label: "Users", icon: Users, section: "Moderation" },
    { id: "notifications", label: "Notifications", icon: Bell, section: "Support" },
    { id: "help", label: "Help & Support", icon: HelpCircle, section: "Support" },
  ],
  AUTHOR: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
    { id: "browse-projects", label: "Browse Projects", icon: Store, section: "Overview" },
    { id: "dashboard/analytics", label: "Analytics", icon: BarChart3, section: "Overview" },
    { id: "dashboard/earnings", label: "Earnings", icon: DollarSign, section: "Finance" },
    { id: "dashboard/withdraw", label: "Withdraw", icon: Wallet, section: "Finance" },
    { id: "dashboard/tracking", label: "Order Tracking", icon: Truck, section: "Finance" },
    { id: "dashboard/my-projects", label: "My Projects", icon: Package, section: "Content" },
    { id: "dashboard/portfolio", label: "Portfolio", icon: Briefcase, section: "Content" },
    { id: "dashboard/reviews", label: "Reviews", icon: Star, section: "Content" },
    { id: "dashboard/messages", label: "Messages", icon: MessageSquare, section: "Communication" },
    { id: "dashboard/settings", label: "Settings", icon: Settings, section: "Account" },
    { id: "notifications", label: "Notifications", icon: Bell, section: "Support" },
    { id: "help", label: "Help & Support", icon: HelpCircle, section: "Support" },
  ],
  BUYER: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
    { id: "browse-projects", label: "Browse Projects", icon: Store, section: "Overview" },
    { id: "dashboard/analytics", label: "Analytics", icon: BarChart3, section: "Overview" },
    { id: "dashboard/purchases", label: "Purchases", icon: ShoppingBag, section: "Activity" },
    { id: "dashboard/tracking", label: "Order Tracking", icon: Truck, section: "Activity" },
    { id: "dashboard/wishlist", label: "Wishlist", icon: Heart, section: "Activity" },
    { id: "disputes", label: "Disputes", icon: ShieldAlert, section: "Activity" },
    { id: "dashboard/messages", label: "Messages", icon: MessageSquare, section: "Communication" },
    { id: "dashboard/reviews", label: "Reviews", icon: Star, section: "Activity" },
    { id: "dashboard/settings", label: "Settings", icon: Settings, section: "Account" },
    { id: "notifications", label: "Notifications", icon: Bell, section: "Support" },
    { id: "help", label: "Help & Support", icon: HelpCircle, section: "Support" },
  ],
};

const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  MODERATOR: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  AUTHOR: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  BUYER: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Admin",
  MODERATOR: "Moderator",
  AUTHOR: "Author",
  BUYER: "Buyer",
};

// Page name mapping for breadcrumbs
const PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  "dashboard/analytics": "Analytics",
  "dashboard/earnings": "Earnings",
  "dashboard/withdraw": "Withdraw",
  "dashboard/tracking": "Order Tracking",
  "dashboard/portfolio": "Portfolio",
  "dashboard/reviews": "Reviews",
  "dashboard/messages": "Messages",
  "dashboard/settings": "Settings",
  "dashboard/purchases": "Purchases",
  "dashboard/my-projects": "My Projects",
  "dashboard/wishlist": "Wishlist",
  disputes: "Disputes",
  admin: "Admin Dashboard",
  "admin/users": "Users",
  "admin/transactions": "Transactions",
  "admin/payouts": "Payouts",
  "admin/commissions": "Commissions",
  "admin/disputes": "Disputes",
  "admin/reviews": "Reviews",
  "admin/notifications": "Notifications",
  "admin/settings": "Settings",
  "admin/audit-log": "Audit Log",
  "mod/applications": "Applications",
  "mod/reviews": "Reviews",
  "mod/users": "Users",
  notifications: "Notifications",
  help: "Help & Support",
  browse: "Browse",
  "browse-projects": "Browse Projects",
  "project-detail": "Project Detail",
  profile: "Profile",
};

function SidebarNavItems({
  items,
  currentPage,
  collapsed,
  onNavigate,
}: {
  items: NavItem[];
  currentPage: string;
  collapsed: boolean;
  onNavigate: (id: string) => void;
}) {
  const itemsWithSections = items.map((item, index) => {
    const prevSection = index > 0 ? items[index - 1].section : null;
    const showSection = item.section !== prevSection;
    return { ...item, showSection };
  });

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="flex flex-col gap-1 px-2">
        {itemsWithSections.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;

          return (
            <React.Fragment key={item.id}>
              {item.showSection && !collapsed && (
                <div className="mt-5 mb-1 px-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {item.section}
                  </span>
                  <Separator className="mt-1 bg-border/40" />
                </div>
              )}
              {item.showSection && collapsed && (
                <div className="my-2 mx-2">
                  <Separator className="bg-border/40" />
                </div>
              )}
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onNavigate(item.id)}
                      className={cn(
                        "relative flex items-center justify-center w-full h-10 rounded-lg transition-all duration-200 group",
                        "hover:bg-accent hover:text-accent-foreground",
                        isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : ""
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active-collapsed"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-500"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                      <Icon className="size-[18px]" />
                      {/* Active glow effect */}
                      {isActive && (
                        <div className="absolute inset-0 rounded-lg bg-emerald-500/5 shadow-[0_0_12px_rgba(16,185,129,0.15)]" />
                      )}
                      {item.badge && item.badge > 0 && (
                        <div className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                          {item.badge > 9 ? "9+" : item.badge}
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "relative flex items-center gap-3 w-full h-10 px-3 rounded-lg text-sm transition-all duration-200 group text-left",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                      : ""
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-500"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon className="size-[18px] shrink-0" />
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <div className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 shrink-0">
                      {item.badge > 9 ? "9+" : item.badge}
                    </div>
                  )}
                  {/* Active glow effect */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-lg bg-emerald-500/5 shadow-[0_0_12px_rgba(16,185,129,0.15)] pointer-events-none" />
                  )}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

// Breadcrumb component
function Breadcrumb({ currentPage }: { currentPage: string }) {
  const parts: string[] = [];
  if (currentPage.includes("/")) {
    const [first, ...rest] = currentPage.split("/");
    parts.push(first);
    parts.push(rest.join("/"));
  } else {
    parts.push(currentPage);
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Home className="size-3.5" />
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="size-3 text-muted-foreground/50" />}
          <span className={i === parts.length - 1 ? "text-foreground font-medium" : ""}>
            {PAGE_LABELS[parts.slice(0, i + 1).join("/")] || part.charAt(0).toUpperCase() + part.slice(1)}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { currentPage, navigate } = useNavigationStore();
  const { user, logout } = useAuthStore();
  const commandPalette = useCommandPalette();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notificationsData } = useQuery<{
    data: Notification[];
    unreadCount: number;
  }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const json = await apiFetch<{
        success: boolean;
        data: {
          data: Notification[];
          total: number;
          page: number;
          limit: number;
          unreadCount: number;
        };
      }>("/api/notifications?limit=20");
      const payload = json.data;
      return {
        data: (payload.data ?? []) as Notification[],
        unreadCount: payload.unreadCount ?? 0,
      };
    },
    refetchInterval: 30_000,
    enabled: !!user,
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiPatch("/api/notifications/read-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      try {
        await apiPatch(`/api/notifications/${notificationId}/read`, {});
      } catch {
        await apiPatch("/api/notifications/read-all", {});
      }
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = notificationsData?.data || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  // Add unread badge to messages nav item
  const navItems = useMemo(() => {
    const items = user ? NAV_BY_ROLE[user.role] : NAV_BY_ROLE.BUYER;
    return items.map((item) => {
      if (item.id === "dashboard/messages" && unreadCount > 0) {
        return { ...item, badge: unreadCount };
      }
      return item;
    });
  }, [user, unreadCount]);

  const handleNotificationClick = useCallback(
    (notificationId: string) => {
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification) {
        markAsReadMutation.mutate(notificationId);
        const type = notification.type;
        switch (type) {
          case "new_sale":
            navigate("dashboard/earnings");
            break;
          case "new_message":
            navigate("dashboard/messages");
            break;
          case "review_received":
            navigate("dashboard/reviews");
            break;
          case "transaction_update":
            if (user?.role === "BUYER") {
              navigate("dashboard/purchases");
            } else {
              navigate("dashboard/earnings");
            }
            break;
          case "account_approved":
            navigate("dashboard");
            break;
          case "payout_processed":
            navigate("dashboard/withdraw");
            break;
          case "dispute_opened":
            if (user?.role === "SUPER_ADMIN") {
              navigate("admin/disputes");
            } else {
              navigate("dashboard/purchases");
            }
            break;
          default:
            if (notification.link) {
              navigate(notification.link);
            }
            break;
        }
      }
    },
    [notifications, markAsReadMutation, navigate, user?.role]
  );

  const handleViewAllNotifications = useCallback(() => {
    navigate("notifications");
  }, [navigate]);

  const roleLabel = user ? ROLE_LABELS[user.role] : "User";
  const roleBadgeClass = user ? ROLE_COLORS[user.role] : "";
  const isVerifiedAuthor = user?.role === "AUTHOR";

  // Get the bottom nav items (primary 4 for mobile)
  const bottomNavItems = navItems.slice(0, 4);

  const handleNavigate = (id: string) => {
    navigate(id);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("landing");
  };

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Desktop Layout */}
      <div className="flex flex-1">
        {/* Sidebar - Desktop - Enhanced */}
        <motion.aside
          className="hidden md:flex flex-col border-r border-border h-screen sticky top-0 overflow-hidden relative"
          animate={{ width: collapsed ? 64 : 240 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.03] via-transparent to-emerald-500/[0.02] dark:from-emerald-500/[0.05] dark:via-transparent dark:to-emerald-500/[0.03] pointer-events-none" />
          <div className="relative flex flex-col h-full bg-sidebar">
            {/* Logo */}
            <div className="flex items-center h-16 px-4 border-b border-border/60 shrink-0">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="font-semibold text-foreground whitespace-nowrap overflow-hidden"
                    >
                      Marketplace
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 py-3 custom-scroll">
              <SidebarNavItems
                items={navItems}
                currentPage={currentPage}
                collapsed={collapsed}
                onNavigate={handleNavigate}
              />
            </ScrollArea>

            {/* User info at bottom */}
            <div className="border-t border-border/60 p-3 shrink-0 bg-sidebar/80">
              <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                <div className="relative shrink-0">
                  <Avatar className="size-9 ring-2 ring-background shadow-sm">
                    <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || "User"} />
                    <AvatarFallback className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  {isVerifiedAuthor && (
                    <div className="absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full p-0.5 shadow-sm">
                      <Crown className="size-2.5 text-white" />
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col min-w-0 overflow-hidden"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground truncate">
                          {user?.name || "User"}
                        </span>
                        {isVerifiedAuthor && (
                          <Badge className="text-[9px] px-1 py-0 h-4 bg-gradient-to-r from-amber-400 to-amber-500 text-white border-0 shadow-sm shrink-0">
                            PRO
                          </Badge>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn("text-[10px] px-1.5 py-0 h-4 w-fit", roleBadgeClass)}
                      >
                        {roleLabel}
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Collapse toggle */}
            <div className="border-t border-border/60 p-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-muted-foreground hover:text-foreground hover:bg-accent"
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? (
                  <ChevronRight className="size-4" />
                ) : (
                  <>
                    <ChevronLeft className="size-4" />
                    <span className="text-xs ml-1">Collapse</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.aside>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar - Enhanced */}
          <header className="sticky top-0 z-40 flex items-center h-16 px-4 md:px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {/* Gradient bottom border */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {/* Mobile menu trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden mr-2">
                  <Menu className="size-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="h-16 flex flex-row items-center px-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">M</span>
                    </div>
                    <SheetTitle className="font-semibold">Marketplace</SheetTitle>
                  </div>
                </SheetHeader>
                <ScrollArea className="flex-1 py-2 custom-scroll">
                  <SidebarNavItems
                    items={navItems}
                    currentPage={currentPage}
                    collapsed={false}
                    onNavigate={handleNavigate}
                  />
                </ScrollArea>
                <div className="border-t border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="size-9">
                        <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || "User"} />
                        <AvatarFallback className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      {isVerifiedAuthor && (
                        <div className="absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full p-0.5">
                          <Crown className="size-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{user?.name || "User"}</span>
                        {isVerifiedAuthor && (
                          <Badge className="text-[9px] px-1 py-0 h-4 bg-gradient-to-r from-amber-400 to-amber-500 text-white border-0 shadow-sm shrink-0">
                            PRO
                          </Badge>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn("text-[10px] px-1.5 py-0 h-4 w-fit", roleBadgeClass)}
                      >
                        {roleLabel}
                      </Badge>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Breadcrumb */}
            <div className="hidden md:flex mr-4">
              <Breadcrumb currentPage={currentPage} />
            </div>

            {/* Search - Enhanced */}
            <div className="flex-1 max-w-md">
              <button
                onClick={() => commandPalette.setOpen(true)}
                className="flex items-center gap-2 w-full h-10 px-3 rounded-lg bg-muted/50 border border-border/50 text-sm text-muted-foreground hover:bg-muted hover:border-border transition-all cursor-pointer group"
              >
                <Search className="size-4 shrink-0 group-hover:text-foreground transition-colors" />
                <span className="flex-1 text-left">Search...</span>
                <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-sm">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </button>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1 ml-4">
              {/* Theme toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-lg"
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    >
                      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span className="sr-only">Toggle theme</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle theme</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Notifications */}
              <NotificationDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAllRead={() => markAllReadMutation.mutate()}
                onNotificationClick={handleNotificationClick}
                onViewAll={handleViewAllNotifications}
              />

              {/* User menu - Enhanced */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="size-9 rounded-full ml-1 ring-2 ring-transparent hover:ring-border transition-all">
                    <div className="relative">
                      <Avatar className="size-8">
                        <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || "User"} />
                        <AvatarFallback className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      {isVerifiedAuthor && (
                        <div className="absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full p-0.5 shadow-sm">
                          <Crown className="size-2 text-white" />
                        </div>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2">
                  <DropdownMenuLabel className="p-2 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="size-10 ring-1 ring-border">
                          <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || "User"} />
                          <AvatarFallback className="text-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        {isVerifiedAuthor && (
                          <div className="absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full p-0.5 shadow-sm">
                            <Crown className="size-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
                          {isVerifiedAuthor && (
                            <Badge className="text-[9px] px-1 py-0 h-4 bg-gradient-to-r from-amber-400 to-amber-500 text-white border-0 shadow-sm shrink-0">
                              PRO
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] px-1.5 py-0 h-4 w-fit", roleBadgeClass)}
                        >
                          {roleLabel}
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleNavigate("dashboard/settings")} className="rounded-md px-2 py-1.5 cursor-pointer">
                    <User className="mr-2 size-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigate("dashboard/settings")} className="rounded-md px-2 py-1.5 cursor-pointer">
                    <Settings className="mr-2 size-4" />
                    Settings
                  </DropdownMenuItem>
                  {(user?.role === "SUPER_ADMIN" || user?.role === "MODERATOR") && (
                    <DropdownMenuItem
                      onClick={() =>
                        handleNavigate(user.role === "SUPER_ADMIN" ? "admin" : "dashboard")
                      }
                      className="rounded-md px-2 py-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="mr-2 size-4" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="rounded-md px-2 py-1.5 text-destructive focus:text-destructive cursor-pointer">
                    <LogOut className="mr-2 size-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="max-w-[1280px] mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Enhanced */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-inset-bottom">
        <div className="flex items-center h-16 px-2">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 h-full flex-1 max-w-[72px] transition-all duration-200",
                  isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground active:scale-90"
                )}
              >
                {/* Active pill background */}
                {isActive && (
                  <motion.div
                    layoutId="bottomNav-active"
                    className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 h-7 rounded-full bg-emerald-500/10"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <div className="relative z-10">
                  <Icon className="size-5" />
                  {item.badge && item.badge > 0 && (
                    <div className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                      {item.badge > 9 ? "9+" : item.badge}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </button>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 h-full flex-1 max-w-[72px] text-muted-foreground active:scale-90 transition-transform"
          >
            <Menu className="size-5" />
            <span className="text-[10px] font-medium leading-tight">More</span>
          </button>
        </div>
      </nav>

      {/* Command Palette */}
      <CommandPalette open={commandPalette.open} onOpenChange={commandPalette.onOpenChange} />
    </div>
  );
}
