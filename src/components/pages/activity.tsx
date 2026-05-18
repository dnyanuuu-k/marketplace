"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  DollarSign,
  MessageSquare,
  Star,
  AlertTriangle,
  Settings,
  User,
  ShieldCheck,
  Wallet,
  ShoppingBag,
  FileText,
  Filter,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday, subDays, isAfter } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuthStore } from "@/store/auth";
import { useNavigationStore } from "@/store/navigation";
import { apiFetch, apiGet } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ---- Types ----
type ActivityType = "all" | "transactions" | "reviews" | "disputes" | "system";

interface NotificationActivity {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

interface DateGroup {
  label: string;
  items: NotificationActivity[];
}

// ---- Action icon mapping ----
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
  default: Activity,
};

const TYPE_COLORS: Record<string, string> = {
  new_sale: "bg-emerald-500",
  transaction_update: "bg-emerald-500",
  payout_processed: "bg-teal-500",
  review_received: "bg-amber-500",
  review_reply: "bg-amber-500",
  new_message: "bg-violet-500",
  dispute_opened: "bg-red-500",
  dispute_update: "bg-red-500",
  account_approved: "bg-emerald-500",
  account_update: "bg-sky-500",
  account_suspended: "bg-orange-500",
  settings: "bg-gray-500",
  default: "bg-primary",
};

const TYPE_ICON_COLORS: Record<string, string> = {
  new_sale: "text-emerald-600 dark:text-emerald-400",
  transaction_update: "text-emerald-600 dark:text-emerald-400",
  payout_processed: "text-teal-600 dark:text-teal-400",
  review_received: "text-amber-600 dark:text-amber-400",
  review_reply: "text-amber-600 dark:text-amber-400",
  new_message: "text-violet-600 dark:text-violet-400",
  dispute_opened: "text-red-600 dark:text-red-400",
  dispute_update: "text-red-600 dark:text-red-400",
  account_approved: "text-emerald-600 dark:text-emerald-400",
  account_update: "text-sky-600 dark:text-sky-400",
  account_suspended: "text-orange-600 dark:text-orange-400",
  settings: "text-muted-foreground",
  default: "text-primary",
};

function getCategoryFromType(type: string): ActivityType {
  if (["new_sale", "transaction_update", "payout_processed"].includes(type)) return "transactions";
  if (["review_received", "review_reply"].includes(type)) return "reviews";
  if (["dispute_opened", "dispute_update"].includes(type)) return "disputes";
  if (["account_approved", "account_update", "account_suspended", "settings"].includes(type)) return "system";
  return "all";
}

function getActionLabel(type: string): string {
  const labels: Record<string, string> = {
    new_sale: "New Sale",
    transaction_update: "Transaction Updated",
    payout_processed: "Payout Processed",
    review_received: "Review Received",
    review_reply: "Review Reply",
    new_message: "New Message",
    dispute_opened: "Dispute Opened",
    dispute_update: "Dispute Updated",
    account_approved: "Account Approved",
    account_update: "Account Update",
    account_suspended: "Account Suspended",
    settings: "Settings Changed",
  };
  return labels[type] || "Activity";
}

function getRelatedPage(type: string, userRole?: string): string | null {
  if (["new_sale", "transaction_update", "payout_processed"].includes(type)) {
    return userRole === "BUYER" ? "dashboard/purchases" : "dashboard/earnings";
  }
  if (["review_received", "review_reply"].includes(type)) return "dashboard/reviews";
  if (["new_message"].includes(type)) return "dashboard/messages";
  if (["dispute_opened", "dispute_update"].includes(type)) {
    return userRole === "BUYER" ? "dashboard/purchases" : "dashboard/earnings";
  }
  if (["account_approved", "account_update", "account_suspended"].includes(type)) return "dashboard/settings";
  return null;
}

// ---- Group by date ----
function groupByDate(items: NotificationActivity[]): DateGroup[] {
  const now = new Date();
  const startOfWeek = subDays(now, now.getDay());

  const groups: Record<string, NotificationActivity[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Earlier: [],
  };

  for (const item of items) {
    const date = new Date(item.createdAt);
    if (isToday(date)) {
      groups["Today"].push(item);
    } else if (isYesterday(date)) {
      groups["Yesterday"].push(item);
    } else if (isAfter(date, startOfWeek)) {
      groups["This Week"].push(item);
    } else {
      groups["Earlier"].push(item);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// ---- Timeline Item ----
function TimelineItem({
  item,
  isFirst,
  isLast,
  onNavigate,
}: {
  item: NotificationActivity;
  isFirst: boolean;
  isLast: boolean;
  onNavigate: (page: string) => void;
}) {
  const Icon = TYPE_ICONS[item.type] || TYPE_ICONS.default;
  const dotColor = TYPE_COLORS[item.type] || TYPE_COLORS.default;
  const iconColor = TYPE_ICON_COLORS[item.type] || TYPE_ICON_COLORS.default;
  const relatedPage = getRelatedPage(item.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-4 group"
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={cn(
            "size-8 rounded-full flex items-center justify-center shrink-0 border-2 border-background",
            dotColor
          )}
        >
          <Icon className={cn("size-4 text-white", iconColor)} style={{ color: "white" }} />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border min-h-[24px]" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-w-0 pb-6", isLast && "pb-0")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{getActionLabel(item.type)}</span>
              {!item.isRead && (
                <span className="size-2 rounded-full bg-primary shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {item.message}
            </p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* Related entity link */}
        {relatedPage && (
          <button
            onClick={() => onNavigate(relatedPage)}
            className="mt-2 text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            View details
            <ChevronDown className="size-3 rotate-[-90deg]" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ---- Skeleton ----
function ActivitySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="space-y-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 pb-6">
            <div className="flex flex-col items-center shrink-0">
              <Skeleton className="size-8 rounded-full" />
              {!i && <Skeleton className="w-0.5 flex-1 min-h-[24px]" />}
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Main Activity Page ----
export function ActivityPage() {
  const { user } = useAuthStore();
  const { navigate } = useNavigationStore();

  const [filter, setFilter] = useState<ActivityType>("all");

  // Fetch notifications as activity data
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["activity-notifications"],
    queryFn: async () => {
      const json = await apiFetch("/api/notifications?limit=100");
      const payload = json?.data ?? json;
      return {
        data: (payload.data ?? []) as NotificationActivity[],
        unreadCount: payload.unreadCount ?? 0,
      };
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const allActivities = data?.data || [];

  // Apply filter
  const filteredActivities = useMemo(() => {
    if (filter === "all") return allActivities;
    return allActivities.filter((a) => getCategoryFromType(a.type) === filter);
  }, [allActivities, filter]);

  // Group by date
  const grouped = useMemo(() => groupByDate(filteredActivities), [filteredActivities]);

  const handleNavigate = (page: string) => {
    navigate(page);
  };

  if (isLoading) return <ActivitySkeleton />;

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <EmptyState
          icon={<Activity />}
          title="Failed to load activity"
          description={
            error instanceof Error ? error.message : "Something went wrong. Please try again."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
          <p className="text-muted-foreground mt-1">
            Your recent activity and timeline
          </p>
        </div>
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as ActivityType)}
        >
          <SelectTrigger className="w-44">
            <Filter className="size-4 mr-2 shrink-0" />
            <SelectValue placeholder="Filter activity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activity</SelectItem>
            <SelectItem value="transactions">Transactions</SelectItem>
            <SelectItem value="reviews">Reviews</SelectItem>
            <SelectItem value="disputes">Disputes</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <EmptyState
          icon={<Activity />}
          title={
            filter !== "all"
              ? `No ${filter} activity`
              : "No activity yet"
          }
          description={
            filter !== "all"
              ? "Try selecting a different activity type"
              : "Your activity will appear here as you use the platform"
          }
          action={
            filter !== "all"
              ? {
                  label: "View all",
                  onClick: () => setFilter("all"),
                }
              : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {grouped.map((group) => (
                <div key={group.label} className="mb-8 last:mb-0">
                  {/* Date group header */}
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </h3>
                    <Separator className="flex-1" />
                    <Badge variant="secondary" className="text-xs">
                      {group.items.length}
                    </Badge>
                  </div>

                  {/* Timeline items */}
                  <div className="space-y-0">
                    {group.items.map((item, index) => (
                      <TimelineItem
                        key={item.id}
                        item={item}
                        isFirst={index === 0}
                        isLast={index === group.items.length - 1}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
