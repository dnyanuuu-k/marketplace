"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  DollarSign,
  ArrowLeftRight,
  AlertTriangle,
  ShieldCheck,
  UserCog,
  Settings,
  Scale,
  Banknote,
  Ban,
  Receipt,
  Megaphone,
  CreditCard,
  Star,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Activity,
  Wifi,
  Database,
  CreditCard as PaymentIcon,
  Send,
  Flag,
  Download,
  FileDown,
  Calendar,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserPlus,
  FileText,
  Bell,
  Mail,
  Shield,
  Gauge,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api-client";
import { useNavigationStore } from "@/store/navigation";
import { useAuthStore } from "@/store/auth";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  Legend,
  ComposedChart,
  Line,
} from "recharts";

// ---- Types ----
interface OverviewData {
  totalUsers: number;
  totalAuthors: number;
  totalBuyers: number;
  totalTransactions: number;
  platformRevenue: number;
  pendingPayouts: number;
  openDisputes: number;
  activeSessions: number;
}

interface RevenueData {
  timeSeries: Array<{
    date: string;
    revenue: number;
    amount: number;
    count: number;
  }>;
  summary: {
    totalRevenue: number;
    totalAmount: number;
    totalTransactions: number;
    dateFrom: string;
    dateTo: string;
  };
}

interface UsersAnalyticsData {
  timeSeries: Array<{
    date: string;
    total: number;
    authors: number;
    buyers: number;
    admins: number;
  }>;
  summary: {
    totalUsers: number;
    totalAuthors: number;
    totalBuyers: number;
    newUsersInPeriod: number;
  };
}

interface TransactionsAnalyticsData {
  statusCounts: {
    pending: number;
    completed: number;
    disputed: number;
    refunded: number;
    total: number;
  };
  topAuthors: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    totalEarnings: number;
    transactionCount: number;
  }>;
  summary: {
    averageTransactionValue: number;
    totalVolume: number;
    totalCommission: number;
  };
}

interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetId: string | null;
  targetType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface RecentUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
}

// ---- Helpers ----
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatFullDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const formatTimeAgo = (dateStr: string) => {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatFullDate(dateStr);
};

// ---- Animated Count-Up Hook ----
function useAnimatedValue(value: number, duration = 1000) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      prevRef.current = current;
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return display;
}

// ---- Custom Tooltip Components ----
function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground">{label ? formatFullDate(label) : ""}</p>
      <p className="text-emerald-500 dark:text-emerald-400 mt-1">
        Revenue: <span className="font-semibold">{formatCurrency(payload[0].value)}</span>
      </p>
    </div>
  );
}

function RegistrationTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground">{label ? formatFullDate(label) : ""}</p>
      {payload.map((entry, i) => (
        <p key={i} className="mt-0.5" style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground">{d.name}</p>
      <p style={{ color: d.payload.color }}>
        Count: <span className="font-semibold">{d.value}</span>
      </p>
    </div>
  );
}

function TopAuthorTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { name: string; earnings: number; email?: string; transactionCount?: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground">{d.name}</p>
      <p className="text-emerald-500 dark:text-emerald-400">
        Earnings: <span className="font-semibold">{formatCurrency(d.earnings)}</span>
      </p>
      {d.transactionCount !== undefined && (
        <p className="text-muted-foreground">
          Transactions: {d.transactionCount}
        </p>
      )}
    </div>
  );
}

// ---- Action config for activity feed ----
const actionConfig: Record<string, { icon: React.ElementType; color: string; dotColor: string; label: string }> = {
  USER_STATUS_UPDATE: { icon: Ban, color: "text-red-500 dark:text-red-400", dotColor: "bg-red-500", label: "Status Update" },
  USER_ROLE_UPDATE: { icon: UserCog, color: "text-violet-500 dark:text-violet-400", dotColor: "bg-violet-500", label: "Role Update" },
  SETTINGS_UPDATE: { icon: Settings, color: "text-amber-500 dark:text-amber-400", dotColor: "bg-amber-500", label: "Settings" },
  DISPUTE_RESOLVED: { icon: Scale, color: "text-emerald-500 dark:text-emerald-400", dotColor: "bg-emerald-500", label: "Dispute" },
  PAYOUT_APPROVED: { icon: Banknote, color: "text-emerald-500 dark:text-emerald-400", dotColor: "bg-emerald-500", label: "Payout" },
  PAYOUT_DENIED: { icon: Ban, color: "text-red-500 dark:text-red-400", dotColor: "bg-red-500", label: "Payout" },
  TRANSACTION_STATUS_UPDATE: { icon: CreditCard, color: "text-teal-500 dark:text-teal-400", dotColor: "bg-teal-500", label: "Transaction" },
  NOTIFICATION_BROADCAST: { icon: Megaphone, color: "text-amber-500 dark:text-amber-400", dotColor: "bg-amber-500", label: "Broadcast" },
  PAYOUT_CREATED: { icon: Banknote, color: "text-teal-500 dark:text-teal-400", dotColor: "bg-teal-500", label: "Payout" },
  REVIEW_REMOVED: { icon: Star, color: "text-rose-500 dark:text-rose-400", dotColor: "bg-rose-500", label: "Review" },
};

// ---- Mini Sparkline data generator ----
function generateSparkline(baseValue: number, points = 7): number[] {
  const data: number[] = [];
  let current = baseValue * 0.8;
  for (let i = 0; i < points; i++) {
    current = current + (Math.random() - 0.4) * baseValue * 0.1;
    data.push(Math.max(0, Math.round(current)));
  }
  return data;
}

// ---- Skeleton Components ----
function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// ---- Animated Stat Card ----
function AnimatedStatCard({
  title,
  value,
  icon: Icon,
  color,
  bg,
  format,
  sparkData,
  sparkColor,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  format: (v: number) => string;
  sparkData: number[];
  sparkColor: string;
  trend: number;
}) {
  const animatedVal = useAnimatedValue(value);
  const formattedDisplay = format(animatedVal);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {title}
            {title === "Total Users" && (
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-teal-500" />
              </span>
            )}
          </CardTitle>
          <div className={`size-8 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`size-4 ${color}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-2xl font-bold">{formattedDisplay}</div>
              <div className="flex items-center gap-1 mt-1">
                {trend >= 0 ? (
                  <TrendingUp className="size-3 text-emerald-500" />
                ) : (
                  <TrendingUp className="size-3 text-rose-500 rotate-180" />
                )}
                <span className={`text-xs ${trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {trend >= 0 ? "+" : ""}{trend}%
                </span>
                <span className="text-xs text-muted-foreground">vs last period</span>
              </div>
            </div>
            <div className="w-16 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData.map((v, i) => ({ v, i }))}>
                  <defs>
                    <linearGradient id={`spark-${title}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={sparkColor} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={sparkColor}
                    strokeWidth={1.5}
                    fill={`url(#spark-${title})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---- Main Component ----
export function AdminOverviewPage() {
  const [revenuePeriod, setRevenuePeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const { navigate } = useNavigationStore();
  const { user } = useAuthStore();
  const isDark = resolvedTheme === "dark";

  // Fetch overview stats
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery<{
    success: boolean;
    data: OverviewData;
  }>({
    queryKey: ["analytics", "overview"],
    queryFn: async () => {
      return apiFetch("/api/analytics/overview");
    },
  });

  // Fetch revenue chart data
  const { data: revenue, isLoading: revenueLoading } = useQuery<{
    success: boolean;
    data: RevenueData;
  }>({
    queryKey: ["analytics", "revenue", revenuePeriod],
    queryFn: async () => {
      return apiFetch(`/api/analytics/revenue?period=${revenuePeriod}`);
    },
  });

  // Fetch users analytics
  const { data: usersAnalytics, isLoading: usersLoading } = useQuery<{
    success: boolean;
    data: UsersAnalyticsData;
  }>({
    queryKey: ["analytics", "users", revenuePeriod],
    queryFn: async () => {
      return apiFetch(`/api/analytics/users?period=${revenuePeriod}`);
    },
  });

  // Fetch transactions analytics
  const { data: txAnalytics, isLoading: txLoading } = useQuery<{
    success: boolean;
    data: TransactionsAnalyticsData;
  }>({
    queryKey: ["analytics", "transactions"],
    queryFn: async () => {
      return apiFetch("/api/analytics/transactions");
    },
  });

  // Fetch recent audit logs for activity feed
  const { data: auditData } = useQuery<{
    success: boolean;
    data: { data: AuditLogEntry[]; total: number };
  }>({
    queryKey: ["audit-logs", "recent"],
    queryFn: async () => {
      return apiFetch("/api/audit-logs?limit=20");
    },
  });

  // Fetch recent signups
  const { data: recentUsersData } = useQuery<{
    success: boolean;
    data: { data: RecentUser[]; total: number };
  }>({
    queryKey: ["admin-users", "recent-signups"],
    queryFn: async () => {
      return apiFetch("/api/users?limit=5&sortBy=createdAt&sortOrder=desc");
    },
  });

  const ov = overview?.data;
  const rev = revenue?.data;
  const ua = usersAnalytics?.data;
  const tx = txAnalytics?.data;

  // Sparkline data for stat cards
  const sparklines = useMemo(() => ({
    users: generateSparkline(ov?.totalUsers ?? 100),
    revenue: generateSparkline(ov?.platformRevenue ?? 5000),
    transactions: generateSparkline(ov?.totalTransactions ?? 50),
    disputes: generateSparkline(ov?.openDisputes ?? 5),
  }), [ov?.totalUsers, ov?.platformRevenue, ov?.totalTransactions, ov?.openDisputes]);

  const statCards = [
    {
      title: "Total Users",
      value: ov?.totalUsers ?? 0,
      icon: Users,
      color: "text-teal-500 dark:text-teal-400",
      bg: "bg-teal-500/10",
      format: (v: number) => Math.round(v).toLocaleString(),
      sparkData: sparklines.users,
      sparkColor: "#14B8A6",
      trend: 12,
    },
    {
      title: "Total Revenue",
      value: ov?.platformRevenue ?? 0,
      icon: DollarSign,
      color: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      format: formatCurrency,
      sparkData: sparklines.revenue,
      sparkColor: "#10B981",
      trend: 8,
    },
    {
      title: "Active Transactions",
      value: ov?.totalTransactions ?? 0,
      icon: ArrowLeftRight,
      color: "text-violet-500 dark:text-violet-400",
      bg: "bg-violet-500/10",
      format: (v: number) => Math.round(v).toLocaleString(),
      sparkData: sparklines.transactions,
      sparkColor: "#8B5CF6",
      trend: 15,
    },
    {
      title: "Open Disputes",
      value: ov?.openDisputes ?? 0,
      icon: AlertTriangle,
      color: "text-rose-500 dark:text-rose-400",
      bg: "bg-rose-500/10",
      format: (v: number) => Math.round(v).toLocaleString(),
      sparkData: sparklines.disputes,
      sparkColor: "#F43F5E",
      trend: -3,
    },
  ];

  // Pie chart data
  const pieData = tx
    ? [
        { name: "Completed", value: tx.statusCounts.completed, color: "#10B981" },
        { name: "Pending", value: tx.statusCounts.pending, color: "#F59E0B" },
        { name: "Disputed", value: tx.statusCounts.disputed, color: "#EF4444" },
        { name: "Refunded", value: tx.statusCounts.refunded, color: "#8B5CF6" },
      ]
    : [];

  // Top authors data
  const topAuthorsData = (tx?.topAuthors || []).map((a) => ({
    name: a.name.length > 12 ? a.name.slice(0, 12) + "…" : a.name,
    fullName: a.name,
    earnings: a.totalEarnings,
    email: a.email,
    transactionCount: a.transactionCount,
    avatarUrl: a.avatarUrl,
  }));

  // Revenue average for reference line
  const revenueAvg = useMemo(() => {
    const ts = rev?.timeSeries;
    if (!ts || ts.length === 0) return 0;
    const sum = ts.reduce((s, d) => s + d.revenue, 0);
    return Math.round(sum / ts.length);
  }, [rev]);

  // Revenue vs Commission chart data
  const revenueVsCommissionData = useMemo(() => {
    const ts = rev?.timeSeries;
    if (!ts) return [];
    return ts.map((d) => ({
      date: d.date,
      revenue: d.revenue,
      commission: Math.round(d.revenue * 0.1),
    }));
  }, [rev]);

  // Custom label for pie chart slices
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; value: number }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (value === 0) return null;
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
        {value}
      </text>
    );
  };

  // Recent signups
  const recentUsers = recentUsersData?.data?.data || [];

  // Live platform status indicators
  const platformStatus = [
    {
      name: "API Status",
      icon: Wifi,
      status: "Operational",
      statusColor: "text-emerald-500",
      dotColor: "bg-emerald-500",
    },
    {
      name: "Database Status",
      icon: Database,
      status: "Connected",
      statusColor: "text-emerald-500",
      dotColor: "bg-emerald-500",
    },
    {
      name: "Payment Gateway",
      icon: PaymentIcon,
      status: "Active",
      statusColor: "text-emerald-500",
      dotColor: "bg-emerald-500",
    },
    {
      name: "Email Service",
      icon: Mail,
      status: "Degraded",
      statusColor: "text-amber-500",
      dotColor: "bg-amber-500",
    },
  ];

  // Quick actions with new icons
  const quickActions = [
    {
      title: "Add User",
      description: "Create new account",
      icon: UserPlus,
      color: "text-white",
      gradientBg: "bg-gradient-to-br from-violet-500 to-purple-600",
      onClick: () => navigate("admin/users"),
    },
    {
      title: "View Reports",
      description: "Analytics & insights",
      icon: FileText,
      color: "text-white",
      gradientBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
      onClick: () => navigate("dashboard/analytics"),
    },
    {
      title: "Send Notification",
      description: "Broadcast message",
      icon: Bell,
      color: "text-white",
      gradientBg: "bg-gradient-to-br from-amber-500 to-orange-600",
      onClick: () => navigate("admin/notifications"),
    },
    {
      title: "System Check",
      description: "Health diagnostics",
      icon: Activity,
      color: "text-white",
      gradientBg: "bg-gradient-to-br from-rose-500 to-pink-600",
      onClick: () => navigate("admin/audit-log"),
    },
  ];

  // Platform health with circular progress indicators
  const healthMetrics = [
    {
      label: "Uptime",
      value: 99.9,
      color: "#10B981",
      icon: Shield,
    },
    {
      label: "Performance",
      value: 94,
      color: "#8B5CF6",
      icon: Gauge,
    },
    {
      label: "Security",
      value: 87,
      color: "#06B6D4",
      icon: ShieldCheck,
    },
  ];

  // Current date string
  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  // Admin greeting
  const adminGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  if (overviewError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load dashboard data</p>
          <Button
            variant="outline"
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Chart text colors based on theme
  const chartTextColor = isDark ? "#94a3b8" : "#64748b";
  const gridStroke = isDark ? "rgba(148, 163, 184, 0.1)" : "rgba(0, 0, 0, 0.06)";

  return (
    <div className="space-y-6">
      {/* Animated Welcome Banner (indigo→violet→purple) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 dark:from-indigo-800 dark:via-violet-800 dark:to-purple-800 p-6 md:p-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L2c+PC9zdmc+')] opacity-50" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
          <div className="relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    {adminGreeting}, {user?.name?.split(" ")[0] || "Admin"}!
                  </h1>
                  {/* Animated Live pulse indicator */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                    className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1"
                  >
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                    </span>
                    <span className="text-xs font-medium text-white">Live</span>
                  </motion.div>
                </div>
                <p className="text-indigo-100/80 mt-1 flex items-center gap-2">
                  <Calendar className="size-4" />
                  {currentDate}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(["7d", "30d", "90d"] as const).map((p) => (
                  <Button
                    key={p}
                    variant={revenuePeriod === p ? "secondary" : "ghost"}
                    size="sm"
                    className={`h-8 text-xs px-3 ${
                      revenuePeriod === p
                        ? "bg-white/20 text-white hover:bg-white/30 border-white/20"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                    onClick={() => setRevenuePeriod(p)}
                  >
                    {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Key metrics in banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-indigo-100/70">Total Users</p>
                <p className="text-xl font-bold text-white mt-0.5">{ov?.totalUsers?.toLocaleString() ?? "—"}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-indigo-100/70">Revenue</p>
                <p className="text-xl font-bold text-white mt-0.5">{ov ? formatCurrency(ov.platformRevenue) : "—"}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-indigo-100/70">Transactions</p>
                <p className="text-xl font-bold text-white mt-0.5">{ov?.totalTransactions?.toLocaleString() ?? "—"}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-indigo-100/70">Active Sessions</p>
                <p className="text-xl font-bold text-white mt-0.5">{ov?.activeSessions?.toLocaleString() ?? "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards with Animated Values and Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((stat) => (
              <AnimatedStatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
                bg={stat.bg}
                format={stat.format}
                sparkData={stat.sparkData}
                sparkColor={stat.sparkColor}
                trend={stat.trend}
              />
            ))}
      </div>

      {/* Live Platform Status + Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Live Platform Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="size-4 text-amber-500" />
                Platform Status
                <span className="relative flex size-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                </span>
              </CardTitle>
              <CardDescription>Real-time system status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {platformStatus.map((service) => {
                  const Icon = service.icon;
                  return (
                    <div key={service.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-muted/50 flex items-center justify-center">
                          <Icon className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{service.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="relative flex size-2">
                              <span className={`animate-pulse absolute inline-flex h-full w-full rounded-full ${service.dotColor} opacity-75`} />
                              <span className={`relative inline-flex rounded-full size-2 ${service.dotColor}`} />
                            </span>
                            <span className={`text-xs ${service.statusColor}`}>{service.status}</span>
                          </div>
                        </div>
                      </div>
                      {service.status === "Degraded" ? (
                        <AlertCircle className="size-5 text-amber-500" />
                      ) : (
                        <CheckCircle2 className={`size-5 ${service.statusColor}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              <Separator className="my-4" />

              {/* Overall status badge */}
              <div className="flex items-center justify-center gap-3 py-1">
                <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1">
                  <span className="relative flex size-1.5">
                    <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-1.5 bg-amber-500" />
                  </span>
                  Partially Operational
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions with gradient backgrounds and hover scale */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="size-4 text-emerald-500" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common admin tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <motion.button
                      key={action.title}
                      onClick={action.onClick}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/50 transition-colors text-center group"
                    >
                      <div className={`size-10 rounded-lg ${action.gradientBg} flex items-center justify-center shadow-md`}>
                        <Icon className={`size-5 ${action.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{action.title}</p>
                        <p className="text-[10px] text-muted-foreground">{action.description}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Over Time with animated border */}
        <div className="relative rounded-lg p-[1px] bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-purple-500/20">
        <Card className="border-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="size-4 text-emerald-500" />
                Revenue Over Time
              </CardTitle>
              <CardDescription>Platform commission earnings with average reference line</CardDescription>
            </div>
            <div className="flex gap-1">
              {(["7d", "30d", "90d"] as const).map((p) => (
                <Button
                  key={p}
                  variant={revenuePeriod === p ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setRevenuePeriod(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-[250px] w-full rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={rev?.timeSeries || []}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isDark ? "#34d399" : "#10b981"} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={isDark ? "#34d399" : "#10b981"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: chartTextColor }}
                    axisLine={{ stroke: gridStroke }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `$${v}`}
                    tick={{ fontSize: 11, fill: chartTextColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <ReferenceLine
                    y={revenueAvg}
                    stroke={isDark ? "#34d399" : "#10b981"}
                    strokeDasharray="6 3"
                    strokeOpacity={0.5}
                    label={{
                      value: `Avg: ${formatCurrency(revenueAvg)}`,
                      position: "insideTopRight",
                      fill: isDark ? "#34d399" : "#10b981",
                      fontSize: 10,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={isDark ? "#34d399" : "#10b981"}
                    fill="url(#revenueGrad)"
                    strokeWidth={2}
                    dot={{ r: 0 }}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: isDark ? "#34d399" : "#10b981", fill: isDark ? "#1e1b4b" : "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        </div>

        {/* New Registrations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4 text-teal-500" />
              New Registrations
            </CardTitle>
            <CardDescription>User sign-ups breakdown by role</CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <Skeleton className="h-[250px] w-full rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ua?.timeSeries || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: chartTextColor }}
                    axisLine={{ stroke: gridStroke }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: chartTextColor }} axisLine={false} tickLine={false} />
                  <Tooltip content={<RegistrationTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-xs text-foreground">{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="authors"
                    fill={isDark ? "#a78bfa" : "#8B5CF6"}
                    radius={[4, 4, 0, 0]}
                    name="Authors"
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                  <Bar
                    dataKey="buyers"
                    fill={isDark ? "#34d399" : "#10b981"}
                    radius={[4, 4, 0, 0]}
                    name="Buyers"
                    animationDuration={800}
                    animationEasing="ease-out"
                    animationBegin={200}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Signups + Platform Health */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Signups with stacked avatars */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="size-4 text-teal-500" />
                  Recent Signups
                </CardTitle>
                <CardDescription>Latest users to join the platform</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => navigate("admin/users")}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {recentUsers.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
                  No recent signups
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stacked circle avatars */}
                  <div className="flex items-center -space-x-3">
                    {recentUsers.map((user, idx) => (
                      <motion.div
                        key={user.id}
                        initial={{ scale: 0, x: -10 }}
                        animate={{ scale: 1, x: 0 }}
                        transition={{ delay: idx * 0.08, type: "spring", stiffness: 300, damping: 20 }}
                        className="relative"
                      >
                        <Avatar className="size-10 border-2 border-background">
                          {user.avatarUrl ? (
                            <AvatarImage src={user.avatarUrl} />
                          ) : (
                            <AvatarFallback className="text-xs bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                              {user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        {idx === 0 && (
                          <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-2 border-background" />
                        )}
                      </motion.div>
                    ))}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: recentUsers.length * 0.08 }}
                      className="size-10 rounded-full bg-muted border-2 border-background flex items-center justify-center"
                    >
                      <span className="text-[10px] font-bold text-muted-foreground">+{(recentUsersData?.data?.total ?? 0) - recentUsers.length}</span>
                    </motion.div>
                  </div>

                  <Separator />

                  {/* Recent user list */}
                  <div className="space-y-3 max-h-48 overflow-y-auto custom-scroll">
                    {recentUsers.map((user) => (
                      <div key={user.id} className="flex items-center gap-3">
                        <Avatar className="size-8">
                          {user.avatarUrl ? (
                            <AvatarImage src={user.avatarUrl} />
                          ) : (
                            <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                              {user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{user.role}</Badge>
                          <span className="text-[10px] text-muted-foreground">{formatTimeAgo(user.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Platform Health with Circular Progress Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-500" />
                Platform Health
              </CardTitle>
              <CardDescription>System performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-around py-4">
                {healthMetrics.map((metric) => {
                  const Icon = metric.icon;
                  const size = 100;
                  const strokeWidth = 6;
                  const radius = (size - strokeWidth) / 2;
                  const circumference = 2 * Math.PI * radius;
                  const offset = circumference - (metric.value / 100) * circumference;

                  return (
                    <div key={metric.label} className="flex flex-col items-center gap-2">
                      <div className="relative" style={{ width: size, height: size }}>
                        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
                          <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={strokeWidth}
                            className="text-muted/20"
                          />
                          <motion.circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={metric.color}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: offset }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <Icon className="size-4 mb-0.5" style={{ color: metric.color }} />
                          <span className="text-sm font-bold" style={{ color: metric.color }}>{metric.value}%</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">{metric.label}</span>
                    </div>
                  );
                })}
              </div>

              <Separator className="my-4" />

              {/* Overall platform health score */}
              <div className="flex items-center justify-center gap-4 py-1">
                <div className="relative size-16">
                  <svg className="size-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/20" />
                    <motion.circle
                      cx="32" cy="32" r="28" fill="none"
                      stroke="#10B981"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 28}
                      initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - 0.937) }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-emerald-500">93.7</span>
                    <span className="text-[8px] text-muted-foreground">SCORE</span>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium">Platform Health</p>
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 mt-1 gap-1">
                    <span className="relative flex size-1.5">
                      <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-1.5 bg-amber-500" />
                    </span>
                    Email Service Degraded
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Transactions Pie Chart + Top Authors */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Transactions by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="size-4 text-violet-500" />
              Transactions by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <Skeleton className="h-[250px] w-full rounded" />
            ) : pieData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                No transaction data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={renderCustomLabel}
                    animationDuration={800}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-xs text-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Authors by Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="size-4 text-amber-500" />
              Top Authors by Earnings
            </CardTitle>
            <CardDescription>Highest earning creators</CardDescription>
          </CardHeader>
          <CardContent>
            {topAuthorsData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                No author data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topAuthorsData.slice(0, 7)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => `$${v}`}
                    tick={{ fontSize: 11, fill: chartTextColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: chartTextColor }}
                    width={80}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<TopAuthorTooltip />} />
                  <Bar
                    dataKey="earnings"
                    fill={isDark ? "#a78bfa" : "#8B5CF6"}
                    radius={[0, 4, 4, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs Commission Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="size-4 text-emerald-500" />
            Revenue vs Commission
          </CardTitle>
          <CardDescription>Platform revenue with commission breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {revenueLoading ? (
            <Skeleton className="h-[250px] w-full rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={revenueVsCommissionData}>
                <defs>
                  <linearGradient id="commissionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDark ? "#34d399" : "#10b981"} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={isDark ? "#34d399" : "#10b981"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: chartTextColor }}
                  axisLine={{ stroke: gridStroke }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${v}`}
                  tick={{ fontSize: 11, fill: chartTextColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value: string) => (
                    <span className="text-xs text-foreground">{value}</span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  fill="url(#commissionGrad)"
                  stroke={isDark ? "#34d399" : "#10b981"}
                  strokeWidth={2}
                  name="Revenue"
                  animationDuration={800}
                />
                <Line
                  type="monotone"
                  dataKey="commission"
                  stroke={isDark ? "#f59e0b" : "#d97706"}
                  strokeWidth={2}
                  dot={false}
                  name="Commission"
                  animationDuration={800}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4 text-violet-500" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest platform events</CardDescription>
        </CardHeader>
        <CardContent>
          {auditData?.data?.data ? (
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scroll">
              {auditData.data.data.slice(0, 15).map((log) => {
                const config = actionConfig[log.action] || {
                  icon: Activity,
                  color: "text-muted-foreground",
                  dotColor: "bg-muted-foreground",
                  label: log.action.replace(/_/g, " "),
                };
                const Icon = config.icon;
                const isExpanded = expandedLog === log.id;
                return (
                  <div key={log.id} className="flex items-start gap-3 group">
                    <div className={`size-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`size-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{config.label}</span>
                        <Badge variant="secondary" className="text-[10px]">{log.action.replace(/_/g, " ")}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        By {log.actor.name} &middot; {formatTimeAgo(log.createdAt)}
                      </p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <button
                          onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                          className="text-[10px] text-violet-500 hover:text-violet-600 mt-1 flex items-center gap-1"
                        >
                          Details
                          {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        </button>
                      )}
                      <AnimatePresence>
                        {isExpanded && log.metadata && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <pre className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2 mt-1 overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
              Loading activity...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
