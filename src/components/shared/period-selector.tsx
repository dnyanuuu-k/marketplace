"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

export interface PeriodSelectorProps {
  value?: string
  onChange?: (period: string) => void
  onCustomRange?: (from: Date | undefined, to: Date | undefined) => void
  className?: string
}

const PRESETS = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
]

export function PeriodSelector({
  value = "30d",
  onChange,
  onCustomRange,
  className,
}: PeriodSelectorProps) {
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>()
  const [dateTo, setDateTo] = React.useState<Date | undefined>()
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false)

  const handlePreset = (preset: string) => {
    setDateFrom(undefined)
    setDateTo(undefined)
    onChange?.(preset)
  }

  const handleSelect = (date: Date | undefined) => {
    if (!dateFrom || (dateFrom && dateTo)) {
      setDateFrom(date)
      setDateTo(undefined)
    } else {
      if (date && date < dateFrom) {
        setDateTo(dateFrom)
        setDateFrom(date)
      } else {
        setDateTo(date)
      }
    }
  }

  const applyCustomRange = () => {
    if (dateFrom && dateTo) {
      onCustomRange?.(dateFrom, dateTo)
      onChange?.("custom")
      setIsCalendarOpen(false)
    }
  }

  const isCustomActive = value === "custom"

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {PRESETS.map((preset) => (
        <Button
          key={preset.value}
          variant={value === preset.value ? "default" : "outline"}
          size="sm"
          className="text-xs"
          onClick={() => handlePreset(preset.value)}
        >
          {preset.label}
        </Button>
      ))}

      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={isCustomActive ? "default" : "outline"}
            size="sm"
            className="text-xs gap-1"
          >
            <CalendarIcon className="size-3.5" />
            {isCustomActive && dateFrom && dateTo
              ? `${format(dateFrom, "MMM d")} - ${format(dateTo, "MMM d")}`
              : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <Calendar
            mode="range"
            selected={{ from: dateFrom, to: dateTo }}
            onSelect={(range) => {
              setDateFrom(range?.from)
              setDateTo(range?.to)
            }}
            numberOfMonths={2}
          />
          <div className="flex items-center justify-end gap-2 pt-2 border-t mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom(undefined)
                setDateTo(undefined)
                setIsCalendarOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={applyCustomRange}
              disabled={!dateFrom || !dateTo}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
