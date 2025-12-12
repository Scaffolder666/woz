import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'
import { dbHelpers, Message } from './lib/db'

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0' // Listen on all network interfaces
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  })

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('join-session', async (data: { sessionId: string; role: 'expert' | 'learner' }) => {
      const { sessionId, role } = data
      socket.join(sessionId)
      console.log(`${role} joined session: ${sessionId}`)

      // Notify others in the room
      socket.to(sessionId).emit('user-joined', { role })

      // Send existing messages to the newly joined user
      const messages = await dbHelpers.getMessages(sessionId)
      socket.emit('load-messages', messages)
    })

    socket.on('send-message', async (data: { sessionId: string; role: 'expert' | 'learner'; content: string }) => {
      const { sessionId, role, content } = data
      
      const message: Message = {
        session_id: sessionId,
        role,
        content,
        timestamp: Date.now(),
      }

      // Save to database
      const savedMessage = await dbHelpers.saveMessage(message)

      // Broadcast to all users in the session
      io.to(sessionId).emit('new-message', savedMessage)
    })

    socket.on('end-session', async (data: { sessionId: string }) => {
      const { sessionId } = data
      await dbHelpers.endSession(sessionId)
      io.to(sessionId).emit('session-ended')
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})
