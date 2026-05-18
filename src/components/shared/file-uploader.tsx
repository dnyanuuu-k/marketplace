"use client"

import * as React from "react"
import { Upload, X, FileIcon, Image as ImageIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export interface FileUploaderProps {
  onUpload: (files: File[]) => void
  accept?: string
  maxSize?: number
  multiple?: boolean
  isUploading?: boolean
  progress?: number
  preview?: string[]
  onRemovePreview?: (index: number) => void
}

export function FileUploader({
  onUpload,
  accept,
  maxSize = 10,
  multiple = false,
  isUploading = false,
  progress,
  preview = [],
  onRemovePreview,
}: FileUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const validateFiles = (files: FileList | File[]): File[] => {
    const valid: File[] = []
    const fileArray = Array.from(files)

    for (const file of fileArray) {
      if (maxSize && file.size > maxSize * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the ${maxSize}MB size limit.`)
        return []
      }
      if (accept) {
        const acceptTypes = accept.split(",").map((t) => t.trim())
        const fileExt = "." + file.name.split(".").pop()?.toLowerCase()
        const fileType = file.type
        const matches = acceptTypes.some((type) => {
          if (type.startsWith(".")) return fileExt === type.toLowerCase()
          if (type.endsWith("/*")) return fileType.startsWith(type.replace("/*", "/"))
          return fileType === type
        })
        if (!matches) {
          setError(`File "${file.name}" is not an accepted file type.`)
          return []
        }
      }
      valid.push(file)
    }
    setError(null)
    return valid
  }

  const handleFiles = (files: FileList | File[]) => {
    const valid = validateFiles(files)
    if (valid.length > 0) {
      onUpload(valid)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="size-5" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            Click to browse or drag files here
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {accept ? `Accepted: ${accept}` : "All file types accepted"}
            {maxSize && ` • Max ${maxSize}MB`}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
        />
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Upload progress */}
      {isUploading && progress !== undefined && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Uploading...</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Preview thumbnails */}
      {preview.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {preview.map((src, idx) => {
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(src)
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group aspect-square rounded-lg border overflow-hidden bg-muted"
              >
                {isImage ? (
                  <img
                    src={src}
                    alt={`Preview ${idx + 1}`}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center size-full text-muted-foreground">
                    <FileIcon className="size-6" />
                    <span className="text-[10px] mt-1">File</span>
                  </div>
                )}
                {onRemovePreview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemovePreview(idx)
                    }}
                    className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
