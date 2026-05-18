"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MessageSquare,
  Loader2,
  Pin,
  Star,
  StarOff,
  PinOff,
  MessagesSquare,
  Filter,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChatWindow, ChatMessage } from "@/components/shared/chat-window";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuthStore } from "@/store/auth";
import { useNavigationStore } from "@/store/navigation";
import { apiFetch, apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  participants: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
    role: string;
    isOnline?: boolean;
  }>;
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
  isPinned?: boolean;
  isStarred?: boolean;
}

// Typing indicator dots
function TypingDots() {
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-emerald-500"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

export function DashboardMessagesPage() {
  const { user } = useAuthStore();
  const { navigate } = useNavigationStore();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [pinnedConversations, setPinnedConversations] = useState<Set<string>>(new Set());
  const [starredConversations, setStarredConversations] = useState<Set<string>>(new Set());
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  // Simulated typing state
  const [typingConversationId, setTypingConversationId] = useState<string | null>(null);

  const { data: conversationsData, isLoading: convLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const json = await apiFetch("/api/conversations?limit=50");
      const result = json.data as { data: Conversation[]; total: number } | Conversation[];
      return Array.isArray(result) ? result : (result.data || []);
    },
    refetchInterval: 10000,
  });

  const { data: messagesData, isLoading: msgLoading } = useQuery({
    queryKey: ["messages", selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const json = await apiFetch(`/api/conversations/${selectedConversation}/messages?limit=100`);
      const result = json.data as { data: ChatMessage[]; total: number } | ChatMessage[];
      return Array.isArray(result) ? result : (result.data || []);
    },
    enabled: !!selectedConversation,
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => {
      return apiPost(`/api/conversations/${conversationId}/messages`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const conversations = conversationsData || [];

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (showStarredOnly && !starredConversations.has(conv.id)) return false;
    if (!searchQuery) return true;
    const otherParticipant = conv.participants.find((p) => p.id !== user?.id);
    return otherParticipant?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Sort: pinned first, then starred, then by updatedAt
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const aPinned = pinnedConversations.has(a.id) ? 1 : 0;
    const bPinned = pinnedConversations.has(b.id) ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;

    const aStarred = starredConversations.has(a.id) ? 1 : 0;
    const bStarred = starredConversations.has(b.id) ? 1 : 0;
    if (aStarred !== bStarred) return bStarred - aStarred;

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const currentConv = conversations.find((c) => c.id === selectedConversation);
  const otherUser = currentConv?.participants.find((p) => p.id !== user?.id);

  const messages: ChatMessage[] = (messagesData || []).map((msg: ChatMessage) => ({
    id: msg.id,
    senderId: msg.senderId,
    content: msg.content,
    fileUrl: msg.fileUrl,
    readAt: msg.readAt,
    createdAt: msg.createdAt,
  }));

  // Filter messages by search
  const displayMessages = messageSearch
    ? messages.filter((msg) =>
        msg.content.toLowerCase().includes(messageSearch.toLowerCase())
      )
    : messages;

  const handleSendMessage = (content: string, _file?: File) => {
    if (!selectedConversation || !content.trim()) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversation,
      content: content.trim(),
    });
  };

  const togglePin = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedConversations((prev) => {
      const next = new Set(prev);
      if (next.has(convId)) next.delete(convId);
      else next.add(convId);
      return next;
    });
  };

  const toggleStar = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredConversations((prev) => {
      const next = new Set(prev);
      if (next.has(convId)) next.delete(convId);
      else next.add(convId);
      return next;
    });
  };

  if (convLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
            <p className="text-muted-foreground mt-1">
              Communicate with clients and creators
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showStarredOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className="text-xs"
            >
              <Star className={cn("size-3.5 mr-1", showStarredOnly && "fill-current")} />
              Starred
            </Button>
          </div>
        </div>
      </motion.div>

      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessagesSquare />}
          title="No conversations yet"
          description="Start a conversation by visiting an author's profile or browsing creators"
          action={{
            label: "Browse Creators",
            onClick: () => navigate("browse"),
          }}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid lg:grid-cols-[340px_1fr] gap-0 border border-border rounded-xl overflow-hidden h-[650px]">
            {/* Conversation List */}
            <div className="border-r border-border flex flex-col bg-card">
              {/* Search bar */}
              <div className="p-3 border-b border-border space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8 text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {/* Conversation list */}
              <ScrollArea className="flex-1 custom-scroll">
                {filteredConversations.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {showStarredOnly ? "No starred conversations" : "No conversations found"}
                  </div>
                ) : (
                  sortedConversations.map((conv) => {
                    const other = conv.participants.find((p) => p.id !== user?.id);
                    if (!other) return null;
                    const isPinned = pinnedConversations.has(conv.id);
                    const isStarred = starredConversations.has(conv.id);
                    const isOnline = (other as { isOnline?: boolean }).isOnline ?? false;
                    const isTyping = typingConversationId === conv.id;

                    return (
                      <div
                        key={conv.id}
                        className="relative"
                      >
                        {/* Pin indicator bar */}
                        {isPinned && (
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500" />
                        )}

                        <button
                          onClick={() => setSelectedConversation(conv.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left",
                            selectedConversation === conv.id && "bg-accent",
                            isPinned && "bg-amber-50/50 dark:bg-amber-500/5"
                          )}
                        >
                          {/* Avatar with online indicator */}
                          <div className="relative shrink-0">
                            <Avatar className="size-9">
                              {other.avatarUrl ? (
                                <AvatarImage src={other.avatarUrl} />
                              ) : (
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {other.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            {/* Online status indicator */}
                            <div
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background",
                                isOnline
                                  ? "bg-emerald-500"
                                  : "bg-muted-foreground/30"
                              )}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-sm font-medium truncate">
                                  {other.name}
                                </span>
                                {isStarred && (
                                  <Star className="size-3 fill-amber-400 text-amber-400 shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {conv.lastMessage && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(conv.lastMessage.createdAt), {
                                      addSuffix: false,
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              {isTyping ? (
                                <div className="flex items-center gap-1.5">
                                  <TypingDots />
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                    Typing...
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground truncate">
                                  {conv.lastMessage?.senderId === user?.id ? "You: " : ""}
                                  {conv.lastMessage?.content}
                                </span>
                              )}
                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                {conv.unreadCount > 0 && (
                                  <Badge className="size-5 flex items-center justify-center text-[10px] p-0 bg-emerald-500 hover:bg-emerald-600 text-white">
                                    {conv.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Pin/Star actions */}
                          <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-0.5 rounded hover:bg-muted transition-colors"
                                >
                                  <svg className="size-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                                  </svg>
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={(e) => togglePin(conv.id, e as unknown as React.MouseEvent)}>
                                  {isPinned ? (
                                    <>
                                      <PinOff className="size-3.5 mr-2" />
                                      Unpin
                                    </>
                                  ) : (
                                    <>
                                      <Pin className="size-3.5 mr-2" />
                                      Pin
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => toggleStar(conv.id, e as unknown as React.MouseEvent)}>
                                  {isStarred ? (
                                    <>
                                      <StarOff className="size-3.5 mr-2" />
                                      Unstar
                                    </>
                                  ) : (
                                    <>
                                      <Star className="size-3.5 mr-2" />
                                      Star
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </button>
                      </div>
                    );
                  })
                )}
              </ScrollArea>
            </div>

            {/* Chat Window */}
            <div className="flex flex-col">
              {!selectedConversation || !otherUser ? (
                <div className="flex-1 flex items-center justify-center">
                  <EmptyState
                    icon={<MessagesSquare />}
                    title="Select a conversation"
                    description="Choose a conversation from the list to start messaging"
                  />
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {/* Chat header with search */}
                  <div className="border-b px-4 py-2.5 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Avatar className="size-8">
                            {otherUser.avatarUrl ? (
                              <AvatarImage src={otherUser.avatarUrl} />
                            ) : (
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {otherUser.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background",
                              "bg-muted-foreground/30"
                            )}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{otherUser.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {typingConversationId === selectedConversation
                              ? "typing..."
                              : "Offline"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => {
                          setShowMessageSearch(!showMessageSearch);
                          if (showMessageSearch) setMessageSearch("");
                        }}
                      >
                        <Search className="size-4" />
                      </Button>
                    </div>
                    {/* Message search bar */}
                    <AnimatePresence>
                      {showMessageSearch && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                              <Input
                                placeholder="Search messages..."
                                value={messageSearch}
                                onChange={(e) => setMessageSearch(e.target.value)}
                                className="pl-8 h-7 text-xs"
                                autoFocus
                              />
                            </div>
                            {messageSearch && (
                              <p className="text-[10px] text-muted-foreground mt-1 px-1">
                                {displayMessages.length} result{displayMessages.length !== 1 ? "s" : ""} found
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Chat area */}
                  <div className="flex-1">
                    <ChatWindow
                      messages={displayMessages}
                      currentUserId={user?.id || ""}
                      onSendMessage={handleSendMessage}
                      otherUser={{
                        name: otherUser.name,
                        avatar: otherUser.avatarUrl || undefined,
                        isOnline: false,
                      }}
                      isLoading={msgLoading}
                      isTyping={typingConversationId === selectedConversation}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
