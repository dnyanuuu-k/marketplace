"use client"

import * as React from "react"
import { Bell, Check, MessageSquare, DollarSign, AlertTriangle, User, Settings, ExternalLink } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  link?: string
  createdAt: string
}

export interface NotificationDropdownProps {
  notifications: Notification[]
  unreadCount: number
  onMarkAllRead: () => void
  onNotificationClick: (id: string) => void
  onViewAll: () => void
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  message: MessageSquare,
  sale: DollarSign,
  dispute: AlertTriangle,
  user: User,
  settings: Settings,
  default: Bell,
}

const TYPE_COLORS: Record<string, string> = {
  message: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
  sale: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  dispute: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
  user: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  settings: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  default: "bg-muted text-muted-foreground",
}

function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)

  const groups: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  }

  for (const n of notifications) {
    const d = new Date(n.createdAt)
    if (d >= today) {
      groups["Today"].push(n)
    } else if (d >= yesterday) {
      groups["Yesterday"].push(n)
    } else {
      groups["Earlier"].push(n)
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkAllRead,
  onNotificationClick,
  onViewAll,
}: NotificationDropdownProps) {
  const grouped = groupByDate(notifications)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1 px-2 text-primary"
              onClick={onMarkAllRead}
            >
              <Check className="size-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Bell className="size-8 mb-2 opacity-40" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            {grouped.map((group) => (
              <div key={group.label}>
                <div className="px-4 py-1.5 bg-muted/50">
                  <span className="text-xs font-medium text-muted-foreground">
                    {group.label}
                  </span>
                </div>
                {group.items.map((notification) => {
                  const Icon = TYPE_ICONS[notification.type] ?? TYPE_ICONS.default
                  const colorClass = TYPE_COLORS[notification.type] ?? TYPE_COLORS.default

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => onNotificationClick(notification.id)}
                      className={cn(
                        "flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                        !notification.isRead && "bg-primary/5"
                      )}
                    >
                      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", colorClass)}>
                        <Icon className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn("text-sm truncate", !notification.isRead && "font-semibold")}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="size-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </ScrollArea>
        )}

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-primary"
                onClick={onViewAll}
              >
                <ExternalLink className="size-3 mr-1" />
                View all notifications
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
