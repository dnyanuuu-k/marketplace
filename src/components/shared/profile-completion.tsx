"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  FileText,
  MapPin,
  Sparkles,
  Link2,
  Image,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/store/auth";
import { useNavigationStore } from "@/store/navigation";
import { cn } from "@/lib/utils";

interface CompletionItem {
  key: string;
  label: string;
  icon: React.ElementType;
  weight: number;
  filled: boolean;
}

export interface ProfileCompletionProps {
  /** Optional class name */
  className?: string;
  /** Whether the sidebar is collapsed */
  collapsed?: boolean;
}

export function ProfileCompletion({ className, collapsed = false }: ProfileCompletionProps) {
  const { user } = useAuthStore();
  const { navigate } = useNavigationStore();

  const completionItems: CompletionItem[] = useMemo(() => {
    const profile = user?.profile;
    const skills = profile?.skills
      ? (typeof profile.skills === "string"
          ? (JSON.parse(profile.skills as string) as string[])
          : profile.skills)
      : [];
    const socialLinks = profile?.socialLinks
      ? (typeof profile.socialLinks === "string"
          ? (JSON.parse(profile.socialLinks as string) as Record<string, string>)
          : profile.socialLinks)
      : {};
    const portfolioImages = profile?.portfolioImages
      ? (typeof profile.portfolioImages === "string"
          ? (JSON.parse(profile.portfolioImages as string) as string[])
          : profile.portfolioImages)
      : [];

    return [
      {
        key: "avatar",
        label: "Profile photo",
        icon: Camera,
        weight: 20,
        filled: !!user?.avatarUrl,
      },
      {
        key: "bio",
        label: "Bio",
        icon: FileText,
        weight: 20,
        filled: !!profile?.bio,
      },
      {
        key: "skills",
        label: "Skills",
        icon: Sparkles,
        weight: 20,
        filled: skills.length > 0,
      },
      {
        key: "portfolio",
        label: "Portfolio images",
        icon: Image,
        weight: 20,
        filled: portfolioImages.length > 0,
      },
      {
        key: "social",
        label: "Social links",
        icon: Link2,
        weight: 10,
        filled: Object.values(socialLinks).some((v) => !!v && v.trim().length > 0),
      },
      {
        key: "location",
        label: "Location",
        icon: MapPin,
        weight: 10,
        filled: !!profile?.location,
      },
    ];
  }, [user]);

  const totalPercentage = useMemo(() => {
    return completionItems.reduce((sum, item) => sum + (item.filled ? item.weight : 0), 0);
  }, [completionItems]);

  const nextItem = completionItems.find((item) => !item.filled);

  // If fully complete, don't show the widget
  if (totalPercentage >= 100) return null;

  // Only show for authors
  if (user?.role !== "AUTHOR") return null;

  if (collapsed) {
    return (
      <div className={cn("px-2 py-2", className)}>
        <div className="flex flex-col items-center gap-1">
          <div className="relative size-8">
            <svg className="size-8 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-muted/30"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                strokeWidth="3"
                strokeDasharray={`${(totalPercentage / 100) * 94.2} 94.2`}
                strokeLinecap="round"
                className="text-emerald-500 transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-emerald-600 dark:text-emerald-400">
              {totalPercentage}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className={cn("px-3 py-3", className)}
      >
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Profile
              </span>
            </div>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {totalPercentage}%
            </span>
          </div>

          {/* Progress bar */}
          <Progress
            value={totalPercentage}
            className="h-1.5 bg-emerald-500/10 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-teal-500"
          />

          {/* Next suggestion */}
          {nextItem && (
            <button
              onClick={() => navigate("dashboard/settings")}
              className="flex items-center gap-2 w-full text-left group"
            >
              <div className="size-5 rounded-full bg-background flex items-center justify-center shrink-0 group-hover:bg-emerald-500/10 transition-colors">
                <nextItem.icon className="size-3 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              </div>
              <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors truncate">
                Add {nextItem.label.toLowerCase()}
              </span>
              <ArrowRight className="size-3 text-muted-foreground/50 ml-auto shrink-0 group-hover:text-emerald-500 transition-colors" />
            </button>
          )}

          {/* Checklist (only first 4 incomplete items) */}
          <div className="space-y-1">
            {completionItems.slice(0, 5).map((item) => (
              <div key={item.key} className="flex items-center gap-2">
                {item.filled ? (
                  <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                ) : (
                  <div className="size-3 rounded-full border border-muted-foreground/30 shrink-0" />
                )}
                <span
                  className={cn(
                    "text-[10px] truncate",
                    item.filled
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  )}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
