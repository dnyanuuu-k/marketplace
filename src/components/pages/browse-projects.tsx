"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Star,
  Paintbrush,
  Code2,
  PenTool,
  Megaphone,
  Video,
  Music,
  BarChart3,
  SlidersHorizontal,
  X,
  Eye,
  ShoppingBag,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Crown,
  BadgeCheck,
  TrendingUp,
  Clock,
  DollarSign,
  Sparkles,
  Loader2,
  LayoutGrid,
  List,
  Filter,
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
import { useNavigationStore } from "@/store/navigation";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { apiGet } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ─── Types ───

interface Project {
  id: string;
  authorId: string;
  title: string;
  description: string;
  shortDescription: string | null;
  category: "DESIGN" | "DEVELOPMENT" | "WRITING" | "MARKETING" | "VIDEO" | "MUSIC" | "ANALYTICS" | "OTHER";
  status: "DRAFT" | "PUBLISHED" | "PAUSED" | "ARCHIVED";
  price: number;
  thumbnailUrl: string | null;
  images: string;
  tags: string;
  features: string;
  demoUrl: string | null;
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
    profile: { isVerified: boolean } | null;
  };
}

interface CategoryCount {
  category: string;
  count: number;
}

interface PopularTag {
  tag: string;
  count: number;
}

interface ProjectsResponse {
  data: Project[];
  total: number;
  page: number;
  limit: number;
  categories: CategoryCount[];
  popularTags: PopularTag[];
}

// ─── Constants ───

const CATEGORY_CONFIG = [
  { value: "DESIGN", label: "Design", icon: Paintbrush, color: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300", badgeColor: "bg-pink-500" },
  { value: "DEVELOPMENT", label: "Development", icon: Code2, color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300", badgeColor: "bg-cyan-500" },
  { value: "WRITING", label: "Writing", icon: PenTool, color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300", badgeColor: "bg-amber-500" },
  { value: "MARKETING", label: "Marketing", icon: Megaphone, color: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300", badgeColor: "bg-violet-500" },
  { value: "VIDEO", label: "Video", icon: Video, color: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300", badgeColor: "bg-rose-500" },
  { value: "MUSIC", label: "Music", icon: Music, color: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300", badgeColor: "bg-teal-500" },
  { value: "ANALYTICS", label: "Analytics", icon: BarChart3, color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300", badgeColor: "bg-orange-500" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest", icon: Clock },
  { value: "popular", label: "Most Popular", icon: TrendingUp },
  { value: "price_low", label: "Price: Low → High", icon: DollarSign },
  { value: "price_high", label: "Price: High → Low", icon: DollarSign },
] as const;

const THUMBNAIL_GRADIENTS = [
  "from-emerald-500/40 via-teal-500/30 to-cyan-500/40",
  "from-violet-500/40 via-purple-500/30 to-rose-500/40",
  "from-amber-500/40 via-orange-500/30 to-rose-500/40",
  "from-teal-500/40 via-emerald-500/30 to-amber-500/40",
  "from-rose-500/40 via-pink-500/30 to-violet-500/40",
  "from-cyan-500/40 via-sky-500/30 to-emerald-500/40",
  "from-pink-500/40 via-rose-500/30 to-orange-500/40",
  "from-indigo-500/40 via-violet-500/30 to-purple-500/40",
];

function getGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return THUMBNAIL_GRADIENTS[Math.abs(hash) % THUMBNAIL_GRADIENTS.length];
}

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG.find((c) => c.value === category) || {
    value: category,
    label: category,
    icon: Sparkles,
    color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
    badgeColor: "bg-gray-500",
  };
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Star Rating ───

function StarRating({ rating, maxStars = 5, size = "sm" }: { rating: number; maxStars?: number; size?: "sm" | "md" }) {
  const starClass = size === "sm" ? "size-3" : "size-4";
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
    </div>
  );
}

// ─── Skeletons ───

function ProjectCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          {Math.random() > 0.5 && <Skeleton className="h-5 w-16 rounded-full" />}
        </div>
        <Skeleton className="h-5 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-14 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

function FeaturedProjectSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <Skeleton className="md:w-1/2 aspect-video md:aspect-auto md:h-64" />
        <div className="md:w-1/2 p-6 space-y-4">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-4 pt-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Project Card (Grid) ───

function ProjectGridCard({
  project,
  onNavigate,
}: {
  project: Project;
  onNavigate: () => void;
}) {
  const categoryConfig = getCategoryConfig(project.category);
  const tags = parseJsonArray(project.tags);
  const CategoryIcon = categoryConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <Card
        className="overflow-hidden hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1 cursor-pointer relative h-full flex flex-col"
        onClick={onNavigate}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden">
          {project.thumbnailUrl ? (
            <img
              src={project.thumbnailUrl}
              alt={project.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getGradient(project.id)} flex items-center justify-center`}>
              <CategoryIcon className="size-12 text-white/70" />
            </div>
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1 }}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              <Button
                size="sm"
                className="bg-white text-gray-900 hover:bg-gray-100 shadow-lg"
                onClick={(e) => { e.stopPropagation(); onNavigate(); }}
              >
                <Eye className="size-4 mr-1" />
                View Details
              </Button>
            </motion.div>
          </div>

          {/* Category badge */}
          <div className="absolute top-2 left-2">
            <Badge className={`${categoryConfig.badgeColor} text-white border-0 gap-1 text-[10px] px-2 py-0.5 shadow-md`}>
              <CategoryIcon className="size-3" />
              {categoryConfig.label}
            </Badge>
          </div>

          {/* Featured badge */}
          {project.featured && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1 text-[10px] px-2 py-0.5 shadow-md">
                <Crown className="size-3" />
                Featured
              </Badge>
            </div>
          )}

          {/* Demo link indicator */}
          {project.demoUrl && (
            <div className="absolute bottom-2 right-2">
              <Badge className="bg-black/60 text-white border-0 text-[10px] px-2 py-0.5 backdrop-blur-sm">
                Live Preview
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4 flex-1 flex flex-col">
          {/* Title */}
          <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {project.title}
          </h3>

          {/* Short description */}
          {(project.shortDescription || project.description) && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {project.shortDescription || project.description}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 rounded-full"
                >
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Author */}
          <div className="flex items-center gap-2 mt-3">
            <Avatar className="size-5 ring-1 ring-border">
              {project.author.avatarUrl && (
                <AvatarImage src={project.author.avatarUrl} alt={project.author.name} />
              )}
              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                {project.author.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">{project.author.name}</span>
            {project.author.profile?.isVerified && (
              <BadgeCheck className="size-3.5 text-emerald-500 shrink-0" />
            )}
          </div>

          {/* Rating + Sales + Price */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-border mt-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <StarRating rating={project.averageRating} />
                <span className="text-xs text-muted-foreground">
                  {project.averageRating > 0 ? project.averageRating.toFixed(1) : "—"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                <ShoppingBag className="size-3 inline mr-0.5" />
                {project.totalSales}
              </span>
            </div>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              ${project.price.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Project Card (List) ───

function ProjectListCard({
  project,
  onNavigate,
}: {
  project: Project;
  onNavigate: () => void;
}) {
  const categoryConfig = getCategoryConfig(project.category);
  const tags = parseJsonArray(project.tags);
  const CategoryIcon = categoryConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="hover:shadow-md transition-all duration-200 group cursor-pointer"
        onClick={onNavigate}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Thumbnail */}
            <div className="w-32 h-20 md:w-48 md:h-28 rounded-lg overflow-hidden shrink-0 relative">
              {project.thumbnailUrl ? (
                <img
                  src={project.thumbnailUrl}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${getGradient(project.id)} flex items-center justify-center`}>
                  <CategoryIcon className="size-8 text-white/70" />
                </div>
              )}
              {project.featured && (
                <Badge className="absolute top-1 left-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[9px] px-1.5 py-0 gap-0.5">
                  <Crown className="size-2.5" />
                  Featured
                </Badge>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`${categoryConfig.badgeColor} text-white border-0 gap-1 text-[10px] px-2 py-0`}>
                  <CategoryIcon className="size-2.5" />
                  {categoryConfig.label}
                </Badge>
                {project.demoUrl && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Live Preview</Badge>
                )}
              </div>

              <h3 className="font-semibold text-sm truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {project.title}
              </h3>

              {project.shortDescription && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {project.shortDescription}
                </p>
              )}

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full">{tag}</Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Avatar className="size-4 ring-1 ring-border">
                      {project.author.avatarUrl && (
                        <AvatarImage src={project.author.avatarUrl} alt={project.author.name} />
                      )}
                      <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                        {project.author.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{project.author.name}</span>
                    {project.author.profile?.isVerified && (
                      <BadgeCheck className="size-3 text-emerald-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <StarRating rating={project.averageRating} />
                    <span className="text-xs text-muted-foreground">
                      {project.averageRating > 0 ? project.averageRating.toFixed(1) : "—"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    <ShoppingBag className="size-3 inline mr-0.5" />
                    {project.totalSales}
                  </span>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  ${project.price.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Featured Project Spotlight ───

function FeaturedProjectCard({
  project,
  onNavigate,
}: {
  project: Project;
  onNavigate: () => void;
}) {
  const categoryConfig = getCategoryConfig(project.category);
  const CategoryIcon = categoryConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        className="overflow-hidden border-2 border-amber-500/30 dark:border-amber-500/20 shadow-lg shadow-amber-500/5 cursor-pointer group"
        onClick={onNavigate}
      >
        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="md:w-1/2 relative aspect-video md:aspect-auto md:h-72 overflow-hidden">
            {project.thumbnailUrl ? (
              <img
                src={project.thumbnailUrl}
                alt={project.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${getGradient(project.id)} flex items-center justify-center`}>
                <CategoryIcon className="size-20 text-white/50" />
              </div>
            )}
            <div className="absolute top-3 left-3">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1 shadow-md">
                <Crown className="size-3" />
                Featured Project
              </Badge>
            </div>
          </div>

          {/* Info */}
          <div className="md:w-1/2 p-5 md:p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${categoryConfig.badgeColor} text-white border-0 gap-1 text-[11px]`}>
                <CategoryIcon className="size-3" />
                {categoryConfig.label}
              </Badge>
              {project.demoUrl && (
                <Badge variant="outline" className="text-[11px]">Live Preview</Badge>
              )}
            </div>

            <h2 className="text-lg md:text-xl font-bold line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {project.title}
            </h2>

            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {project.shortDescription || project.description}
            </p>

            {/* Author */}
            <div className="flex items-center gap-2 mt-3">
              <Avatar className="size-7 ring-1 ring-border">
                {project.author.avatarUrl && (
                  <AvatarImage src={project.author.avatarUrl} alt={project.author.name} />
                )}
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {project.author.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{project.author.name}</span>
              {project.author.profile?.isVerified && (
                <BadgeCheck className="size-4 text-emerald-500" />
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-auto pt-4">
              <div className="flex items-center gap-1">
                <StarRating rating={project.averageRating} size="md" />
                <span className="text-sm font-medium ml-1">
                  {project.averageRating > 0 ? project.averageRating.toFixed(1) : "—"}
                </span>
                <span className="text-xs text-muted-foreground">({project.reviewCount})</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <ShoppingBag className="size-3.5" />
                <span>{project.totalSales} sales</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Eye className="size-3.5" />
                <span>{project.totalViews}</span>
              </div>
            </div>

            {/* Price + CTA */}
            <div className="flex items-center gap-3 mt-3">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ${project.price.toFixed(2)}
              </span>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                onClick={(e) => { e.stopPropagation(); onNavigate(); }}
              >
                View Details
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Pagination ───

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
        Showing{" "}
        <span className="font-medium text-foreground">
          {Math.min((page - 1) * limit + 1, total)}
        </span>
        {" – "}
        <span className="font-medium text-foreground">{Math.min(page * limit, total)}</span>
        {" of "}
        <span className="font-medium text-foreground">{total}</span> projects
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
            <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
              …
            </span>
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

// ─── Sidebar Filters ───

function SidebarFilters({
  categories,
  popularTags,
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceRangeChange,
  selectedTags,
  onTagToggle,
  sort,
  onSortChange,
  hasActiveFilters,
  onClearFilters,
}: {
  categories: CategoryCount[];
  popularTags: PopularTag[];
  selectedCategory: string;
  onCategoryChange: (v: string) => void;
  priceRange: number[];
  onPriceRangeChange: (v: number[]) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Sort */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Sort By</h3>
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  <opt.icon className="size-3.5" />
                  {opt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Category */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Category</h3>
        <div className="space-y-0.5">
          <label
            className={cn(
              "flex items-center gap-2.5 h-8 px-2 rounded-md transition-colors cursor-pointer",
              selectedCategory === "all" ? "bg-emerald-50 dark:bg-emerald-500/10" : "hover:bg-accent/50"
            )}
          >
            <input
              type="radio"
              name="category"
              checked={selectedCategory === "all"}
              onChange={() => onCategoryChange("all")}
              className="sr-only"
            />
            <Sparkles className={cn("size-4 shrink-0", selectedCategory === "all" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
            <span className={cn("text-sm flex-1 leading-none", selectedCategory === "all" && "font-medium text-emerald-600 dark:text-emerald-400")}>
              All Categories
            </span>
          </label>
          {CATEGORY_CONFIG.map((cat) => {
            const count = categories.find((c) => c.category === cat.value)?.count || 0;
            return (
              <label
                key={cat.value}
                className={cn(
                  "flex items-center gap-2.5 h-8 px-2 rounded-md transition-colors cursor-pointer",
                  selectedCategory === cat.value ? "bg-emerald-50 dark:bg-emerald-500/10" : "hover:bg-accent/50"
                )}
              >
                <input
                  type="radio"
                  name="category"
                  checked={selectedCategory === cat.value}
                  onChange={() => onCategoryChange(cat.value)}
                  className="sr-only"
                />
                <cat.icon className={cn("size-4 shrink-0", selectedCategory === cat.value ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
                <span className={cn("text-sm flex-1 leading-none", selectedCategory === cat.value && "font-medium text-emerald-600 dark:text-emerald-400")}>
                  {cat.label}
                </span>
                {count > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0 leading-none">
                    {count}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Price Range</h3>
        <div className="px-1">
          <Slider
            value={priceRange}
            onValueChange={onPriceRangeChange}
            min={0}
            max={500}
            step={10}
            className="w-full"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">${priceRange[0]}</span>
            <span className="text-xs font-medium">
              ${priceRange[0]} – ${priceRange[1] >= 500 ? "500+" : priceRange[1]}
            </span>
            <span className="text-xs text-muted-foreground">${priceRange[1] >= 500 ? "500+" : priceRange[1]}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Tags */}
      {popularTags.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Popular Tags</h3>
          <div className="max-h-64 overflow-y-auto pr-1 custom-scroll">
            <div className="space-y-0.5">
              {popularTags.map(({ tag, count }) => (
                <label
                  key={tag}
                  htmlFor={`tag-${tag}`}
                  className="flex items-center gap-2.5 h-8 px-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={() => onTagToggle(tag)}
                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 shrink-0"
                  />
                  <span className="text-sm flex-1 text-left min-w-0 truncate leading-none">
                    {tag}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0 leading-none">
                    {count}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

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

// ─── Mobile Filters Sheet ───

function MobileFiltersSheet({
  open,
  onOpenChange,
  categories,
  popularTags,
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceRangeChange,
  selectedTags,
  onTagToggle,
  sort,
  onSortChange,
  hasActiveFilters,
  onClearFilters,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: CategoryCount[];
  popularTags: PopularTag[];
  selectedCategory: string;
  onCategoryChange: (v: string) => void;
  priceRange: number[];
  onPriceRangeChange: (v: number[]) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-5 text-emerald-500" />
            Filters
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <SidebarFilters
            categories={categories}
            popularTags={popularTags}
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
            priceRange={priceRange}
            onPriceRangeChange={onPriceRangeChange}
            selectedTags={selectedTags}
            onTagToggle={onTagToggle}
            sort={sort}
            onSortChange={onSortChange}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={onClearFilters}
          />
        </div>
        <SheetFooter className="mt-6">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={() => onOpenChange(false)}
          >
            Show Results
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page Component ───

export function BrowseProjectsPage() {
  const { navigate } = useNavigationStore();
  const { isAuthenticated, user } = useAuthStore();

  // Filter state
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const limit = 12;

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (priceRange[0] > 0) params.set("minPrice", String(priceRange[0]));
    if (priceRange[1] < 500) params.set("maxPrice", String(priceRange[1]));
    if (sort !== "newest") params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(limit));
    return params.toString();
  }, [search, selectedCategory, priceRange, sort, page]);

  // Fetch featured projects
  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ["projects-featured"],
    queryFn: () => apiGet<{ success: boolean; data: ProjectsResponse }>(`/api/projects?featured=true&limit=3&sort=popular`),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch projects
  const { data, isLoading, error, isError } = useQuery({
    queryKey: ["projects", queryParams],
    queryFn: () => apiGet<{ success: boolean; data: ProjectsResponse }>(`/api/projects?${queryParams}`),
    staleTime: 30 * 1000,
  });

  const projects = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const categories = data?.data?.categories || [];
  const popularTags = data?.data?.popularTags || [];
  const featuredProjects = featuredData?.data?.data || [];

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      search !== "" ||
      selectedCategory !== "all" ||
      priceRange[0] > 0 ||
      priceRange[1] < 500 ||
      selectedTags.length > 0 ||
      sort !== "newest"
    );
  }, [search, selectedCategory, priceRange, selectedTags, sort]);

  // Handlers
  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleCategoryChange = useCallback((v: string) => {
    setSelectedCategory(v);
    setPage(1);
  }, []);

  const handlePriceRangeChange = useCallback((v: number[]) => {
    setPriceRange(v);
    setPage(1);
  }, []);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setPage(1);
  }, []);

  const handleSortChange = useCallback((v: string) => {
    setSort(v);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setSearchInput("");
    setSelectedCategory("all");
    setPriceRange([0, 500]);
    setSelectedTags([]);
    setSort("newest");
    setPage(1);
    toast.success("Filters cleared");
  }, []);

  const handleNavigate = useCallback(
    (project: Project) => {
      navigate("project-detail", { projectId: project.id });
    },
    [navigate]
  );

  // Search on Enter key
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch]
  );

  // Filter projects by selected tags (client-side since API doesn't support tag filter)
  const filteredProjects = useMemo(() => {
    if (selectedTags.length === 0) return projects;
    return projects.filter((p) => {
      const tags = parseJsonArray(p.tags);
      return selectedTags.some((t) => tags.includes(t));
    });
  }, [projects, selectedTags]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-background to-teal-50 dark:from-emerald-950/30 dark:via-background dark:to-teal-950/30 border-b border-border">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-teal-500/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-emerald-500/[0.02] blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-16">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-0 gap-1">
                <Sparkles className="size-3" />
                Browse Projects
              </Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                Discover{" "}
                <span className="text-emerald-600 dark:text-emerald-400">
                  Digital Products
                </span>
              </h1>
              <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Premium templates, tools, and digital assets from verified creators.
                Find the perfect solution for your next project.
              </p>
            </motion.div>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-6 relative max-w-xl mx-auto"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <Input
                  placeholder="Search projects, templates, tools..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-12 pr-24 h-12 text-base rounded-xl border-2 border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-500 bg-background/80 backdrop-blur-sm"
                />
                <Button
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 bg-emerald-600 hover:bg-emerald-700 rounded-lg px-4"
                  onClick={handleSearch}
                >
                  Search
                </Button>
              </div>
            </motion.div>

            {/* Category pills */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
            >
              {CATEGORY_CONFIG.map((cat) => {
                const count = categories.find((c) => c.category === cat.value)?.count || 0;
                const isActive = selectedCategory === cat.value;
                return (
                  <Button
                    key={cat.value}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "rounded-full gap-1.5 text-xs h-8 px-3",
                      isActive
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "hover:border-emerald-300 hover:text-emerald-600 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
                    )}
                    onClick={() => handleCategoryChange(isActive ? "all" : cat.value)}
                  >
                    <cat.icon className="size-3.5" />
                    {cat.label}
                    {count > 0 && (
                      <span className={cn(
                        "text-[10px] tabular-nums",
                        isActive ? "text-white/70" : "text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    )}
                  </Button>
                );
              })}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Projects Section */}
      {!search && selectedCategory === "all" && featuredProjects.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Crown className="size-5 text-amber-500" />
              <h2 className="text-xl md:text-2xl font-bold">Featured Projects</h2>
            </div>
          </div>

          {featuredLoading ? (
            <div className="grid grid-cols-1 gap-6">
              <FeaturedProjectSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <AnimatePresence mode="wait">
                {featuredProjects.slice(0, 3).map((project) => (
                  <FeaturedProjectCard
                    key={project.id}
                    project={project}
                    onNavigate={() => handleNavigate(project)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      )}

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-12">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {search ? `Results for "${search}"` : "All Projects"}
            </h2>
            <Badge variant="secondary" className="text-xs tabular-nums">
              {total}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop sort + view toggle */}
            <div className="hidden md:flex items-center gap-2">
              <Select value={sort} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[180px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center border border-border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "size-8 rounded-r-none",
                    viewMode === "grid" && "bg-emerald-600 hover:bg-emerald-700"
                  )}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="size-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "size-8 rounded-l-none",
                    viewMode === "list" && "bg-emerald-600 hover:bg-emerald-700"
                  )}
                  onClick={() => setViewMode("list")}
                >
                  <List className="size-4" />
                </Button>
              </div>
            </div>

            {/* Mobile filter button */}
            <Button
              variant="outline"
              size="sm"
              className="md:hidden gap-1.5"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <Filter className="size-4" />
              Filters
              {hasActiveFilters && (
                <span className="size-1.5 rounded-full bg-emerald-500" />
              )}
            </Button>
          </div>
        </div>

        {/* Active filter indicators */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {search && (
              <Badge variant="secondary" className="gap-1">
                Search: {search}
                <button onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {selectedCategory !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {getCategoryConfig(selectedCategory).label}
                <button onClick={() => handleCategoryChange("all")}>
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {(priceRange[0] > 0 || priceRange[1] < 500) && (
              <Badge variant="secondary" className="gap-1">
                ${priceRange[0]} – ${priceRange[1] >= 500 ? "500+" : priceRange[1]}
                <button onClick={() => handlePriceRangeChange([0, 500])}>
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {selectedTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button onClick={() => handleTagToggle(tag)}>
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={handleClearFilters}>
              Clear all
            </Button>
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-20">
              <SidebarFilters
                categories={categories}
                popularTags={popularTags}
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
                priceRange={priceRange}
                onPriceRangeChange={handlePriceRangeChange}
                selectedTags={selectedTags}
                onTagToggle={handleTagToggle}
                sort={sort}
                onSortChange={handleSortChange}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={handleClearFilters}
              />
            </div>
          </aside>

          {/* Projects Grid / List */}
          <div className="flex-1 min-w-0">
            {isError && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <X className="size-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold">Failed to load projects</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {error instanceof Error ? error.message : "Something went wrong. Please try again."}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
              </div>
            )}

            {isLoading && !isError && (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                    : "space-y-4"
                }
              >
                {Array.from({ length: 6 }).map((_, i) =>
                  viewMode === "grid" ? (
                    <ProjectCardSkeleton key={i} />
                  ) : (
                    <Card key={i} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <Skeleton className="w-32 h-20 md:w-48 md:h-28 rounded-lg shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-20 rounded-full" />
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            )}

            {!isLoading && !isError && filteredProjects.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="size-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No projects found</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {hasActiveFilters
                    ? "Try adjusting your filters or search terms to find what you're looking for."
                    : "No projects have been published yet. Check back soon!"}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={handleClearFilters}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}

            {!isLoading && !isError && filteredProjects.length > 0 && (
              <>
                <AnimatePresence mode="wait">
                  {viewMode === "grid" ? (
                    <motion.div
                      key="grid"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                    >
                      {filteredProjects.map((project) => (
                        <ProjectGridCard
                          key={project.id}
                          project={project}
                          onNavigate={() => handleNavigate(project)}
                        />
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      {filteredProjects.map((project) => (
                        <ProjectListCard
                          key={project.id}
                          project={project}
                          onNavigate={() => handleNavigate(project)}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Pagination
                  page={page}
                  total={total}
                  limit={limit}
                  onPageChange={setPage}
                />
              </>
            )}
          </div>
        </div>
      </section>

      {/* Mobile Filters Sheet */}
      <MobileFiltersSheet
        open={mobileFiltersOpen}
        onOpenChange={setMobileFiltersOpen}
        categories={categories}
        popularTags={popularTags}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        priceRange={priceRange}
        onPriceRangeChange={handlePriceRangeChange}
        selectedTags={selectedTags}
        onTagToggle={handleTagToggle}
        sort={sort}
        onSortChange={handleSortChange}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
}
