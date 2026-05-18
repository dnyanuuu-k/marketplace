"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface CurrencyDisplayProps {
  value: number
  variant?: "positive" | "negative" | "neutral"
  size?: "sm" | "md" | "lg" | "xl"
  showSign?: boolean
  className?: string
}

const VARIANT_STYLES = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-red-600 dark:text-red-400",
  neutral: "text-foreground",
}

const SIZE_STYLES = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl font-semibold",
  xl: "text-2xl font-bold",
}

function formatCurrency(value: number): string {
  const absValue = Math.abs(value)
  if (absValue >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (absValue >= 100000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function CurrencyDisplay({
  value,
  variant = "neutral",
  size = "md",
  showSign = false,
  className,
}: CurrencyDisplayProps) {
  const displayValue = formatCurrency(value)
  const sign = showSign && value > 0 ? "+" : ""

  return (
    <span
      className={cn(
        "tabular-nums",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className
      )}
    >
      {sign}{displayValue}
    </span>
  )
}
