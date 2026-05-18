"use client";

import { io, Socket } from "socket.io-client";

// ============================================================
// Types
// ============================================================

export interface SocketMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  fileUrl: string | null;
  readAt: string | null;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
}

export interface SocketNotification {
  type: string;
  title: string;
  message: string;
  link?: string;
  conversationId?: string;
  fromUser?: {
    id: string;
    name: string;
  };
}

export interface TypingData {
  userId: string;
  conversationId: string;
  userName?: string;
}

export interface ReadReceiptData {
  messageId: string;
  readAt: string;
  readBy: string;
  conversationId: string;
}

export interface OnlineStatusData {
  userId: string;
}

export interface BroadcastData {
  title: string;
  message: string;
  type: string;
  from: string;
}

export interface SendMessageResponse {
  success?: boolean;
  message?: SocketMessage;
  error?: string;
}

// ============================================================
// Connection State
// ============================================================

export type SocketConnectionState = "connected" | "connecting" | "disconnected";

let socket: Socket | null = null;
let connectionState: SocketConnectionState = "disconnected";
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/** Callbacks for connection state changes */
type StateChangeCallback = (state: SocketConnectionState) => void;
const stateChangeListeners: StateChangeCallback[] = [];

function setConnectionState(state: SocketConnectionState) {
  connectionState = state;
  stateChangeListeners.forEach((cb) => cb(state));
}

/**
 * Subscribe to connection state changes
 */
export function onConnectionStateChange(callback: StateChangeCallback): () => void {
  stateChangeListeners.push(callback);
  return () => {
    const index = stateChangeListeners.indexOf(callback);
    if (index > -1) stateChangeListeners.splice(index, 1);
  };
}

// ============================================================
// Socket.io Client Singleton
// ============================================================

/**
 * Initialize Socket.io connection with authentication
 */
export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  // If we have a stale socket that gave up reconnecting, clean it up first
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  setConnectionState("connecting");

  const socketUrl =
    process.env.NEXT_PUBLIC_SOCKET_IO_URL ?? "/?XTransformPort=3003";

  // Connect via Caddy gateway using XTransformPort pattern (or direct URL in production)
  socket = io(socketUrl, {
    transports: ["websocket", "polling"],
    auth: {
      token,
    },
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
    forceNew: true,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket?.id);
    reconnectAttempts = 0;
    setConnectionState("connected");
  });

  socket.on("disconnect", (reason) => {
    // Don't log disconnect as error - it's normal behavior
    console.log("[Socket] Disconnected:", reason);
    setConnectionState("connecting");
  });

  socket.on("connect_error", (error) => {
    reconnectAttempts++;
    // Only log the first few errors, then suppress to avoid console spam
    if (reconnectAttempts <= 2) {
      console.warn("[Socket] Connection attempt failed, retrying...", error.message);
    }
    setConnectionState("connecting");
  });

  // When socket.io gives up reconnecting after max attempts
  socket.io.on("reconnect_failed", () => {
    console.warn("[Socket] Max reconnection attempts reached. Service unavailable.");
    setConnectionState("disconnected");
  });

  socket.on("auth-error", (data) => {
    console.warn("[Socket] Auth error:", data.message);
  });

  socket.on("authenticated", (data) => {
    console.log("[Socket] Authenticated as:", data.name);
  });

  return socket;
}

/**
 * Disconnect the socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  reconnectAttempts = 0;
  setConnectionState("disconnected");
}

/**
 * Get the current socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Check if socket is connected
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

/**
 * Check if the socket service is available (connected or still trying to connect).
 * Returns false only when we've given up reconnecting after max attempts.
 */
export function isSocketAvailable(): boolean {
  return connectionState !== "disconnected";
}

/**
 * Get the current connection state
 */
export function getConnectionState(): SocketConnectionState {
  return connectionState;
}

/**
 * Attempt to reconnect the socket after it was disconnected.
 * Only works if there's a previous token stored in auth.
 * Returns true if a reconnection attempt was initiated.
 */
export function retryConnection(token: string): boolean {
  if (connectionState === "connected") return false;

  // Clean up the old socket and try fresh
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  reconnectAttempts = 0;

  connectSocket(token);
  return true;
}

// ============================================================
// Conversation Room Management
// ============================================================

/**
 * Join a conversation room to receive messages for that conversation
 */
export function joinConversation(conversationId: string): void {
  if (socket?.connected) {
    socket.emit("join-conversation", conversationId);
  }
}

/**
 * Leave a conversation room
 */
export function leaveConversation(conversationId: string): void {
  if (socket?.connected) {
    socket.emit("leave-conversation", conversationId);
  }
}

// ============================================================
// Message Events
// ============================================================

/**
 * Send a message to a conversation
 * Returns a promise that resolves with the server response
 */
export function sendMessage(
  conversationId: string,
  content: string,
  fileUrl?: string
): Promise<SendMessageResponse> {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      resolve({ error: "Socket not connected" });
      return;
    }

    socket.emit(
      "send-message",
      { conversationId, content, fileUrl },
      (response: SendMessageResponse) => {
        resolve(response);
      }
    );
  });
}

/**
 * Listen for new messages
 */
export function onNewMessage(callback: (message: SocketMessage) => void): () => void {
  if (socket) {
    socket.on("new-message", callback);
    return () => socket?.off("new-message", callback);
  }
  return () => {};
}

// ============================================================
// Typing Events
// ============================================================

/**
 * Emit typing indicator to a conversation
 */
export function emitTyping(conversationId: string): void {
  if (socket?.connected) {
    socket.emit("typing", { conversationId });
  }
}

/**
 * Emit stop typing indicator to a conversation
 */
export function emitStopTyping(conversationId: string): void {
  if (socket?.connected) {
    socket.emit("stop-typing", { conversationId });
  }
}

/**
 * Listen for typing indicators
 */
export function onTyping(callback: (data: TypingData) => void): () => void {
  if (socket) {
    socket.on("user-typing", callback);
    return () => socket?.off("user-typing", callback);
  }
  return () => {};
}

/**
 * Listen for stop typing indicators
 */
export function onStopTyping(callback: (data: TypingData) => void): () => void {
  if (socket) {
    socket.on("user-stop-typing", callback);
    return () => socket?.off("user-stop-typing", callback);
  }
  return () => {};
}

// ============================================================
// Read Receipt Events
// ============================================================

/**
 * Mark a message as read
 */
export function markAsRead(
  messageId: string,
  conversationId: string
): Promise<{ success?: boolean; readAt?: string; error?: string }> {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      resolve({ error: "Socket not connected" });
      return;
    }

    socket.emit(
      "mark-read",
      { messageId, conversationId },
      (response: { success?: boolean; readAt?: string; error?: string }) => {
        resolve(response);
      }
    );
  });
}

/**
 * Listen for read receipt events
 */
export function onMessageRead(callback: (data: ReadReceiptData) => void): () => void {
  if (socket) {
    socket.on("message-read", callback);
    return () => socket?.off("message-read", callback);
  }
  return () => {};
}

// ============================================================
// Notification Events
// ============================================================

/**
 * Listen for notifications
 */
export function onNotification(callback: (data: SocketNotification) => void): () => void {
  if (socket) {
    socket.on("notification", callback);
    return () => socket?.off("notification", callback);
  }
  return () => {};
}

/**
 * Listen for broadcast messages
 */
export function onBroadcast(callback: (data: BroadcastData) => void): () => void {
  if (socket) {
    socket.on("broadcast", callback);
    return () => socket?.off("broadcast", callback);
  }
  return () => {};
}

// ============================================================
// Online Status Events
// ============================================================

/**
 * Get online status for a list of user IDs
 */
export function getOnlineStatus(
  userIds: string[]
): Promise<Record<string, boolean>> {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      const offlineStatus: Record<string, boolean> = {};
      userIds.forEach((id) => (offlineStatus[id] = false));
      resolve(offlineStatus);
      return;
    }

    socket.emit(
      "get-online-status",
      userIds,
      (status: Record<string, boolean>) => {
        resolve(status);
      }
    );
  });
}

/**
 * Listen for user online events
 */
export function onUserOnline(callback: (data: OnlineStatusData) => void): () => void {
  if (socket) {
    socket.on("user-online", callback);
    return () => socket?.off("user-online", callback);
  }
  return () => {};
}

/**
 * Listen for user offline events
 */
export function onUserOffline(callback: (data: OnlineStatusData) => void): () => void {
  if (socket) {
    socket.on("user-offline", callback);
    return () => socket?.off("user-offline", callback);
  }
  return () => {};
}
