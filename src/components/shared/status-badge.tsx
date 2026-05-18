"use client"

import * as React from "react"
import {
  CheckCircle,
  Clock,
  Pause,
  XCircle,
  ShieldCheck,
  CircleCheck,
  AlertTriangle,
  RotateCcw,
  CircleAlert,
  Eye,
  CircleCheckBig,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface StatusBadgeProps {
  status: string
  variant?:
    | "active"
    | "pending"
    | "suspended"
    | "banned"
    | "verified"
    | "completed"
    | "disputed"
    | "refunded"
    | "open"
    | "under_review"
    | "resolved"
  size?: "sm" | "md"
}

const VARIANT_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  suspended: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
  banned: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  verified: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  disputed: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  refunded: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  open: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  under_review: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
}

const VARIANT_ICONS: Record<string, React.ElementType> = {
  active: CheckCircle,
  pending: Clock,
  suspended: Pause,
  banned: XCircle,
  verified: ShieldCheck,
  completed: CircleCheck,
  disputed: AlertTriangle,
  refunded: RotateCcw,
  open: CircleAlert,
  under_review: Eye,
  resolved: CircleCheckBig,
}

const SIZE_STYLES = {
  sm: "text-[10px] px-1.5 py-0.5 gap-0.5 [&>svg]:size-2.5",
  md: "text-xs px-2.5 py-0.5 gap-1 [&>svg]:size-3",
}

export function StatusBadge({
  status,
  variant,
  size = "md",
}: StatusBadgeProps) {
  const resolvedVariant = variant ?? status.toLowerCase()
  const Icon = VARIANT_ICONS[resolvedVariant]

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full whitespace-nowrap",
        VARIANT_STYLES[resolvedVariant] ?? "bg-muted text-muted-foreground",
        SIZE_STYLES[size]
      )}
    >
      {Icon && <Icon />}
      {status}
    </span>
  )
}
