"use client"

import * as React from "react"
import { Star, Flag, Trash2, Reply, X, Send } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/shared/user-avatar"

export interface ReviewCardProps {
  review: {
    id: string
    rating: number
    comment: string
    reviewer: { name: string; avatar?: string }
    createdAt: string
    reply?: string
    repliedAt?: string
    flagged?: boolean
  }
  onReply?: (reviewId: string, reply: string) => void
  onDelete?: (reviewId: string) => void
  onFlag?: (reviewId: string) => void
  showActions?: boolean
  isAuthor?: boolean
}

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const starSize = size === "sm" ? "size-3.5" : "size-4"
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            starSize,
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-none text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  )
}

export function ReviewCard({
  review,
  onReply,
  onDelete,
  onFlag,
  showActions = false,
  isAuthor = false,
}: ReviewCardProps) {
  const [showReplyInput, setShowReplyInput] = React.useState(false)
  const [replyText, setReplyText] = React.useState("")

  const handleSubmitReply = () => {
    const text = replyText.trim()
    if (!text) return
    onReply?.(review.id, text)
    setReplyText("")
    setShowReplyInput(false)
  }

  return (
    <Card className={cn("overflow-hidden", review.flagged && "border-red-200 dark:border-red-500/30")}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserAvatar
              src={review.reviewer.avatar}
              name={review.reviewer.name}
              size="sm"
            />
            <div>
              <p className="text-sm font-medium">{review.reviewer.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating rating={review.rating} />
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
          {review.flagged && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/20 px-2 py-0.5 rounded-full">
              <Flag className="size-3" />
              Flagged
            </span>
          )}
        </div>

        {/* Comment */}
        <p className="text-sm text-foreground/90 leading-relaxed">
          {review.comment}
        </p>

        {/* Reply */}
        {review.reply && (
          <div className="ml-4 pl-4 border-l-2 border-primary/20 bg-muted/30 rounded-r-lg p-3">
            <p className="text-xs font-medium text-primary mb-1">Your Reply</p>
            <p className="text-sm text-foreground/80">{review.reply}</p>
            {review.repliedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(review.repliedAt), { addSuffix: true })}
              </p>
            )}
          </div>
        )}

        {/* Reply input */}
        <AnimatePresence>
          {showReplyInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply..."
                  rows={3}
                  className="text-sm"
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowReplyInput(false)
                      setReplyText("")
                    }}
                  >
                    <X className="size-3.5 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim()}
                  >
                    <Send className="size-3.5 mr-1" />
                    Reply
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {showActions && !showReplyInput && (
          <div className="flex items-center gap-1 pt-1 border-t">
            {isAuthor && !review.reply && onReply && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setShowReplyInput(true)}
              >
                <Reply className="size-3.5 mr-1" />
                Reply
              </Button>
            )}
            {onFlag && !review.flagged && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-amber-600 hover:text-amber-700"
                onClick={() => onFlag(review.id)}
              >
                <Flag className="size-3.5 mr-1" />
                Flag
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive"
                onClick={() => onDelete(review.id)}
              >
                <Trash2 className="size-3.5 mr-1" />
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { StarRating }
