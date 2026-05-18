"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  connectSocket,
  disconnectSocket,
  joinConversation,
  leaveConversation,
  sendMessage as socketSendMessage,
  onNewMessage,
  onTyping,
  onStopTyping,
  emitTyping,
  emitStopTyping,
  markAsRead as socketMarkAsRead,
  onMessageRead,
  onNotification,
  onBroadcast,
  getOnlineStatus,
  onUserOnline,
  onUserOffline,
  isSocketAvailable,
  retryConnection,
  onConnectionStateChange,
  SocketConnectionState,
  SocketMessage,
  SocketNotification,
  TypingData,
  ReadReceiptData,
  OnlineStatusData,
  BroadcastData,
  SendMessageResponse,
} from "@/lib/socket";
import { useAuthStore } from "@/store/auth";

// ============================================================
// Context Types
// ============================================================

interface TypingState {
  userId: string;
  userName?: string;
  conversationId: string;
}

interface SocketContextValue {
  isConnected: boolean;
  connectionState: SocketConnectionState;
  onlineUsers: Record<string, boolean>;
  typingUsers: Record<string, TypingState[]>; // conversationId -> TypingState[]
  notifications: SocketNotification[];
  connect: () => void;
  disconnect: () => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string, fileUrl?: string) => Promise<SendMessageResponse>;
  emitTyping: (conversationId: string) => void;
  emitStopTyping: (conversationId: string) => void;
  markAsRead: (messageId: string, conversationId: string) => Promise<{ success?: boolean; readAt?: string; error?: string }>;
  getOnlineStatus: (userIds: string[]) => Promise<Record<string, boolean>>;
  clearNotifications: () => void;
  onNewMessage: (callback: (message: SocketMessage) => void) => () => void;
  onMessageRead: (callback: (data: ReadReceiptData) => void) => () => void;
}

// ============================================================
// Context
// ============================================================

const SocketContext = createContext<SocketContextValue | null>(null);

/**
 * Hook to access socket context
 */
export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}

// ============================================================
// Connection Status Indicator
// ============================================================

function ConnectionStatusDot({ state }: { state: SocketConnectionState }) {
  const colorMap: Record<SocketConnectionState, string> = {
    connected: "bg-emerald-500",
    connecting: "bg-amber-500 animate-pulse",
    disconnected: "bg-red-400",
  };

  const tooltipMap: Record<SocketConnectionState, string> = {
    connected: "Real-time connected",
    connecting: "Connecting...",
    disconnected: "Real-time unavailable",
  };

  return (
    <span
      className={`inline-block size-2 rounded-full ${colorMap[state]}`}
      title={tooltipMap[state]}
      aria-label={tooltipMap[state]}
    />
  );
}

// ============================================================
// Provider
// ============================================================

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<SocketConnectionState>("disconnected");
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingState[]>>({});
  const [notifications, setNotifications] = useState<SocketNotification[]>([]);
  const connectedRef = useRef(false);
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-retry connection every 30 seconds when disconnected
  useEffect(() => {
    if (connectionState === "disconnected" && isAuthenticated && user?.id) {
      retryIntervalRef.current = setInterval(() => {
        // Silently attempt reconnection
        retryConnection(user.id);
      }, 30000);
    }

    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    };
  }, [connectionState, isAuthenticated, user?.id]);

  // Listen for connection state changes from socket.ts
  useEffect(() => {
    const unsub = onConnectionStateChange((state) => {
      setConnectionState(state);
      setIsConnected(state === "connected");
    });
    return unsub;
  }, []);

  // Connect socket when user authenticates, cleanup when they log out
  // The cleanup function handles disconnection and state reset
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    // Connect socket
    if (connectedRef.current) return;
    connectedRef.current = true;

    const socket = connectSocket(user.id);

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // Listen for online/offline events
    const unsubOnline = onUserOnline((data: OnlineStatusData) => {
      setOnlineUsers((prev) => ({ ...prev, [data.userId]: true }));
    });

    const unsubOffline = onUserOffline((data: OnlineStatusData) => {
      setOnlineUsers((prev) => ({ ...prev, [data.userId]: false }));
    });

    // Listen for typing events
    const unsubTyping = onTyping((data: TypingData) => {
      setTypingUsers((prev) => {
        const conversationTyping = prev[data.conversationId] || [];
        const exists = conversationTyping.some((t) => t.userId === data.userId);
        if (exists) return prev;
        return {
          ...prev,
          [data.conversationId]: [...conversationTyping, { userId: data.userId, userName: data.userName, conversationId: data.conversationId }],
        };
      });

      // Auto-clear typing after 3 seconds
      setTimeout(() => {
        setTypingUsers((prev) => {
          const conversationTyping = prev[data.conversationId] || [];
          return {
            ...prev,
            [data.conversationId]: conversationTyping.filter((t) => t.userId !== data.userId),
          };
        });
      }, 3000);
    });

    const unsubStopTyping = onStopTyping((data: TypingData) => {
      setTypingUsers((prev) => {
        const conversationTyping = prev[data.conversationId] || [];
        return {
          ...prev,
          [data.conversationId]: conversationTyping.filter((t) => t.userId !== data.userId),
        };
      });
    });

    // Listen for notifications
    const unsubNotification = onNotification((data: SocketNotification) => {
      setNotifications((prev) => [data, ...prev].slice(0, 50));
    });

    // Listen for broadcasts
    const unsubBroadcast = onBroadcast((data: BroadcastData) => {
      setNotifications((prev) => [
        {
          type: data.type,
          title: data.title,
          message: data.message,
          fromUser: { id: "", name: data.from },
        },
        ...prev,
      ].slice(0, 50));
    });

    // Cleanup function - runs when auth state changes (logout) or component unmounts
    return () => {
      connectedRef.current = false;
      socket.off("connect");
      socket.off("disconnect");
      unsubOnline();
      unsubOffline();
      unsubTyping();
      unsubStopTyping();
      unsubNotification();
      unsubBroadcast();
      disconnectSocket();
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, user]);

  // ============================================================
  // Context Methods
  // ============================================================

  const connect = useCallback(() => {
    if (user?.id && !connectedRef.current) {
      connectedRef.current = true;
      connectSocket(user.id);
    }
  }, [user]);

  const disconnect = useCallback(() => {
    connectedRef.current = false;
    disconnectSocket();
    setIsConnected(false);
    setOnlineUsers({});
    setTypingUsers({});
    setNotifications([]);
  }, []);

  const handleJoinConversation = useCallback((conversationId: string) => {
    joinConversation(conversationId);
  }, []);

  const handleLeaveConversation = useCallback((conversationId: string) => {
    leaveConversation(conversationId);
  }, []);

  const handleSendMessage = useCallback(
    async (conversationId: string, content: string, fileUrl?: string): Promise<SendMessageResponse> => {
      // If socket is unavailable, return error silently without blocking UI
      if (!isSocketAvailable()) {
        return { error: "Real-time service unavailable. Please try again later." };
      }
      return socketSendMessage(conversationId, content, fileUrl);
    },
    []
  );

  const handleEmitTyping = useCallback((conversationId: string) => {
    emitTyping(conversationId);
  }, []);

  const handleEmitStopTyping = useCallback((conversationId: string) => {
    emitStopTyping(conversationId);
  }, []);

  const handleMarkAsRead = useCallback(
    async (messageId: string, conversationId: string) => {
      return socketMarkAsRead(messageId, conversationId);
    },
    []
  );

  const handleGetOnlineStatus = useCallback(async (userIds: string[]) => {
    const status = await getOnlineStatus(userIds);
    setOnlineUsers((prev) => ({ ...prev, ...status }));
    return status;
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const handleOnNewMessage = useCallback((callback: (message: SocketMessage) => void) => {
    return onNewMessage(callback);
  }, []);

  const handleOnMessageRead = useCallback((callback: (data: ReadReceiptData) => void) => {
    return onMessageRead(callback);
  }, []);

  // ============================================================
  // Context Value
  // ============================================================

  const value: SocketContextValue = {
    isConnected,
    connectionState,
    onlineUsers,
    typingUsers,
    notifications,
    connect,
    disconnect,
    joinConversation: handleJoinConversation,
    leaveConversation: handleLeaveConversation,
    sendMessage: handleSendMessage,
    emitTyping: handleEmitTyping,
    emitStopTyping: handleEmitStopTyping,
    markAsRead: handleMarkAsRead,
    getOnlineStatus: handleGetOnlineStatus,
    clearNotifications,
    onNewMessage: handleOnNewMessage,
    onMessageRead: handleOnMessageRead,
  };

  return (
    <SocketContext.Provider value={value}>
      {/* Connection status indicator - subtle, non-blocking */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
        <ConnectionStatusDot state={connectionState} />
        <span className="hidden sm:inline">
          {connectionState === "connected" && "Live"}
          {connectionState === "connecting" && "Connecting"}
          {connectionState === "disconnected" && "Offline mode"}
        </span>
      </div>
      {children}
    </SocketContext.Provider>
  );
}
