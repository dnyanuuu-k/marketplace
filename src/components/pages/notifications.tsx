"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCheck,
  DollarSign,
  Star,
  Info,
  AtSign,
  AlertTriangle,
  Settings,
  MessageSquare,
  ShieldCheck,
  Wallet,
  ExternalLink,
  ArrowRight,
  Eye,
  Reply,
  MessageCircle,
  SlidersHorizontal,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuthStore } from "@/store/auth";
import { useNavigationStore } from "@/store/navigation";
import { apiGet, apiPatch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ---- Types ----
interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

interface NotificationsResponse {
  data: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  unreadCount: number;
}

interface NotificationPrefs {
  newSale: boolean;
  newMessage: boolean;
  reviewReceived: boolean;
  transactionUpdate: boolean;
  accountUpdate: boolean;
  payoutProcessed: boolean;
  disputeUpdate: boolean;
}

// ---- Filter Tabs ----
type FilterTab = "all" | "unread" | "mentions" | "transactions" | "reviews" | "system";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "mentions", label: "Mentions" },
  { id: "transactions", label: "Transactions" },
  { id: "reviews", label: "Reviews" },
  { id: "system", label: "System" },
];

// ---- Type-to-icon mapping ----
const TYPE_ICONS: Record<string, React.ElementType> = {
  new_sale: DollarSign,
  transaction_update: DollarSign,
  payout_processed: Wallet,
  review_received: Star,
  review_reply: Star,
  new_message: MessageSquare,
  dispute_opened: AlertTriangle,
  dispute_update: AlertTriangle,
  account_approved: ShieldCheck,
  account_update: Settings,
  account_suspended: AlertTriangle,
  settings: Settings,
  mention: AtSign,
  default: Bell,
};

const TYPE_COLORS: Record<string, string> = {
  new_sale: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  transaction_update: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  payout_processed: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  review_received: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  review_reply: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  new_message: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
  mention: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
  dispute_opened: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
  dispute_update: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
  account_approved: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  account_update: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  account_suspended: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
  settings: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400",
  default: "bg-muted text-muted-foreground",
};

// ---- Type-to-action label mapping ----
const TYPE_ACTIONS: Record<string, string> = {
  new_sale: "View Transaction",
  transaction_update: "View Transaction",
  payout_processed: "View Payout",
  review_received: "View Review",
  review_reply: "Reply",
  new_message: "View Message",
  dispute_opened: "Review Dispute",
  dispute_update: "Review Dispute",
  account_approved: "View Profile",
  account_update: "View Details",
  mention: "View Mention",
  default: "View",
};

// ---- Type-to-category mapping ----
function getCategory(type: string): FilterTab {
  if (["new_sale", "transaction_update", "payout_processed"].includes(type)) return "transactions";
  if (["review_received", "review_reply"].includes(type)) return "reviews";
  if (["mention"].includes(type)) return "mentions";
  if (["dispute_opened", "dispute_update", "account_approved", "account_update", "account_suspended", "settings"].includes(type)) return "system";
  return "all";
}

// ---- Notification Navigation Map ----
function getNotificationTarget(type: string, role?: string): string {
  switch (type) {
    case "new_sale":
      return "dashboard/earnings";
    case "transaction_update":
      return role === "BUYER" ? "dashboard/purchases" : "dashboard/earnings";
    case "payout_processed":
      return "dashboard/withdraw";
    case "review_received":
    case "review_reply":
      return "dashboard/reviews";
    case "new_message":
      return "dashboard/messages";
    case "dispute_opened":
    case "dispute_update":
      return role === "SUPER_ADMIN" ? "admin/disputes" : "disputes";
    case "account_approved":
      return "dashboard";
    default:
      return "dashboard";
  }
}

// ---- Notification Preferences Config ----
const PREF_CONFIG = [
  { key: "newSale" as const, label: "Sales", icon: DollarSign },
  { key: "transactionUpdate" as const, label: "Transactions", icon: DollarSign },
  { key: "reviewReceived" as const, label: "Reviews", icon: Star },
  { key: "newMessage" as const, label: "Messages", icon: MessageSquare },
  { key: "payoutProcessed" as const, label: "Payouts", icon: Wallet },
  { key: "disputeUpdate" as const, label: "Disputes", icon: AlertTriangle },
  { key: "accountUpdate" as const, label: "Account", icon: Info },
];

// ---- Skeleton ----
function NotificationsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-40 rounded-2xl bg-gradient-to-r from-orange-500 via-red-500 to-rose-500 animate-pulse" />
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-border">
              <Skeleton className="size-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ---- Notification Card ----
function NotificationCard({
  notification,
  onMarkRead,
  onAction,
}: {
  notification: NotificationItem;
  onMarkRead: (id: string) => void;
  onAction: (notification: NotificationItem) => void;
}) {
  const Icon = TYPE_ICONS[notification.type] || TYPE_ICONS.default;
  const colorClass = TYPE_COLORS[notification.type] || TYPE_COLORS.default;
  const actionLabel = TYPE_ACTIONS[notification.type] || TYPE_ACTIONS.default;

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkRead(notification.id);
    }
    onAction(notification);
  };

  // Pick action icon based on type
  const ActionIcon = notification.type === "review_reply" || notification.type === "new_message"
    ? Reply
    : notification.type === "review_received"
    ? Star
    : Eye;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer group",
        !notification.isRead
          ? "bg-orange-50/50 border-orange-200/50 hover:bg-orange-100/50 dark:bg-orange-500/5 dark:border-orange-500/20 dark:hover:bg-orange-500/10"
          : "border-border hover:bg-muted/30"
      )}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
      )}

      {/* Icon */}
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          colorClass
        )}
      >
        <Icon className="size-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-sm truncate",
              !notification.isRead && "font-semibold"
            )}
          >
            {notification.title}
          </p>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-xs text-muted-foreground/70">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
            })}
          </p>
          {!notification.isRead && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
              New
            </Badge>
          )}
        </div>
      </div>

      {/* Action button */}
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs gap-1"
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
      >
        <ActionIcon className="size-3.5" />
        {actionLabel}
      </Button>
    </motion.div>
  );
}

// ---- Main Notifications Page ----
export function NotificationsPage() {
  const { user } = useAuthStore();
  const { navigate } = useNavigationStore();
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);
  const [showPrefs, setShowPrefs] = useState(false);
  const limit = 10;

  // Fetch notifications
  const { data, isLoading, isError, error } = useQuery<NotificationsResponse>({
    queryKey: ["notifications-page", page, activeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (activeFilter === "unread") {
        params.set("isRead", "false");
      }
      const json = await apiGet<{ success: boolean; data: NotificationsResponse }>(`/api/notifications?${params}`);
      return json.data;
    },
    enabled: !!user,
  });

  // Fetch notification preferences
  const { data: prefs } = useQuery<NotificationPrefs>({
    queryKey: ["notification-prefs"],
    queryFn: async () => {
      const json = await apiGet<{ success: boolean; data: NotificationPrefs }>("/api/notifications/preferences");
      return json.data;
    },
    enabled: !!user,
  });

  const notifications = data?.data || [];
  const total = data?.total || 0;
  const unreadCount = data?.unreadCount || 0;
  const hasMore = page * limit < total;

  // Client-side filter by category
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "unread") return !n.isRead;
      if (activeFilter === "mentions") return getCategory(n.type) === "mentions" || n.type === "new_message";
      if (activeFilter === "transactions") return getCategory(n.type) === "transactions";
      if (activeFilter === "reviews") return getCategory(n.type) === "reviews";
      if (activeFilter === "system") return getCategory(n.type) === "system";
      return true;
    });
  }, [notifications, activeFilter]);

  // Count by filter
  const filterCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = {
      all: notifications.length,
      unread: notifications.filter((n) => !n.isRead).length,
      mentions: notifications.filter((n) => getCategory(n.type) === "mentions" || n.type === "new_message").length,
      transactions: notifications.filter((n) => getCategory(n.type) === "transactions").length,
      reviews: notifications.filter((n) => getCategory(n.type) === "reviews").length,
      system: notifications.filter((n) => getCategory(n.type) === "system").length,
    };
    return counts;
  }, [notifications]);

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiPatch(`/api/notifications/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-page"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiPatch("/api/notifications/read-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-page"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
  });

  // Update preferences
  const updatePrefMutation = useMutation({
    mutationFn: async (update: Partial<NotificationPrefs>) => {
      return apiPatch("/api/notifications/preferences", update);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-prefs"] });
    },
  });

  const handleMarkRead = useCallback(
    (id: string) => {
      markReadMutation.mutate(id);
    },
    [markReadMutation]
  );

  const handleAction = useCallback(
    (notification: NotificationItem) => {
      if (!notification.isRead) {
        markReadMutation.mutate(notification.id);
      }
      const target = notification.link || getNotificationTarget(notification.type, user?.role);
      navigate(target, { notificationId: notification.id });
    },
    [markReadMutation, navigate, user?.role]
  );

  const handlePrefToggle = useCallback(
    (key: keyof NotificationPrefs, value: boolean) => {
      updatePrefMutation.mutate({ [key]: value });
    },
    [updatePrefMutation]
  );

  const handleLoadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  if (isLoading) return <NotificationsSkeleton />;

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <EmptyState
          icon={<Bell />}
          title="Failed to load notifications"
          description={
            error instanceof Error ? error.message : "Something went wrong. Please try again."
          }
          action={{
            label: "Retry",
            onClick: () =>
              queryClient.invalidateQueries({ queryKey: ["notifications-page"] }),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gradient Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-red-500 to-rose-500 p-6 md:p-8 text-white"
      >
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 size-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-4 -left-4 size-24 rounded-full bg-white/10 blur-xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
              <Bell className="size-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Notification Center
              </h1>
              <p className="text-white/80 mt-1 text-sm">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                  : "You're all caught up!"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time indicator */}
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
              <span className="relative flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2.5 bg-emerald-400" />
              </span>
              <span className="text-xs font-medium">Live</span>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
              >
                <CheckCheck className="size-4 mr-1" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-wrap gap-2"
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveFilter(tab.id);
              setPage(1);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeFilter === tab.id
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/20"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
            )}
          >
            {tab.label}
            {filterCounts[tab.id] > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4 min-w-[18px]",
                  activeFilter === tab.id
                    ? "bg-white/25 text-white border-0"
                    : ""
                )}
              >
                {filterCounts[tab.id]}
              </Badge>
            )}
          </button>
        ))}

        {/* Preferences toggle */}
        <button
          onClick={() => setShowPrefs(!showPrefs)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all ml-auto",
            showPrefs
              ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
              : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/50"
          )}
        >
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Preferences</span>
        </button>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* Notification List */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredNotifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-16"
              >
                <div className="text-center">
                  <motion.div
                    animate={{
                      y: [0, -8, 0],
                      rotate: [0, -10, 10, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "loop",
                    }}
                    className="inline-block mb-4"
                  >
                    <div className="size-20 rounded-full bg-gradient-to-br from-orange-100 to-rose-100 dark:from-orange-500/10 dark:to-rose-500/10 flex items-center justify-center mx-auto">
                      <Bell className="size-10 text-orange-400 dark:text-orange-500" />
                    </div>
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    {activeFilter !== "all"
                      ? "No notifications in this category. Try checking a different filter."
                      : "You have no notifications right now. We'll let you know when something important happens."}
                  </p>
                  {activeFilter !== "all" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setActiveFilter("all")}
                    >
                      View All Notifications
                    </Button>
                  )}
                </div>
              </motion.div>
            ) : (
              filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onAction={handleAction}
                />
              ))
            )}
          </AnimatePresence>

          {/* Load More */}
          {hasMore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center pt-4"
            >
              <Button
                variant="outline"
                onClick={handleLoadMore}
                className="gap-2"
              >
                Load More
                <ArrowRight className="size-4" />
              </Button>
            </motion.div>
          )}

          {/* Page info */}
          {total > 0 && (
            <p className="text-center text-xs text-muted-foreground pt-2">
              Showing {Math.min(page * limit, total)} of {total} notifications
            </p>
          )}
        </div>

        {/* Right Sidebar - Preferences */}
        <div className="space-y-4">
          <AnimatePresence>
            {showPrefs && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <SlidersHorizontal className="size-4 text-orange-500" />
                      Notification Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {PREF_CONFIG.map((pref) => {
                      const PrefIcon = pref.icon;
                      const isEnabled = prefs ? prefs[pref.key] : true;
                      return (
                        <div key={pref.key} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <PrefIcon className="size-4 text-muted-foreground shrink-0" />
                            <Label htmlFor={`pref-${pref.key}`} className="text-sm cursor-pointer truncate">
                              {pref.label}
                            </Label>
                          </div>
                          <Switch
                            id={`pref-${pref.key}`}
                            checked={isEnabled}
                            onCheckedChange={(checked) =>
                              handlePrefToggle(pref.key, checked)
                            }
                            disabled={updatePrefMutation.isPending}
                          />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Stats Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Unread</span>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                  {unreadCount}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <Badge variant="secondary">{total}</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Read</span>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                  {total - unreadCount}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent Types Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">By Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(["transactions", "reviews", "mentions", "system"] as const).map((cat) => {
                const catColors: Record<string, string> = {
                  transactions: "bg-emerald-500",
                  reviews: "bg-amber-500",
                  mentions: "bg-purple-500",
                  system: "bg-blue-500",
                };
                const count = filterCounts[cat];
                if (count === 0) return null;
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <div className={cn("size-2 rounded-full", catColors[cat])} />
                    <span className="text-sm text-muted-foreground capitalize flex-1">{cat}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
