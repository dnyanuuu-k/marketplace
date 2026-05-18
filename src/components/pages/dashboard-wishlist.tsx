"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Star,
  MapPin,
  BadgeCheck,
  Search,
  X,
  MessageSquare,
  Trash2,
  ArrowUpDown,
  ShoppingBag,
  Users,
  CheckSquare,
  Square,
  Mail,
  Trash,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuthStore } from "@/store/auth";
import { useNavigationStore } from "@/store/navigation";
import { apiFetch, apiDelete } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ---- Types ----
interface WishlistAuthorProfile {
  bio: string | null;
  skills: string[];
  location: string | null;
  isVerified: boolean;
  totalSales: number;
  averageRating: number;
}

interface WishlistItem {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  savedAt: string;
  profile: WishlistAuthorProfile | null;
}

interface WishlistResponse {
  data: WishlistItem[];
  total: number;
  page: number;
  limit: number;
}

// ---- Skill color map ----
const SKILL_COLORS: Record<string, string> = {
  "UI Design": "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  "Branding": "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  "Figma": "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  "Web Dev": "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  "React": "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  "Node.js": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "Illustration": "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300",
  "Copywriting": "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "SEO": "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
  "Prototyping": "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  "Dashboard": "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
  "Design Systems": "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
  "3D Modeling": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "Animation": "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "Photography": "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
  "Video Editing": "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  "Music Production": "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
};

function getSkillColor(skill: string): string {
  return SKILL_COLORS[skill] || "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
}

// ---- Cover gradient helper ----
const GRADIENTS = [
  "from-violet-500/30 via-purple-500/20 to-fuchsia-500/30",
  "from-emerald-500/30 via-teal-500/20 to-cyan-500/30",
  "from-amber-500/30 via-orange-500/20 to-yellow-500/30",
  "from-rose-500/30 via-pink-500/20 to-red-500/30",
  "from-teal-500/30 via-emerald-500/20 to-green-500/30",
  "from-fuchsia-500/30 via-purple-500/20 to-violet-500/30",
];

function getGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

// ---- Time ago helper ----
function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `Added ${diffMins}m ago`;
  if (diffHours < 24) return `Added ${diffHours}h ago`;
  if (diffDays < 7) return `Added ${diffDays}d ago`;
  if (diffWeeks < 4) return `Added ${diffWeeks}w ago`;
  return `Added on ${date.toLocaleDateString()}`;
}

// ---- Skeleton ----
function WishlistSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <Skeleton className="h-40 w-full rounded-xl" />
      {/* Filter bar skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-24 w-full" />
            <CardContent className="pt-0 pb-4 px-4">
              <div className="flex items-end gap-3 -mt-8">
                <Skeleton className="size-16 rounded-full border-4 border-background shrink-0" />
                <div className="flex-1 min-w-0 pb-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-5 w-16 rounded-full" />
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 size-8" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---- Animated Heart Empty State ----
function AnimatedHeartEmpty({ onBrowse }: { onBrowse: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16"
    >
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="mb-6"
      >
        <div className="relative">
          <Heart className="size-20 text-violet-300 dark:text-violet-600/50" />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 blur-xl bg-violet-400/20 dark:bg-violet-500/20 rounded-full"
          />
        </div>
      </motion.div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        Your wishlist is empty
      </h3>
      <p className="text-muted-foreground text-center max-w-sm mb-6">
        Save your favorite creators to find them easily later. Browse our
        talented community and start building your wishlist!
      </p>
      <Button
        onClick={onBrowse}
        className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-lg shadow-violet-500/25"
      >
        <Sparkles className="size-4 mr-2" />
        Browse Creators
      </Button>
    </motion.div>
  );
}

// ---- Author Card ----
function WishlistAuthorCard({
  author,
  onRemove,
  isRemoving,
  onViewProfile,
  onMessage,
  selected,
  onToggleSelect,
  index,
}: {
  author: WishlistItem;
  onRemove: () => void;
  isRemoving: boolean;
  onViewProfile: () => void;
  onMessage: () => void;
  selected: boolean;
  onToggleSelect: () => void;
  index: number;
}) {
  const initials = author.authorName
    .split(" ")
    .map((n) => n[0])
    .join("");

  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      layout
    >
      <Card
        className={cn(
          "overflow-hidden group hover:shadow-lg hover:scale-[1.02] transition-all duration-300 relative",
          selected && "ring-2 ring-violet-500 dark:ring-violet-400"
        )}
      >
        {/* Selection checkbox */}
        <div className="absolute top-3 left-3 z-10">
          <button
            onClick={onToggleSelect}
            className="size-6 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-accent transition-colors"
          >
            {selected ? (
              <CheckSquare className="size-4 text-violet-500" />
            ) : (
              <Square className="size-4 text-muted-foreground/50" />
            )}
          </button>
        </div>

        {/* Cover Banner */}
        <div className={`h-24 bg-gradient-to-r ${getGradient(author.authorId)} relative`}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNMCAyMGgyME0yMCAwdjIwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50" />
        </div>

        <CardContent className="pt-0 pb-4 px-4">
          {/* Avatar + Name */}
          <div className="flex items-end gap-3 -mt-8">
            <Avatar className="size-16 border-4 border-background shrink-0 shadow-md">
              {author.authorAvatar ? (
                <AvatarImage src={author.authorAvatar} alt={author.authorName} />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 text-violet-700 dark:text-violet-300 font-bold text-lg">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-1">
                <h3 className="text-sm font-semibold truncate">{author.authorName}</h3>
                {author.profile?.isVerified && (
                  <BadgeCheck className="size-4 text-violet-500 dark:text-violet-400 shrink-0" />
                )}
              </div>
              {author.profile?.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="size-3" />
                  <span className="truncate">{author.profile.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Skills badges */}
          {author.profile && author.profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {author.profile.skills.slice(0, 4).map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className={`text-[10px] px-2 py-0 ${getSkillColor(skill)}`}
                >
                  {skill}
                </Badge>
              ))}
              {author.profile.skills.length > 4 && (
                <Badge variant="outline" className="text-[10px] px-2 py-0">
                  +{author.profile.skills.length - 4} more
                </Badge>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-1">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium">
                {author.profile?.averageRating?.toFixed(1) || "0.0"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShoppingBag className="size-3" />
              <span>{author.profile?.totalSales || 0} sales</span>
            </div>
          </div>

          {/* Added date */}
          <p className="text-[11px] text-muted-foreground mt-2">
            {timeAgo(author.savedAt)}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm"
              onClick={onViewProfile}
            >
              View Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onMessage}
            >
              <MessageSquare className="size-3.5 mr-1" />
              Message
            </Button>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 shrink-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-200 dark:border-rose-800/50"
                  disabled={isRemoving}
                  title="Remove from wishlist"
                >
                  <Heart className="size-4 fill-current" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove from wishlist?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove <strong>{author.authorName}</strong> from your wishlist? You can always add them back later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onRemove();
                      setConfirmOpen(false);
                    }}
                    className="bg-rose-500 hover:bg-rose-600 text-white"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---- Main Wishlist Page ----
type SortOption = "date" | "name" | "rating" | "sales";

export function DashboardWishlistPage() {
  const { user } = useAuthStore();
  const { navigate } = useNavigationStore();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const limit = 20;

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch wishlist
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["wishlist", page, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const json = await apiFetch(`/api/wishlist?${params.toString()}`);
      return (json.data ?? json) as WishlistResponse;
    },
    enabled: !!user && user.role === "BUYER",
  });

  const wishlistItems = data?.data || [];
  const totalCount = data?.total || 0;

  // Extract all unique skills from wishlist items for filter
  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    wishlistItems.forEach((item) => {
      item.profile?.skills?.forEach((s) => skills.add(s));
    });
    return Array.from(skills).sort();
  }, [wishlistItems]);

  // Sort and filter
  const filteredItems = useMemo(() => {
    let items = [...wishlistItems];

    // Skill filter
    if (skillFilter !== "all") {
      items = items.filter(
        (item) => item.profile?.skills?.includes(skillFilter)
      );
    }

    // Sort
    switch (sortBy) {
      case "name":
        items.sort((a, b) => a.authorName.localeCompare(b.authorName));
        break;
      case "rating":
        items.sort(
          (a, b) =>
            (b.profile?.averageRating || 0) - (a.profile?.averageRating || 0)
        );
        break;
      case "sales":
        items.sort(
          (a, b) =>
            (b.profile?.totalSales || 0) - (a.profile?.totalSales || 0)
        );
        break;
      case "date":
      default:
        items.sort(
          (a, b) =>
            new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        );
        break;
    }

    return items;
  }, [wishlistItems, sortBy, skillFilter]);

  // Remove single item mutation
  const removeMutation = useMutation({
    mutationFn: async (authorId: string) => {
      return apiDelete(`/api/wishlist/${authorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["saved-authors"] });
      toast.success("Removed from wishlist");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to remove from wishlist");
    },
  });

  // Bulk remove mutation
  const bulkRemoveMutation = useMutation({
    mutationFn: async (authorIds: string[]) => {
      const results = await Promise.allSettled(
        authorIds.map((id) => apiDelete(`/api/wishlist/${id}`))
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        throw new Error(`Failed to remove ${failed.length} item(s)`);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["saved-authors"] });
      setSelectedIds(new Set());
      toast.success("Selected items removed from wishlist");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to remove selected items");
    },
  });

  // Selection handlers
  const toggleSelect = useCallback((authorId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(authorId)) {
        next.delete(authorId);
      } else {
        next.add(authorId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredItems.map((i) => i.authorId)));
  }, [filteredItems]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Handle message selected
  const handleMessageSelected = useCallback(() => {
    // Navigate to messages - in a real app you'd open a conversation
    navigate("dashboard/messages");
    toast.info("Navigate to messages to start a conversation");
  }, [navigate]);

  if (isLoading) return <WishlistSkeleton />;

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">My Wishlist</h1>
        <EmptyState
          icon={<Heart />}
          title="Failed to load wishlist"
          description={
            error instanceof Error ? error.message : "Something went wrong. Please try again."
          }
          action={{
            label: "Retry",
            onClick: () =>
              queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gradient Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 p-6 md:p-8"
      >
        {/* SVG Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjxwYXRoIGQ9Ik0zMCAwdjYwTTYwIDMwSDAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-60" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Heart className="size-6 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                My Wishlist
              </h1>
              <p className="text-white/80 text-sm mt-0.5">
                Your saved creators and favorite authors
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2">
              <Users className="size-4 text-white" />
              <span className="text-white font-semibold text-lg">
                {totalCount}
              </span>
              <span className="text-white/80 text-sm">
                {totalCount === 1 ? "creator" : "creators"}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search & Filter Bar */}
      {totalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, skill, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                onClick={() => {
                  setSearchQuery("");
                  setDebouncedSearch("");
                }}
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="size-4 text-muted-foreground hidden sm:block" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date Added</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Skill filter */}
          {allSkills.length > 0 && (
            <Select value={skillFilter} onValueChange={setSkillFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by skill" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Skills</SelectItem>
                {allSkills.map((skill) => (
                  <SelectItem key={skill} value={skill}>
                    {skill}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </motion.div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-lg p-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
              {selectedIds.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={deselectAll}
            >
              Deselect all
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMessageSelected}
              className="text-xs"
            >
              <Mail className="size-3.5 mr-1" />
              Message Selected
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 border-rose-200 dark:border-rose-800/50"
                >
                  <Trash className="size-3.5 mr-1" />
                  Remove Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove selected creators?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove {selectedIds.size} creator{selectedIds.size !== 1 ? "s" : ""} from your wishlist? You can always add them back later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      bulkRemoveMutation.mutate(Array.from(selectedIds))
                    }
                    className="bg-rose-500 hover:bg-rose-600 text-white"
                  >
                    Remove {selectedIds.size} Item{selectedIds.size !== 1 ? "s" : ""}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>
      )}

      {/* Select All Button */}
      {totalCount > 0 && selectedIds.size === 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredItems.length} of {totalCount} creator{totalCount !== 1 ? "s" : ""}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={selectAll}
          >
            <CheckSquare className="size-3.5 mr-1" />
            Select all
          </Button>
        </div>
      )}

      {/* Empty state */}
      {totalCount === 0 ? (
        <AnimatedHeartEmpty onBrowse={() => navigate("browse")} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="No matching creators"
          description="Try adjusting your search or filter criteria"
          action={{
            label: "Clear filters",
            onClick: () => {
              setSearchQuery("");
              setDebouncedSearch("");
              setSkillFilter("all");
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((author, idx) => (
              <WishlistAuthorCard
                key={author.id}
                author={author}
                index={idx}
                onRemove={() => removeMutation.mutate(author.authorId)}
                isRemoving={removeMutation.isPending}
                onViewProfile={() =>
                  navigate("profile", { userId: author.authorId })
                }
                onMessage={() => navigate("dashboard/messages")}
                selected={selectedIds.has(author.authorId)}
                onToggleSelect={() => toggleSelect(author.authorId)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalCount > limit && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(totalCount / limit)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * limit >= totalCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
