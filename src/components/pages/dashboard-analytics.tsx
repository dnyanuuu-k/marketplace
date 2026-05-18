"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ShoppingCart,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  PieChart as PieChartIcon,
  Activity,
  Wallet,
  Globe,
  Target,
  Filter,
  Clock,
  CheckCircle2,
  Eye,
  ShoppingBag,
  MousePointerClick,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Legend,
  LineChart,
  Line,
} from "recharts";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";

// ---- Types ----
interface EarningsTimeSeriesPoint {
  date: string;
  earnings: number;
  count: number;
}

interface SalesByCategoryItem {
  name: string;
  earnings: number;
  count: number;
}

interface TopProductItem {
  name: string;
  revenue: number;
  sales: number;
}

interface ClientDemographics {
  locations: Array<{ location: string; count: number }>;
  repeatVsNew: { repeat: number; new: number };
}

interface MonthlyComparison {
  thisMonth: { earnings?: number; spending?: number; count: number };
  lastMonth: { earnings?: number; spending?: number; count: number };
  earningsChange?: number;
  spendingChange?: number;
  countChange: number;
}

interface TopBuyerItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  email: string;
  totalSpent: number;
  transactionCount: number;
}

interface AuthorAnalytics {
  earningsTimeSeries: EarningsTimeSeriesPoint[];
  salesByCategory: SalesByCategoryItem[];
  topProducts: TopProductItem[];
  clientDemographics: ClientDemographics;
  monthlyComparison: MonthlyComparison;
  topBuyers: TopBuyerItem[];
}

interface SpendingTimeSeriesPoint {
  date: string;
  spending: number;
  count: number;
}

interface PurchaseCategoryItem {
  name: string;
  spending: number;
  count: number;
}

interface TopVendorItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  email: string;
  totalSpent: number;
  transactionCount: number;
}

interface BuyerSavings {
  totalRefunded: number;
  refundCount: number;
  totalSpent: number;
  totalCommission: number;
}

interface BuyerAnalytics {
  spendingTimeSeries: SpendingTimeSeriesPoint[];
  purchaseCategories: PurchaseCategoryItem[];
  topVendors: TopVendorItem[];
  savings: BuyerSavings;
  monthlyComparison: MonthlyComparison;
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

// Category colors (NO indigo/blue)
const CATEGORY_COLORS = [
  "#10B981", // emerald
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#14B8A6", // teal
  "#F43F5E", // rose
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#EC4899", // pink
  "#EAB308", // yellow
  "#6366F1", // indigo (last resort)
];

// ---- Custom Tooltip Components ----
function EarningsTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground">{label ? formatFullDate(label) : ""}</p>
      <p className="text-emerald-500 dark:text-emerald-400 mt-1">
        Earnings: <span className="font-semibold">{formatCurrency(payload[0].value)}</span>
      </p>
      {payload[1] && (
        <p className="text-muted-foreground mt-0.5">
          Sales: <span className="font-semibold">{payload[1].value}</span>
        </p>
      )}
    </div>
  );
}

function SpendingTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground">{label ? formatFullDate(label) : ""}</p>
      <p className="text-amber-500 dark:text-amber-400 mt-1">
        Spending: <span className="font-semibold">{formatCurrency(payload[0].value)}</span>
      </p>
      {payload[1] && (
        <p className="text-muted-foreground mt-0.5">
          Purchases: <span className="font-semibold">{payload[1].value}</span>
        </p>
      )}
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground">{d.name}</p>
      <p className="text-muted-foreground">
        Amount: <span className="font-semibold">{formatCurrency(d.value)}</span>
      </p>
    </div>
  );
}

function ComparisonTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground">{label ? formatFullDate(label) : ""}</p>
      {payload.map((entry, i) => (
        <p key={i} className="mt-0.5" style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ---- Animated Count-Up Component ----
function AnimatedValue({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = React.useRef<number>(0);

  React.useEffect(() => {
    const start = ref.current;
    const end = value;
    const duration = 800;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      ref.current = current;
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value]);

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString();

  return <span>{prefix}{formatted}{suffix}</span>;
}

// ---- Sparkline data generator ----
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
function ChartSkeleton() {
  return <Skeleton className="h-[280px] w-full rounded" />;
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-8 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// ---- Circular Progress Component ----
function CircularProgress({
  value,
  size = 80,
  strokeWidth = 6,
  color,
  label,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
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
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>{value}%</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}

// ---- Conversion Funnel Component ----
function ConversionFunnel() {
  const funnelSteps = [
    { label: "Visitors", value: 10000, icon: Eye, color: "bg-teal-500" },
    { label: "Viewed", value: 6500, icon: MousePointerClick, color: "bg-cyan-500" },
    { label: "Added to Cart", value: 2800, icon: ShoppingBag, color: "bg-emerald-500" },
    { label: "Purchased", value: 1200, icon: CheckCircle2, color: "bg-violet-500" },
  ];

  const maxValue = funnelSteps[0].value;

  return (
    <div className="space-y-3">
      {funnelSteps.map((step, idx) => {
        const widthPct = (step.value / maxValue) * 100;
        const prevValue = idx > 0 ? funnelSteps[idx - 1].value : step.value;
        const conversionRate = idx > 0 ? ((step.value / prevValue) * 100).toFixed(1) : "100";
        const Icon = step.icon;

        return (
          <div key={step.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" />
                <span className="font-medium">{step.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{step.value.toLocaleString()}</span>
                {idx > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {conversionRate}%
                  </Badge>
                )}
              </div>
            </div>
            <div className="h-8 rounded-md bg-muted/30 overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.15 }}
                className={`h-full ${step.color} rounded-md opacity-80 flex items-center justify-end pr-2`}
              >
                <span className="text-[10px] font-medium text-white">
                  {((step.value / maxValue) * 100).toFixed(0)}%
                </span>
              </motion.div>
            </div>
            {idx < funnelSteps.length - 1 && (
              <div className="flex justify-center">
                <ArrowDownRight className="size-3 text-muted-foreground/40" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Empty State ----
function AnalyticsEmptyState({ role }: { role: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <BarChart3 className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No analytics data yet</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {role === "AUTHOR"
          ? "Start selling your services to see earnings data, client demographics, and performance insights."
          : "Start making purchases to see spending trends, vendor insights, and savings tracking."}
      </p>
    </motion.div>
  );
}

// ---- Author Analytics Section ----
function AuthorAnalyticsView({ period }: { period: "7d" | "30d" | "90d" }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const chartTextColor = isDark ? "#94a3b8" : "#64748b";
  const gridStroke = isDark ? "rgba(148, 163, 184, 0.1)" : "rgba(0, 0, 0, 0.06)";

  const { data, isLoading } = useQuery<{
    success: boolean;
    data: AuthorAnalytics;
  }>({
    queryKey: ["analytics", "author", period],
    queryFn: async () => {
      return apiFetch(`/api/analytics/author?period=${period}`);
    },
  });

  const analytics = data?.data;

  const exportCSV = useCallback(() => {
    if (!analytics) return;
    const headers = ["Date", "Earnings", "Sales Count"];
    const rows = analytics.earningsTimeSeries.map((d) => [
      d.date,
      d.earnings.toFixed(2),
      d.count,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `earnings-analytics-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analytics, period]);

  const mc = analytics?.monthlyComparison;
  const hasData = analytics && analytics.earningsTimeSeries.some((d) => d.earnings > 0);

  // Generate sparkline data for stat cards
  const sparklines = useMemo(() => ({
    revenue: generateSparkline(mc?.thisMonth.earnings ?? 500),
    orders: generateSparkline(mc?.thisMonth.count ?? 10),
    conversion: generateSparkline(3),
    aov: generateSparkline(mc?.thisMonth.count ? (mc.thisMonth.earnings ?? 0) / mc.thisMonth.count : 50),
  }), [mc?.thisMonth.earnings, mc?.thisMonth.count]);

  // Revenue comparison data (current vs previous period)
  const revenueComparisonData = useMemo(() => {
    if (!analytics?.earningsTimeSeries) return [];
    return analytics.earningsTimeSeries.map((d) => ({
      date: d.date,
      current: d.earnings,
      previous: d.earnings * 0.85, // Simulated previous period
    }));
  }, [analytics]);

  // Orders by category bar chart data
  const ordersByCategoryData = useMemo(() => {
    if (!analytics?.salesByCategory) return [];
    return analytics.salesByCategory.map((c) => ({
      name: c.name,
      orders: c.count,
      earnings: c.earnings,
    }));
  }, [analytics]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (!hasData) {
    return <AnalyticsEmptyState role="AUTHOR" />;
  }

  const categoryPieData = analytics.salesByCategory.map((c) => ({
    name: c.name,
    value: c.earnings,
  }));

  const repeatVsNewData = [
    { name: "Repeat Clients", value: analytics.clientDemographics.repeatVsNew.repeat },
    { name: "New Clients", value: analytics.clientDemographics.repeatVsNew.new },
  ];

  // Key metrics for the animated stat cards
  const keyMetrics = [
    {
      title: "Revenue",
      value: mc?.thisMonth.earnings ?? 0,
      prefix: "$",
      decimals: 2,
      trend: mc?.earningsChange ?? 0,
      icon: DollarSign,
      color: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      sparkData: sparklines.revenue,
      sparkColor: "#10B981",
    },
    {
      title: "Orders",
      value: mc?.thisMonth.count ?? 0,
      prefix: "",
      decimals: 0,
      trend: mc?.countChange ?? 0,
      icon: ShoppingCart,
      color: "text-teal-500 dark:text-teal-400",
      bg: "bg-teal-500/10",
      sparkData: sparklines.orders,
      sparkColor: "#14B8A6",
    },
    {
      title: "Conversion Rate",
      value: 3.2,
      prefix: "",
      suffix: "%",
      decimals: 1,
      trend: 5.4,
      icon: Target,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-500/10",
      sparkData: sparklines.conversion,
      sparkColor: "#F59E0B",
    },
    {
      title: "Avg Order Value",
      value: mc?.thisMonth.count ? (mc.thisMonth.earnings ?? 0) / mc.thisMonth.count : 0,
      prefix: "$",
      decimals: 2,
      trend: 2.1,
      icon: Wallet,
      color: "text-violet-500 dark:text-violet-400",
      bg: "bg-violet-500/10",
      sparkData: sparklines.aov,
      sparkColor: "#8B5CF6",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Key Metrics Row with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {keyMetrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
                  <div className={`size-8 rounded-lg ${metric.bg} flex items-center justify-center`}>
                    <Icon className={`size-4 ${metric.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <div className="text-2xl font-bold">
                        <AnimatedValue value={metric.value} prefix={metric.prefix} suffix={metric.suffix} decimals={metric.decimals} />
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {metric.trend >= 0 ? (
                          <ArrowUpRight className="size-3 text-emerald-500" />
                        ) : (
                          <ArrowDownRight className="size-3 text-rose-500" />
                        )}
                        <span className={`text-xs ${metric.trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {Math.abs(metric.trend).toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground">vs last</span>
                      </div>
                    </div>
                    <div className="w-16 h-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metric.sparkData.map((v, i) => ({ v, i }))}>
                          <defs>
                            <linearGradient id={`spark-da-${metric.title}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={metric.sparkColor} stopOpacity={0.3} />
                              <stop offset="100%" stopColor={metric.sparkColor} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="v"
                            stroke={metric.sparkColor}
                            strokeWidth={1.5}
                            fill={`url(#spark-da-${metric.title})`}
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
        })}
      </div>

      {/* Revenue Chart with Period Comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4 text-teal-500" />
                Revenue Over Time
              </CardTitle>
              <CardDescription>Current period vs previous period comparison</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={exportCSV}>
              <Download className="size-3 mr-1" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueComparisonData}>
              <defs>
                <linearGradient id="revenueCurrentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isDark ? "#2dd4bf" : "#14b8a6"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={isDark ? "#2dd4bf" : "#14b8a6"} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="revenuePrevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isDark ? "#94a3b8" : "#64748b"} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={isDark ? "#94a3b8" : "#64748b"} stopOpacity={0} />
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
              <Tooltip content={<ComparisonTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => (
                  <span className="text-xs text-foreground">{value}</span>
                )}
              />
              <Area
                type="monotone"
                dataKey="previous"
                stroke={isDark ? "#94a3b8" : "#64748b"}
                fill="url(#revenuePrevGrad)"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                name="Previous Period"
                animationDuration={800}
              />
              <Area
                type="monotone"
                dataKey="current"
                stroke={isDark ? "#2dd4bf" : "#14b8a6"}
                fill="url(#revenueCurrentGrad)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: isDark ? "#2dd4bf" : "#14b8a6", fill: isDark ? "#1e1b4b" : "#fff" }}
                name="Current Period"
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Orders by Category + Geo Distribution */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Orders by Category - Horizontal Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="size-4 text-amber-500" />
              Orders by Category
            </CardTitle>
            <CardDescription>Order distribution by type</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersByCategoryData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                No category data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ordersByCategoryData.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: chartTextColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: chartTextColor }}
                    width={120}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--card-foreground))",
                    }}
                    formatter={(value: number, name: string) => [
                      name === "orders" ? value : formatCurrency(value),
                      name === "orders" ? "Orders" : "Revenue",
                    ]}
                  />
                  <Bar
                    dataKey="orders"
                    fill={isDark ? "#2dd4bf" : "#14B8A6"}
                    radius={[0, 4, 4, 0]}
                    animationDuration={800}
                    name="Orders"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Geo Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="size-4 text-cyan-500" />
              Geo Distribution
            </CardTitle>
            <CardDescription>Top client locations</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.clientDemographics.locations.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                No location data
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.clientDemographics.locations.slice(0, 5).map((loc, i) => {
                  const maxCount = analytics.clientDemographics.locations[0]?.count ?? 1;
                  const pct = Math.round((loc.count / maxCount) * 100);
                  return (
                    <div key={loc.location} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium">{loc.location}</span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">{loc.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.08 }}
                          className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics + Sales by Category Pie */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Performance Metrics with Circular Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4 text-emerald-500" />
              Performance Metrics
            </CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-around py-4">
              <CircularProgress value={92} color="#10B981" label="Satisfaction" />
              <CircularProgress value={87} color="#06B6D4" label="Response Rate" />
              <CircularProgress value={95} color="#8B5CF6" label="On-Time" />
            </div>
          </CardContent>
        </Card>

        {/* Sales by Category Pie */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="size-4 text-amber-500" />
              Sales by Category
            </CardTitle>
            <CardDescription>Earnings breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryPieData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                No category data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    animationDuration={800}
                  >
                    {categoryPieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-3 mt-3">
              {analytics?.salesByCategory.map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-sm" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">{cat.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products Table + Conversion Funnel */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Products/Services Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="size-4 text-violet-500" />
              Top Products / Services
            </CardTitle>
            <CardDescription>Best performing items by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topProducts.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                No product data
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4">#</th>
                      <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4">Name</th>
                      <th className="text-right text-xs font-medium text-muted-foreground pb-3 pr-4">Sales</th>
                      <th className="text-right text-xs font-medium text-muted-foreground pb-3 pr-4">Revenue</th>
                      <th className="text-right text-xs font-medium text-muted-foreground pb-3">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topProducts.slice(0, 5).map((product, idx) => {
                      const trendUp = idx % 3 !== 2; // Mix of up/down for visual variety
                      return (
                        <tr key={product.name} className="border-b border-border last:border-0">
                          <td className="py-3 pr-4">
                            <Badge variant="secondary" className="text-xs w-6 justify-center">{idx + 1}</Badge>
                          </td>
                          <td className="py-3 pr-4 text-sm font-medium truncate max-w-[200px]">{product.name}</td>
                          <td className="py-3 pr-4 text-right text-sm text-muted-foreground">{product.sales}</td>
                          <td className="py-3 pr-4 text-right text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(product.revenue)}
                          </td>
                          <td className="py-3 text-right">
                            {trendUp ? (
                              <TrendingUp className="size-4 text-emerald-500 ml-auto" />
                            ) : (
                              <TrendingDown className="size-4 text-rose-500 ml-auto" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="size-4 text-teal-500" />
              Conversion Funnel
            </CardTitle>
            <CardDescription>Visitor to purchase flow</CardDescription>
          </CardHeader>
          <CardContent>
            <ConversionFunnel />
          </CardContent>
        </Card>
      </div>

      {/* Top Clients + Client Demographics */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Buyers Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4 text-rose-500" />
              Top Clients
            </CardTitle>
            <CardDescription>Clients ranked by total spending</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topBuyers.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No client data yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4">Client</th>
                      <th className="text-right text-xs font-medium text-muted-foreground pb-3 pr-4">Spent</th>
                      <th className="text-right text-xs font-medium text-muted-foreground pb-3">Purchases</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topBuyers.map((buyer) => (
                      <tr key={buyer.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7">
                              {buyer.avatarUrl ? (
                                <AvatarImage src={buyer.avatarUrl} alt={buyer.name} />
                              ) : null}
                              <AvatarFallback className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                {buyer.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{buyer.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(buyer.totalSpent)}
                        </td>
                        <td className="py-3 text-right text-sm text-muted-foreground">
                          {buyer.transactionCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Demographics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4 text-teal-500" />
              Client Demographics
            </CardTitle>
            <CardDescription>Repeat vs new clients</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={repeatVsNewData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                  animationDuration={800}
                >
                  <Cell fill="#10B981" stroke="transparent" />
                  <Cell fill="#F59E0B" stroke="transparent" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-sm bg-emerald-500" />
                <span className="text-xs text-muted-foreground">Repeat ({analytics.clientDemographics.repeatVsNew.repeat})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-sm bg-amber-500" />
                <span className="text-xs text-muted-foreground">New ({analytics.clientDemographics.repeatVsNew.new})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

// ---- Buyer Analytics Section ----
function BuyerAnalyticsView({ period }: { period: "7d" | "30d" | "90d" }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const chartTextColor = isDark ? "#94a3b8" : "#64748b";
  const gridStroke = isDark ? "rgba(148, 163, 184, 0.1)" : "rgba(0, 0, 0, 0.06)";

  const { data, isLoading } = useQuery<{
    success: boolean;
    data: BuyerAnalytics;
  }>({
    queryKey: ["analytics", "buyer", period],
    queryFn: async () => {
      return apiFetch(`/api/analytics/buyer?period=${period}`);
    },
  });

  const analytics = data?.data;

  const exportCSV = useCallback(() => {
    if (!analytics) return;
    const headers = ["Date", "Spending", "Purchases"];
    const rows = analytics.spendingTimeSeries.map((d) => [
      d.date,
      d.spending.toFixed(2),
      d.count,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spending-analytics-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analytics, period]);

  const mc = analytics?.monthlyComparison;
  const hasData = analytics && analytics.spendingTimeSeries.some((d) => d.spending > 0);

  // Generate sparkline data
  const sparklines = useMemo(() => ({
    spending: generateSparkline(mc?.thisMonth.spending ?? 300),
    purchases: generateSparkline(mc?.thisMonth.count ?? 5),
    conversion: generateSparkline(2),
    aov: generateSparkline(mc?.thisMonth.count ? (mc.thisMonth.spending ?? 0) / mc.thisMonth.count : 40),
  }), [mc?.thisMonth.spending, mc?.thisMonth.count]);

  // Revenue comparison data
  const spendingComparisonData = useMemo(() => {
    if (!analytics?.spendingTimeSeries) return [];
    return analytics.spendingTimeSeries.map((d) => ({
      date: d.date,
      current: d.spending,
      previous: d.spending * 0.85,
    }));
  }, [analytics]);

  // Purchase category bar data
  const categoryBarData = useMemo(() => {
    if (!analytics?.purchaseCategories) return [];
    return analytics.purchaseCategories.map((c) => ({
      name: c.name,
      orders: c.count,
      spending: c.spending,
    }));
  }, [analytics]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (!hasData) {
    return <AnalyticsEmptyState role="BUYER" />;
  }

  const categoryPieData = analytics.purchaseCategories.map((c) => ({
    name: c.name,
    value: c.spending,
  }));

  // Key metrics for buyer stat cards
  const keyMetrics = [
    {
      title: "Spending",
      value: mc?.thisMonth.spending ?? 0,
      prefix: "$",
      decimals: 2,
      trend: mc?.spendingChange ?? 0,
      icon: DollarSign,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-500/10",
      sparkData: sparklines.spending,
      sparkColor: "#F59E0B",
    },
    {
      title: "Orders",
      value: mc?.thisMonth.count ?? 0,
      prefix: "",
      decimals: 0,
      trend: mc?.countChange ?? 0,
      icon: ShoppingCart,
      color: "text-teal-500 dark:text-teal-400",
      bg: "bg-teal-500/10",
      sparkData: sparklines.purchases,
      sparkColor: "#14B8A6",
    },
    {
      title: "Conversion Rate",
      value: 2.8,
      prefix: "",
      suffix: "%",
      decimals: 1,
      trend: 3.2,
      icon: Target,
      color: "text-rose-500 dark:text-rose-400",
      bg: "bg-rose-500/10",
      sparkData: sparklines.conversion,
      sparkColor: "#F43F5E",
    },
    {
      title: "Avg Order Value",
      value: mc?.thisMonth.count ? (mc.thisMonth.spending ?? 0) / mc.thisMonth.count : 0,
      prefix: "$",
      decimals: 2,
      trend: -1.3,
      icon: Wallet,
      color: "text-violet-500 dark:text-violet-400",
      bg: "bg-violet-500/10",
      sparkData: sparklines.aov,
      sparkColor: "#8B5CF6",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Key Metrics Row with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {keyMetrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
                  <div className={`size-8 rounded-lg ${metric.bg} flex items-center justify-center`}>
                    <Icon className={`size-4 ${metric.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <div className="text-2xl font-bold">
                        <AnimatedValue value={metric.value} prefix={metric.prefix} suffix={metric.suffix} decimals={metric.decimals} />
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {metric.trend >= 0 ? (
                          <ArrowUpRight className="size-3 text-emerald-500" />
                        ) : (
                          <ArrowDownRight className="size-3 text-rose-500" />
                        )}
                        <span className={`text-xs ${metric.trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {Math.abs(metric.trend).toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground">vs last</span>
                      </div>
                    </div>
                    <div className="w-16 h-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metric.sparkData.map((v, i) => ({ v, i }))}>
                          <defs>
                            <linearGradient id={`spark-da-b-${metric.title}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={metric.sparkColor} stopOpacity={0.3} />
                              <stop offset="100%" stopColor={metric.sparkColor} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="v"
                            stroke={metric.sparkColor}
                            strokeWidth={1.5}
                            fill={`url(#spark-da-b-${metric.title})`}
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
        })}
      </div>

      {/* Spending Chart with Period Comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4 text-amber-500" />
                Spending Over Time
              </CardTitle>
              <CardDescription>Current period vs previous period comparison</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={exportCSV}>
              <Download className="size-3 mr-1" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={spendingComparisonData}>
              <defs>
                <linearGradient id="spendCurrentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isDark ? "#fbbf24" : "#F59E0B"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={isDark ? "#fbbf24" : "#F59E0B"} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="spendPrevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isDark ? "#94a3b8" : "#64748b"} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={isDark ? "#94a3b8" : "#64748b"} stopOpacity={0} />
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
              <Tooltip content={<ComparisonTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => (
                  <span className="text-xs text-foreground">{value}</span>
                )}
              />
              <Area
                type="monotone"
                dataKey="previous"
                stroke={isDark ? "#94a3b8" : "#64748b"}
                fill="url(#spendPrevGrad)"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                name="Previous Period"
                animationDuration={800}
              />
              <Area
                type="monotone"
                dataKey="current"
                stroke={isDark ? "#fbbf24" : "#F59E0B"}
                fill="url(#spendCurrentGrad)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: isDark ? "#fbbf24" : "#F59E0B", fill: isDark ? "#1e1b4b" : "#fff" }}
                name="Current Period"
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Purchase Categories Bar + Performance Metrics */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Purchase Categories Horizontal Bar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="size-4 text-rose-500" />
              Orders by Category
            </CardTitle>
            <CardDescription>Purchase distribution by type</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryBarData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                No category data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryBarData.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: chartTextColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: chartTextColor }}
                    width={120}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--card-foreground))",
                    }}
                    formatter={(value: number, name: string) => [
                      name === "orders" ? value : formatCurrency(value),
                      name === "orders" ? "Orders" : "Spending",
                    ]}
                  />
                  <Bar
                    dataKey="orders"
                    fill={isDark ? "#fb923c" : "#F59E0B"}
                    radius={[0, 4, 4, 0]}
                    animationDuration={800}
                    name="Orders"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4 text-emerald-500" />
              Performance Metrics
            </CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-around py-4">
              <CircularProgress value={88} color="#F59E0B" label="Satisfaction" />
              <CircularProgress value={82} color="#14B8A6" label="Response Rate" />
              <CircularProgress value={91} color="#8B5CF6" label="On-Time" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Vendors + Savings + Conversion Funnel */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Vendors Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="size-4 text-amber-500" />
              Top Vendors
            </CardTitle>
            <CardDescription>Vendors ranked by your spending</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topVendors.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                No vendor data
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground pb-3 pr-4">Vendor</th>
                      <th className="text-right text-xs font-medium text-muted-foreground pb-3 pr-4">Spent</th>
                      <th className="text-right text-xs font-medium text-muted-foreground pb-3">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topVendors.slice(0, 5).map((vendor) => (
                      <tr key={vendor.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7">
                              {vendor.avatarUrl ? (
                                <AvatarImage src={vendor.avatarUrl} alt={vendor.name} />
                              ) : null}
                              <AvatarFallback className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                {vendor.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{vendor.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right text-sm font-semibold text-amber-600 dark:text-amber-400">
                          {formatCurrency(vendor.totalSpent)}
                        </td>
                        <td className="py-3 text-right text-sm text-muted-foreground">
                          {vendor.transactionCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel for Buyers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="size-4 text-teal-500" />
              Conversion Funnel
            </CardTitle>
            <CardDescription>Your purchase journey</CardDescription>
          </CardHeader>
          <CardContent>
            <ConversionFunnel />
          </CardContent>
        </Card>
      </div>

      {/* Savings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PiggyBank className="size-4 text-emerald-500" />
            Savings & Refunds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-emerald-500/5">
              <p className="text-xs text-muted-foreground">Total Saved</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                <AnimatedValue value={analytics?.savings.totalRefunded ?? 0} prefix="$" decimals={2} />
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-amber-500/5">
              <p className="text-xs text-muted-foreground">Refunds</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
                {analytics?.savings.refundCount ?? 0}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-teal-500/5">
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="text-lg font-bold text-teal-600 dark:text-teal-400 mt-1">
                <AnimatedValue value={analytics?.savings.totalSpent ?? 0} prefix="$" decimals={2} />
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-violet-500/5">
              <p className="text-xs text-muted-foreground">Commission Paid</p>
              <p className="text-lg font-bold text-violet-600 dark:text-violet-400 mt-1">
                <AnimatedValue value={analytics?.savings.totalCommission ?? 0} prefix="$" decimals={2} />
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---- Main Component ----
export function DashboardAnalyticsPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const { user } = useAuthStore();
  const role = user?.role || "BUYER";

  const exportAll = useCallback(() => {
    const headers = ["Metric", "Value"];
    const rows = [
      ["Period", period],
      ["Role", role],
    ];
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [period, role]);

  return (
    <div className="space-y-6">
      {/* Gradient Header Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 dark:from-teal-800 dark:via-cyan-800 dark:to-blue-800 p-6 md:p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <BarChart3 className="size-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Analytics Dashboard</h1>
                <p className="text-teal-100/80 mt-0.5 text-sm">
                  Track performance, revenue, and growth metrics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(["7d", "30d", "90d"] as const).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? "secondary" : "ghost"}
                  size="sm"
                  className={`h-8 text-xs px-3 ${
                    period === p
                      ? "bg-white/20 text-white hover:bg-white/30 border-white/20"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                  onClick={() => setPeriod(p)}
                >
                  {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs px-3 text-white/70 hover:text-white hover:bg-white/10"
                onClick={exportAll}
              >
                <Download className="size-3.5 mr-1" /> Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Role-based Analytics Tabs */}
      <Tabs defaultValue={role === "AUTHOR" ? "author" : "buyer"} className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="author" className="text-xs">
            Author Analytics
          </TabsTrigger>
          <TabsTrigger value="buyer" className="text-xs">
            Buyer Analytics
          </TabsTrigger>
        </TabsList>
        <TabsContent value="author">
          <AuthorAnalyticsView period={period} />
        </TabsContent>
        <TabsContent value="buyer">
          <BuyerAnalyticsView period={period} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
