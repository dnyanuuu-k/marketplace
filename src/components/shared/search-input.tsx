"use client"

import * as React from "react"
import { Search, X, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface SearchInputProps {
  value?: string
  onValueChange?: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  debounceMs?: number
  isLoading?: boolean
  className?: string
  shortcutKey?: boolean
}

export function SearchInput({
  value: controlledValue,
  onValueChange,
  onSearch,
  placeholder = "Search...",
  debounceMs = 300,
  isLoading = false,
  className,
  shortcutKey = true,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = React.useState("")
  const [isFocused, setIsFocused] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>()

  const value = controlledValue ?? internalValue

  const handleChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      onSearch?.(newValue)
    }, debounceMs)
  }

  const handleClear = () => {
    handleChange("")
    inputRef.current?.focus()
  }

  // Cmd+K / Ctrl+K shortcut
  React.useEffect(() => {
    if (!shortcutKey) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [shortcutKey])

  // Cleanup debounce on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="pl-9 pr-10"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {value && !isLoading && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={handleClear}
          >
            <X className="size-3.5" />
          </Button>
        )}
        {!value && !isLoading && !isFocused && shortcutKey && (
          <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
      </div>
    </div>
  )
}
