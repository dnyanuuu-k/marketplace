"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  MapPin,
  BadgeCheck,
  Heart,
  Share2,
  MessageSquare,
  ShoppingBag,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Github,
  Linkedin,
  Twitter,
  Globe,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageIcon,
  MessageCircle,
  Copy,
  User,
  Briefcase,
  StickyNote,
  Eye,
  Flag,
  MoreHorizontal,
  LayoutGrid,
  List,
  Send,
  Loader2,
  Users,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { ReviewCard, StarRating } from "@/components/shared/review-card";
import { useNavigationStore } from "@/store/navigation";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ---- Types ----
interface ProfileData {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
  profile: {
    id: string;
    bio: string | null;
    skills: string[];
    portfolioImages: string[];
    socialLinks: Record<string, string>;
    location: string | null;
    coverImageUrl: string | null;
    isVerified: boolean;
    totalSales: number;
    averageRating: number;
  } | null;
  stats: {
    totalSales: number;
    averageRating: number;
    totalReviews: number;
    completionRate: number;
    averageResponseTime: string;
  };
  ratingDistribution: { rating: number; count: number }[];
  isSaved: boolean;
  isOwnProfile: boolean;
  viewCount?: number;
}

interface ReviewData {
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

interface ReviewsResponse {
  data: ReviewData[];
  total: number;
  page: number;
  limit: number;
}

interface SimilarAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
  profile: {
    bio: string | null;
    skills: string[];
    location: string | null;
    isVerified: boolean;
    totalSales: number;
    averageRating: number;
  } | null;
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
  "Prototyping": "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
  "Dashboard": "bg-lime-100 text-lime-700 dark:bg-lime-500/20 dark:text-lime-300",
  "Design Systems": "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
};

function getSkillColor(skill: string): string {
  return SKILL_COLORS[skill] || "bg-primary/10 text-primary";
}

// ---- Skill size for cloud (based on proficiency) ----
function getSkillSize(index: number, total: number): string {
  const ratio = total > 1 ? index / (total - 1) : 1;
  if (ratio > 0.75) return "text-sm px-4 py-1.5";
  if (ratio > 0.5) return "text-xs px-3 py-1";
  if (ratio > 0.25) return "text-[11px] px-2.5 py-0.5";
  return "text-[10px] px-2 py-0.5";
}

// ---- Social link config ----
const SOCIAL_LINKS = [
  { key: "github", icon: Github, label: "GitHub" },
  { key: "linkedin", icon: Linkedin, label: "LinkedIn" },
  { key: "twitter", icon: Twitter, label: "Twitter" },
  { key: "website", icon: Globe, label: "Website" },
] as const;

// ---- Cover gradient ----
const GRADIENTS = [
  "from-emerald-500/30 via-teal-500/20 to-cyan-500/30",
  "from-rose-500/30 via-orange-500/20 to-amber-500/30",
  "from-violet-500/30 via-fuchsia-500/20 to-pink-500/30",
  "from-teal-500/30 via-emerald-500/20 to-green-500/30",
];

function getGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

// ---- Portfolio category tags ----
const PORTFOLIO_TAGS = ["Design", "Branding", "Web", "Mobile", "Illustration", "UI/UX"];

function getPortfolioTag(index: number): string {
  return PORTFOLIO_TAGS[index % PORTFOLIO_TAGS.length];
}

// ---- Lightbox Component ----
function ImageLightbox({
  images,
  initialIndex,
  open,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => { setIndex(initialIndex); }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowLeft") setIndex((i) => (i > 0 ? i - 1 : images.length - 1));
      if (e.key === "ArrowRight") setIndex((i) => (i < images.length - 1 ? i + 1 : 0));
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, images.length, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
        <div className="relative flex items-center justify-center min-h-[400px] max-h-[80vh]">
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-10 text-white hover:bg-white/20" onClick={onClose}>
            <X className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" className="absolute left-2 md:left-4 z-10 text-white hover:bg-white/20 size-10" onClick={() => setIndex((i) => (i > 0 ? i - 1 : images.length - 1))}>
            <ChevronLeft className="size-6" />
          </Button>
          <AnimatePresence mode="wait">
            <motion.img key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} src={images[index]} alt={`Portfolio image ${index + 1}`} className="max-w-full max-h-[80vh] object-contain" />
          </AnimatePresence>
          <Button variant="ghost" size="icon" className="absolute right-2 md:right-4 z-10 text-white hover:bg-white/20 size-10" onClick={() => setIndex((i) => (i < images.length - 1 ? i + 1 : 0))}>
            <ChevronRight className="size-6" />
          </Button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
            {index + 1} / {images.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Rating Distribution Bar ----
function RatingDistribution({
  distribution,
  totalReviews,
  onFilterByRating,
  activeRating,
}: {
  distribution: { rating: number; count: number }[];
  totalReviews: number;
  onFilterByRating: (rating: number | null) => void;
  activeRating: number | null;
}) {
  const sorted = [...distribution].sort((a, b) => b.rating - a.rating);

  const barColors: Record<number, string> = {
    5: "bg-emerald-400 dark:bg-emerald-500",
    4: "bg-lime-400 dark:bg-lime-500",
    3: "bg-amber-400 dark:bg-amber-500",
    2: "bg-orange-400 dark:bg-orange-500",
    1: "bg-red-400 dark:bg-red-500",
  };

  return (
    <div className="space-y-2">
      {sorted.map(({ rating, count }) => {
        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
        const isActive = activeRating === rating;
        return (
          <button
            key={rating}
            className={cn(
              "flex items-center gap-2 w-full text-left rounded px-1 py-0.5 transition-colors",
              isActive ? "bg-primary/5" : "hover:bg-muted/50"
            )}
            onClick={() => onFilterByRating(isActive ? null : rating)}
          >
            <span className={cn("text-xs w-8 shrink-0", isActive ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {rating}<Star className="inline size-2.5 ml-0.5 fill-amber-400 text-amber-400" />
            </span>
            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.6, delay: (5 - rating) * 0.1 }}
                className={cn("h-full rounded-full", barColors[rating] || "bg-amber-400")}
              />
            </div>
            <span className={cn("text-xs w-10 shrink-0 text-right", isActive ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {percentage > 0 ? `${Math.round(percentage)}%` : "0%"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---- Contact Creator Sheet ----
function ContactCreatorSheet({
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
    if (!message.trim()) { toast.error("Please enter a message"); return; }
    setSending(true);
    try {
      await apiPost("/api/conversations", { participantId: authorId, message: message.trim() });
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
          <SheetTitle>Contact {authorName}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Start a conversation with {authorName}. They typically respond within a few hours.
          </p>
          <Textarea placeholder="Write your message..." value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="resize-none" />
          <p className="text-xs text-muted-foreground">{message.length}/500 characters</p>
        </div>
        <SheetFooter className="mt-6">
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSend} disabled={sending || !message.trim()}>
            {sending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
            Send Message
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ---- Report User Dialog ----
function ReportUserDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error("Please provide a reason"); return; }
    setSubmitting(true);
    try {
      await apiPost("/api/reports", { reportedUserId: userId, reason: reason.trim(), type: "USER" });
      toast.success("Report submitted. Our team will review it shortly.");
      setReason("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="size-5 text-rose-500" />
            Report {userName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">Help us understand the issue. Our moderation team will review your report.</p>
          <Select onValueChange={setReason}>
            <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="spam">Spam or misleading</SelectItem>
              <SelectItem value="harassment">Harassment or abuse</SelectItem>
              <SelectItem value="fraud">Fraud or scam</SelectItem>
              <SelectItem value="inappropriate">Inappropriate content</SelectItem>
              <SelectItem value="impersonation">Impersonation</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Additional details (optional)" rows={3} className="resize-none" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting || !reason}>
            {submitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Similar Creators Section ----
function SimilarCreators({ currentAuthorId }: { currentAuthorId: string }) {
  const { navigate } = useNavigationStore();

  const { data: similarData, isLoading } = useQuery({
    queryKey: ["similar-creators", currentAuthorId],
    queryFn: async () => {
      const json = await apiGet(`/api/users/${currentAuthorId}/similar`);
      return (json as { data: SimilarAuthor[] }).data;
    },
    enabled: !!currentAuthorId,
  });

  const authors = similarData || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (authors.length === 0) return null;

  return (
    <div className="space-y-3">
      {authors.map((author) => {
        const authorInitials = author.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
        return (
          <motion.div
            key={author.id}
            whileHover={{ x: 2 }}
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate("profile", { userId: author.id })}
          >
            <div className="relative">
              <Avatar className="size-10">
                {author.avatarUrl && <AvatarImage src={author.avatarUrl} alt={author.name} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{authorInitials}</AvatarFallback>
              </Avatar>
              {author.profile?.isVerified && (
                <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0">
                  <BadgeCheck className="size-3.5 text-emerald-500" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{author.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {author.profile && (
                  <>
                    <div className="flex items-center gap-0.5">
                      <Star className="size-2.5 fill-amber-400 text-amber-400" />
                      {author.profile.averageRating.toFixed(1)}
                    </div>
                    <span>{author.profile.totalSales} sales</span>
                  </>
                )}
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </motion.div>
        );
      })}
    </div>
  );
}

// ---- Mini Availability Calendar (next 7 days) ----
function AvailabilityCalendar() {
  const days = useMemo(() => {
    const result: { dayName: string; dayNum: number; status: "available" | "busy" | "partial"; date: Date }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = date.getDate();
      // Pseudo-random availability based on date
      const hash = (date.getDate() * 7 + date.getMonth() * 3) % 5;
      const status: "available" | "busy" | "partial" =
        hash < 2 ? "available" : hash < 4 ? "partial" : "busy";
      result.push({ dayName, dayNum, status, date });
    }
    return result;
  }, []);

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map(({ dayName, dayNum, status }) => (
        <div key={dayName + dayNum} className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-muted-foreground">{dayName}</span>
          <div
            className={cn(
              "size-8 rounded-md flex items-center justify-center text-xs font-medium",
              status === "available" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
              status === "busy" && "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
              status === "partial" && "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400"
            )}
          >
            {dayNum}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Skills Cloud ----
function SkillsCloud({ skills }: { skills: string[] }) {
  if (skills.length === 0) return null;
  // Sort by "proficiency" - first items are more proficient
  const sorted = [...skills];
  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((skill, i) => (
        <Badge
          key={skill}
          variant="secondary"
          className={cn(
            "rounded-full font-medium transition-all hover:scale-105 cursor-default",
            getSkillSize(i, sorted.length),
            getSkillColor(skill)
          )}
        >
          {skill}
        </Badge>
      ))}
    </div>
  );
}

// ---- Skeleton ----
function ProfileSkeleton() {
  return (
    <div className="py-8 px-4 md:px-6">
      <div className="max-w-[1280px] mx-auto">
        <Skeleton className="h-40 md:h-56 rounded-xl w-full" />
        <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 md:-mt-16 px-4 md:px-6">
          <Skeleton className="size-24 md:size-32 rounded-full border-4 border-background" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-8 px-4 md:px-6">
          <div className="space-y-6">
            <Card><CardContent className="p-6 space-y-3"><Skeleton className="h-5 w-20" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><div className="flex gap-2 mt-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-16 rounded-full" />)}</div></CardContent></Card>
            <Card><CardContent className="p-6"><Skeleton className="h-5 w-24 mb-4" /><div className="grid grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}</div></CardContent></Card>
          </div>
          <div className="space-y-4">
            <Card><CardContent className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <React.Fragment key={i}><div className="flex justify-between"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-16" /></div>{i < 3 && <Separator />}</React.Fragment>)}</CardContent></Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Review Pagination ----
function ReviewPagination({
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

  return (
    <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border">
      <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        <ChevronLeft className="size-4 mr-1" /> Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
        Next <ChevronRight className="size-4 ml-1" />
      </Button>
    </div>
  );
}

// ---- Main Profile Page ----
export function ProfilePage() {
  const { pageParams, navigate } = useNavigationStore();
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const userId = (pageParams.userId as string) || user?.id || "";
  const isBuyer = isAuthenticated && user?.role === "BUYER";

  // Fetch profile data
  const {
    data: profileData,
    isLoading: profileLoading,
    isError: profileError,
    error: profileErrorObj,
  } = useQuery<ProfileData>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const json = await apiGet<{ success: boolean; data: ProfileData }>(`/api/users/${userId}/profile`);
      return json.data;
    },
    enabled: !!userId,
  });

  // Reviews state
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewSort, setReviewSort] = useState("newest");
  const [reviewRatingFilter, setReviewRatingFilter] = useState<number | null>(null);
  const reviewLimit = 5;

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery<ReviewsResponse>({
    queryKey: ["profile-reviews", userId, reviewPage, reviewSort, reviewRatingFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        authorId: userId,
        page: reviewPage.toString(),
        limit: reviewLimit.toString(),
      });
      if (reviewRatingFilter) params.set("rating", reviewRatingFilter.toString());
      const json = await apiGet<{ success: boolean; data: ReviewsResponse }>(`/api/reviews?${params}`);
      return json.data;
    },
    enabled: !!userId,
  });

  // Save/unsave mutation
  const saveMutation = useMutation({
    mutationFn: async (authorId: string) => {
      return apiPost<{ success: boolean; data: { saved: boolean } }>("/api/saved-authors", { authorId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success(data.data.saved ? "Author saved" : "Author removed from saved");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update");
    },
  });

  // Share profile
  const handleShare = useCallback(() => {
    const url = `${window.location.origin}?page=profile&userId=${userId}`;
    navigator.clipboard.writeText(url);
    toast.success("Profile link copied to clipboard!");
  }, [userId]);

  // Dialog states
  const [contactOpen, setContactOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [portfolioView, setPortfolioView] = useState<"grid" | "list">("grid");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [portfolioShowCount, setPortfolioShowCount] = useState(6);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Parallax-like scroll effect
  const [coverOffset, setCoverOffset] = useState(0);
  const profileRef = useRef<HTMLDivElement>(null);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setCoverOffset(scrollY * 0.3); // Parallax factor
      if (profileRef.current) {
        const rect = profileRef.current.getBoundingClientRect();
        setIsHeaderSticky(rect.top < -180);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Active tab
  const [activeTab, setActiveTab] = useState("about");
  const aboutRef = useRef<HTMLDivElement>(null);
  const portfolioRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (section: string) => {
    setActiveTab(section);
    const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
      about: aboutRef,
      portfolio: portfolioRef,
      reviews: reviewsRef,
    };
    const ref = refMap[section];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (profileLoading) return <ProfileSkeleton />;

  if (profileError || !profileData) {
    return (
      <div className="py-8 px-4 md:px-6">
        <div className="max-w-[1280px] mx-auto">
          <EmptyState
            icon={<MessageCircle />}
            title="Profile not found"
            description={profileErrorObj instanceof Error ? profileErrorObj.message : "This profile could not be loaded."}
            action={{ label: "Back to Browse", onClick: () => navigate("browse") }}
          />
        </div>
      </div>
    );
  }

  const profile = profileData.profile;
  const stats = profileData.stats;
  const distribution = profileData.ratingDistribution || [];
  const totalReviews = stats.totalReviews || 0;
  const reviews = reviewsData?.data || [];
  const reviewTotal = reviewsData?.total || 0;
  const portfolioImages = profile?.portfolioImages || [];
  const socialLinks = profile?.socialLinks || {};
  const skills = profile?.skills || [];
  const viewCount = profileData.viewCount || profile?.totalSales || 0;
  const initials = profileData.name.split(" ").map((n) => n[0]).join("");
  const isOwnProfile = profileData.isOwnProfile;

  const displayedPortfolioImages = portfolioImages.slice(0, portfolioShowCount);
  const hasMorePortfolio = portfolioImages.length > portfolioShowCount;

  return (
    <div className="py-8 px-4 md:px-6" ref={profileRef}>
      <div className="max-w-[1280px] mx-auto">
        {/* Sticky Profile Header */}
        <AnimatePresence>
          {isHeaderSticky && (
            <motion.div
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-b shadow-sm"
            >
              <div className="max-w-[1280px] mx-auto px-4 md:px-6 flex items-center justify-between h-14">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    {profileData.avatarUrl && <AvatarImage src={profileData.avatarUrl} alt={profileData.name} />}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{profileData.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      {stats.averageRating.toFixed(1)}
                      <span>&middot;</span>
                      {stats.totalSales} sales
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleShare}>
                    <Share2 className="size-4" />
                  </Button>
                  {!isOwnProfile && isBuyer && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setContactOpen(true)}>
                      <MessageSquare className="size-3.5 mr-1" />
                      Contact
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back link */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate("browse")}>
            <ArrowLeft className="size-4 mr-1" />
            Back to Browse
          </Button>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Eye className="size-4" />
            <span>{viewCount.toLocaleString()} views</span>
          </div>
        </div>

        {/* Cover Banner with Parallax */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative h-32 md:h-48 rounded-xl overflow-hidden"
        >
          <div
            style={{ transform: `translateY(${coverOffset}px) scale(1.1)` }}
            className="absolute inset-0 transition-transform duration-100"
          >
            {profile?.coverImageUrl ? (
              <img src={profile.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-r ${getGradient(profileData.id)}`} />
            )}
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
        </motion.div>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 md:-mt-16 px-4 md:px-6"
        >
          <div className="relative">
            <Avatar className="size-24 md:size-32 border-4 border-background shrink-0">
              {profileData.avatarUrl && <AvatarImage src={profileData.avatarUrl} alt={profileData.name} />}
              <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
            </Avatar>
            {/* Animated verified badge with sparkle */}
            {profile?.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <BadgeCheck className="size-6 text-emerald-500" />
                </motion.div>
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, delay: 0.5 }}
                >
                  <Sparkles className="size-3 text-amber-400" />
                </motion.div>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{profileData.name}</h1>
              {profile?.isVerified && (
                <Badge variant="default" className="text-xs bg-emerald-600 hover:bg-emerald-700 gap-1">
                  <BadgeCheck className="size-3" />
                  Verified
                </Badge>
              )}
            </div>
            {profile?.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="size-4" />
                {profile.location}
              </div>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
              <div className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                Member since {new Date(profileData.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </div>
              <div className="flex items-center gap-1">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                <span className="font-medium text-foreground">{stats.averageRating.toFixed(1)}</span>
                ({totalReviews} reviews)
              </div>
              <div className="flex items-center gap-1">
                <ShoppingBag className="size-3.5" />
                {stats.totalSales} sales
              </div>
              {/* Response time indicator */}
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Clock className="size-3.5" />
                Usually responds in {stats.averageResponseTime || "2 hours"}
              </div>
            </div>
            {/* Social Media Links */}
            {Object.keys(socialLinks).length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                {SOCIAL_LINKS.map(({ key, icon: Icon, label }) => {
                  const url = socialLinks[key];
                  if (!url) return null;
                  return (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="size-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                      title={label}
                    >
                      <Icon className="size-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isOwnProfile ? (
              <>
                <Button variant="outline" onClick={() => navigate("dashboard/settings")}>Edit Profile</Button>
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="size-4 mr-1" /> Share
                </Button>
              </>
            ) : (
              <>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { if (!isAuthenticated) { toast.error("Please log in to contact this creator"); return; } setContactOpen(true); }}>
                  <MessageSquare className="size-4 mr-1" /> Contact Creator
                </Button>
                {isBuyer && (
                  <Button variant="outline" onClick={() => saveMutation.mutate(profileData.id)} disabled={saveMutation.isPending}>
                    <Heart className={`size-4 mr-1 ${profileData.isSaved ? "fill-red-500 text-red-500" : ""}`} />
                    {profileData.isSaved ? "Saved" : "Save"}
                  </Button>
                )}
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="size-4 mr-1" /> Share Profile
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="size-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setReportOpen(true)} className="text-rose-600">
                      <Flag className="size-4 mr-2" /> Report User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </motion.div>

        {/* Section Navigation Tabs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-6 px-4 md:px-6">
          <Tabs value={activeTab} onValueChange={scrollToSection}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="about" className="gap-1.5"><User className="size-3.5" /> About</TabsTrigger>
              <TabsTrigger value="portfolio" className="gap-1.5">
                <Briefcase className="size-3.5" /> Portfolio
                {portfolioImages.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{portfolioImages.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5">
                <StickyNote className="size-3.5" /> Reviews
                {totalReviews > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{totalReviews}</Badge>}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-6 px-4 md:px-6">
          <div className="space-y-6">
            {/* About Section */}
            <div ref={aboutRef}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profile?.bio ? (
                      <p className="text-sm leading-relaxed whitespace-pre-line">{profile.bio}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No bio available</p>
                    )}
                    {/* Skills Cloud with varying sizes */}
                    {skills.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">Skills</h4>
                        <SkillsCloud skills={skills} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Portfolio Section (Masonry-style) */}
            <div ref={portfolioRef}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Portfolio</CardTitle>
                        <CardDescription>{portfolioImages.length} items</CardDescription>
                      </div>
                      {portfolioImages.length > 0 && (
                        <div className="flex items-center gap-1 border rounded-md p-0.5">
                          <Button variant={portfolioView === "grid" ? "secondary" : "ghost"} size="icon" className="size-7" onClick={() => setPortfolioView("grid")}>
                            <LayoutGrid className="size-3.5" />
                          </Button>
                          <Button variant={portfolioView === "list" ? "secondary" : "ghost"} size="icon" className="size-7" onClick={() => setPortfolioView("list")}>
                            <List className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {portfolioImages.length > 0 ? (
                      portfolioView === "grid" ? (
                        <>
                          {/* Masonry-style grid with varying heights */}
                          <div className="columns-2 md:columns-3 gap-3 space-y-3">
                            {displayedPortfolioImages.map((img, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="break-inside-avoid rounded-lg overflow-hidden cursor-pointer relative group"
                                onClick={() => openLightbox(index)}
                              >
                                <img
                                  src={img}
                                  alt={`Portfolio ${index + 1}`}
                                  className="w-full object-cover transition-transform group-hover:scale-105"
                                  style={{ height: `${[180, 240, 150, 200, 160, 220][index % 6]}px` }}
                                />
                                {/* Hover overlay with title and View button */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                  <Badge className="bg-white/90 text-gray-900 text-xs border-0">
                                    {getPortfolioTag(index)}
                                  </Badge>
                                  <Button size="sm" variant="secondary" className="bg-white text-gray-900 hover:bg-gray-100 shadow-md">
                                    <Eye className="size-3.5 mr-1" /> View
                                  </Button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                          {/* Load More button */}
                          {hasMorePortfolio && (
                            <div className="flex justify-center mt-4">
                              <Button variant="outline" onClick={() => setPortfolioShowCount((prev) => prev + 6)}>
                                Load More ({portfolioImages.length - portfolioShowCount} remaining)
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-3">
                          {displayedPortfolioImages.map((img, index) => (
                            <motion.div
                              key={index}
                              whileHover={{ x: 4 }}
                              className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer transition-colors"
                              onClick={() => openLightbox(index)}
                            >
                              <div className="size-16 rounded-md overflow-hidden shrink-0">
                                <img src={img} alt={`Portfolio ${index + 1}`} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">Portfolio Item {index + 1}</p>
                                <Badge variant="secondary" className="text-[10px] mt-1">{getPortfolioTag(index)}</Badge>
                              </div>
                              <ExternalLink className="size-4 text-muted-foreground shrink-0" />
                            </motion.div>
                          ))}
                          {hasMorePortfolio && (
                            <div className="flex justify-center mt-2">
                              <Button variant="outline" size="sm" onClick={() => setPortfolioShowCount((prev) => prev + 6)}>
                                Load More
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <EmptyState icon={<ImageIcon />} title="No portfolio items" description="This creator hasn't added any portfolio items yet." />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Reviews Section */}
            <div ref={reviewsRef}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.35 }}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Reviews</CardTitle>
                        <CardDescription>{totalReviews} total reviews</CardDescription>
                      </div>
                      <Select
                        value={reviewSort}
                        onValueChange={(v) => {
                          setReviewSort(v);
                          setReviewPage(1);
                        }}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Most Recent</SelectItem>
                          <SelectItem value="highest">Highest Rated</SelectItem>
                          <SelectItem value="lowest">Lowest Rated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Overall Rating + Distribution with filter */}
                    {totalReviews > 0 && (
                      <div className="flex flex-col sm:flex-row gap-6 mb-6 pb-6 border-b border-border">
                        <div className="flex flex-col items-center justify-center sm:min-w-[140px]">
                          <span className="text-4xl font-bold">{stats.averageRating.toFixed(1)}</span>
                          <StarRating rating={Math.round(stats.averageRating)} size="md" />
                          <span className="text-sm text-muted-foreground mt-1">{totalReviews} reviews</span>
                          {reviewRatingFilter && (
                            <Badge variant="secondary" className="mt-2 text-xs gap-1">
                              {reviewRatingFilter} stars
                              <X className="size-3 cursor-pointer" onClick={() => { setReviewRatingFilter(null); setReviewPage(1); }} />
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1">
                          <RatingDistribution
                            distribution={distribution}
                            totalReviews={totalReviews}
                            onFilterByRating={(r) => { setReviewRatingFilter(r); setReviewPage(1); }}
                            activeRating={reviewRatingFilter}
                          />
                        </div>
                      </div>
                    )}

                    {/* Review List */}
                    {reviewsLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex items-center gap-2"><Skeleton className="size-8 rounded-full" /><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-20" /></div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        ))}
                      </div>
                    ) : reviews.length > 0 ? (
                      <div className="space-y-3">
                        {reviews.map((review) => (
                          <div key={review.id} className="relative">
                            <ReviewCard
                              review={{
                                id: review.id,
                                rating: review.rating,
                                comment: review.comment,
                                reviewer: {
                                  name: review.reviewer.name,
                                  avatar: review.reviewer.avatarUrl || undefined,
                                },
                                createdAt: review.createdAt,
                                reply: review.reply || undefined,
                                repliedAt: review.repliedAt || undefined,
                              }}
                            />
                            {/* Replied badge */}
                            {review.reply && (
                              <Badge className="absolute top-3 right-3 text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 gap-0.5">
                                <CheckCircle2 className="size-2.5" />
                                Replied
                              </Badge>
                            )}
                          </div>
                        ))}
                        {/* Review Pagination */}
                        <ReviewPagination
                          page={reviewPage}
                          total={reviewTotal}
                          limit={reviewLimit}
                          onPageChange={setReviewPage}
                        />
                      </div>
                    ) : (
                      <EmptyState icon={<StickyNote />} title="No reviews yet" description="This creator hasn't received any reviews yet." />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* ─── Sidebar ─── */}
          <div className="space-y-4">
            {/* Stats Card */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium">{stats.averageRating.toFixed(1)}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Sales</span>
                  <span className="text-sm font-medium">{stats.totalSales}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Reviews</span>
                  <span className="text-sm font-medium">{totalReviews}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Completion Rate</span>
                  <span className="text-sm font-medium">{stats.completionRate}%</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Response Time</span>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{stats.averageResponseTime || "~2 hours"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Hire This Creator CTA */}
            {!isOwnProfile && (
              <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
                <CardContent className="p-6">
                  <h3 className="text-base font-semibold mb-2">Hire This Creator</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ready to work with {profileData.name}? Start a conversation today.
                  </p>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      if (!isAuthenticated) {
                        toast.error("Please log in to contact this creator");
                        return;
                      }
                      setContactOpen(true);
                    }}
                  >
                    <MessageSquare className="size-4 mr-2" />
                    Contact Creator
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Availability Calendar */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="size-4 text-emerald-500" />
                  Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AvailabilityCalendar />
                <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="size-2 rounded-sm bg-emerald-400" /> Available
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="size-2 rounded-sm bg-sky-400" /> Partial
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="size-2 rounded-sm bg-amber-400" /> Busy
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Similar Creators */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="size-4 text-emerald-500" />
                  Similar Creators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimilarCreators currentAuthorId={userId} />
              </CardContent>
            </Card>

            {/* Report Profile option in dropdown menu at bottom */}
            {!isOwnProfile && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-rose-500"
                  onClick={() => setReportOpen(true)}
                >
                  <Flag className="size-3 mr-1" />
                  Report Profile
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {portfolioImages.length > 0 && (
        <ImageLightbox
          images={portfolioImages}
          initialIndex={lightboxIndex}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Contact Creator Sheet */}
      <ContactCreatorSheet open={contactOpen} onOpenChange={setContactOpen} authorId={userId} authorName={profileData.name} />

      {/* Report User Dialog */}
      <ReportUserDialog open={reportOpen} onOpenChange={setReportOpen} userId={userId} userName={profileData.name} />
    </div>
  );
}
