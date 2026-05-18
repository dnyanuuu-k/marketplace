"use client"

import * as React from "react"
import { AlertTriangle, Trash2, Info } from "lucide-react"
import { Loader2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  severity?: "default" | "warning" | "danger"
  onConfirm: () => void
  isLoading?: boolean
}

const SEVERITY_STYLES = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  warning: "bg-amber-600 text-white hover:bg-amber-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
}

const SEVERITY_ICONS = {
  default: Info,
  warning: AlertTriangle,
  danger: Trash2,
}

const SEVERITY_ICON_COLORS = {
  default: "text-primary",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  severity = "default",
  onConfirm,
  isLoading = false,
}: ConfirmModalProps) {
  const Icon = SEVERITY_ICONS[severity]

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn("mt-0.5 shrink-0", SEVERITY_ICON_COLORS[severity])}>
              <Icon className="size-5" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{description}</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <Button
            className={cn(SEVERITY_STYLES[severity])}
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
