'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { io, Socket } from 'socket.io-client'

interface Message {
  id?: number
  session_id: string
  role: 'expert' | 'learner'
  content: string
  timestamp: number
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')
  const role = searchParams.get('role') as 'expert' | 'learner'

  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [otherUserJoined, setOtherUserJoined] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!sessionId || !role) return

    // Use window.location.origin to connect to the same server that served the page
    const socketInstance = io(window.location.origin, {
      path: '/api/socketio'
    })

    socketInstance.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
      socketInstance.emit('join-session', { sessionId, role })
    })

    socketInstance.on('load-messages', (loadedMessages: Message[]) => {
      setMessages(loadedMessages)
    })

    socketInstance.on('new-message', (message: Message) => {
      setMessages((prev) => [...prev, message])
    })

    socketInstance.on('user-joined', (data: { role: string }) => {
      setOtherUserJoined(true)
    })

    socketInstance.on('session-ended', () => {
      alert('Session has ended')
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [sessionId, role])

  const sendMessage = () => {
    if (!inputMessage.trim() || !socket || !sessionId) return

    socket.emit('send-message', {
      sessionId,
      role,
      content: inputMessage.trim(),
    })

    setInputMessage('')
  }

  const endSession = () => {
    if (!socket || !sessionId) return
    if (confirm('Are you sure you want to end this session?')) {
      socket.emit('end-session', { sessionId })
      window.location.href = '/'
    }
  }

  const copySessionCode = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId)
      alert('Session code copied to clipboard!')
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    })
  }

  if (!sessionId || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Invalid session or role</p>
      </div>
    )
  }

  const isExpert = role === 'expert'

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className={`${isExpert ? 'bg-purple-600' : 'bg-blue-600'} text-white p-4 shadow-lg`}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {isExpert ? '👨‍🏫 Expert' : '🎓 Learner'}
            </h1>
            <p className="text-sm opacity-90">Session: {sessionId}</p>
          </div>
          <div className="flex gap-2">
            {isExpert && (
              <button
                onClick={copySessionCode}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                📋 Copy Code
              </button>
            )}
            <button
              onClick={endSession}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              End Session
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="max-w-4xl mx-auto w-full px-4 py-2">
        <div className="flex gap-4 text-sm">
          <span className={`flex items-center gap-2 ${connected ? 'text-green-600' : 'text-red-600'}`}>
            <span className="w-2 h-2 rounded-full bg-current"></span>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
          {isExpert && (
            <span className={`flex items-center gap-2 ${otherUserJoined ? 'text-green-600' : 'text-gray-600'}`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              {otherUserJoined ? 'Learner joined' : 'Waiting for learner...'}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMyMessage = msg.role === role
              return (
                <div
                  key={idx}
                  className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[70%]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-600">
                        {msg.role === 'expert' ? '👨‍🏫 Expert' : '🎓 Learner'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isMyMessage
                          ? msg.role === 'expert'
                            ? 'bg-purple-600 text-white'
                            : 'bg-blue-600 text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!connected}
            />
            <button
              onClick={sendMessage}
              disabled={!connected || !inputMessage.trim()}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                isExpert
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
