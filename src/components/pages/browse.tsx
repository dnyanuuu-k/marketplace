"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Star,
  Heart,
  MapPin,
  BadgeCheck,
  Grid3X3,
  List,
  SlidersHorizontal,
  X,
  MessageSquare,
  ArrowRight,
  Users,
  TrendingUp,
  Crown,
  Eye,
  Bookmark,
  Sparkles,
  ArrowUpDown,
  Clock,
  Paintbrush,
  Code2,
  PenTool,
  BarChart3,
  Megaphone,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Video,
  Music,
  DollarSign,
  Zap,
  Check,
  Send,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { useNavigationStore } from "@/store/navigation";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { apiFetch, apiGet, apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ---- Types ----
interface AuthorProfile {
  bio: string | null;
  skills: string[];
  portfolioImages: string[];
  socialLinks: Record<string, string>;
  location: string | null;
  coverImageUrl: string | null;
  isVerified: boolean;
  totalSales: number;
  averageRating: number;
}

interface Author {
  id: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  profile: AuthorProfile | null;
  reviewCount: number;
}

interface PopularSkill {
  skill: string;
  count: number;
}

interface PopularLocation {
  location: string;
  count: number;
}

interface BrowseResponse {
  data: Author[];
  total: number;
  page: number;
  limit: number;
  popularSkills: PopularSkill[];
  popularLocations: PopularLocation[];
}

// ---- Category filter chips (expanded with Video & Music) ----
const CATEGORIES = [
  { id: "all", label: "All", icon: Sparkles, trending: false },
  { id: "design", label: "Design", icon: Paintbrush, trending: true },
  { id: "development", label: "Development", icon: Code2, trending: true },
  { id: "writing", label: "Writing", icon: PenTool, trending: false },
  { id: "marketing", label: "Marketing", icon: Megaphone, trending: false },
  { id: "video", label: "Video", icon: Video, trending: true },
  { id: "music", label: "Music", icon: Music, trending: false },
  { id: "analytics", label: "Analytics", icon: BarChart3, trending: false },
];

// ---- Sort options with icons ----
const SORT_OPTIONS = [
  { value: "newest", label: "Newest", icon: Clock },
  { value: "highest_rated", label: "Top Rated", icon: Star },
  { value: "most_sales", label: "Most Sales", icon: TrendingUp },
];

// ---- Skill color map ----
const SKILL_COLORS: Record<string, string> = {
  "UI Design": "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  Branding: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  Figma: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  "Web Dev": "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  React: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  "Node.js": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  Illustration: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300",
  Copywriting: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  SEO: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
  Prototyping: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  Dashboard: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  "Design Systems": "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
};

function getSkillColor(skill: string): string {
  return SKILL_COLORS[skill] || "bg-primary/10 text-primary";
}

// ---- Cover gradient helper ----
const GRADIENTS = [
  "from-emerald-500/30 via-teal-500/20 to-cyan-500/30",
  "from-violet-500/30 via-purple-500/20 to-rose-500/30",
  "from-amber-500/30 via-orange-500/20 to-rose-500/30",
  "from-teal-500/30 via-emerald-500/20 to-amber-500/30",
  "from-rose-500/30 via-pink-500/20 to-violet-500/30",
  "from-cyan-500/30 via-sky-500/20 to-emerald-500/30",
];

function getGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

// ---- Star rating display ----
function StarRating({ rating, maxStars = 5 }: { rating: number; maxStars?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxStars }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3",
            i < Math.floor(rating)
              ? "fill-amber-400 text-amber-400"
              : i < rating
              ? "fill-amber-400/50 text-amber-400"
              : "fill-muted text-muted"
          )}
        />
      ))}
    </div>
  );
}

// ---- Mini Sparkline (3-bar earnings chart) ----
function MiniSparkline({ authorId }: { authorId: string }) {
  const bars = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < authorId.length; i++) {
      hash = authorId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return [
      20 + Math.abs(hash % 60),
      30 + Math.abs((hash >> 4) % 70),
      15 + Math.abs((hash >> 8) % 80),
    ];
  }, [authorId]);

  const maxBar = Math.max(...bars);

  return (
    <div className="flex items-end gap-1 h-8">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${(height / maxBar) * 100}%` }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="w-2 rounded-t-sm bg-emerald-400/60 dark:bg-emerald-500/60 min-h-[4px]"
        />
      ))}
    </div>
  );
}

// ---- Skeleton Components ----
function AuthorCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-32 w-full" />
      <CardContent className="pt-0 pb-4 px-4">
        <div className="flex items-end gap-3 -mt-10">
          <Skeleton className="size-20 rounded-full border-4 border-background shrink-0" />
          <div className="flex-1 min-w-0 pb-1">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-16 rounded-full" />
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

function AuthorListSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-48 mb-2" />
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-14 rounded-full" />
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Quick Message Dialog ----
function QuickMessageSheet({
  open,
  onOpenChange,
  authorId,
  authorName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorId: string;
  authorName: string;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { navigate } = useNavigationStore();

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    setSending(true);
    try {
      await apiPost("/api/conversations", {
        participantId: authorId,
        message: message.trim(),
      });
      toast.success("Message sent successfully!");
      setMessage("");
      onOpenChange(false);
      navigate("dashboard-messages", { authorId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="size-5 text-emerald-500" />
            Message {authorName}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Send a quick message to {authorName}. They usually respond within 2 hours.
          </p>
          <Textarea
            placeholder="Write your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="resize-none"
          />
        </div>
        <SheetFooter className="mt-6">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSend}
            disabled={sending || !message.trim()}
          >
            {sending ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Send className="size-4 mr-2" />
            )}
            Send Message
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ---- Author Card (Grid) - Enhanced ----
function AuthorGridCard({
  author,
  isSaved,
  onSave,
  isSaving,
  onNavigate,
  isBuyer,
  onMessage,
}: {
  author: Author;
  isSaved: boolean;
  onSave: () => void;
  isSaving: boolean;
  onNavigate: () => void;
  isBuyer: boolean;
  onMessage: () => void;
}) {
  const initials = author.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  const startingPrice = useMemo(() => {
    const sales = author.profile?.totalSales || 0;
    if (sales > 100) return 50;
    if (sales > 50) return 75;
    if (sales > 10) return 100;
    return 150;
  }, [author.profile?.totalSales]);

  // Determine availability based on activity
  const isAvailable = useMemo(() => {
    const sales = author.profile?.totalSales || 0;
    return sales > 0;
  }, [author.profile?.totalSales]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1 relative">
        {/* Cover Banner */}
        <div
          className={`h-32 bg-gradient-to-r ${getGradient(author.id)} relative overflow-hidden`}
        >
          {author.profile?.coverImageUrl && (
            <img
              src={author.profile.coverImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-2 right-4 w-16 h-16 border border-white/30 rounded-full" />
            <div className="absolute bottom-2 left-6 w-8 h-8 border border-white/20 rounded-lg rotate-12" />
          </div>

          {/* Verified badge with animated checkmark */}
          {author.profile?.isVerified && (
            <div className="absolute top-2 left-2">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-pulse" />
                <Badge className="bg-emerald-500 text-white border-0 gap-1 text-[10px] px-2 py-0 shadow-md">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, delay: 0.2 }}
                  >
                    <BadgeCheck className="size-3" />
                  </motion.div>
                  Verified
                </Badge>
              </div>
            </div>
          )}

          {/* Availability status */}
          <div className="absolute top-2 right-2">
            <Badge
              className={cn(
                "text-[10px] px-2 py-0 border-0 shadow-sm gap-1",
                isAvailable
                  ? "bg-emerald-500/90 text-white"
                  : "bg-amber-500/90 text-white"
              )}
            >
              <span className={cn(
                "size-1.5 rounded-full",
                isAvailable ? "bg-white animate-pulse" : "bg-white/70"
              )} />
              {isAvailable ? "Available Now" : "Busy"}
            </Badge>
          </div>

          {/* Hover overlay with action buttons */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
            <motion.button
              initial={{ y: 10, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); onNavigate(); }}
              className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium shadow-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5"
            >
              <Eye className="size-3.5" />
              View Profile
            </motion.button>
            {isBuyer && (
              <motion.button
                initial={{ y: 10, opacity: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); onMessage(); }}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium shadow-lg hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
              >
                <MessageSquare className="size-3.5" />
                Message
              </motion.button>
            )}
          </div>
        </div>

        <CardContent className="pt-0 pb-4 px-4">
          {/* Avatar overlapping cover */}
          <div className="flex items-end gap-3 -mt-10">
            <Avatar className="size-20 border-4 border-background shrink-0 shadow-lg">
              {author.avatarUrl && (
                <AvatarImage src={author.avatarUrl} alt={author.name} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold truncate">
                  {author.name}
                </h3>
                {author.profile?.isVerified && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, delay: 0.3 }}
                  >
                    <BadgeCheck className="size-4 text-emerald-500 shrink-0" />
                  </motion.div>
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

          {/* Skills as colored pills */}
          {author.profile && author.profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {author.profile.skills.slice(0, 4).map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${getSkillColor(skill)}`}
                >
                  {skill}
                </Badge>
              ))}
              {author.profile.skills.length > 4 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-2 py-0.5 rounded-full"
                >
                  +{author.profile.skills.length - 4}
                </Badge>
              )}
            </div>
          )}

          {/* Rating + sparkline + price */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <div className="flex flex-col gap-1">
              <StarRating rating={author.profile?.averageRating || 0} />
              <span className="text-xs text-muted-foreground">
                {author.profile?.averageRating?.toFixed(1) || "0.0"} (
                {author.reviewCount})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <MiniSparkline authorId={author.id} />
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] text-muted-foreground">Starting at</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  ${startingPrice}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              onClick={onNavigate}
            >
              View Profile
            </Button>
            {isBuyer && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 shrink-0 hover:border-emerald-300 hover:text-emerald-600 transition-colors"
                  onClick={onMessage}
                  title="Quick Message"
                >
                  <MessageSquare className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 shrink-0 hover:border-rose-300 hover:text-rose-500 transition-colors"
                  onClick={onSave}
                  disabled={isSaving}
                >
                  <Heart
                    className={cn(
                      "size-4",
                      isSaved ? "fill-rose-500 text-rose-500" : "text-muted-foreground"
                    )}
                  />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---- Author Card (List) - Enhanced ----
function AuthorListCard({
  author,
  isSaved,
  onSave,
  isSaving,
  onNavigate,
  isBuyer,
  onMessage,
}: {
  author: Author;
  isSaved: boolean;
  onSave: () => void;
  isSaving: boolean;
  onNavigate: () => void;
  isBuyer: boolean;
  onMessage: () => void;
}) {
  const initials = author.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  const startingPrice = useMemo(() => {
    const sales = author.profile?.totalSales || 0;
    if (sales > 100) return 50;
    if (sales > 50) return 75;
    if (sales > 10) return 100;
    return 150;
  }, [author.profile?.totalSales]);

  const isAvailable = useMemo(() => {
    return (author.profile?.totalSales || 0) > 0;
  }, [author.profile?.totalSales]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:shadow-md transition-all duration-200 group">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <Avatar className="size-14 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                {author.avatarUrl && (
                  <AvatarImage src={author.avatarUrl} alt={author.name} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {author.profile?.isVerified && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                  className="absolute -bottom-0.5 -right-0.5 size-5 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-background"
                >
                  <BadgeCheck className="size-3 text-white" />
                </motion.div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold truncate">
                  {author.name}
                </h3>
                <Badge
                  className={cn(
                    "text-[9px] px-1.5 py-0 h-4 border-0 gap-0.5",
                    isAvailable
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}
                >
                  <span className={cn(
                    "size-1 rounded-full",
                    isAvailable ? "bg-emerald-500" : "bg-amber-500"
                  )} />
                  {isAvailable ? "Available" : "Busy"}
                </Badge>
              </div>
              {author.profile?.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="size-3" />
                  {author.profile.location}
                </div>
              )}
              {author.profile && author.profile.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {author.profile.skills.slice(0, 4).map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className={`text-[10px] px-2 py-0 rounded-full ${getSkillColor(skill)}`}
                    >
                      {skill}
                    </Badge>
                  ))}
                  {author.profile.skills.length > 4 && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0 rounded-full">
                      +{author.profile.skills.length - 4}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <MiniSparkline authorId={author.id} />
              <div className="flex flex-col items-end gap-1.5">
                <StarRating rating={author.profile?.averageRating || 0} />
                <span className="text-xs text-muted-foreground">
                  {author.profile?.averageRating?.toFixed(1) || "0.0"} (
                  {author.reviewCount}) · {author.profile?.totalSales || 0} sales
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  From ${startingPrice}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isBuyer && (
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 hover:border-emerald-300 hover:text-emerald-600 transition-colors"
                  onClick={onMessage}
                  title="Quick Message"
                >
                  <MessageSquare className="size-3.5" />
                </Button>
              )}
              {isBuyer && (
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 hover:border-rose-300 hover:text-rose-500 transition-colors"
                  onClick={onSave}
                  disabled={isSaving}
                >
                  <Heart
                    className={cn(
                      "size-4",
                      isSaved ? "fill-rose-500 text-rose-500" : "text-muted-foreground"
                    )}
                  />
                </Button>
              )}
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                onClick={onNavigate}
              >
                View Profile
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---- Featured Creator Spotlight ----
function FeaturedCreator({
  author,
  onNavigate,
  onMessage,
  isBuyer,
}: {
  author: Author;
  onNavigate: () => void;
  onMessage: () => void;
  isBuyer: boolean;
}) {
  const initials = author.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden border-2 border-amber-500/30 dark:border-amber-500/20 shadow-lg shadow-amber-500/5">
        <div className="relative">
          <div className={`h-40 bg-gradient-to-r ${getGradient(author.id)} relative overflow-hidden`}>
            {author.profile?.coverImageUrl && (
              <img src={author.profile.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 right-8 w-24 h-24 border border-white/30 rounded-full" />
              <div className="absolute bottom-4 left-12 w-12 h-12 border border-white/20 rounded-lg rotate-45" />
            </div>
            <div className="absolute top-3 left-3">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1 shadow-md">
                <Crown className="size-3" />
                Featured Creator
              </Badge>
            </div>
          </div>
          <CardContent className="pt-0 pb-5 px-5">
            <div className="flex items-end gap-4 -mt-12">
              <Avatar className="size-24 border-4 border-background shrink-0 shadow-xl">
                {author.avatarUrl && <AvatarImage src={author.avatarUrl} alt={author.name} />}
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold truncate">{author.name}</h2>
                  {author.profile?.isVerified && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }}>
                      <BadgeCheck className="size-5 text-emerald-500 shrink-0" />
                    </motion.div>
                  )}
                </div>
                {author.profile?.location && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                    <MapPin className="size-3.5" />
                    <span>{author.profile.location}</span>
                  </div>
                )}
              </div>
            </div>
            {author.profile?.bio && (
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{author.profile.bio}</p>
            )}
            {author.profile && author.profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {author.profile.skills.slice(0, 6).map((skill) => (
                  <Badge key={skill} variant="secondary" className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${getSkillColor(skill)}`}>
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-center gap-6 mt-4 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5">
                <StarRating rating={author.profile?.averageRating || 0} />
                <span className="text-sm font-medium">{author.profile?.averageRating?.toFixed(1) || "0.0"}</span>
                <span className="text-xs text-muted-foreground">({author.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <TrendingUp className="size-4 text-emerald-500" />
                <span className="font-medium">{author.profile?.totalSales || 0}</span>
                <span className="text-xs text-muted-foreground">sales</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                onClick={onNavigate}
              >
                View Full Profile
                <ArrowRight className="ml-2 size-4" />
              </Button>
              {isBuyer && (
                <Button variant="outline" onClick={onMessage} className="shrink-0">
                  <MessageSquare className="size-4 mr-1" />
                  Message
                </Button>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}

// ---- Pagination Component ----
function Pagination({
  page,
  total,
  limit,
  onPageChange,
}: {
  page: number;
  total: number;
  limit: number;
  onPageChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{Math.min((page - 1) * limit + 1, total)}</span>
        {" – "}
        <span className="font-medium text-foreground">{Math.min(page * limit, total)}</span>
        {" of "}
        <span className="font-medium text-foreground">{total}</span> creators
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="size-4" />
        </Button>
        {getVisiblePages().map((p, i) =>
          typeof p === "string" ? (
            <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon"
              className={cn(
                "size-8 text-sm",
                p === page && "bg-emerald-600 hover:bg-emerald-700"
              )}
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ---- Sidebar Filters Component (Enhanced) ----
function SidebarFilters({
  popularSkills,
  popularLocations,
  selectedSkills,
  onSkillToggle,
  ratingSlider,
  onRatingChange,
  minRating,
  locationFilter,
  onLocationChange,
  priceRange,
  onPriceRangeChange,
  verifiedOnly,
  onVerifiedOnlyChange,
  hasActiveFilters,
  onClearFilters,
}: {
  popularSkills: PopularSkill[];
  popularLocations: PopularLocation[];
  selectedSkills: string[];
  onSkillToggle: (skill: string) => void;
  ratingSlider: number[];
  onRatingChange: (v: number[]) => void;
  minRating: number;
  locationFilter: string;
  onLocationChange: (v: string) => void;
  priceRange: number[];
  onPriceRangeChange: (v: number[]) => void;
  verifiedOnly: boolean;
  onVerifiedOnlyChange: (v: boolean) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Price Range Filter */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Price Range</h3>
        <div className="px-1">
          <Slider
            value={priceRange}
            onValueChange={onPriceRangeChange}
            min={0}
            max={500}
            step={25}
            className="w-full"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">${priceRange[0]}</span>
            <span className="text-xs font-medium">${priceRange[0]} – ${priceRange[1]}</span>
            <span className="text-xs text-muted-foreground">${priceRange[1]}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Verified Only */}
      <label className="flex items-center justify-between gap-2.5 h-8 px-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer">
        <span className="text-sm font-semibold flex items-center gap-1.5 leading-none">
          <BadgeCheck className="size-4 text-emerald-500" />
          Verified Only
        </span>
        <Checkbox
          checked={verifiedOnly}
          onCheckedChange={(v) => onVerifiedOnlyChange(!!v)}
          className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 shrink-0"
        />
      </label>

      <Separator />

      {/* Skills Filter */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Skills</h3>
        <div className="max-h-64 overflow-y-auto pr-1 custom-scroll">
          <div className="space-y-0.5">
            {popularSkills.map(({ skill, count }) => (
              <label
                key={skill}
                htmlFor={`skill-${skill}`}
                className="flex items-center gap-2.5 h-8 px-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <Checkbox
                  id={`skill-${skill}`}
                  checked={selectedSkills.includes(skill)}
                  onCheckedChange={() => onSkillToggle(skill)}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 shrink-0"
                />
                <span className="text-sm flex-1 text-left min-w-0 truncate leading-none">
                  {skill}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0 leading-none">{count}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Rating Filter */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Minimum Rating</h3>
        <div className="px-1">
          <Slider
            value={ratingSlider}
            onValueChange={onRatingChange}
            min={0}
            max={5}
            step={0.5}
            className="w-full"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">Any</span>
            <span className="text-xs font-medium">
              {minRating > 0 ? `${minRating}+ stars` : "Any"}
            </span>
            <span className="text-xs text-muted-foreground">5</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Location Filter */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Location</h3>
        <Select value={locationFilter} onValueChange={onLocationChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {popularLocations.map(({ location, count }) => (
              <SelectItem key={location} value={location}>
                {location} ({count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <>
          <Separator />
          <Button variant="outline" className="w-full" onClick={onClearFilters}>
            <X className="size-4 mr-2" />
            Clear All Filters
          </Button>
        </>
      )}
    </div>
  );
}

// ---- Search Suggestions ----
function SearchSuggestions({
  search,
  onSelect,
}: {
  search: string;
  onSelect: (term: string) => void;
}) {
  const suggestions = useMemo(() => {
    if (!search || search.length < 2) return [];
    const terms = [
      "UI Designer", "React Developer", "Logo Design", "Web Development",
      "Content Writing", "SEO Expert", "Mobile App", "Brand Identity",
      "Illustration", "Dashboard Design", "Figma Expert", "Node.js Developer",
    ];
    return terms.filter((t) => t.toLowerCase().includes(search.toLowerCase())).slice(0, 5);
  }, [search]);

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
      {suggestions.map((term) => (
        <button
          key={term}
          className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent flex items-center gap-2 transition-colors"
          onClick={() => onSelect(term)}
        >
          <Search className="size-3.5 text-muted-foreground" />
          {term}
        </button>
      ))}
    </div>
  );
}

// ---- Main Browse Page ----
export function BrowsePage() {
  const { navigate } = useNavigationStore();
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const isBuyer = isAuthenticated && user?.role === "BUYER";

  // State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [ratingSlider, setRatingSlider] = useState<number[]>([0]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState<number[]>([0, 500]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [quickMessageAuthor, setQuickMessageAuthor] = useState<{ id: string; name: string } | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", "12");
    params.set("sortBy", sortBy);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (selectedSkills.length > 0) params.set("skill", selectedSkills[0]);
    if (minRating > 0) params.set("minRating", minRating.toString());
    if (locationFilter) params.set("location", locationFilter);
    return params.toString();
  }, [page, sortBy, debouncedSearch, selectedSkills, minRating, locationFilter]);

  // Fetch authors
  const {
    data: browseData,
    isLoading,
    isError,
    error,
  } = useQuery<BrowseResponse>({
    queryKey: ["browse-authors", queryParams],
    queryFn: async () => {
      const json = await apiGet<{ success: boolean; data: BrowseResponse }>(`/api/public/authors/browse?${queryParams}`);
      return json.data;
    },
  });

  // Fetch saved authors (if buyer)
  const { data: savedAuthors = [] } = useQuery<string[]>({
    queryKey: ["saved-authors"],
    queryFn: async () => {
      try {
        const json = await apiFetch<{ success: boolean; data: { authorId: string }[] }>("/api/saved-authors");
        return json.data.map((s) => s.authorId);
      } catch {
        return [];
      }
    },
    enabled: isBuyer,
  });

  // Save/unsave mutation
  const saveMutation = useMutation({
    mutationFn: async (authorId: string) => {
      return apiPost<{ success: boolean; data: { saved: boolean } }>("/api/saved-authors", { authorId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["saved-authors"] });
      toast.success(data.data.saved ? "Author saved" : "Author removed from saved");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update saved authors");
    },
  });

  const authors = browseData?.data || [];
  const total = browseData?.total || 0;
  const popularSkills = browseData?.popularSkills || [];
  const popularLocations = browseData?.popularLocations || [];
  const limit = 12;

  // Compute display authors directly from fetched data
  const allLoadedAuthors = useMemo(() => authors, [authors]);

  // Featured creator - first author if available and verified
  const featuredAuthor = allLoadedAuthors.find((a) => a.profile?.isVerified) || null;

  // Client-side filter for verified only and price range
  const displayAuthors = useMemo(() => {
    let filtered = allLoadedAuthors;
    if (verifiedOnly) {
      filtered = filtered.filter((a) => a.profile?.isVerified);
    }
    if (priceRange[0] > 0 || priceRange[1] < 500) {
      filtered = filtered.filter((a) => {
        const sales = a.profile?.totalSales || 0;
        const price = sales > 100 ? 50 : sales > 50 ? 75 : sales > 10 ? 100 : 150;
        return price >= priceRange[0] && price <= priceRange[1];
      });
    }
    return filtered;
  }, [allLoadedAuthors, verifiedOnly, priceRange]);

  const handleSave = useCallback(
    (authorId: string) => {
      if (!isBuyer) {
        toast.error("Please log in as a buyer to save authors");
        return;
      }
      saveMutation.mutate(authorId);
    },
    [isBuyer, saveMutation]
  );

  const handleSkillToggle = useCallback((skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }, []);

  const handleRatingChange = useCallback((v: number[]) => {
    setRatingSlider(v);
    setMinRating(v[0]);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedSkills([]);
    setMinRating(0);
    setRatingSlider([0]);
    setSortBy("newest");
    setLocationFilter("");
    setSelectedCategory("all");
    setPage(1);
    setPriceRange([0, 500]);
    setVerifiedOnly(false);
  }, []);

  const hasActiveFilters =
    debouncedSearch || selectedSkills.length > 0 || minRating > 0 || locationFilter || selectedCategory !== "all" || verifiedOnly || priceRange[0] > 0 || priceRange[1] < 500;

  const handleMessage = useCallback(
    (authorId: string) => {
      const author = allLoadedAuthors.find((a) => a.id === authorId);
      if (author) {
        setQuickMessageAuthor({ id: author.id, name: author.name });
      }
    },
    [allLoadedAuthors]
  );

  const handleSearchSuggestion = useCallback((term: string) => {
    setSearch(term);
    setDebouncedSearch(term);
    setShowSuggestions(false);
  }, []);

  const sidebarFiltersProps = {
    popularSkills,
    popularLocations,
    selectedSkills,
    onSkillToggle: handleSkillToggle,
    ratingSlider,
    onRatingChange: handleRatingChange,
    minRating,
    locationFilter,
    onLocationChange: setLocationFilter,
    priceRange,
    onPriceRangeChange: setPriceRange,
    verifiedOnly,
    onVerifiedOnlyChange: setVerifiedOnly,
    hasActiveFilters: !!hasActiveFilters,
    onClearFilters: clearFilters,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Gradient Header Section (indigo→violet→purple) ─── */}
      <div className="relative bg-gradient-to-br from-indigo-500/10 via-violet-500/8 to-purple-500/10 dark:from-indigo-500/5 dark:via-violet-500/3 dark:to-purple-500/5 border-b border-border/50">
        {/* Decorative shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-[10%] w-56 h-56 bg-indigo-400/8 dark:bg-indigo-400/4 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-[15%] w-44 h-44 bg-violet-400/8 dark:bg-violet-400/4 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-purple-400/5 dark:bg-purple-400/3 rounded-full blur-3xl" />
        </div>

        <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-10 pb-8 relative">
          <div className="flex flex-col items-center text-center gap-4 mb-6">
            <Badge
              variant="secondary"
              className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20"
            >
              <Sparkles className="size-3 mr-1" />
              Discover Talent
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 dark:from-indigo-400 dark:via-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                Discover Talent
              </span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              Find and connect with the world&apos;s most talented digital creators for your next project
            </p>
          </div>

          {/* Large Prominent Search Bar with Suggestions */}
          <div className="max-w-2xl mx-auto" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input
                placeholder="Search creators by name, skill, or location..."
                className="pl-12 h-14 text-base bg-background/90 backdrop-blur-sm border-2 border-indigo-200 dark:border-indigo-800 focus:border-indigo-400 dark:focus:border-indigo-600 rounded-xl shadow-lg"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-8"
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                  }}
                >
                  <X className="size-4" />
                </Button>
              )}
              {showSuggestions && (
                <SearchSuggestions search={search} onSelect={handleSearchSuggestion} />
              )}
            </div>
            <div className="flex items-center justify-center mt-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{total}</span> creators available
            </div>
          </div>

          {/* Category filter chips with Trending badges */}
          <div className="flex items-center justify-center gap-2 mt-6 overflow-x-auto pb-1 custom-scroll">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <motion.button
                  key={cat.id}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setPage(1);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border relative",
                    selectedCategory === cat.id
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
                      : "bg-background/80 text-muted-foreground border-border hover:border-indigo-500/30 hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                  {cat.label}
                  {cat.trending && selectedCategory !== cat.id && (
                    <span className="absolute -top-1.5 -right-1 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0 rounded-full shadow-sm">
                      <Zap className="size-2 inline" /> Hot
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm py-3 border-b border-border/50">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="flex items-center gap-2">
            {/* Sort dropdown */}
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <ArrowUpDown className="size-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="size-3.5 text-muted-foreground" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Rating filter */}
            <Select
              value={minRating > 0 ? minRating.toString() : "any"}
              onValueChange={(v) => {
                const val = v === "any" ? 0 : parseFloat(v);
                setMinRating(val);
                setRatingSlider([val]);
              }}
            >
              <SelectTrigger className="w-32 h-9 text-sm">
                <Star className="size-3.5 mr-1.5 text-amber-400" />
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Rating</SelectItem>
                <SelectItem value="3">3+ Stars</SelectItem>
                <SelectItem value="4">4+ Stars</SelectItem>
                <SelectItem value="4.5">4.5+ Stars</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            {/* View toggle */}
            <div className="hidden sm:flex items-center border rounded-lg h-9">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                className={cn(
                  "size-9 rounded-r-none",
                  viewMode === "grid" && "bg-indigo-600 hover:bg-indigo-700"
                )}
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="size-3.5" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className={cn(
                  "size-9 rounded-l-none",
                  viewMode === "list" && "bg-indigo-600 hover:bg-indigo-700"
                )}
                onClick={() => setViewMode("list")}
              >
                <List className="size-3.5" />
              </Button>
            </div>

            {/* Mobile filter button */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <Button variant="outline" className="lg:hidden h-9 text-sm" onClick={() => setSidebarOpen(true)}>
                <SlidersHorizontal className="size-3.5 mr-1.5" />
                Filters
              </Button>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <SidebarFilters {...sidebarFiltersProps} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {debouncedSearch && (
                <Badge variant="secondary" className="gap-1">
                  Search: &quot;{debouncedSearch}&quot;
                  <X className="size-3 cursor-pointer" onClick={() => { setSearch(""); setDebouncedSearch(""); }} />
                </Badge>
              )}
              {selectedSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <X className="size-3 cursor-pointer" onClick={() => handleSkillToggle(skill)} />
                </Badge>
              ))}
              {minRating > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {minRating}+ Stars
                  <X className="size-3 cursor-pointer" onClick={() => { setMinRating(0); setRatingSlider([0]); }} />
                </Badge>
              )}
              {locationFilter && (
                <Badge variant="secondary" className="gap-1">
                  {locationFilter}
                  <X className="size-3 cursor-pointer" onClick={() => setLocationFilter("")} />
                </Badge>
              )}
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {CATEGORIES.find((c) => c.id === selectedCategory)?.label}
                  <X className="size-3 cursor-pointer" onClick={() => { setSelectedCategory("all"); setPage(1); }} />
                </Badge>
              )}
              {verifiedOnly && (
                <Badge variant="secondary" className="gap-1">
                  Verified Only
                  <X className="size-3 cursor-pointer" onClick={() => setVerifiedOnly(false)} />
                </Badge>
              )}
              {(priceRange[0] > 0 || priceRange[1] < 500) && (
                <Badge variant="secondary" className="gap-1">
                  ${priceRange[0]} – ${priceRange[1]}
                  <X className="size-3 cursor-pointer" onClick={() => setPriceRange([0, 500])} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24">
              <Card>
                <CardContent className="p-4">
                  <SidebarFilters {...sidebarFiltersProps} />
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Results count */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-muted-foreground">
                {isLoading ? (
                  <Skeleton className="h-4 w-48" />
                ) : (
                  <>
                    Showing{" "}
                    <span className="font-medium text-foreground">{displayAuthors.length}</span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">{total}</span>{" "}
                    creators
                  </>
                )}
              </p>
            </div>

            {/* Featured Creator Spotlight */}
            {featuredAuthor && page === 1 && !debouncedSearch && !hasActiveFilters && (
              <div className="mb-6">
                <FeaturedCreator
                  author={featuredAuthor}
                  onNavigate={() => navigate("profile", { userId: featuredAuthor.id })}
                  onMessage={() => handleMessage(featuredAuthor.id)}
                  isBuyer={isBuyer}
                />
              </div>
            )}

            {/* Loading state */}
            {isLoading && displayAuthors.length === 0 && (
              <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>
                {Array.from({ length: 6 }).map((_, i) =>
                  viewMode === "grid" ? <AuthorCardSkeleton key={i} /> : <AuthorListSkeleton key={i} />
                )}
              </div>
            )}

            {/* Error state */}
            {isError && (
              <EmptyState
                icon={<Users />}
                title="Failed to load authors"
                description={error instanceof Error ? error.message : "Something went wrong. Please try again."}
                action={{
                  label: "Retry",
                  onClick: () => queryClient.invalidateQueries({ queryKey: ["browse-authors"] }),
                }}
              />
            )}

            {/* Empty state */}
            {!isLoading && !isError && displayAuthors.length === 0 && (
              <EmptyState
                icon={<Users />}
                title="No authors found"
                description="No authors found matching your criteria. Try adjusting your filters."
                action={hasActiveFilters ? { label: "Clear Filters", onClick: clearFilters } : undefined}
              />
            )}

            {/* Results grid */}
            {!isLoading && !isError && displayAuthors.length > 0 && (
              <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>
                {displayAuthors.map((author) => {
                  const isSaved = savedAuthors.includes(author.id);
                  const CardComponent = viewMode === "grid" ? AuthorGridCard : AuthorListCard;

                  return (
                    <CardComponent
                      key={author.id}
                      author={author}
                      isSaved={isSaved}
                      onSave={() => handleSave(author.id)}
                      isSaving={saveMutation.isPending}
                      onNavigate={() => navigate("profile", { userId: author.id })}
                      isBuyer={isBuyer}
                      onMessage={() => handleMessage(author.id)}
                    />
                  );
                })}
              </div>
            )}

            {/* Enhanced Pagination */}
            <Pagination
              page={page}
              total={total}
              limit={limit}
              onPageChange={(p) => {
                setPage(p);
                setPage(1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        </div>
      </div>

      {/* Quick Message Sheet */}
      {quickMessageAuthor && (
        <QuickMessageSheet
          open={!!quickMessageAuthor}
          onOpenChange={(open) => {
            if (!open) setQuickMessageAuthor(null);
          }}
          authorId={quickMessageAuthor.id}
          authorName={quickMessageAuthor.name}
        />
      )}
    </div>
  );
}
