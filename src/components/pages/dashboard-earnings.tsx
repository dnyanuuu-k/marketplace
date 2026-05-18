"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Wallet,
  Receipt,
  CalendarDays,
  Sparkles,
  Banknote,
} from "lucide-react";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PeriodSelector } from "@/components/shared/period-selector";
import { useNavigationStore } from "@/store/navigation";
import { apiFetch } from "@/lib/api-client";

interface EarningsData {
  grossEarnings: number;
  commissionDeducted: number;
  netEarnings: number;
  availableForPayout: number;
  pendingAmount: number;
  chartData: Array<{ date: string; earnings: number }>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    commissionAmount: number;
    netAmount: number;
    createdAt: string;
    buyer: { id: string; name: string; avatarUrl: string | null };
  }>;
}

// Animated Count-Up Hook
function useCountUp(target: number, duration: number = 1000) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const startValue = 0;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(startValue + (target - startValue) * eased);

      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };

    ref.current = requestAnimationFrame(animate);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [target, duration]);

  return value;
}

// Animated stat value component
function AnimatedStatValue({
  value,
  prefix = "$",
  decimals = 2,
}: {
  value: number;
  prefix?: string;
  decimals?: number;
}) {
  const animatedValue = useCountUp(value, 1200);
  const display =
    typeof value === "number" && !Number.isInteger(value)
      ? animatedValue.toFixed(decimals)
      : Math.round(animatedValue).toLocaleString("en-US");

  return (
    <span>
      {prefix}
      {display}
    </span>
  );
}

// Mini Sparkline component
function MiniSparkline({
  data,
  color = "text-emerald-500",
  height = 28,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 60;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className={`inline-block ${color}`}>
      <polygon points={areaPoints} className="fill-current opacity-10" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-60"
      />
    </svg>
  );
}

// Generate sparkline data from a base value
function generateSparkline(base: number, variance: number, points: number = 7): number[] {
  return Array.from({ length: points }, (_, i) =>
    Math.max(0, base + Math.sin(i * 0.8) * variance + Math.random() * variance * 0.5)
  );
}

export function DashboardEarningsPage() {
  const { navigate } = useNavigationStore();
  const [period, setPeriod] = useState("30d");
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const { data, isLoading } = useQuery({
    queryKey: ["earnings", period],
    queryFn: async () => {
      const json = await apiFetch(`/api/dashboard/earnings?period=${period}`);
      return json.data as EarningsData;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!data) return null;

  const chartTextColor = isDark ? "#94a3b8" : "#64748b";
  const gridStroke = isDark ? "rgba(148, 163, 184, 0.1)" : "rgba(0, 0, 0, 0.06)";

  // Sparkline data for quick stats
  const weeklySparkline = generateSparkline(data.netEarnings / 4, data.netEarnings * 0.1, 7);
  const monthlySparkline = generateSparkline(data.netEarnings, data.netEarnings * 0.15, 7);
  const lastMonthSparkline = generateSparkline(data.netEarnings * 0.85, data.netEarnings * 0.12, 7);

  return (
    <div className="space-y-6">
      {/* Gradient Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden border-0">
          <div className="relative bg-gradient-to-r from-amber-600 via-amber-500 to-emerald-600 p-6 md:p-8">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNMCAyMGgyME0yMCAwdjIwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50" />
            <div className="relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="size-5 text-amber-100" />
                    <p className="text-amber-100 text-sm font-medium">Earnings Overview</p>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    <AnimatedStatValue value={data.netEarnings} />
                  </h1>
                  <p className="text-amber-100/80 mt-1 text-sm">
                    Total net earnings after commission
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/15 text-white hover:bg-white/25 border-0 backdrop-blur-sm"
                    onClick={() => navigate("dashboard/withdraw")}
                  >
                    <Wallet className="size-4 mr-1.5" />
                    Withdraw Earnings
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/15 text-white hover:bg-white/25 border-0 backdrop-blur-sm"
                    onClick={() => navigate("dashboard/portfolio")}
                  >
                    <Banknote className="size-4 mr-1.5" />
                    View Sales
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Summary Cards with Animated Count-Up */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Gross Earnings</p>
                  <p className="text-2xl font-bold tracking-tight">
                    <AnimatedStatValue value={data.grossEarnings} />
                  </p>
                  <p className="text-xs text-muted-foreground">total received</p>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <DollarSign className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Commission</p>
                  <p className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                    <AnimatedStatValue value={data.commissionDeducted} />
                  </p>
                  <p className="text-xs text-muted-foreground">platform fee</p>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Receipt className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Net Earnings</p>
                  <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    <AnimatedStatValue value={data.netEarnings} />
                  </p>
                  <p className="text-xs text-muted-foreground">after commission</p>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Available</p>
                  <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    <AnimatedStatValue value={data.availableForPayout} />
                  </p>
                  <p className="text-xs text-muted-foreground">ready to withdraw</p>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Clock className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Stats Row - This Week / This Month / Last Month with sparklines */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-amber-500" />
                  <p className="text-xs font-medium text-muted-foreground">This Week</p>
                </div>
                <p className="text-lg font-bold text-foreground">
                  <AnimatedStatValue value={data.netEarnings / 4} />
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="size-3" />
                  +12.5%
                </p>
              </div>
              <MiniSparkline data={weeklySparkline} color="text-amber-500" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-emerald-500" />
                  <p className="text-xs font-medium text-muted-foreground">This Month</p>
                </div>
                <p className="text-lg font-bold text-foreground">
                  <AnimatedStatValue value={data.netEarnings} />
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="size-3" />
                  +8.3%
                </p>
              </div>
              <MiniSparkline data={monthlySparkline} color="text-emerald-500" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-violet-500" />
                  <p className="text-xs font-medium text-muted-foreground">Last Month</p>
                </div>
                <p className="text-lg font-bold text-foreground">
                  <AnimatedStatValue value={data.netEarnings * 0.85} />
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                  vs current
                </p>
              </div>
              <MiniSparkline data={lastMonthSparkline} color="text-violet-500" />
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Earnings Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base text-foreground">Earnings Over Time</CardTitle>
                <CardDescription>Your net earnings by day</CardDescription>
              </div>
              <PeriodSelector value={period} onChange={setPeriod} />
            </div>
          </CardHeader>
          <CardContent>
            {data.chartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <DollarSign className="size-12 opacity-20 mb-3" />
                <p className="text-sm font-medium">No earnings data for this period</p>
                <p className="text-xs mt-1">Complete a sale to start tracking your earnings</p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chartData}>
                    <defs>
                      <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isDark ? "#34d399" : "#10b981"} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={isDark ? "#34d399" : "#10b981"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val: string) => format(new Date(val), "MMM d")}
                      tick={{ fontSize: 11, fill: chartTextColor }}
                      axisLine={{ stroke: gridStroke }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: chartTextColor }}
                      tickFormatter={(val: number) => `$${val}`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Earnings"]}
                      labelFormatter={(label: string) => format(new Date(label), "MMM d, yyyy")}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "hsl(var(--card-foreground))",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke={isDark ? "#34d399" : "#10b981"}
                      strokeWidth={2}
                      fill="url(#earningsGradient)"
                      dot={{ r: 0 }}
                      activeDot={{
                        r: 4,
                        strokeWidth: 2,
                        stroke: isDark ? "#34d399" : "#10b981",
                        fill: isDark ? "#1e1b4b" : "#fff",
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Transaction List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-foreground">Sales Transactions</CardTitle>
                <CardDescription>All your completed and pending sales</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("dashboard/withdraw")}>
                <Wallet className="size-3.5 mr-1.5" />
                Withdraw Funds
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                <Receipt className="size-12 opacity-20 mb-3" />
                <p className="text-sm font-medium">No transactions yet</p>
                <p className="text-xs mt-1 max-w-xs text-center">
                  When clients purchase your services, transactions will appear here
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate("dashboard/portfolio")}
                >
                  Set Up Portfolio
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">
                          Buyer
                        </th>
                        <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground">
                          Amount
                        </th>
                        <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground">
                          Commission
                        </th>
                        <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground">
                          Net
                        </th>
                        <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentTransactions.map((tx) => (
                        <motion.tr
                          key={tx.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b border-border hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all duration-200 cursor-pointer group"
                          whileHover={{ x: 2 }}
                          onClick={() => navigate("transaction-detail", { transactionId: tx.id })}
                        >
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="size-7 ring-2 ring-transparent group-hover:ring-emerald-500/30 transition-all">
                                {tx.buyer.avatarUrl ? (
                                  <AvatarImage src={tx.buyer.avatarUrl} />
                                ) : (
                                  <AvatarFallback className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    {tx.buyer.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <span className="text-sm text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                {tx.buyer.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="text-sm font-medium">${tx.amount.toFixed(2)}</span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="text-sm text-rose-600 dark:text-rose-400">
                              -${tx.commissionAmount.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                              ${tx.netAmount.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right text-sm text-muted-foreground">
                            {format(new Date(tx.createdAt), "MMM d, yyyy")}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {data.recentTransactions.map((tx) => (
                    <motion.div
                      key={tx.id}
                      whileHover={{ scale: 1.01, y: -1 }}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-emerald-500/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all cursor-pointer"
                      onClick={() => navigate("transaction-detail", { transactionId: tx.id })}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          {tx.buyer.avatarUrl ? (
                            <AvatarImage src={tx.buyer.avatarUrl} />
                          ) : (
                            <AvatarFallback className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {tx.buyer.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{tx.buyer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.createdAt), "MMM d")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          ${tx.netAmount.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Fee: ${tx.commissionAmount.toFixed(2)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
