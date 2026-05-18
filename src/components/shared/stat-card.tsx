"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

export interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  delta?: number
  deltaLabel?: string
  trend?: "up" | "down" | "neutral"
  className?: string
}

function formatValue(value: string | number): string {
  if (typeof value === "number") {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `$${value.toLocaleString("en-US")}`
    }
    if (Number.isInteger(value)) {
      return value.toLocaleString("en-US")
    }
    return `$${value.toFixed(2)}`
  }
  return value
}

export function StatCard({
  icon,
  label,
  value,
  delta,
  deltaLabel,
  trend,
  className,
}: StatCardProps) {
  const resolvedTrend = trend ?? (delta !== undefined ? (delta > 0 ? "up" : delta < 0 ? "down" : "neutral") : "neutral")

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 min-w-0 flex-1">
              <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
              <p className="text-2xl font-bold tracking-tight truncate">
                {formatValue(value)}
              </p>
              {(delta !== undefined || deltaLabel) && (
                <div className="flex items-center gap-1.5">
                  {resolvedTrend === "up" && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="size-3" />
                      +{Math.abs(delta ?? 0)}%
                    </span>
                  )}
                  {resolvedTrend === "down" && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                      <TrendingDown className="size-3" />
                      -{Math.abs(delta ?? 0)}%
                    </span>
                  )}
                  {resolvedTrend === "neutral" && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
                      <Minus className="size-3" />
                      0%
                    </span>
                  )}
                  {deltaLabel && (
                    <span className="text-xs text-muted-foreground">{deltaLabel}</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
