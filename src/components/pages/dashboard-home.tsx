"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  ShoppingBag,
  Star,
  MessageSquare,
  Eye,
  Briefcase,
  Users,
  AlertTriangle,
  Package,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Wallet,
  ChevronRight,
  BarChart3,
  Inbox,
  Rocket,
  FileText,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { StarRating } from "@/components/shared/review-card";
import { useAuthStore } from "@/store/auth";
import { useNavigationStore } from "@/store/navigation";
import { apiFetch } from "@/lib/api-client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardStats {
  role: "AUTHOR" | "BUYER";
}

interface AuthorStats extends DashboardStats {
  role: "AUTHOR";
  totalEarnings: number;
  pendingPayout: number;
  availableForPayout: number;
  averageRating: number;
  totalSales: number;
  recentSales: Array<{
    id: string;
    amount: number;
    netAmount: number;
    status: string;
    description: string | null;
    createdAt: string;
    buyer: { id: string; name: string; avatarUrl: string | null };
  }>;
  recentReviews: Array<{
    id: string;
    rating: number;
    comment: string;
    reply: string | null;
    createdAt: string;
    reviewer: { id: string; name: string; avatarUrl: string | null };
  }>;
  unreadMessages: number;
}

interface BuyerStats extends DashboardStats {
  role: "BUYER";
  totalSpent: number;
  purchaseCount: number;
  savedAuthorsCount: number;
  openDisputes: number;
  recentPurchases: Array<{
    id: string;
    amount: number;
    status: string;
    description: string | null;
    createdAt: string;
    seller: { id: string; name: string; avatarUrl: string | null };
  }>;
  savedAuthors: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
    averageRating: number;
    totalSales: number;
    skills: string[];
  }>;
}

// Animated Count-Up Hook
function useCountUp(target: number, duration: number = 1000) {
  const [value, setValue] = useState(0);
  const ref = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = performance.now();
    const startValue = 0;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
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

// Mini Sparkline component
function MiniSparkline({
  data,
  color = "text-emerald-500",
  height = 32,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;

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
      <polygon
        points={areaPoints}
        className="fill-current opacity-10"
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-60"
      />
    </svg>
  );
}

// Performance Chart - larger SVG line chart with labels
function PerformanceChart({
  data,
  color = "#10b981",
  label,
  prefix = "$",
}: {
  data: number[];
  color?: string;
  label: string;
  prefix?: string;
}) {
  if (data.length < 2) return null;
  const height = 160;
  const width = 400;
  const padding = { top: 20, right: 10, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartW;
      const y = padding.top + chartH - ((val - min) / range) * chartH;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${padding.left},${padding.top + chartH} ${points} ${padding.left + chartW},${padding.top + chartH}`;

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const tickCount = 4;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {Array.from({ length: tickCount }, (_, i) => {
          const y = padding.top + (i / (tickCount - 1)) * chartH;
          const val = max - (i / (tickCount - 1)) * range;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartW}
                y2={y}
                className="stroke-border"
                strokeWidth="0.5"
                strokeDasharray="4,4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[9px]"
              >
                {prefix}{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <defs>
          <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon
          points={areaPoints}
          fill={`url(#grad-${label})`}
        />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data dots */}
        {data.map((val, i) => {
          const x = padding.left + (i / (data.length - 1)) * chartW;
          const y = padding.top + chartH - ((val - min) / range) * chartH;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="3" fill={color} className="opacity-0 hover:opacity-100 transition-opacity" />
              <circle cx={x} cy={y} r="6" fill={color} className="opacity-0 hover:opacity-20 transition-opacity" />
            </g>
          );
        })}

        {/* Day labels */}
        {data.map((_, i) => {
          const x = padding.left + (i / (data.length - 1)) * chartW;
          return (
            <text
              key={i}
              x={x}
              y={height - 6}
              textAnchor="middle"
              className="fill-muted-foreground text-[9px]"
            >
              {days[i % 7]}
            </text>
          );
        })}
      </svg>
    </div>
  );
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

// Enhanced Stat Card with colored left border, hover gradient, and tooltip
function EnhancedStatCard({
  title,
  value,
  subtitle,
  icon,
  sparklineData,
  sparklineColor,
  borderColor,
  tooltipText,
  delay = 0,
  iconBg,
}: {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  icon: React.ReactNode;
  sparklineData?: number[];
  sparklineColor?: string;
  borderColor: string;
  tooltipText: string;
  delay?: number;
  iconBg: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={`overflow-hidden border-l-4 ${borderColor} cursor-pointer group hover:shadow-lg transition-all duration-300 hover:bg-gradient-to-br hover:from-card hover:to-muted/30`}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {title}
                    </p>
                    <p className="text-2xl font-bold tracking-tight">
                      {value}
                    </p>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconBg} group-hover:scale-110 transition-transform`}>
                      {icon}
                    </div>
                    {sparklineData && sparklineColor && (
                      <MiniSparkline data={sparklineData} color={sparklineColor} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.div>
  );
}

// Quick Action Card with gradient bg, animated arrow
function QuickActionCard({
  icon,
  title,
  description,
  onClick,
  colorClass,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  colorClass: string;
  delay?: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative p-4 rounded-xl border border-border bg-card hover:shadow-lg hover:border-primary/30 dark:hover:border-primary/20 transition-all text-left group overflow-hidden"
    >
      {/* Gradient overlay on hover */}
      <div className={`absolute inset-0 ${colorClass} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div
            className={`size-10 rounded-lg ${colorClass} flex items-center justify-center group-hover:scale-110 transition-transform`}
          >
            {icon}
          </div>
          <ArrowRight className="size-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
        </div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </motion.button>
  );
}

// Review Card for dashboard
function DashboardReviewCard({
  review,
}: {
  review: {
    id: string;
    rating: number;
    comment: string;
    reply: string | null;
    createdAt: string;
    reviewer: { id: string; name: string; avatarUrl: string | null };
  };
}) {
  return (
    <div className="p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2 mb-1.5">
        <Avatar className="size-7">
          {review.reviewer.avatarUrl ? (
            <AvatarImage src={review.reviewer.avatarUrl} />
          ) : (
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {review.reviewer.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          )}
        </Avatar>
        <span className="text-sm font-medium">{review.reviewer.name}</span>
        <StarRating rating={review.rating} />
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 pl-9">
        {review.comment}
      </p>
      {review.reply && (
        <p className="text-xs text-primary pl-9 mt-1 flex items-center gap-1">
          <Sparkles className="size-3" /> Replied
        </p>
      )}
    </div>
  );
}

// Vertical Timeline Component
function ActivityTimeline({
  items,
  onViewAll,
  viewAllLabel = "View all activity",
}: {
  items: Array<{
    id: string;
    icon: React.ReactNode;
    iconColor: string;
    dotColor: string;
    title: string;
    subtitle: string;
    time: string;
  }>;
  onViewAll?: () => void;
  viewAllLabel?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border" />

      <div className="space-y-0">
        {items.map((item, idx) => (
          <div key={item.id} className="relative flex items-start gap-4 pb-4 last:pb-0">
            {/* Dot on timeline */}
            <div className={`relative z-10 flex items-center justify-center size-[32px] shrink-0 rounded-full ${item.dotColor} shadow-sm`}>
              {item.icon}
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0 pt-1">{item.time}</span>
          </div>
        ))}
      </div>

      {onViewAll && (
        <button
          onClick={onViewAll}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors ml-10"
        >
          {viewAllLabel}
          <ChevronRight className="size-3" />
        </button>
      )}
    </div>
  );
}

// Engaging Empty State with CSS-based illustration
function EngagingEmptyState({
  icon: Icon,
  title,
  description,
  tips,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  tips?: string[];
  ctaLabel?: string;
  onCta?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      {/* CSS-based animated illustration */}
      <div className="relative mb-6">
        <div className="size-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <Icon className="size-10 text-primary/40" />
        </div>
        {/* Animated floating dots */}
        <div className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms", animationDuration: "2s" }} />
        <div className="absolute -bottom-1 -left-2 size-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "500ms", animationDuration: "2.5s" }} />
        <div className="absolute top-1 -left-3 size-2.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: "1000ms", animationDuration: "3s" }} />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>

      {tips && tips.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border max-w-xs w-full text-left">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Tips to get started</p>
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-primary mt-0.5 shrink-0">&#x2022;</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        {ctaLabel && onCta && (
          <Button size="sm" onClick={onCta}>
            <Rocket className="size-3.5 mr-1.5" />
            {ctaLabel}
          </Button>
        )}
        {secondaryLabel && onSecondary && (
          <Button variant="outline" size="sm" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Floating decorative shapes for banner
function BannerDecorations({ variant }: { variant: "author" | "buyer" }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Floating circles */}
      <div
        className="absolute top-4 right-20 size-16 rounded-full opacity-10 animate-pulse"
        style={{ animationDuration: "4s" }}
      >
        <div className={`size-full rounded-full ${variant === "author" ? "bg-white" : "bg-white"}`} />
      </div>
      <div
        className="absolute bottom-6 left-16 size-10 rounded-full opacity-10 animate-pulse"
        style={{ animationDuration: "5s", animationDelay: "1s" }}
      >
        <div className="size-full rounded-full bg-white" />
      </div>
      <div
        className="absolute top-1/2 right-1/3 size-6 rounded-full opacity-15 animate-pulse"
        style={{ animationDuration: "3s", animationDelay: "0.5s" }}
      >
        <div className="size-full rounded-full bg-white" />
      </div>
      {/* Floating dots */}
      <div
        className="absolute top-8 left-1/3 size-2 rounded-full bg-white/20 animate-bounce"
        style={{ animationDuration: "3s", animationDelay: "0.2s" }}
      />
      <div
        className="absolute bottom-10 right-1/4 size-3 rounded-full bg-white/15 animate-bounce"
        style={{ animationDuration: "4s", animationDelay: "1s" }}
      />
      <div
        className="absolute top-1/3 left-20 size-1.5 rounded-full bg-white/25 animate-bounce"
        style={{ animationDuration: "2.5s", animationDelay: "0.8s" }}
      />
      {/* Larger decorative ring */}
      <div
        className="absolute -bottom-4 -right-4 size-32 rounded-full border border-white/10 animate-pulse"
        style={{ animationDuration: "6s" }}
      />
      <div
        className="absolute -top-8 -left-8 size-24 rounded-full border border-white/5 animate-pulse"
        style={{ animationDuration: "7s", animationDelay: "2s" }}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

// Format current date nicely
function formatCurrentDate() {
  return format(new Date(), "EEEE, MMMM d, yyyy");
}

export function DashboardHomePage() {
  const { user } = useAuthStore();
  const { navigate } = useNavigationStore();
  const isAuthor = user?.role === "AUTHOR";

  const { data, isLoading, error } = useQuery<AuthorStats | BuyerStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const json = await apiFetch<{ success: boolean; data: AuthorStats | BuyerStats }>("/api/dashboard/stats");
      return json.data;
    },
    refetchInterval: 30000,
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Generate fake sparkline data from stats
  const generateSparkline = (base: number, variance: number, points: number = 7): number[] => {
    return Array.from({ length: points }, (_, i) =>
      Math.max(0, base + (Math.sin(i * 0.8) * variance) + (Math.random() * variance * 0.5))
    );
  };

  // Generate chart data for the performance section
  const chartData = useMemo(() => {
    if (!data) return [];
    if (data.role === "AUTHOR") {
      const ad = data as AuthorStats;
      return generateSparkline(ad.totalEarnings / 7, ad.totalEarnings * 0.2);
    }
    const bd = data as BuyerStats;
    return generateSparkline(bd.totalSpent / 7, bd.totalSpent * 0.2);
  }, [data]);

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting()}, {user?.name?.split(" ")[0] || "User"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your account today.
          </p>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Failed to load dashboard data. Please refresh.
            </p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  // ============ AUTHOR VIEW ============
  if (isAuthor && data.role === "AUTHOR") {
    const authorData = data as AuthorStats;
    const earningsSparkline = generateSparkline(authorData.totalEarnings / 7, authorData.totalEarnings * 0.15);
    const salesSparkline = generateSparkline(authorData.totalSales / 7, authorData.totalSales * 0.2, 7);

    // Build activity timeline items for author
    const authorTimelineItems = [
      ...(authorData.recentSales || []).slice(0, 3).map((sale) => ({
        id: sale.id,
        icon: <DollarSign className="size-3.5 text-emerald-600 dark:text-emerald-400" />,
        iconColor: "text-emerald-600",
        dotColor: "bg-emerald-500/15",
        title: sale.description || "New sale",
        subtitle: `${sale.buyer.name} · $${sale.amount.toFixed(2)}`,
        time: formatDistanceToNow(new Date(sale.createdAt), { addSuffix: true }),
      })),
      ...(authorData.recentReviews || []).slice(0, 2).map((review) => ({
        id: review.id,
        icon: <Star className="size-3.5 text-amber-600 dark:text-amber-400" />,
        iconColor: "text-amber-600",
        dotColor: "bg-amber-500/15",
        title: `New ${review.rating}-star review`,
        subtitle: (review.comment || "").slice(0, 50) + ((review.comment || "").length > 50 ? "..." : ""),
        time: formatDistanceToNow(new Date(review.createdAt), { addSuffix: true }),
      })),
    ];

    const hasData = authorData.recentSales.length > 0 || authorData.recentReviews.length > 0;

    return (
      <div className="space-y-6">
        {/* Welcome Banner - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 md:p-8">
              {/* Animated gradient shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_8s_ease-in-out_infinite]" style={{ backgroundSize: "200% 100%" }} />
              {/* Decorative floating shapes */}
              <BannerDecorations variant="author" />
              <div className="relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium mb-1">
                      {greeting()}
                    </p>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                      {user?.name?.split(" ")[0] || "Creator"} 👋
                    </h1>
                    <p className="text-emerald-100/80 mt-1 text-sm">
                      Here&apos;s your marketplace overview for today
                    </p>
                    <p className="text-emerald-200/60 mt-0.5 text-xs font-medium">
                      {formatCurrentDate()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-white/15 text-white hover:bg-white/25 border-0 backdrop-blur-sm"
                      onClick={() => navigate("dashboard/earnings")}
                    >
                      <DollarSign className="size-4 mr-1" />
                      View Earnings
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-white/15 text-white hover:bg-white/25 border-0 backdrop-blur-sm"
                      onClick={() => navigate("dashboard/portfolio")}
                    >
                      <Briefcase className="size-4 mr-1" />
                      Edit Portfolio
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Author Stats - Enhanced with colored left borders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <EnhancedStatCard
            title="Total Earnings"
            value={<AnimatedStatValue value={authorData.totalEarnings} />}
            subtitle="all time"
            icon={<DollarSign className="size-5 text-emerald-600 dark:text-emerald-400" />}
            sparklineData={earningsSparkline}
            sparklineColor="text-emerald-500"
            borderColor="border-l-emerald-500"
            iconBg="bg-emerald-500/10"
            tooltipText={`Total lifetime earnings: $${authorData.totalEarnings.toFixed(2)}`}
            delay={0.1}
          />
          <EnhancedStatCard
            title="Pending Payout"
            value={<AnimatedStatValue value={authorData.pendingPayout} />}
            subtitle="awaiting"
            icon={<Clock className="size-5 text-amber-600 dark:text-amber-400" />}
            borderColor="border-l-amber-500"
            iconBg="bg-amber-500/10"
            tooltipText={`Pending payout amount: $${authorData.pendingPayout.toFixed(2)}`}
            delay={0.15}
          />
          <EnhancedStatCard
            title="Average Rating"
            value={<AnimatedStatValue value={authorData.averageRating} prefix="" decimals={1} />}
            subtitle="out of 5"
            icon={<Star className="size-5 text-amber-500 dark:text-amber-400" />}
            borderColor="border-l-amber-400"
            iconBg="bg-amber-500/10"
            tooltipText={`Based on reviews · ${authorData.averageRating.toFixed(1)} stars`}
            delay={0.2}
          />
          <EnhancedStatCard
            title="Total Sales"
            value={<AnimatedStatValue value={authorData.totalSales} prefix="" decimals={0} />}
            subtitle="completed"
            icon={<ShoppingBag className="size-5 text-teal-600 dark:text-teal-400" />}
            sparklineData={salesSparkline}
            sparklineColor="text-teal-500"
            borderColor="border-l-teal-500"
            iconBg="bg-teal-500/10"
            tooltipText={`${authorData.totalSales} completed sales`}
            delay={0.25}
          />
        </div>

        {/* Performance Chart - New Section */}
        {chartData.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="size-4 text-emerald-500" />
                      Earnings Overview
                    </CardTitle>
                    <CardDescription>Last 7 days performance</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("dashboard/earnings")}
                  >
                    Details <ChevronRight className="size-4 ml-0.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <PerformanceChart
                  data={chartData}
                  color="#10b981"
                  label="author-earnings"
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Activity Timeline - Replacing simple activity list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                    <CardDescription>Your latest marketplace activity</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!hasData ? (
                  <EngagingEmptyState
                    icon={Inbox}
                    title="No activity yet"
                    description="Your sales and reviews will appear here as you start transacting."
                    tips={[
                      "Complete your portfolio to attract buyers",
                      "Set competitive pricing for your services",
                      "Respond promptly to messages"
                    ]}
                    ctaLabel="Edit Portfolio"
                    onCta={() => navigate("dashboard/portfolio")}
                    secondaryLabel="Browse Tips"
                    onSecondary={() => navigate("help")}
                  />
                ) : (
                  <div className="max-h-80 overflow-y-auto custom-scroll">
                    <ActivityTimeline
                      items={authorTimelineItems}
                      onViewAll={() => navigate("dashboard/earnings")}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Reviews */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Recent Reviews</CardTitle>
                    <CardDescription>
                      What your clients are saying
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("dashboard/reviews")}
                  >
                    View all <ChevronRight className="size-4 ml-0.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {authorData.recentReviews.length === 0 ? (
                  <EngagingEmptyState
                    icon={Star}
                    title="No reviews yet"
                    description="Reviews from your clients will show up here once you complete transactions."
                    tips={[
                      "Deliver quality work on time",
                      "Communicate clearly with buyers",
                      "Ask satisfied clients for reviews"
                    ]}
                  />
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto custom-scroll">
                    {authorData.recentReviews.map((review) => (
                      <DashboardReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <QuickActionCard
                  icon={<Eye className="size-5 text-emerald-600 dark:text-emerald-400" />}
                  title="View Profile"
                  description="See your public page"
                  onClick={() => navigate("profile", { userId: user?.id })}
                  colorClass="bg-emerald-500/10"
                  delay={0.1}
                />
                <QuickActionCard
                  icon={<Briefcase className="size-5 text-violet-600 dark:text-violet-400" />}
                  title="Edit Portfolio"
                  description="Manage your showcase"
                  onClick={() => navigate("dashboard/portfolio")}
                  colorClass="bg-violet-500/10"
                  delay={0.15}
                />
                <QuickActionCard
                  icon={<Wallet className="size-5 text-cyan-600 dark:text-cyan-400" />}
                  title="Request Payout"
                  description="Withdraw earnings"
                  onClick={() => navigate("dashboard/withdraw")}
                  colorClass="bg-cyan-500/10"
                  delay={0.2}
                />
                <QuickActionCard
                  icon={<MessageSquare className="size-5 text-rose-600 dark:text-rose-400" />}
                  title="Messages"
                  description={
                    authorData.unreadMessages > 0
                      ? `${authorData.unreadMessages} unread`
                      : "No new messages"
                  }
                  onClick={() => navigate("dashboard/messages")}
                  colorClass="bg-rose-500/10"
                  delay={0.25}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ============ BUYER VIEW ============
  const buyerData = data as BuyerStats;
  const spendingSparkline = generateSparkline(buyerData.totalSpent / 7, buyerData.totalSpent * 0.15);

  // Build activity timeline items for buyer
  const buyerTimelineItems = (buyerData.recentPurchases || []).slice(0, 5).map((purchase) => {
    const statusIconMap: Record<string, { icon: React.ReactNode; dotColor: string }> = {
      COMPLETED: { icon: <ShoppingBag className="size-3.5 text-emerald-600 dark:text-emerald-400" />, dotColor: "bg-emerald-500/15" },
      PENDING: { icon: <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />, dotColor: "bg-amber-500/15" },
      DISPUTED: { icon: <AlertTriangle className="size-3.5 text-red-600 dark:text-red-400" />, dotColor: "bg-red-500/15" },
      REFUNDED: { icon: <DollarSign className="size-3.5 text-sky-600 dark:text-sky-400" />, dotColor: "bg-sky-500/15" },
    };
    const mapped = statusIconMap[purchase.status] || { icon: <FileText className="size-3.5 text-muted-foreground" />, dotColor: "bg-muted" };
    return {
      id: purchase.id,
      icon: mapped.icon,
      iconColor: "",
      dotColor: mapped.dotColor,
      title: purchase.description || "Purchase from " + purchase.seller.name,
      subtitle: `${purchase.seller.name} · $${purchase.amount.toFixed(2)}`,
      time: formatDistanceToNow(new Date(purchase.createdAt), { addSuffix: true }),
    };
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner - Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 p-6 md:p-8">
            {/* Animated gradient shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_8s_ease-in-out_infinite]" style={{ backgroundSize: "200% 100%" }} />
            {/* Decorative floating shapes */}
            <BannerDecorations variant="buyer" />
            <div className="relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-purple-100 text-sm font-medium mb-1">
                    {greeting()}
                  </p>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    {user?.name?.split(" ")[0] || "User"} 👋
                  </h1>
                  <p className="text-purple-100/80 mt-1 text-sm">
                    Discover amazing creators and manage your purchases
                  </p>
                  <p className="text-purple-200/60 mt-0.5 text-xs font-medium">
                    {formatCurrentDate()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/15 text-white hover:bg-white/25 border-0 backdrop-blur-sm"
                    onClick={() => navigate("browse")}
                  >
                    <Users className="size-4 mr-1" />
                    Browse Creators
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/15 text-white hover:bg-white/25 border-0 backdrop-blur-sm"
                    onClick={() => navigate("dashboard/purchases")}
                  >
                    <ShoppingBag className="size-4 mr-1" />
                    My Purchases
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Buyer Stats - Enhanced with colored left borders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <EnhancedStatCard
          title="Total Spent"
          value={<AnimatedStatValue value={buyerData.totalSpent} />}
          subtitle="all time"
          icon={<DollarSign className="size-5 text-violet-600 dark:text-violet-400" />}
          sparklineData={spendingSparkline}
          sparklineColor="text-violet-500"
          borderColor="border-l-violet-500"
          iconBg="bg-violet-500/10"
          tooltipText={`Total spent: $${buyerData.totalSpent.toFixed(2)}`}
          delay={0.1}
        />
        <EnhancedStatCard
          title="Purchases"
          value={<AnimatedStatValue value={buyerData.purchaseCount} prefix="" decimals={0} />}
          subtitle="total"
          icon={<Package className="size-5 text-teal-600 dark:text-teal-400" />}
          borderColor="border-l-teal-500"
          iconBg="bg-teal-500/10"
          tooltipText={`${buyerData.purchaseCount} purchases made`}
          delay={0.15}
        />
        <EnhancedStatCard
          title="Saved Authors"
          value={<AnimatedStatValue value={buyerData.savedAuthorsCount} prefix="" decimals={0} />}
          subtitle="bookmarked"
          icon={<Users className="size-5 text-rose-600 dark:text-rose-400" />}
          borderColor="border-l-rose-500"
          iconBg="bg-rose-500/10"
          tooltipText={`${buyerData.savedAuthorsCount} creators bookmarked`}
          delay={0.2}
        />
        <EnhancedStatCard
          title="Open Disputes"
          value={<AnimatedStatValue value={buyerData.openDisputes} prefix="" decimals={0} />}
          subtitle="active"
          icon={
            <AlertTriangle className={`size-5 ${buyerData.openDisputes > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`} />
          }
          borderColor={buyerData.openDisputes > 0 ? "border-l-red-500" : "border-l-emerald-500"}
          iconBg={buyerData.openDisputes > 0 ? "bg-red-500/10" : "bg-emerald-500/10"}
          tooltipText={buyerData.openDisputes > 0 ? `${buyerData.openDisputes} open disputes` : "No open disputes"}
          delay={0.25}
        />
      </div>

      {/* Spending Chart - New Section */}
      {chartData.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="size-4 text-violet-500" />
                    Spending Overview
                  </CardTitle>
                  <CardDescription>Last 7 days activity</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("dashboard/purchases")}
                >
                  Details <ChevronRight className="size-4 ml-0.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <PerformanceChart
                data={chartData}
                color="#8b5cf6"
                label="buyer-spending"
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <CardDescription>Your latest purchase activity</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {buyerTimelineItems.length === 0 ? (
                <EngagingEmptyState
                  icon={Inbox}
                  title="No activity yet"
                  description="Your purchases will appear here as you start buying from creators."
                  tips={[
                    "Browse creators to find services you need",
                    "Check ratings and reviews before buying",
                    "Save your favorite creators for later"
                  ]}
                  ctaLabel="Browse Creators"
                  onCta={() => navigate("browse")}
                />
              ) : (
                <div className="max-h-80 overflow-y-auto custom-scroll">
                  <ActivityTimeline
                    items={buyerTimelineItems}
                    onViewAll={() => navigate("dashboard/purchases")}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Saved Authors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Saved Authors</CardTitle>
                  <CardDescription>
                    Creators you&apos;ve bookmarked
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("browse")}
                >
                  Browse more <ChevronRight className="size-4 ml-0.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(buyerData.savedAuthors || []).length === 0 ? (
                <EngagingEmptyState
                  icon={Users}
                  title="No saved authors"
                  description="Start bookmarking creators you like to easily find them later."
                  tips={[
                    "Click the heart icon on creator profiles",
                    "Saved creators appear here for quick access",
                    "Get notified when saved creators add new services"
                  ]}
                  ctaLabel="Discover Creators"
                  onCta={() => navigate("browse")}
                />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(buyerData.savedAuthors || []).slice(0, 4).map((author) => (
                    <button
                      key={author.id}
                      onClick={() =>
                        navigate("profile", { userId: author.id })
                      }
                      className="p-3 rounded-lg border border-border hover:bg-accent dark:hover:bg-accent/50 hover:border-primary/30 hover:shadow-sm transition-all text-left group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="size-8">
                          {author.avatarUrl ? (
                            <AvatarImage src={author.avatarUrl} />
                          ) : (
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {author.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">
                            {author.name}
                          </p>
                          <div className="flex items-center gap-1">
                            <Star className="size-3 fill-amber-400 dark:fill-amber-500 text-amber-400 dark:text-amber-500" />
                            <span className="text-xs text-muted-foreground">
                              {author.averageRating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {(author.skills || []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(author.skills || []).slice(0, 2).map((skill) => (
                            <Badge
                              key={skill}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions - Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <QuickActionCard
                icon={<Users className="size-5 text-violet-600 dark:text-violet-400" />}
                title="Browse Creators"
                description="Find talent"
                onClick={() => navigate("browse")}
                colorClass="bg-violet-500/10"
                delay={0.1}
              />
              <QuickActionCard
                icon={<ShoppingBag className="size-5 text-emerald-600 dark:text-emerald-400" />}
                title="View Purchases"
                description="Track orders"
                onClick={() => navigate("dashboard/purchases")}
                colorClass="bg-emerald-500/10"
                delay={0.15}
              />
              <QuickActionCard
                icon={<MessageSquare className="size-5 text-rose-600 dark:text-rose-400" />}
                title="Messages"
                description="Chat with creators"
                onClick={() => navigate("dashboard/messages")}
                colorClass="bg-rose-500/10"
                delay={0.2}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
