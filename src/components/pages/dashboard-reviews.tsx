"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star,
  Filter,
  ArrowUpDown,
  Loader2,
  Search,
  X,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  CheckCircle2,
  ChevronDown,
  Send,
  Sparkles,
  Eye,
  BadgeCheck,
  Clock,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAuthStore } from "@/store/auth";
import { useNavigationStore } from "@/store/navigation";
import { apiFetch, apiPatch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface Review {
  id: string;
  rating: number;
  comment: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  reviewer: { id: string; name: string; avatarUrl: string | null };
  author: { id: string; name: string; avatarUrl: string | null };
  transaction: { id: string; amount: number; description: string | null } | null;
}

interface ReviewsData {
  type: "received" | "given";
  data: Review[];
  total: number;
  averageRating?: number;
  responseRate?: number;
}

type SortOption = "newest" | "highest" | "lowest" | "unreplied";
type ReplyFilter = "all" | "has_reply" | "no_reply";
type StarFilter = 0 | 1 | 2 | 3 | 4 | 5; // 0 = All

interface VoteState {
  [reviewId: string]: "up" | "down" | null;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const ITEMS_PER_PAGE = 6;

const REPLY_TEMPLATES = [
  { label: "Thank you for your review", text: "Thank you so much for your kind review! It was a pleasure working with you." },
  { label: "I'm sorry to hear that", text: "I'm sorry to hear about your experience. I'd love the opportunity to make things right — please reach out so we can discuss further." },
  { label: "Appreciate the feedback", text: "Thank you for the thoughtful feedback! Your suggestions help me improve and deliver better results." },
  { label: "Glad you loved it", text: "I'm thrilled you loved the result! It was great collaborating with you. Don't hesitate to reach out for future projects." },
];

const RATING_BAR_COLORS: Record<number, string> = {
  5: "bg-emerald-500",
  4: "bg-teal-500",
  3: "bg-amber-500",
  2: "bg-orange-500",
  1: "bg-red-500",
};

const RATING_BAR_BG_COLORS: Record<number, string> = {
  5: "bg-emerald-500/20",
  4: "bg-teal-500/20",
  3: "bg-amber-500/20",
  2: "bg-orange-500/20",
  1: "bg-red-500/20",
};

// ──────────────────────────────────────────────
// Helper Components
// ──────────────────────────────────────────────

function StarRating({
  rating,
  size = "sm",
  interactive = false,
  onRate,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRate?: (r: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const starSize =
    size === "sm" ? "size-3.5" : size === "md" ? "size-4" : "size-5";
  const displayRating = interactive && hovered > 0 ? hovered : rating;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            starSize,
            "transition-colors",
            interactive && "cursor-pointer",
            i < displayRating
              ? "fill-amber-400 text-amber-400"
              : "fill-none text-muted-foreground/30"
          )}
          onMouseEnter={interactive ? () => setHovered(i + 1) : undefined}
          onMouseLeave={interactive ? () => setHovered(0) : undefined}
          onClick={interactive && onRate ? () => onRate(i + 1) : undefined}
        />
      ))}
    </div>
  );
}

function LargeStarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-6 transition-colors",
            i < Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : i < rating
                ? "fill-amber-400/50 text-amber-400"
                : "fill-none text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

function TimeAgo({ date }: { date: string }) {
  let formatted: string | null = null;
  try {
    formatted = formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    formatted = null;
  }
  if (!formatted) return null;
  return (
    <span className="text-xs text-muted-foreground">{formatted}</span>
  );
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export function DashboardReviewsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);
  const queryClient = useQueryClient();
  const isAuthor = user?.role === "AUTHOR";

  // ── Filter state ──
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [starFilter, setStarFilter] = useState<StarFilter>(0);
  const [replyFilter, setReplyFilter] = useState<ReplyFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [votes, setVotes] = useState<VoteState>({});

  // ── Data fetching ──
  const { data, isLoading } = useQuery({
    queryKey: ["my-reviews"],
    queryFn: async () => {
      const json = await apiFetch("/api/reviews/me");
      return json.data as ReviewsData;
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({
      reviewId,
      reply,
    }: {
      reviewId: string;
      reply: string;
    }) => {
      return apiPatch(`/api/reviews/${reviewId}/reply`, { reply });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
    },
  });

  const handleReply = useCallback(
    (reviewId: string, reply: string) => {
      replyMutation.mutate({ reviewId, reply });
    },
    [replyMutation]
  );

  const handleVote = useCallback(
    (reviewId: string, direction: "up" | "down") => {
      setVotes((prev) => ({
        ...prev,
        [reviewId]: prev[reviewId] === direction ? null : direction,
      }));
    },
    []
  );

  // ── Apply search on Enter ──
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setSearchText(searchInput);
      setCurrentPage(1);
    }
  };

  // ── Filtering & sorting ──
  const reviews = data?.data || [];
  const filtered = useMemo(() => {
    let result = [...reviews];

    // Star filter
    if (starFilter > 0) {
      result = result.filter((r) => r.rating === starFilter);
    }

    // Reply filter
    if (replyFilter === "has_reply") {
      result = result.filter((r) => r.reply);
    } else if (replyFilter === "no_reply") {
      result = result.filter((r) => !r.reply);
    }

    // Search filter
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (r) =>
          r.comment.toLowerCase().includes(q) ||
          r.reviewer.name.toLowerCase().includes(q) ||
          r.author.name.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "highest":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "lowest":
        result.sort((a, b) => a.rating - b.rating);
        break;
      case "unreplied":
        result.sort((a, b) => {
          if (!a.reply && b.reply) return -1;
          if (a.reply && !b.reply) return 1;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        break;
    }

    return result;
  }, [reviews, starFilter, replyFilter, searchText, sortBy]);

  // ── Pagination ──
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedReviews = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ── Rating distribution ──
  const ratingDistribution = useMemo(() => {
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      if (dist[r.rating] !== undefined) dist[r.rating]++;
    });
    return dist;
  }, [reviews]);

  const totalReviews = reviews.length;

  // ── Active filters for chips ──
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (starFilter > 0) {
      chips.push({
        key: "star",
        label: `${starFilter} Star${starFilter > 1 ? "s" : ""}`,
        onRemove: () => {
          setStarFilter(0);
          setCurrentPage(1);
        },
      });
    }
    if (replyFilter !== "all") {
      chips.push({
        key: "reply",
        label: replyFilter === "has_reply" ? "Has Reply" : "No Reply",
        onRemove: () => {
          setReplyFilter("all");
          setCurrentPage(1);
        },
      });
    }
    if (searchText.trim()) {
      chips.push({
        key: "search",
        label: `"${searchText}"`,
        onRemove: () => {
          setSearchText("");
          setSearchInput("");
          setCurrentPage(1);
        },
      });
    }
    return chips;
  }, [starFilter, replyFilter, searchText]);

  // ── Reset all filters ──
  const clearAllFilters = () => {
    setStarFilter(0);
    setReplyFilter("all");
    setSearchText("");
    setSearchInput("");
    setSortBy("newest");
    setCurrentPage(1);
  };

  // ──────────────────────────────────────────
  // Loading Skeleton
  // ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <Skeleton className="h-40 w-full rounded-2xl" />
        {/* Summary skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 lg:col-span-1" />
          <Skeleton className="h-48 lg:col-span-2" />
        </div>
        {/* Filter bar skeleton */}
        <Skeleton className="h-14 w-full rounded-xl" />
        {/* Review cards skeleton */}
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-52 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const avgRating = data?.averageRating ?? 0;

  // ──────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ════════════════════════════════════════
          1. GRADIENT HEADER BANNER
          ════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-violet-700 p-6 sm:p-8 text-white"
      >
        {/* Decorative SVG Pattern */}
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="review-pattern"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M20 2 L23 10 L32 12 L25 18 L27 27 L20 23 L13 27 L15 18 L8 12 L17 10 Z"
                fill="currentColor"
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#review-pattern)" />
        </svg>
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-12 -left-12 size-48 rounded-full bg-white/5" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Star className="size-6 fill-amber-300 text-amber-300" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Reviews
              </h1>
            </div>
            <p className="text-white/80 text-sm sm:text-base max-w-md">
              {isAuthor
                ? "Manage and respond to reviews from your clients. Build trust through timely replies."
                : "Track reviews you've given to authors. Your feedback helps the community grow."}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-bold">
                {avgRating.toFixed(1)}
              </p>
              <LargeStarRating rating={avgRating} />
              <p className="text-xs text-white/70 mt-1">
                {totalReviews} review{totalReviews !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ════════════════════════════════════════
          2. ENHANCED RATING SUMMARY SECTION
          ════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Large average rating display */}
        <Card className="lg:col-span-1 border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-6xl font-bold text-emerald-600 dark:text-emerald-400">
              {avgRating.toFixed(1)}
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-2">
              out of 5
            </p>
            <LargeStarRating rating={avgRating} />
            <p className="text-sm text-muted-foreground mt-3">
              Based on{" "}
              <span className="font-semibold text-foreground">
                {totalReviews}
              </span>{" "}
              review{totalReviews !== 1 ? "s" : ""}
            </p>
            {isAuthor && (
              <>
                <Separator className="my-3" />
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="size-4 text-teal-500" />
                  <span className="text-muted-foreground">Response Rate</span>
                  <span className="font-semibold text-teal-600 dark:text-teal-400">
                    {data?.responseRate ?? 0}%
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Rating distribution */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rating Distribution</CardTitle>
            <CardDescription>
              Breakdown of ratings across all reviews
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-3">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star] || 0;
              const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => {
                    setStarFilter(starFilter === star ? 0 : (star as StarFilter));
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 group rounded-lg px-2 py-1.5 -mx-2 transition-colors",
                    starFilter === star
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  )}
                >
                  <span className="text-sm font-medium w-8 text-right shrink-0">
                    {star}★
                  </span>
                  <div
                    className={cn(
                      "flex-1 h-3 rounded-full overflow-hidden",
                      RATING_BAR_BG_COLORS[star]
                    )}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.2 + (5 - star) * 0.05 }}
                      className={cn("h-full rounded-full", RATING_BAR_COLORS[star])}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-10 text-right shrink-0 tabular-nums">
                    {pct > 0 ? `${Math.round(pct)}%` : "0%"}
                  </span>
                  <span className="text-xs text-muted-foreground w-8 text-right shrink-0 tabular-nums">
                    ({count})
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      {/* ════════════════════════════════════════
          3. REVIEW FILTER & SORT BAR
          ════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            {/* Top row: Search + Sort */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search reviews..."
                  className="pl-9 pr-9"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchInput && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSearchInput("");
                      setSearchText("");
                      setCurrentPage(1);
                    }}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as SortOption)}
                >
                  <SelectTrigger className="w-40">
                    <ArrowUpDown className="size-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="highest">Highest Rating</SelectItem>
                    <SelectItem value="lowest">Lowest Rating</SelectItem>
                    {isAuthor && (
                      <SelectItem value="unreplied">Unreplied</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {isAuthor && (
                  <Select
                    value={replyFilter}
                    onValueChange={(v) => {
                      setReplyFilter(v as ReplyFilter);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <MessageSquare className="size-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reviews</SelectItem>
                      <SelectItem value="has_reply">Has Reply</SelectItem>
                      <SelectItem value="no_reply">No Reply</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Star filter row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground mr-1">
                Filter:
              </span>
              <TooltipProvider delayDuration={200}>
                {([0, 5, 4, 3, 2, 1] as const).map((star) => (
                  <Tooltip key={star}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={starFilter === star ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-8 text-xs",
                          starFilter === star &&
                            star === 5 &&
                            "bg-emerald-600 hover:bg-emerald-700",
                          starFilter === star &&
                            star === 4 &&
                            "bg-teal-600 hover:bg-teal-700",
                          starFilter === star &&
                            star === 3 &&
                            "bg-amber-600 hover:bg-amber-700",
                          starFilter === star &&
                            star === 2 &&
                            "bg-orange-600 hover:bg-orange-700",
                          starFilter === star &&
                            star === 1 &&
                            "bg-red-600 hover:bg-red-700",
                          starFilter === star &&
                            star === 0 &&
                            "bg-violet-600 hover:bg-violet-700"
                        )}
                        onClick={() => {
                          setStarFilter(
                            starFilter === star ? 0 : star
                          );
                          setCurrentPage(1);
                        }}
                      >
                        {star === 0 ? "All" : `${star}★`}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {star === 0
                        ? "Show all ratings"
                        : `Show ${star}-star reviews`}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>

            {/* Active filter chips */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
                <span className="text-xs text-muted-foreground">
                  Active filters:
                </span>
                {activeFilters.map((chip) => (
                  <Badge
                    key={chip.key}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {chip.label}
                    <button
                      type="button"
                      onClick={chip.onRemove}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={clearAllFilters}
                >
                  Clear all
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ════════════════════════════════════════
          4. ENHANCED REVIEW CARDS / EMPTY STATE
          ════════════════════════════════════════ */}
      {filtered.length === 0 ? (
        /* ════════════════════════════════════════
           6. EMPTY STATE ENHANCEMENT
           ════════════════════════════════════════ */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 flex flex-col items-center text-center">
              {/* Animated illustration */}
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "loop",
                }}
                className="mb-6"
              >
                <div className="relative">
                  <div className="size-24 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 flex items-center justify-center">
                    <Star className="size-10 text-amber-500 fill-amber-500" />
                  </div>
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{ y: [0, -4, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "loop",
                    }}
                  >
                    <Sparkles className="size-5 text-violet-500" />
                  </motion.div>
                </div>
              </motion.div>

              <h3 className="text-xl font-semibold mb-2">
                {searchText || starFilter > 0 || replyFilter !== "all"
                  ? "No matching reviews"
                  : isAuthor
                    ? "No reviews yet"
                    : "No reviews given"}
              </h3>

              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                {searchText || starFilter > 0 || replyFilter !== "all"
                  ? "Try adjusting your filters to find what you're looking for."
                  : isAuthor
                    ? "Complete some transactions to start receiving reviews from clients. Great work leads to great reviews!"
                    : "You haven't left any reviews yet. Complete a purchase to share your experience."}
              </p>

              <div className="flex flex-wrap gap-2 justify-center">
                {(searchText || starFilter > 0 || replyFilter !== "all") && (
                  <Button
                    variant="outline"
                    onClick={clearAllFilters}
                    className="gap-1.5"
                  >
                    <Filter className="size-4" />
                    Clear Filters
                  </Button>
                )}
                {isAuthor &&
                  !searchText &&
                  starFilter === 0 &&
                  replyFilter === "all" && (
                    <>
                      <Button
                        onClick={() => navigate("dashboard/portfolio")}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Eye className="size-4" />
                        View Portfolio
                      </Button>
                    </>
                  )}
                {!isAuthor &&
                  !searchText &&
                  starFilter === 0 &&
                  replyFilter === "all" && (
                    <Button
                      onClick={() => navigate("browse")}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Eye className="size-4" />
                      Browse Creators
                    </Button>
                  )}
              </div>

              {/* Tips for authors */}
              {isAuthor &&
                !searchText &&
                starFilter === 0 &&
                replyFilter === "all" && (
                  <div className="mt-8 max-w-md w-full">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Tips for getting more reviews
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                      {[
                        {
                          icon: MessageSquare,
                          text: "Communicate proactively with clients",
                        },
                        {
                          icon: Clock,
                          text: "Deliver work on or before deadlines",
                        },
                        {
                          icon: CheckCircle2,
                          text: "Exceed expectations when possible",
                        },
                        {
                          icon: Sparkles,
                          text: "Ask satisfied clients for reviews",
                        },
                      ].map((tip) => (
                        <div
                          key={tip.text}
                          className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5"
                        >
                          <tip.icon className="size-4 text-teal-500 mt-0.5 shrink-0" />
                          <span className="text-xs text-muted-foreground">
                            {tip.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filtered.length}
              </span>{" "}
              review{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Review cards with staggered animation */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {paginatedReviews.map((review, index) => (
                <EnhancedReviewCard
                  key={review.id}
                  review={review}
                  isAuthor={isAuthor}
                  onReply={handleReply}
                  isReplying={
                    replyMutation.isPending &&
                    replyMutation.variables?.reviewId === review.id
                  }
                  vote={votes[review.id] ?? null}
                  onVote={(dir) => handleVote(review.id, dir)}
                  index={index}
                  navigate={navigate}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* ════════════════════════════════════════
              Pagination
              ════════════════════════════════════════ */}
          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 pt-2"
            >
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <Button
                    key={i}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "w-8 h-8 p-0",
                      currentPage === i + 1 &&
                        "bg-emerald-600 hover:bg-emerald-700"
                    )}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              >
                Next
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Enhanced Review Card Component
// ──────────────────────────────────────────────

interface EnhancedReviewCardProps {
  review: Review;
  isAuthor: boolean;
  onReply: (reviewId: string, reply: string) => void;
  isReplying: boolean;
  vote: "up" | "down" | null;
  onVote: (direction: "up" | "down") => void;
  index: number;
  navigate: (page: string, params?: Record<string, unknown>) => void;
}

function EnhancedReviewCard({
  review,
  isAuthor,
  onReply,
  isReplying,
  vote,
  onVote,
  index,
  navigate,
}: EnhancedReviewCardProps) {
  const [showReplyEditor, setShowReplyEditor] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showFullComment, setShowFullComment] = useState(false);
  const [markResolved, setMarkResolved] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const isLongComment = review.comment.length > 250;
  const displayedComment =
    isLongComment && !showFullComment
      ? review.comment.slice(0, 250) + "..."
      : review.comment;

  const displayName = isAuthor ? review.reviewer.name : review.author.name;
  const displayAvatar = isAuthor
    ? review.reviewer.avatarUrl
    : review.author.avatarUrl;

  const handleSubmitReply = () => {
    const text = replyText.trim();
    if (!text) return;
    onReply(review.id, text);
    setReplyText("");
    setShowReplyEditor(false);
    setShowTemplates(false);
    setMarkResolved(false);
  };

  const handleTemplateSelect = (templateText: string) => {
    setReplyText(templateText);
    setShowTemplates(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4">
          {/* ── Header: Avatar, Name, Role, Verified ── */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <UserAvatar
                src={displayAvatar}
                name={displayName}
                size="md"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      navigate("profile", { userId: isAuthor ? review.reviewer.id : review.author.id })
                    }
                    className="text-sm font-semibold hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {displayName}
                  </button>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 h-5 bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400"
                  >
                    {isAuthor ? "Buyer" : "Author"}
                  </Badge>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center">
                          <BadgeCheck className="size-4 text-emerald-500" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Verified Purchase</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <StarRating rating={review.rating} size="sm" />
                  <TimeAgo date={review.createdAt} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-semibold",
                  review.rating >= 4
                    ? "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400"
                    : review.rating === 3
                      ? "border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400"
                      : "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"
                )}
              >
                {review.rating}.0
              </Badge>
            </div>
          </div>

          {/* ── Review Comment with Show More ── */}
          <div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
              {displayedComment}
            </p>
            {isLongComment && (
              <button
                type="button"
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline mt-1"
                onClick={() => setShowFullComment(!showFullComment)}
              >
                {showFullComment ? "Show less" : "Show more"}
              </button>
            )}
          </div>

          {/* ── Transaction Info ── */}
          {review.transaction && (
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">
                ${review.transaction.amount.toFixed(2)}
              </span>
              <Separator orientation="vertical" className="h-3" />
              <span className="truncate">
                {review.transaction.description || "Transaction"}
              </span>
            </div>
          )}

          {/* ── Existing Reply ── */}
          {review.reply && (
            <div className="ml-4 pl-4 border-l-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-r-lg p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {isAuthor ? "Your Reply" : "Author's Reply"}
                </p>
                {review.repliedAt && <TimeAgo date={review.repliedAt} />}
              </div>
              <p className="text-sm text-foreground/80">{review.reply}</p>
            </div>
          )}

          {/* ── Reply Editor (for Authors) ── */}
          <AnimatePresence>
            {showReplyEditor && isAuthor && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Write a Reply</p>
                    {/* Reply templates dropdown */}
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => setShowTemplates(!showTemplates)}
                      >
                        <Sparkles className="size-3" />
                        Templates
                        <ChevronDown className="size-3" />
                      </Button>
                      <AnimatePresence>
                        {showTemplates && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute right-0 top-full mt-1 z-10 w-64 rounded-lg border bg-popover shadow-lg"
                          >
                            <div className="p-1">
                              {REPLY_TEMPLATES.map((tmpl) => (
                                <button
                                  key={tmpl.label}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-accent rounded-md transition-colors"
                                  onClick={() =>
                                    handleTemplateSelect(tmpl.text)
                                  }
                                >
                                  <p className="font-medium">{tmpl.label}</p>
                                  <p className="text-muted-foreground truncate mt-0.5">
                                    {tmpl.text}
                                  </p>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a thoughtful reply..."
                    rows={3}
                    className="text-sm resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Character counter */}
                      <span
                        className={cn(
                          "text-xs",
                          replyText.length > 500
                            ? "text-red-500"
                            : "text-muted-foreground"
                        )}
                      >
                        {replyText.length}/500
                      </span>
                      {/* Mark as resolved */}
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={markResolved}
                          onChange={(e) => setMarkResolved(e.target.checked)}
                          className="rounded border-muted-foreground/30 text-emerald-600 focus:ring-emerald-500"
                        />
                        Mark as resolved
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setShowReplyEditor(false);
                          setReplyText("");
                          setShowTemplates(false);
                          setMarkResolved(false);
                        }}
                      >
                        <X className="size-3.5 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleSubmitReply}
                        disabled={!replyText.trim() || isReplying}
                      >
                        {isReplying ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Send className="size-3.5" />
                        )}
                        Send Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Footer Actions ── */}
          <div className="flex items-center justify-between pt-2 border-t">
            {/* Voting */}
            <div className="flex items-center gap-1">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "text-xs gap-1 h-7",
                        vote === "up"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      )}
                      onClick={() => onVote("up")}
                    >
                      <ThumbsUp className="size-3.5" />
                      Helpful
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark as helpful</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "text-xs gap-1 h-7",
                        vote === "down"
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                      )}
                      onClick={() => onVote("down")}
                    >
                      <ThumbsDown className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Not helpful</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Reply / Actions */}
            <div className="flex items-center gap-1">
              {isAuthor && !review.reply && !showReplyEditor && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1 h-7 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                  onClick={() => setShowReplyEditor(true)}
                >
                  <MessageSquare className="size-3.5" />
                  Reply
                </Button>
              )}
              {!isAuthor && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1 h-7"
                  onClick={() =>
                    navigate("profile", { userId: review.author.id })
                  }
                >
                  <Eye className="size-3.5" />
                  View Author
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
