"use client"

import * as React from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface UserAvatarProps {
  src?: string | null
  name: string
  size?: "sm" | "md" | "lg" | "xl"
  isOnline?: boolean
  showBadge?: boolean
  className?: string
}

const SIZE_MAP = {
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
  xl: "size-20",
} as const

const INDICATOR_SIZE_MAP = {
  sm: "size-2.5",
  md: "size-3",
  lg: "size-3.5",
  xl: "size-4",
} as const

const FONT_SIZE_MAP = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
} as const

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function UserAvatar({
  src,
  name,
  size = "md",
  isOnline,
  showBadge = false,
  className,
}: UserAvatarProps) {
  return (
    <div className={cn("relative inline-flex flex-col items-center gap-1", className)}>
      <div className="relative">
        <Avatar className={cn(SIZE_MAP[size])}>
          {src && <AvatarImage src={src} alt={name} />}
          <AvatarFallback
            className={cn(
              "bg-primary/10 text-primary font-semibold",
              FONT_SIZE_MAP[size]
            )}
          >
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        {isOnline !== undefined && (
          <span
            className={cn(
              "absolute bottom-0 right-0 rounded-full border-2 border-background",
              INDICATOR_SIZE_MAP[size],
              isOnline ? "bg-emerald-500" : "bg-muted-foreground/40"
            )}
          />
        )}
      </div>
      {showBadge && (
        <span className="text-[10px] font-medium text-muted-foreground leading-none">
          {name}
        </span>
      )}
    </div>
  )
}
