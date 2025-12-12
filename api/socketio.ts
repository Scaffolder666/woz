import { Server } from 'socket.io'
import { dbHelpers, Message } from '../lib/db'

const ioHandler = (req: any, res: any) => {
  if (!res.socket.server.io) {
    console.log('Setting up Socket.IO')
    const io = new Server(res.socket.server, {
      path: '/api/socketio',
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    })

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      socket.on('join-session', (data: { sessionId: string; role: 'expert' | 'learner' }) => {
        const { sessionId, role } = data
        socket.join(sessionId)
        console.log(`${role} joined session: ${sessionId}`)

        socket.to(sessionId).emit('user-joined', { role })

        const messages = dbHelpers.getMessages(sessionId)
        socket.emit('load-messages', messages)
      })

      socket.on('send-message', (data: { sessionId: string; role: 'expert' | 'learner'; content: string }) => {
        const { sessionId, role, content } = data
        
        const message: Message = {
          session_id: sessionId,
          role,
          content,
          timestamp: Date.now(),
        }

        const savedMessage = dbHelpers.saveMessage(message)
        io.to(sessionId).emit('new-message', savedMessage)
      })

      socket.on('end-session', (data: { sessionId: string }) => {
        const { sessionId } = data
        dbHelpers.endSession(sessionId)
        io.to(sessionId).emit('session-ended')
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })

    res.socket.server.io = io
  } else {
    console.log('Socket.IO already running')
  }
  res.end()
}

export const config = {
  api: {
    bodyParser: false,
  },
}

export default ioHandler
