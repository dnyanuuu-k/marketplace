"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Star,
  MapPin,
  BadgeCheck,
  Search,
  X,
  Users,
  Trash2,
  ShoppingBag,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuthStore } from "@/store/auth";
import { useNavigationStore } from "@/store/navigation";
import { apiFetch, apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ---- Types ----
interface SavedAuthorProfile {
  bio: string | null;
  skills: string[];
  location: string | null;
  isVerified: boolean;
  totalSales: number;
  averageRating: number;
}

interface SavedAuthorItem {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  savedAt: string;
  profile: SavedAuthorProfile | null;
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
  "Dashboard": "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  "Design Systems": "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
};

function getSkillColor(skill: string): string {
  return SKILL_COLORS[skill] || "bg-primary/10 text-primary";
}

// ---- Cover gradient helper ----
const GRADIENTS = [
  "from-emerald-500/20 via-teal-500/10 to-cyan-500/20",
  "from-violet-500/20 via-purple-500/10 to-fuchsia-500/20",
  "from-rose-500/20 via-pink-500/10 to-red-500/20",
  "from-amber-500/20 via-orange-500/10 to-yellow-500/20",
  "from-sky-500/20 via-cyan-500/10 to-blue-500/20",
  "from-teal-500/20 via-emerald-500/10 to-green-500/20",
];

function getGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

// ---- Skeleton ----
function SavedAuthorsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-20 w-full" />
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---- Author Card ----
function SavedAuthorCard({
  author,
  onRemove,
  isRemoving,
  onViewProfile,
}: {
  author: SavedAuthorItem;
  onRemove: () => void;
  isRemoving: boolean;
  onViewProfile: () => void;
}) {
  const initials = author.authorName
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
        {/* Cover Banner */}
        <div className={`h-20 bg-gradient-to-r ${getGradient(author.authorId)} relative`}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNMCAyMGgyME0yMCAwdjIwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50" />
        </div>

        <CardContent className="pt-0 pb-4 px-4">
          {/* Avatar + Name */}
          <div className="flex items-end gap-3 -mt-8">
            <Avatar className="size-16 border-4 border-background shrink-0">
              {author.authorAvatar ? (
                <AvatarImage src={author.authorAvatar} alt={author.authorName} />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-1">
                <h3 className="text-sm font-semibold truncate">{author.authorName}</h3>
                {author.profile?.isVerified && (
                  <BadgeCheck className="size-4 text-primary shrink-0" />
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
                  +{author.profile.skills.length - 4}
                </Badge>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-1">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium">
                {author.profile?.averageRating?.toFixed(1) || "0.0"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {author.profile?.totalSales || 0} sales
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              className="flex-1"
              onClick={onViewProfile}
            >
              View Profile
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onRemove}
              disabled={isRemoving}
              title="Remove from saved"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---- Main Saved Authors Page ----
export function SavedAuthorsPage() {
  const { user } = useAuthStore();
  const { navigate } = useNavigationStore();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch saved authors
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["saved-authors-page"],
    queryFn: async () => {
      const json = await apiFetch("/api/saved-authors");
      return (json.data ?? json) as SavedAuthorItem[];
    },
    enabled: !!user && user.role === "BUYER",
  });

  const savedAuthors = data || [];

  // Filter by search
  const filteredAuthors = useMemo(() => {
    if (!debouncedSearch) return savedAuthors;
    const q = debouncedSearch.toLowerCase();
    return savedAuthors.filter(
      (a) =>
        a.authorName.toLowerCase().includes(q) ||
        a.profile?.skills?.some((s) => s.toLowerCase().includes(q)) ||
        a.profile?.location?.toLowerCase().includes(q) ||
        a.profile?.bio?.toLowerCase().includes(q)
    );
  }, [savedAuthors, debouncedSearch]);

  // Remove (unsave) mutation
  const removeMutation = useMutation({
    mutationFn: async (authorId: string) => {
      return apiPost("/api/saved-authors", { authorId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-authors-page"] });
      queryClient.invalidateQueries({ queryKey: ["saved-authors"] });
      toast.success("Author removed from saved");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to remove author");
    },
  });

  if (isLoading) return <SavedAuthorsSkeleton />;

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Saved Authors</h1>
        <EmptyState
          icon={<Heart />}
          title="Failed to load saved authors"
          description={
            error instanceof Error ? error.message : "Something went wrong. Please try again."
          }
          action={{
            label: "Retry",
            onClick: () =>
              queryClient.invalidateQueries({ queryKey: ["saved-authors-page"] }),
          }}
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
          <h1 className="text-2xl font-bold tracking-tight">Saved Authors</h1>
          <p className="text-muted-foreground mt-1">
            {savedAuthors.length > 0
              ? `${savedAuthors.length} saved creator${savedAuthors.length !== 1 ? "s" : ""}`
              : "Your bookmarked creators"}
          </p>
        </div>
        {savedAuthors.length > 0 && (
          <div className="relative w-full sm:w-64">
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
        )}
      </motion.div>

      {/* Empty state */}
      {savedAuthors.length === 0 ? (
        <EmptyState
          icon={<Heart />}
          title="No saved authors yet"
          description="Browse creators and save your favorites to find them easily later"
          action={{
            label: "Browse Creators",
            onClick: () => navigate("browse"),
          }}
        />
      ) : filteredAuthors.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="No matching authors"
          description="Try adjusting your search terms"
          action={{
            label: "Clear search",
            onClick: () => {
              setSearchQuery("");
              setDebouncedSearch("");
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredAuthors.map((author) => (
              <SavedAuthorCard
                key={author.id}
                author={author}
                onRemove={() => removeMutation.mutate(author.authorId)}
                isRemoving={removeMutation.isPending}
                onViewProfile={() =>
                  navigate("profile", { userId: author.authorId })
                }
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
