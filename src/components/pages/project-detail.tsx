"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Star,
  Eye,
  ShoppingBag,
  BadgeCheck,
  Crown,
  ExternalLink,
  Download,
  MapPin,
  MessageSquare,
  User,
  ChevronRight,
  CheckCircle2,
  Shield,
  Clock,
  Loader2,
  Send,
  Paintbrush,
  Code2,
  PenTool,
  Megaphone,
  Video,
  Music,
  BarChart3,
  Sparkles,
  Heart,
  Share2,
  Flag,
  ImageOff,
  ZoomIn,
  Edit,
  Package,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigationStore } from "@/store/navigation";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ─── Types ───

interface ProjectReview {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface Project {
  id: string;
  authorId: string;
  title: string;
  description: string;
  shortDescription: string | null;
  category: string;
  status: string;
  price: number;
  thumbnailUrl: string | null;
  images: string | string[];
  tags: string | string[];
  features: string | string[];
  demoUrl: string | null;
  sourceUrl: string | null;
  totalSales: number;
  totalViews: number;
  averageRating: number;
  reviewCount: number;
  featured: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
    profile: {
      isVerified: boolean;
      bio: string | null;
      location: string | null;
      totalSales: number;
      averageRating: number;
      skills: string;
    } | null;
  };
  projectReviews?: ProjectReview[];
}

interface ProjectDetailResponse {
  data: Project;
}

interface ReviewsResponse {
  data: ProjectReview[];
  total: number;
  page: number;
  limit: number;
}

// Note: The API wraps all responses in { success: true, data: ... }
// Query functions use inline types with the wrapper

interface RelatedProjectsResponse {
  data: Project[];
  total: number;
}

interface ProjectsResponse {
  data: Project[];
  total: number;
  page: number;
  limit: number;
  categories: { category: string; count: number }[];
  popularTags: { tag: string; count: number }[];
}

// ─── Constants ───

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; badgeColor: string }> = {
  DESIGN: { label: "Design", icon: Paintbrush, color: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300", badgeColor: "bg-pink-500" },
  DEVELOPMENT: { label: "Development", icon: Code2, color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300", badgeColor: "bg-cyan-500" },
  WRITING: { label: "Writing", icon: PenTool, color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300", badgeColor: "bg-amber-500" },
  MARKETING: { label: "Marketing", icon: Megaphone, color: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300", badgeColor: "bg-violet-500" },
  VIDEO: { label: "Video", icon: Video, color: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300", badgeColor: "bg-rose-500" },
  MUSIC: { label: "Music", icon: Music, color: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300", badgeColor: "bg-teal-500" },
  ANALYTICS: { label: "Analytics", icon: BarChart3, color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300", badgeColor: "bg-orange-500" },
};

const THUMBNAIL_GRADIENTS = [
  "from-emerald-500/40 via-teal-500/30 to-cyan-500/40",
  "from-violet-500/40 via-purple-500/30 to-rose-500/40",
  "from-amber-500/40 via-orange-500/30 to-rose-500/40",
  "from-teal-500/40 via-emerald-500/30 to-amber-500/40",
  "from-rose-500/40 via-pink-500/30 to-violet-500/40",
  "from-cyan-500/40 via-sky-500/30 to-emerald-500/40",
  "from-pink-500/40 via-rose-500/30 to-orange-500/40",
];

function getGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return THUMBNAIL_GRADIENTS[Math.abs(hash) % THUMBNAIL_GRADIENTS.length];
}

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || {
    label: category,
    icon: Sparkles,
    color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
    badgeColor: "bg-gray-500",
  };
}

function parseJsonArray(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// ─── Star Rating ───

function StarRating({
  rating,
  maxStars = 5,
  size = "sm",
  showValue = false,
}: {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}) {
  const starClass = size === "sm" ? "size-3.5" : size === "md" ? "size-4" : "size-5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxStars }, (_, i) => (
        <Star
          key={i}
          className={cn(
            starClass,
            i < Math.floor(rating)
              ? "fill-amber-400 text-amber-400"
              : i < rating
              ? "fill-amber-400/50 text-amber-400"
              : "fill-muted text-muted"
          )}
        />
      ))}
      {showValue && (
        <span className={cn(
          "ml-1 font-medium",
          size === "sm" ? "text-sm" : size === "md" ? "text-base" : "text-lg"
        )}>
          {rating > 0 ? rating.toFixed(1) : "—"}
        </span>
      )}
    </div>
  );
}

// ─── Interactive Star Rating (for review form) ───

function InteractiveStarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            className="p-0.5 transition-transform hover:scale-110"
            onMouseEnter={() => setHover(starValue)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(starValue)}
          >
            <Star
              className={cn(
                "size-6 transition-colors",
                starValue <= (hover || value)
                  ? "fill-amber-400 text-amber-400"
                  : "fill-muted text-muted"
              )}
            />
          </button>
        );
      })}
      {value > 0 && (
        <span className="text-sm text-muted-foreground ml-2">
          {value} star{value !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

// ─── Skeletons ───

function DetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Breadcrumb skeleton */}
        <Skeleton className="h-4 w-40 mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image gallery skeleton */}
            <Skeleton className="aspect-video w-full rounded-xl" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="size-20 rounded-lg" />
              ))}
            </div>

            {/* Title + info skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>

            {/* Tabs skeleton */}
            <Skeleton className="h-10 w-full" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>

          {/* Sidebar skeleton */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-4 w-24" />
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Image Gallery ───

function ImageGallery({
  thumbnailUrl,
  images,
  title,
  projectId,
}: {
  thumbnailUrl: string | null;
  images: string[];
  title: string;
  projectId: string;
}) {
  const allImages = useMemo(() => {
    const imgs: string[] = [];
    if (thumbnailUrl) imgs.push(thumbnailUrl);
    imgs.push(...images.filter((img) => img !== thumbnailUrl));
    return imgs;
  }, [thumbnailUrl, images]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [imageError, setImageError] = useState<Record<number, boolean>>({});

  const categoryConfig = getCategoryConfig("");
  const CategoryIcon = categoryConfig.icon;

  const activeImage = allImages[activeIndex] || null;
  const hasImages = allImages.length > 0;

  return (
    <div className="space-y-3">
      {/* Main image */}
      <motion.div
        className="relative aspect-video rounded-xl overflow-hidden bg-muted group cursor-pointer"
        layoutId="main-image"
      >
        {hasImages && !imageError[activeIndex] && activeImage ? (
          <img
            src={activeImage}
            alt={`${title} - Image ${activeIndex + 1}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError((prev) => ({ ...prev, [activeIndex]: true }))}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getGradient(projectId)} flex items-center justify-center`}>
            <CategoryIcon className="size-16 text-white/50" />
          </div>
        )}

        {/* Zoom overlay */}
        {hasImages && !imageError[activeIndex] && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ZoomIn className="size-8 text-white drop-shadow-lg" />
          </div>
        )}

        {/* Image counter */}
        {hasImages && allImages.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
            {activeIndex + 1} / {allImages.length}
          </div>
        )}

        {/* Navigation arrows */}
        {allImages.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
              }}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
              }}
            >
              <ChevronRight className="size-4" />
            </Button>
          </>
        )}
      </motion.div>

      {/* Thumbnail strip */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scroll">
          {allImages.map((img, index) => (
            <button
              key={index}
              className={cn(
                "shrink-0 size-20 rounded-lg overflow-hidden border-2 transition-all duration-200",
                activeIndex === index
                  ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                  : "border-border hover:border-emerald-500/50"
              )}
              onClick={() => setActiveIndex(index)}
            >
              {!imageError[index] ? (
                <img
                  src={img}
                  alt={`${title} thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => setImageError((prev) => ({ ...prev, [index]: true }))}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <ImageOff className="size-4 text-muted-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Author Card ───

function AuthorCard({
  author,
  onNavigateProfile,
}: {
  author: Project["author"];
  onNavigateProfile: () => void;
}) {
  const profile = author.profile;
  const skills = parseJsonArray(profile?.skills);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Avatar className="size-14 ring-2 ring-emerald-500/20">
            {author.avatarUrl && (
              <AvatarImage src={author.avatarUrl} alt={author.name} />
            )}
            <AvatarFallback className="text-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {author.name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-base truncate">{author.name}</h3>
              {profile?.isVerified && (
                <BadgeCheck className="size-4.5 text-emerald-500 shrink-0" />
              )}
            </div>
            {profile?.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="size-3" />
                <span>{profile.location}</span>
              </div>
            )}
          </div>
        </div>

        {profile?.bio && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-3">
            {profile.bio}
          </p>
        )}

        {/* Author stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {profile?.totalSales ?? 0}
            </p>
            <p className="text-[11px] text-muted-foreground">Sales</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-0.5">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              <p className="text-lg font-bold">{profile?.averageRating?.toFixed(1) ?? "—"}</p>
            </div>
            <p className="text-[11px] text-muted-foreground">Rating</p>
          </div>
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {skills.slice(0, 4).map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 rounded-full"
              >
                {skill}
              </Badge>
            ))}
            {skills.length > 4 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full">
                +{skills.length - 4}
              </Badge>
            )}
          </div>
        )}

        <Separator className="my-4" />

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 text-sm"
            onClick={onNavigateProfile}
          >
            <User className="size-4 mr-1.5" />
            View Profile
          </Button>
          <Button
            variant="outline"
            className="flex-1 text-sm"
            onClick={() => toast.info("Messaging coming soon!")}
          >
            <MessageSquare className="size-4 mr-1.5" />
            Message
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Review Card ───

function ReviewCard({ review }: { review: ProjectReview }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="size-9 ring-1 ring-border shrink-0">
              {review.user.avatarUrl && (
                <AvatarImage src={review.user.avatarUrl} alt={review.user.name} />
              )}
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {review.user.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {review.user.name}
                  </span>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatRelativeTime(review.createdAt)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {formatDate(review.createdAt)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {review.comment}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Review Form ───

function ReviewForm({
  projectId,
  onSubmitSuccess,
}: {
  projectId: string;
  onSubmitSuccess: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (!comment.trim()) {
      toast.error("Please write a comment");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiPost(`/api/projects/${projectId}/reviews`, {
        rating,
        comment: comment.trim(),
      });
      toast.success("Review submitted successfully!");
      setRating(0);
      setComment("");
      onSubmitSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  }, [rating, comment, projectId, onSubmitSuccess]);

  return (
    <Card className="border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/5">
      <CardContent className="p-4 space-y-4">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Star className="size-4 text-amber-400" />
          Write a Review
        </h4>
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Your Rating</label>
          <InteractiveStarRating value={rating} onChange={setRating} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Your Review</label>
          <Textarea
            placeholder="Share your experience with this project..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="resize-none bg-background"
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || rating === 0 || !comment.trim()}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Send className="size-4 mr-2" />
          )}
          Submit Review
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Purchase Confirmation Dialog ───

function PurchaseDialog({
  open,
  onOpenChange,
  project,
  onConfirm,
  isPurchasing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: Project;
  onConfirm: () => void;
  isPurchasing: boolean;
}) {
  const commissionRate = 0.1;
  const commission = project.price * commissionRate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="size-5 text-emerald-500" />
            Confirm Purchase
          </DialogTitle>
          <DialogDescription>
            Review your purchase details before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Project info */}
          <div className="flex gap-3">
            <div className="size-14 rounded-lg overflow-hidden shrink-0 bg-muted">
              {project.thumbnailUrl ? (
                <img
                  src={project.thumbnailUrl}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${getGradient(project.id)} flex items-center justify-center`}>
                  <Package className="size-5 text-white/70" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm line-clamp-1">{project.title}</h4>
              <p className="text-xs text-muted-foreground">by {project.author.name}</p>
              <div className="flex items-center gap-1 mt-1">
                <StarRating rating={project.averageRating} size="sm" />
                <span className="text-xs text-muted-foreground">({project.reviewCount})</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Price breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Project Price</span>
              <span className="font-medium">${project.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform Fee</span>
              <span className="text-muted-foreground">$0.00</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-lg">
                ${project.price.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Commission info */}
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <Info className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
            <span>
              A {commissionRate * 100}% commission (${commission.toFixed(2)}) is deducted from the
              seller&apos;s earnings. You pay the full listed price.
            </span>
          </div>

          {/* Security badges */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="size-3.5 text-emerald-500" />
              <span>Secure transaction</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>Instant access</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPurchasing}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPurchasing}
            className="bg-emerald-600 hover:bg-emerald-700 min-w-[120px]"
          >
            {isPurchasing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <ShoppingBag className="size-4 mr-2" />
                Purchase
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page Component ───

export function ProjectDetailPage() {
  const { navigate, pageParams } = useNavigationStore();
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  const projectId = pageParams?.projectId as string;

  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Fetch project details
  const {
    data: projectData,
    isLoading,
    error,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["project-detail", projectId],
    queryFn: () => apiGet<{ success: boolean; data: Project }>(`/api/projects/${projectId}`),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });

  const project = projectData?.data ?? null;

  // Fetch reviews separately for pagination
  const { data: reviewsData, refetch: refetchReviews } = useQuery({
    queryKey: ["project-reviews", projectId],
    queryFn: () => apiGet<{ success: boolean; data: { data: ProjectReview[]; total: number; page: number; limit: number } }>(`/api/projects/${projectId}/reviews?limit=20`),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });

  const reviews = reviewsData?.data?.data ?? project?.projectReviews ?? [];

  // Fetch related projects by same author
  const { data: relatedData } = useQuery({
    queryKey: ["related-projects", project?.authorId],
    queryFn: () =>
      apiGet<{ success: boolean; data: ProjectsResponse }>(
        `/api/projects?limit=5&sort=popular&authorId=${project?.authorId}`
      ),
    enabled: !!project?.authorId,
    staleTime: 60 * 1000,
  });

  const relatedProjects = (relatedData?.data?.data ?? []).filter(
    (p) => p.id !== projectId
  );

  // Derived state
  const isOwnProject = project && user && project.authorId === user.id;
  const images = parseJsonArray(project?.images);
  const tags = parseJsonArray(project?.tags);
  const features = parseJsonArray(project?.features);
  const categoryConfig = project ? getCategoryConfig(project.category) : null;
  const CategoryIcon = categoryConfig?.icon ?? Sparkles;

  // Check if user already purchased (via purchase-status API)
  const [hasPurchased, setHasPurchased] = useState(false);
  useEffect(() => {
    if (isAuthenticated && user && project && !isOwnProject) {
      apiGet<{ success: boolean; data: { hasPurchased: boolean; transactionId: string | null; purchasedAt: string | null } }>(
        `/api/projects/${projectId}/purchase-status`
      )
        .then((res) => {
          if (res.data.hasPurchased) {
            setHasPurchased(true);
          }
        })
        .catch(() => {
          // Silently ignore — user may not be a buyer
        });
    }
  }, [isAuthenticated, user, project, isOwnProject, projectId]);

  // Purchase handler
  const handlePurchase = useCallback(async () => {
    if (!projectId) return;

    setIsPurchasing(true);
    try {
      const result = await apiPost(`/api/projects/${projectId}/purchase`);
      toast.success(
        (result as { message?: string })?.message ?? "Project purchased successfully!"
      );
      setHasPurchased(true);
      setPurchaseDialogOpen(false);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["project-detail", projectId] });
      // Navigate to purchases after a short delay
      setTimeout(() => {
        navigate("dashboard/purchases");
      }, 1500);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to purchase project";
      if (errMsg.includes("already purchased") || errMsg.includes("ALREADY_PURCHASED")) {
        setHasPurchased(true);
        toast.info("You already own this project!");
        setPurchaseDialogOpen(false);
      } else if (errMsg.includes("cannot purchase your own")) {
        toast.error("You cannot purchase your own project");
        setPurchaseDialogOpen(false);
      } else {
        toast.error(errMsg);
      }
    } finally {
      setIsPurchasing(false);
    }
  }, [projectId, navigate, queryClient]);

  // Review success handler
  const handleReviewSuccess = useCallback(() => {
    refetchReviews();
    refetch();
  }, [refetchReviews, refetch]);

  // Navigate to author profile
  const handleNavigateProfile = useCallback(() => {
    if (project?.author?.id) {
      navigate("profile", { userId: project.author.id });
    }
  }, [navigate, project?.author?.id]);

  // Navigate to browse projects
  const handleBackToBrowse = useCallback(() => {
    navigate("browse-projects");
  }, [navigate]);

  // Navigate to edit project (own project)
  const handleEditProject = useCallback(() => {
    navigate("dashboard/portfolio");
  }, [navigate]);

  // Navigate to project detail (for related projects)
  const handleNavigateProject = useCallback(
    (p: Project) => {
      navigate("project-detail", { projectId: p.id });
    },
    [navigate]
  );

  // ─── Error state ───
  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="size-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <ImageOff className="size-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {error instanceof Error ? error.message : "The project you're looking for doesn't exist or has been removed."}
            </p>
            <Button
              onClick={handleBackToBrowse}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <ArrowLeft className="size-4 mr-2" />
              Back to Browse
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Loading state ───
  if (isLoading || !project) {
    return <DetailPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mb-4 md:mb-6"
        >
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <button
              onClick={() => navigate("landing")}
              className="hover:text-foreground transition-colors"
            >
              Home
            </button>
            <ChevronRight className="size-3.5" />
            <button
              onClick={handleBackToBrowse}
              className="hover:text-foreground transition-colors"
            >
              Projects
            </button>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {project.title}
            </span>
          </nav>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* ─── Main Content (left) ─── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ImageGallery
                thumbnailUrl={project.thumbnailUrl}
                images={images}
                title={project.title}
                projectId={project.id}
              />
            </motion.div>

            {/* Title + Meta (Mobile: above purchase card) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-3"
            >
              {/* Category + Featured badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {categoryConfig && (
                  <Badge className={`${categoryConfig.badgeColor} text-white border-0 gap-1`}>
                    <CategoryIcon className="size-3" />
                    {categoryConfig.label}
                  </Badge>
                )}
                {project.featured && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1">
                    <Crown className="size-3" />
                    Featured
                  </Badge>
                )}
                {project.status === "PUBLISHED" && (
                  <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/30">
                    <CheckCircle2 className="size-3" />
                    Published
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {project.title}
              </h1>

              {/* Short description */}
              {project.shortDescription && (
                <p className="text-muted-foreground leading-relaxed">
                  {project.shortDescription}
                </p>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-4 flex-wrap text-sm">
                <div className="flex items-center gap-1.5">
                  <StarRating rating={project.averageRating} size="md" showValue />
                  <span className="text-muted-foreground">({project.reviewCount} review{project.reviewCount !== 1 ? "s" : ""})</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-1 text-muted-foreground">
                  <ShoppingBag className="size-3.5" />
                  <span>{project.totalSales} sale{project.totalSales !== 1 ? "s" : ""}</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Eye className="size-3.5" />
                  <span>{project.totalViews} view{project.totalViews !== 1 ? "s" : ""}</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="size-3.5" />
                  <span>{formatDate(project.createdAt)}</span>
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs px-2.5 py-0.5 rounded-full hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300 cursor-pointer transition-colors"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Mobile: Purchase Card shown here on small screens */}
            <div className="lg:hidden">
              <PurchaseSidebar
                project={project}
                isOwnProject={isOwnProject ?? false}
                hasPurchased={hasPurchased}
                isAuthenticated={isAuthenticated}
                onBuyNow={() => setPurchaseDialogOpen(true)}
                onEdit={handleEditProject}
                onNavigatePurchases={() => navigate("dashboard/purchases")}
                features={features}
                CategoryIcon={CategoryIcon}
              />
            </div>

            {/* Tabs: Description / Reviews */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Tabs defaultValue="description" className="w-full">
                <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-border rounded-none gap-0">
                  <TabsTrigger
                    value="description"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium"
                  >
                    Description
                  </TabsTrigger>
                  <TabsTrigger
                    value="reviews"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium"
                  >
                    Reviews ({project.reviewCount})
                  </TabsTrigger>
                  <TabsTrigger
                    value="features"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium"
                  >
                    Features
                  </TabsTrigger>
                </TabsList>

                {/* Description Tab */}
                <TabsContent value="description" className="mt-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {project.description}
                    </div>
                  </div>
                </TabsContent>

                {/* Reviews Tab */}
                <TabsContent value="reviews" className="mt-6 space-y-4">
                  {/* Rating summary */}
                  <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                        {project.averageRating > 0 ? project.averageRating.toFixed(1) : "—"}
                      </p>
                      <StarRating rating={project.averageRating} size="sm" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {project.reviewCount} review{project.reviewCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Separator orientation="vertical" className="h-16" />
                    <div className="flex-1 space-y-1">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviews.filter((r) => r.rating === star).length;
                        const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-2 text-xs">
                            <span className="w-3 text-right">{star}</span>
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-6 text-muted-foreground text-right tabular-nums">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Review form for buyers who purchased */}
                  {isAuthenticated && user && hasPurchased && !isOwnProject && (
                    <ReviewForm
                      projectId={projectId}
                      onSubmitSuccess={handleReviewSuccess}
                    />
                  )}

                  {/* Reviews list */}
                  {reviews.length > 0 ? (
                    <div className="space-y-3">
                      <AnimatePresence mode="popLayout">
                        {reviews.map((review) => (
                          <ReviewCard key={review.id} review={review} />
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MessageSquare className="size-10 text-muted-foreground/50 mx-auto mb-3" />
                      <h3 className="font-semibold text-sm mb-1">No reviews yet</h3>
                      <p className="text-sm text-muted-foreground">
                        Be the first to review this project after purchasing.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Features Tab */}
                <TabsContent value="features" className="mt-6">
                  {features.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {features.map((feature, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.05 }}
                          className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Sparkles className="size-10 text-muted-foreground/50 mx-auto mb-3" />
                      <h3 className="font-semibold text-sm mb-1">No features listed</h3>
                      <p className="text-sm text-muted-foreground">
                        The author hasn&apos;t listed specific features for this project.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </motion.div>

            {/* Author Card (Desktop - below content) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Separator className="my-2" />
              <h2 className="text-lg font-semibold mb-4">About the Author</h2>
              <AuthorCard
                author={project.author}
                onNavigateProfile={handleNavigateProfile}
              />
            </motion.div>

            {/* Related Projects */}
            {relatedProjects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <Separator className="my-2" />
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">More from this Author</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-emerald-600 hover:text-emerald-700"
                    onClick={handleNavigateProfile}
                  >
                    View All
                    <ChevronRight className="size-4 ml-1" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedProjects.slice(0, 4).map((p) => {
                    const pCatConfig = getCategoryConfig(p.category);
                    const PCatIcon = pCatConfig.icon;
                    return (
                      <Card
                        key={p.id}
                        className="overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group"
                        onClick={() => handleNavigateProject(p)}
                      >
                        <div className="flex gap-3 p-3">
                          <div className="w-24 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
                            {p.thumbnailUrl ? (
                              <img
                                src={p.thumbnailUrl}
                                alt={p.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${getGradient(p.id)} flex items-center justify-center`}>
                                <PCatIcon className="size-5 text-white/70" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {p.title}
                            </h4>
                            <div className="flex items-center gap-1 mt-1">
                              <StarRating rating={p.averageRating} size="sm" />
                              <span className="text-xs text-muted-foreground">({p.reviewCount})</span>
                            </div>
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                              ${p.price.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* ─── Sidebar (Desktop) ─── */}
          <div className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              <PurchaseSidebar
                project={project}
                isOwnProject={isOwnProject ?? false}
                hasPurchased={hasPurchased}
                isAuthenticated={isAuthenticated}
                onBuyNow={() => setPurchaseDialogOpen(true)}
                onEdit={handleEditProject}
                onNavigatePurchases={() => navigate("dashboard/purchases")}
                features={features}
                CategoryIcon={CategoryIcon}
              />
              <AuthorCard
                author={project.author}
                onNavigateProfile={handleNavigateProfile}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Confirmation Dialog */}
      <PurchaseDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        project={project}
        onConfirm={handlePurchase}
        isPurchasing={isPurchasing}
      />
    </div>
  );
}

// ─── Purchase Sidebar (shared between desktop sidebar and mobile inline) ───

function PurchaseSidebar({
  project,
  isOwnProject,
  hasPurchased,
  isAuthenticated,
  onBuyNow,
  onEdit,
  onNavigatePurchases,
  features,
  CategoryIcon,
}: {
  project: Project;
  isOwnProject: boolean;
  hasPurchased: boolean;
  isAuthenticated: boolean;
  onBuyNow: () => void;
  onEdit: () => void;
  onNavigatePurchases: () => void;
  features: string[];
  CategoryIcon: React.ElementType;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="space-y-4"
    >
      <Card className="overflow-hidden border-emerald-500/10">
        <CardContent className="p-5 space-y-4">
          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              ${project.price.toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground">USD</span>
          </div>

          {/* Action buttons */}
          {isOwnProject ? (
            <div className="space-y-2">
              <Badge className="w-full justify-center py-2 bg-primary/10 text-primary border-primary/20 text-sm gap-1.5">
                <Edit className="size-4" />
                Your Project
              </Badge>
              <Button
                variant="outline"
                className="w-full"
                onClick={onEdit}
              >
                <Edit className="size-4 mr-2" />
                Edit Project
              </Button>
            </div>
          ) : hasPurchased ? (
            <div className="space-y-2">
              <Badge className="w-full justify-center py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-sm gap-1.5">
                <CheckCircle2 className="size-4" />
                Already Owned
              </Badge>
              <Button
                variant="outline"
                className="w-full border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                onClick={onNavigatePurchases}
              >
                <Download className="size-4 mr-2" />
                View in Purchases
              </Button>
              {project.sourceUrl && (
                <Button
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <a href={project.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="size-4 mr-2" />
                    Download Source
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 text-base py-5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                onClick={onBuyNow}
              >
                <ShoppingBag className="size-5 mr-2" />
                Buy Now
              </Button>
              {!isAuthenticated && (
                <p className="text-xs text-center text-muted-foreground">
                  <button
                    onClick={() => {
                      const { navigate } = useNavigationStore.getState();
                      navigate("login");
                    }}
                    className="text-emerald-600 hover:underline"
                  >
                    Sign in
                  </button>{" "}
                  to purchase
                </p>
              )}
            </div>
          )}

          <Separator />

          {/* Demo link */}
          {project.demoUrl && (
            <Button
              variant="outline"
              className="w-full"
              asChild
            >
              <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4 mr-2" />
                Live Preview
              </a>
            </Button>
          )}

          {/* Features list */}
          {features.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-3">What&apos;s Included</h4>
                <div className="space-y-2">
                  {features.slice(0, 8).map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                  {features.length > 8 && (
                    <p className="text-xs text-muted-foreground pl-6">
                      +{features.length - 8} more features
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Quick info */}
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <CategoryIcon className="size-3.5" />
                Category
              </span>
              <span className="font-medium">{getCategoryConfig(project.category).label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3.5" />
                Last Updated
              </span>
              <span className="font-medium">{formatDate(project.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <ShoppingBag className="size-3.5" />
                Total Sales
              </span>
              <span className="font-medium">{project.totalSales}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons row */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => toast.info("Saved to wishlist!")}
        >
          <Heart className="size-4 mr-1.5" />
          Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied to clipboard!");
          }}
        >
          <Share2 className="size-4 mr-1.5" />
          Share
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => toast.info("Report submitted. We'll review it shortly.")}
        >
          <Flag className="size-4 mr-1.5" />
          Report
        </Button>
      </div>
    </motion.div>
  );
}
