"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  Search,
  Check,
  Clock,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Star,
  Eye,
  DollarSign,
  ShieldAlert,
  Package,
  ArrowUpDown,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAuthStore } from "@/store/auth";
import { useNavigationStore } from "@/store/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

// Types
interface TimelineStep {
  step: string;
  label: string;
  completed: boolean;
  current: boolean;
  date: string | null;
  description: string;
}

interface TrackingTransaction {
  id: string;
  amount: number;
  description: string | null;
  status: "PENDING" | "COMPLETED" | "DISPUTED" | "REFUNDED";
  createdAt: string;
  updatedAt: string;
  buyer: { id: string; name: string; avatarUrl: string | null };
  seller: { id: string; name: string; avatarUrl: string | null };
  timeline: TimelineStep[];
  commissionAmount: number;
  netAmount: number;
  dispute?: { id: string; reason: string; status: string; createdAt: string } | null;
}

interface TrackingStats {
  activeOrders: number;
  completedThisMonth: number;
  pendingPayment: number;
}

// Status config for colors/icons
const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; icon: React.ElementType; gradient: string }
> = {
  PENDING: {
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30",
    icon: Clock,
    gradient: "from-amber-500 to-amber-600",
  },
  COMPLETED: {
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30",
    icon: Check,
    gradient: "from-emerald-500 to-emerald-600",
  },
  DISPUTED: {
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30",
    icon: AlertTriangle,
    gradient: "from-red-500 to-red-600",
  },
  REFUNDED: {
    color: "text-violet-700 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30",
    icon: RotateCcw,
    gradient: "from-violet-500 to-violet-600",
  },
};

const TIMELINE_STEP_ICONS: Record<string, React.ElementType> = {
  created: Package,
  pending: Clock,
  completed: Check,
  disputed: AlertTriangle,
  refunded: RotateCcw,
};

// ─── Stat Card ──────────────────────────────────────────────────────
function TrackingStatCard({
  label,
  value,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}
            >
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground truncate">{label}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Timeline Step Component ────────────────────────────────────────
function TimelineStepNode({
  step,
  isLast,
  layout,
}: {
  step: TimelineStep;
  isLast: boolean;
  layout: "horizontal" | "vertical";
}) {
  const Icon = TIMELINE_STEP_ICONS[step.step] || Clock;

  const stepColor = useMemo(() => {
    if (step.completed && !step.current) return "emerald";
    if (step.current) {
      if (step.step === "disputed") return "red";
      if (step.step === "refunded") return "violet";
      return "amber";
    }
    return "muted";
  }, [step]);

  if (layout === "vertical") {
    return (
      <div className="flex gap-3">
        {/* Icon + connecting line column */}
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`
              size-8 rounded-full flex items-center justify-center shrink-0 border-2
              ${
                stepColor === "emerald"
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : stepColor === "amber"
                  ? "bg-amber-500 border-amber-500 text-white animate-pulse"
                  : stepColor === "red"
                  ? "bg-red-500 border-red-500 text-white"
                  : stepColor === "violet"
                  ? "bg-violet-500 border-violet-500 text-white"
                  : "bg-muted border-muted-foreground/30 text-muted-foreground"
              }
            `}
          >
            {step.completed ? (
              <Check className="size-4" />
            ) : (
              <Icon className="size-3.5" />
            )}
          </motion.div>
          {!isLast && (
            <div
              className={`w-0.5 flex-1 min-h-8 my-1 ${
                step.completed
                  ? step.current
                    ? "bg-amber-300 dark:bg-amber-600"
                    : "bg-emerald-300 dark:bg-emerald-600"
                  : "bg-muted-foreground/20 border-l border-dashed border-muted-foreground/30"
              }`}
            />
          )}
        </div>
        {/* Content column */}
        <div className="pb-6 min-w-0">
          <p
            className={`text-sm font-semibold ${
              stepColor === "emerald"
                ? "text-emerald-700 dark:text-emerald-400"
                : stepColor === "amber"
                ? "text-amber-700 dark:text-amber-400"
                : stepColor === "red"
                ? "text-red-700 dark:text-red-400"
                : stepColor === "violet"
                ? "text-violet-700 dark:text-violet-400"
                : "text-muted-foreground"
            }`}
          >
            {step.label}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {step.description}
          </p>
          {step.date && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {format(new Date(step.date), "MMM d, yyyy")}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Horizontal layout
  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`
          size-8 rounded-full flex items-center justify-center shrink-0 border-2
          ${
            stepColor === "emerald"
              ? "bg-emerald-500 border-emerald-500 text-white"
              : stepColor === "amber"
              ? "bg-amber-500 border-amber-500 text-white animate-pulse"
              : stepColor === "red"
              ? "bg-red-500 border-red-500 text-white"
              : stepColor === "violet"
              ? "bg-violet-500 border-violet-500 text-white"
              : "bg-muted border-muted-foreground/30 text-muted-foreground"
          }
        `}
      >
        {step.completed ? (
          <Check className="size-4" />
        ) : (
          <Icon className="size-3.5" />
        )}
      </motion.div>
      <p
        className={`text-xs font-semibold mt-2 text-center ${
          stepColor === "emerald"
            ? "text-emerald-700 dark:text-emerald-400"
            : stepColor === "amber"
            ? "text-amber-700 dark:text-amber-400"
            : stepColor === "red"
            ? "text-red-700 dark:text-red-400"
            : stepColor === "violet"
            ? "text-violet-700 dark:text-violet-400"
            : "text-muted-foreground"
        }`}
      >
        {step.label}
      </p>
      {step.date && (
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
          {format(new Date(step.date), "MMM d")}
        </p>
      )}
    </div>
  );
}

// ─── Horizontal connecting line between steps ───────────────────────
function TimelineConnector({
  completed,
  isLast,
}: {
  completed: boolean;
  isLast: boolean;
}) {
  if (isLast) return null;
  return (
    <div
      className={`h-0.5 flex-1 min-w-4 mt-4 ${
        completed
          ? "bg-emerald-300 dark:bg-emerald-600"
          : "bg-muted-foreground/20 border-t border-dashed border-muted-foreground/30"
      }`}
    />
  );
}

// ─── Transaction Tracking Card ──────────────────────────────────────
function TransactionTrackingCard({
  tx,
  userRole,
  navigate,
}: {
  tx: TrackingTransaction;
  userRole: string;
  navigate: (page: string, params?: Record<string, unknown>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[tx.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = config.icon;

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="overflow-hidden border border-border hover:shadow-md transition-shadow">
        {/* Card Header */}
        <CardContent className="p-4 sm:p-6">
          {/* Top row: Status badge + Amount + Expand toggle */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`size-10 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br ${config.gradient} text-white shadow-sm`}
              >
                <StatusIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={tx.status} size="sm" />
                  <span className="text-xs text-muted-foreground font-mono">
                    {tx.id.slice(0, 8)}...
                  </span>
                </div>
                <p className="text-sm font-medium truncate mt-1">
                  {tx.description || "Transaction"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-lg sm:text-xl font-bold tracking-tight">
                ${tx.amount.toFixed(2)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Date */}
          <p className="text-xs text-muted-foreground mb-4">
            {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}{" "}
            &middot; {format(new Date(tx.createdAt), "MMM d, yyyy")}
          </p>

          {/* Collapsed: Mini horizontal timeline */}
          {!expanded && (
            <div className="flex items-center gap-0 overflow-hidden">
              {tx.timeline.map((step, idx) => (
                <React.Fragment key={step.step}>
                  <div className="flex items-center gap-0">
                    <div
                      className={`size-5 rounded-full flex items-center justify-center shrink-0 border-2 ${
                        step.completed && !step.current
                          ? "bg-emerald-500 border-emerald-500"
                          : step.current
                          ? "bg-amber-500 border-amber-500 animate-pulse"
                          : "bg-muted border-muted-foreground/30"
                      }`}
                    >
                      {step.completed && (
                        <Check className="size-3 text-white" />
                      )}
                    </div>
                    {idx < tx.timeline.length - 1 && (
                      <div
                        className={`h-0.5 w-4 sm:w-6 ${
                          step.completed
                            ? "bg-emerald-300 dark:bg-emerald-600"
                            : "bg-muted-foreground/20"
                        }`}
                      />
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Expanded content */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-6">
                  {/* Full Timeline - Horizontal on desktop, vertical on mobile */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                      Transaction Flow
                    </h4>
                    {/* Desktop: horizontal */}
                    <div className="hidden sm:flex items-start">
                      {tx.timeline.map((step, idx) => (
                        <React.Fragment key={step.step}>
                          <TimelineStepNode
                            step={step}
                            isLast={idx === tx.timeline.length - 1}
                            layout="horizontal"
                          />
                          <TimelineConnector
                            completed={step.completed}
                            isLast={idx === tx.timeline.length - 1}
                          />
                        </React.Fragment>
                      ))}
                    </div>
                    {/* Mobile: vertical */}
                    <div className="sm:hidden">
                      {tx.timeline.map((step, idx) => (
                        <TimelineStepNode
                          key={step.step}
                          step={step}
                          isLast={idx === tx.timeline.length - 1}
                          layout="vertical"
                        />
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Parties Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Parties
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Buyer */}
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                        <Avatar className="size-9">
                          {tx.buyer.avatarUrl ? (
                            <AvatarImage src={tx.buyer.avatarUrl} />
                          ) : (
                            <AvatarFallback className="text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400">
                              {initials(tx.buyer.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {tx.buyer.name}
                          </p>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4 bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
                          >
                            Buyer
                          </Badge>
                        </div>
                      </div>
                      {/* Seller */}
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                        <Avatar className="size-9">
                          {tx.seller.avatarUrl ? (
                            <AvatarImage src={tx.seller.avatarUrl} />
                          ) : (
                            <AvatarFallback className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {initials(tx.seller.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {tx.seller.name}
                          </p>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          >
                            Author
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Financial Summary */}
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Financial Summary
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Gross Amount
                        </span>
                        <span className="text-sm font-semibold">
                          ${tx.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Platform Commission
                        </span>
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          -${tx.commissionAmount.toFixed(2)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Net Amount
                        </span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          ${tx.netAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dispute info if applicable */}
                  {tx.dispute && (
                    <>
                      <Separator />
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                            Dispute Opened
                          </span>
                        </div>
                        <p className="text-sm text-red-600 dark:text-red-400/80">
                          {tx.dispute.reason}
                        </p>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {userRole === "BUYER" ? (
                      <>
                        {tx.status === "COMPLETED" && !tx.dispute && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate("disputes", {
                                transactionId: tx.id,
                              })
                            }
                          >
                            <ShieldAlert className="size-4 mr-1" />
                            Open Dispute
                          </Button>
                        )}
                        {tx.status === "COMPLETED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate("transaction-detail", {
                                transactionId: tx.id,
                              })
                            }
                          >
                            <Star className="size-4 mr-1" />
                            Leave Review
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate("transaction-detail", {
                              transactionId: tx.id,
                            })
                          }
                        >
                          <Eye className="size-4 mr-1" />
                          View Details
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("dashboard/earnings")}
                        >
                          <DollarSign className="size-4 mr-1" />
                          View Earnings
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate("dashboard/messages", {
                              authorId: tx.buyer.id,
                            })
                          }
                        >
                          <MessageSquare className="size-4 mr-1" />
                          Message Buyer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate("transaction-detail", {
                              transactionId: tx.id,
                            })
                          }
                        >
                          <Eye className="size-4 mr-1" />
                          View Details
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────
function TrackingEmptyState() {
  const { navigate } = useNavigationStore();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <motion.div
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="size-24 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 flex items-center justify-center mb-6">
          <Package className="size-12 text-teal-500 dark:text-teal-400" />
        </div>
      </motion.div>
      <h3 className="text-xl font-bold mb-2">No orders to track</h3>
      <p className="text-muted-foreground text-center max-w-sm mb-6">
        Your order tracking timeline will appear here once you have active
        transactions.
      </p>
      <Button onClick={() => navigate("browse")} className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0">
        <Truck className="size-4 mr-2" />
        Browse Creators
      </Button>
    </motion.div>
  );
}

// ─── Loading Skeletons ──────────────────────────────────────────────
function TrackingPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <Skeleton className="h-40 w-full rounded-2xl" />
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      {/* Filter skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      {/* Cards skeleton */}
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-44 rounded-lg" />
      ))}
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────
export function DashboardTrackingPage() {
  const { user } = useAuthStore();
  const { navigate } = useNavigationStore();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["transaction-tracking", statusFilter, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      params.set("sort", sortOrder);
      params.set("limit", "50");
      const json = await apiFetch(`/api/transactions/tracking?${params}`);
      return json.data as {
        data: TrackingTransaction[];
        total: number;
        stats: TrackingStats;
      };
    },
  });

  const transactions = data?.data || [];
  const stats = data?.stats || { activeOrders: 0, completedThisMonth: 0, pendingPayment: 0 };

  // Client-side search filter
  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.description?.toLowerCase().includes(q) ||
        tx.buyer.name.toLowerCase().includes(q) ||
        tx.seller.name.toLowerCase().includes(q) ||
        tx.id.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  if (isLoading) {
    return <TrackingPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* ─── Gradient Header Banner ─── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-teal-600 to-cyan-600" />
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="tracking-pattern"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="20" cy="20" r="1.5" fill="white" />
              <path
                d="M20 0 L20 8 M20 32 L20 40 M0 20 L8 20 M32 20 L40 20"
                stroke="white"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#tracking-pattern)" />
        </svg>
        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex items-center gap-4">
            <div className="size-12 sm:size-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-lg">
              <Truck className="size-6 sm:size-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Order Tracking
              </h1>
              <p className="text-teal-100 mt-1 text-sm sm:text-base">
                {user?.role === "AUTHOR"
                  ? "Monitor your sales and transaction progress"
                  : "Track your purchases and order status"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Quick Stats ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TrackingStatCard
          label="Active Orders"
          value={stats.activeOrders}
          icon={Truck}
          colorClass="bg-teal-500/10 text-teal-600 dark:text-teal-400"
        />
        <TrackingStatCard
          label="Completed This Month"
          value={stats.completedThisMonth}
          icon={Check}
          colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <TrackingStatCard
          label="Pending Payment"
          value={stats.pendingPayment}
          icon={Clock}
          colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* ─── Filter & Sort Bar ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: "ALL", label: "All", icon: ArrowUpDown },
            { value: "PENDING", label: "Pending", icon: Clock },
            { value: "COMPLETED", label: "Completed", icon: Check },
            { value: "DISPUTED", label: "Disputed", icon: AlertTriangle },
            { value: "REFUNDED", label: "Refunded", icon: RotateCcw },
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isActive = statusFilter === tab.value;
            return (
              <Button
                key={tab.value}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(tab.value)}
                className={
                  isActive
                    ? "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white border-0"
                    : ""
                }
              >
                <TabIcon className="size-3.5 mr-1.5" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* Search + Sort row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by description or party name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="highest">Highest Amount</SelectItem>
              <SelectItem value="lowest">Lowest Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* ─── Transaction Tracking Cards ─── */}
      {filteredTransactions.length === 0 ? (
        <TrackingEmptyState />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredTransactions.length} transaction
              {filteredTransactions.length !== 1 ? "s" : ""}
            </p>
          </div>
          <AnimatePresence mode="popLayout">
            {filteredTransactions.map((tx, idx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05, duration: 0.25 }}
              >
                <TransactionTrackingCard
                  tx={tx}
                  userRole={user?.role || "BUYER"}
                  navigate={navigate}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
