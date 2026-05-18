"use client"

import * as React from "react"
import {
  Send,
  Paperclip,
  Check,
  CheckCheck,
  FileIcon,
  Image as ImageIcon,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { UserAvatar } from "@/components/shared/user-avatar"

export interface ChatMessage {
  id: string
  senderId: string
  content: string
  fileUrl?: string
  readAt?: string | null
  createdAt: string
}

export interface ChatWindowProps {
  messages: ChatMessage[]
  currentUserId: string
  onSendMessage: (content: string, file?: File) => void
  otherUser: { name: string; avatar?: string; isOnline?: boolean }
  isLoading?: boolean
  isTyping?: boolean
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 px-4">
      <Avatar className="size-8">
        <AvatarFallback className="bg-muted text-xs">
          ?
        </AvatarFallback>
      </Avatar>
      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5">
        <div className="flex gap-1">
          <motion.span
            className="size-2 rounded-full bg-muted-foreground/40"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="size-2 rounded-full bg-muted-foreground/40"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
          />
          <motion.span
            className="size-2 rounded-full bg-muted-foreground/40"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          />
        </div>
      </div>
    </div>
  )
}

export function ChatWindow({
  messages,
  currentUserId,
  onSendMessage,
  otherUser,
  isLoading = false,
  isTyping = false,
}: ChatWindowProps) {
  const [messageText, setMessageText] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const handleSend = () => {
    const text = messageText.trim()
    if (!text) return
    onSendMessage(text)
    setMessageText("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onSendMessage("", file)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 bg-background">
        <UserAvatar
          src={otherUser.avatar}
          name={otherUser.name}
          size="sm"
          isOnline={otherUser.isOnline}
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{otherUser.name}</p>
          <p className="text-xs text-muted-foreground">
            {otherUser.isOnline ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-0">
        <div ref={scrollRef} className="flex flex-col gap-3 p-4 overflow-y-auto custom-scroll max-h-[400px]">
          {messages.length === 0 && !isTyping ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isOwn = msg.senderId === currentUserId
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}
                  >
                    {!isOwn && (
                      <Avatar className="size-7 shrink-0 mt-auto">
                        <AvatarFallback className="bg-muted text-[10px]">
                          {getInitials(otherUser.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn("max-w-[75%] space-y-1")}>
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2 text-sm",
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        )}
                      >
                        {/* File attachment */}
                        {msg.fileUrl && (
                          <div className="mb-1.5">
                            {isImageUrl(msg.fileUrl) ? (
                              <img
                                src={msg.fileUrl}
                                alt="Attachment"
                                className="rounded-lg max-w-full max-h-48 object-cover"
                              />
                            ) : (
                              <a
                                href={msg.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs underline opacity-80"
                              >
                                <FileIcon className="size-3.5" />
                                Attachment
                              </a>
                            )}
                          </div>
                        )}
                        {msg.content && <p className="break-words">{msg.content}</p>}
                      </div>
                      <div className={cn("flex items-center gap-1 px-1", isOwn ? "justify-end" : "justify-start")}>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(msg.createdAt)}
                        </span>
                        {isOwn && (
                          msg.readAt ? (
                            <CheckCheck className="size-3 text-primary" />
                          ) : (
                            <Check className="size-3 text-muted-foreground" />
                          )
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
              {isTyping && <TypingIndicator />}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t px-4 py-3 bg-background">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Paperclip className="size-4" />
          </Button>
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!messageText.trim() || isLoading}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
