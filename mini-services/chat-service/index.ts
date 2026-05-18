import { createServer } from 'http'
import { Server } from 'socket.io'
import { Database } from 'bun:sqlite'

// Initialize SQLite database using Bun's native SQLite
const dbPath = process.env.DATABASE_PATH || './db/custom.db'
const db = new Database(dbPath)

// Enable WAL mode for better concurrent read performance
db.run('PRAGMA journal_mode = WAL')

// Create HTTP server
const httpServer = createServer()

// Create Socket.io server
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ============================================================
// Types
// ============================================================

interface AuthUser {
  userId: string
  name: string
  email: string
  role: string
}

interface SendMessagePayload {
  conversationId: string
  content: string
  fileUrl?: string
}

interface TypingPayload {
  conversationId: string
}

interface MarkReadPayload {
  messageId: string
  conversationId: string
}

// ============================================================
// Online Presence Tracking
// ============================================================

const onlineUsers = new Map<string, string>() // userId -> socketId

function setUserOnline(userId: string, socketId: string) {
  onlineUsers.set(userId, socketId)
  io.emit('user-online', { userId })
}

function setUserOffline(userId: string) {
  onlineUsers.delete(userId)
  io.emit('user-offline', { userId })
}

// ============================================================
// Database Helpers
// ============================================================

function getUserById(userId: string) {
  const query = db.prepare('SELECT id, name, email, role, status, avatarUrl FROM User WHERE id = ?')
  return query.get(userId) as { id: string; name: string; email: string; role: string; status: string; avatarUrl: string | null } | null
}

function getConversationParticipant(conversationId: string, userId: string) {
  const query = db.prepare('SELECT id FROM ConversationParticipant WHERE conversationId = ? AND userId = ?')
  return query.get(conversationId, userId) as { id: string } | null
}

function getOtherParticipants(conversationId: string, excludeUserId: string) {
  const query = db.prepare('SELECT userId FROM ConversationParticipant WHERE conversationId = ? AND userId != ?')
  return query.all(conversationId, excludeUserId) as { userId: string }[]
}

function createMessage(conversationId: string, senderId: string, content: string, fileUrl: string | null) {
  const id = crypto.randomUUID ? crypto.randomUUID() : `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const now = new Date().toISOString()
  const insert = db.prepare(
    'INSERT INTO Message (id, conversationId, senderId, content, fileUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
  )
  insert.run(id, conversationId, senderId, content, fileUrl, now)

  // Update conversation updatedAt
  const updateConv = db.prepare('UPDATE Conversation SET updatedAt = ? WHERE id = ?')
  updateConv.run(now, conversationId)

  // Get sender info
  const sender = getUserById(senderId)

  return {
    id,
    conversationId,
    senderId,
    content,
    fileUrl,
    readAt: null,
    createdAt: now,
    sender: sender ? { id: sender.id, name: sender.name, avatarUrl: sender.avatarUrl } : null,
  }
}

function markMessageRead(messageId: string) {
  const now = new Date().toISOString()
  const update = db.prepare('UPDATE Message SET readAt = ? WHERE id = ? AND readAt IS NULL')
  update.run(now, messageId)
  return now
}

function createNotification(userId: string, type: string, title: string, message: string, link: string | null) {
  const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const now = new Date().toISOString()
  const insert = db.prepare(
    'INSERT INTO Notification (id, userId, type, title, message, link, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, 0, ?)'
  )
  insert.run(id, userId, type, title, message, link, now)
}

function createPlatformAnnouncement(title: string, message: string, type: string, createdById: string) {
  const id = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const now = new Date().toISOString()
  const insert = db.prepare(
    'INSERT INTO PlatformAnnouncement (id, title, message, type, createdById, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
  )
  insert.run(id, title, message, type, createdById, now)
}

function getActiveUserIds() {
  const query = db.prepare("SELECT id FROM User WHERE status = 'ACTIVE'")
  return (query.all() as { id: string }[]).map((u) => u.id)
}

// ============================================================
// Socket Authentication Middleware
// ============================================================

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token

    if (!token) {
      socket.data.user = null
      return next()
    }

    // Accept a simple userId token for development
    // In production, this would verify a JWT token
    let userId = token

    // Try to parse as JWT-like format
    if (token.includes('.')) {
      try {
        const parts = token.split('.')
        const payload = JSON.parse(atob(parts[1]))
        userId = payload.id || payload.sub || payload.userId
      } catch {
        // If JWT parsing fails, use token as-is
      }
    }

    if (userId) {
      const user = getUserById(userId)

      if (user && user.status !== 'BANNED' && user.status !== 'SUSPENDED') {
        socket.data.user = {
          userId: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
        return next()
      }
    }

    socket.data.user = null
    next()
  } catch (error) {
    console.error('Socket auth error:', error)
    socket.data.user = null
    next()
  }
})

// ============================================================
// Connection Handling
// ============================================================

io.on('connection', (socket) => {
  const user: AuthUser | null = socket.data.user

  if (!user) {
    console.log(`Unauthenticated connection: ${socket.id}`)
    socket.emit('auth-error', { message: 'Authentication required' })
    return
  }

  console.log(`User connected: ${user.name} (${user.userId}) - socket: ${socket.id}`)

  // Join user-specific room for direct notifications
  socket.join(`user:${user.userId}`)

  // Track online presence
  setUserOnline(user.userId, socket.id)

  // Notify user of their successful connection
  socket.emit('authenticated', { userId: user.userId, name: user.name })

  // ============================================================
  // Conversation Events
  // ============================================================

  socket.on('join-conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`)
    console.log(`User ${user.userId} joined conversation ${conversationId}`)
  })

  socket.on('leave-conversation', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`)
    socket.to(`conversation:${conversationId}`).emit('user-stop-typing', {
      userId: user.userId,
      conversationId,
    })
    console.log(`User ${user.userId} left conversation ${conversationId}`)
  })

  // ============================================================
  // Message Events
  // ============================================================

  socket.on('send-message', (payload: SendMessagePayload, callback?: (response: any) => void) => {
    try {
      const { conversationId, content, fileUrl } = payload

      // Validate user is a participant in this conversation
      const participant = getConversationParticipant(conversationId, user.userId)
      if (!participant) {
        if (callback) {
          callback({ error: 'You are not a participant in this conversation' })
        }
        return
      }

      // Save message to database
      const messageData = createMessage(conversationId, user.userId, content, fileUrl || null)

      // Emit to conversation room (all participants including sender)
      io.to(`conversation:${conversationId}`).emit('new-message', messageData)

      // Find the other participant(s) and send notification
      const otherParticipants = getOtherParticipants(conversationId, user.userId)

      for (const op of otherParticipants) {
        // Create notification in DB
        createNotification(
          op.userId,
          'new_message',
          'New Message',
          `${user.name} sent you a message`,
          `/messages?conversation=${conversationId}`
        )

        // Emit real-time notification to user room
        io.to(`user:${op.userId}`).emit('notification', {
          type: 'new_message',
          title: 'New Message',
          message: `${user.name} sent you a message`,
          link: `/messages?conversation=${conversationId}`,
          conversationId,
          fromUser: {
            id: user.userId,
            name: user.name,
          },
        })
      }

      // Stop typing since message was sent
      socket.to(`conversation:${conversationId}`).emit('user-stop-typing', {
        userId: user.userId,
        conversationId,
      })

      // Return message with ID and timestamp
      if (callback) {
        callback({ success: true, message: messageData })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      if (callback) {
        callback({ error: 'Failed to send message' })
      }
    }
  })

  // ============================================================
  // Typing Events
  // ============================================================

  socket.on('typing', (payload: TypingPayload) => {
    const { conversationId } = payload
    socket.to(`conversation:${conversationId}`).emit('user-typing', {
      userId: user.userId,
      conversationId,
      userName: user.name,
    })
  })

  socket.on('stop-typing', (payload: TypingPayload) => {
    const { conversationId } = payload
    socket.to(`conversation:${conversationId}`).emit('user-stop-typing', {
      userId: user.userId,
      conversationId,
    })
  })

  // ============================================================
  // Read Receipt Events
  // ============================================================

  socket.on('mark-read', (payload: MarkReadPayload, callback?: (response: any) => void) => {
    try {
      const { messageId, conversationId } = payload

      // Verify user is a participant
      const participant = getConversationParticipant(conversationId, user.userId)
      if (!participant) {
        if (callback) {
          callback({ error: 'Not a participant' })
        }
        return
      }

      // Mark message as read
      const readAt = markMessageRead(messageId)

      // Emit to conversation room
      io.to(`conversation:${conversationId}`).emit('message-read', {
        messageId,
        readAt,
        readBy: user.userId,
        conversationId,
      })

      if (callback) {
        callback({ success: true, readAt })
      }
    } catch (error) {
      console.error('Error marking message as read:', error)
      if (callback) {
        callback({ error: 'Failed to mark message as read' })
      }
    }
  })

  // ============================================================
  // Online Status Events
  // ============================================================

  socket.on('get-online-status', (userIds: string[], callback?: (response: any) => void) => {
    const status: Record<string, boolean> = {}
    for (const uid of userIds) {
      status[uid] = onlineUsers.has(uid)
    }
    if (callback) {
      callback(status)
    }
  })

  // ============================================================
  // Broadcast Events (admin only)
  // ============================================================

  socket.on('broadcast', (payload: { title: string; message: string; type?: string }, callback?: (response: any) => void) => {
    try {
      // Only admins can broadcast
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'MODERATOR') {
        if (callback) {
          callback({ error: 'Insufficient permissions' })
        }
        return
      }

      const { title, message, type = 'system' } = payload

      // Get all active users
      const activeUserIds = getActiveUserIds()

      // Create notification records for all active users
      const insertMany = db.transaction((userIds: string[]) => {
        for (const uid of userIds) {
          createNotification(uid, type, title, message, null)
        }
      })
      insertMany(activeUserIds)

      // Create platform announcement
      createPlatformAnnouncement(title, message, type, user.userId)

      // Emit broadcast to all connected users
      io.emit('broadcast', { title, message, type, from: user.name })

      if (callback) {
        callback({ success: true, recipientCount: activeUserIds.length })
      }
    } catch (error) {
      console.error('Error broadcasting:', error)
      if (callback) {
        callback({ error: 'Failed to broadcast' })
      }
    }
  })

  // ============================================================
  // Disconnect Handling
  // ============================================================

  socket.on('disconnect', (reason) => {
    if (user) {
      console.log(`User disconnected: ${user.name} (${user.userId}) - reason: ${reason}`)

      // Leave all rooms and notify typing stopped
      const rooms = socket.rooms
      for (const room of rooms) {
        if (room.startsWith('conversation:')) {
          socket.to(room).emit('user-stop-typing', {
            userId: user.userId,
            conversationId: room.replace('conversation:', ''),
          })
        }
      }

      // Update online presence
      setUserOffline(user.userId)
    }
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

// ============================================================
// Start Server
// ============================================================

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`Chat service (Socket.io) running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down chat service...')
  httpServer.close(() => {
    db.close()
    console.log('Chat service closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down chat service...')
  httpServer.close(() => {
    db.close()
    console.log('Chat service closed')
    process.exit(0)
  })
})
