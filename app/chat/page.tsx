'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { io, Socket } from 'socket.io-client'

interface Message {
  id?: number
  session_id: string
  role: 'expert' | 'learner'
  content: string
  message_type?: 'text' | 'multiple_choice' | 'choice_response'
  metadata?: string
  timestamp: number
}

interface MultipleChoiceData {
  question: string
  options: string[]
}

interface Session {
  id: string
  created_at: number
  ended_at: number | null
  message_count: number
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
  const [showMCQForm, setShowMCQForm] = useState(false)
  const [mcqQuestion, setMcqQuestion] = useState('')
  const [mcqOptions, setMcqOptions] = useState(['', '', '', ''])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionValid, setSessionValid] = useState<boolean | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Verify session exists for learners before connecting
  useEffect(() => {
    if (!sessionId || !role) return

    if (role === 'learner') {
      fetch(`/api/session/${sessionId}`)
        .then(res => {
          if (res.ok) {
            setSessionValid(true)
          } else {
            setSessionValid(false)
            alert('Session not found. Please check the session code.')
            window.location.href = '/'
          }
        })
        .catch(() => {
          setSessionValid(false)
          alert('Failed to verify session')
          window.location.href = '/'
        })
    } else {
      // Experts don't need verification
      setSessionValid(true)
    }
  }, [sessionId, role])

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/sessions/list')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }, [])

  useEffect(() => {
    if (role === 'expert') {
      fetchSessions()
    }
  }, [role, fetchSessions])

  useEffect(() => {
    if (!sessionId || !role) return

    // Wait for session validation before connecting
    if (sessionValid === null || (role === 'learner' && sessionValid === false)) {
      return
    }

    // Use window.location.origin to connect to the same server that served the page
    const socketInstance = io(window.location.origin)

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
  }, [sessionId, role, sessionValid])

  const sendMessage = () => {
    if (!inputMessage.trim() || !socket || !sessionId) return

    socket.emit('send-message', {
      sessionId,
      role,
      content: inputMessage.trim(),
      message_type: 'text'
    })

    setInputMessage('')
  }

  const sendMultipleChoice = () => {
    if (!mcqQuestion.trim() || !socket || !sessionId) return
    
    const validOptions = mcqOptions.filter(opt => opt.trim())
    if (validOptions.length < 2) {
      alert('Please provide at least 2 options')
      return
    }

    const mcqData: MultipleChoiceData = {
      question: mcqQuestion.trim(),
      options: validOptions
    }

    socket.emit('send-message', {
      sessionId,
      role,
      content: mcqQuestion.trim(),
      message_type: 'multiple_choice',
      metadata: JSON.stringify(mcqData)
    })

    setShowMCQForm(false)
    setMcqQuestion('')
    setMcqOptions(['', '', '', ''])
  }

  const handleChoiceSelection = (messageId: number | undefined, question: string, selectedOption: string) => {
    if (!socket || !sessionId || !messageId) return

    socket.emit('send-message', {
      sessionId,
      role,
      content: selectedOption,
      message_type: 'choice_response',
      metadata: JSON.stringify({ question, answer: selectedOption, questionId: messageId })
    })
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

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const goToHome = () => {
    window.location.href = '/'
  }

  const switchSession = (newSessionId: string) => {
    window.location.href = `/chat?session=${newSessionId}&role=expert`
  }

  if (!sessionId || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Invalid session or role</p>
      </div>
    )
  }

  // Show loading state while verifying session for learners
  if (role === 'learner' && sessionValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Verifying session...</p>
      </div>
    )
  }

  const isExpert = role === 'expert'

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar for Expert */}
      {isExpert && (
        <div
          className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="bg-purple-600 text-white p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold">Sessions</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-white hover:bg-purple-700 rounded p-1"
              >
                ✕
              </button>
            </div>

            {/* Home Button */}
            <div className="p-4 border-b">
              <button
                onClick={goToHome}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                🏠 Home
              </button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-600">All Sessions</h3>
                <button
                  onClick={fetchSessions}
                  className="text-xs text-purple-600 hover:text-purple-700"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="space-y-2">
                {sessions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No sessions yet</p>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => switchSession(session.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition ${
                        session.id === sessionId
                          ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-semibold text-gray-800">
                          {session.id.substring(0, 8)}
                        </span>
                        {session.ended_at && (
                          <span className="text-xs text-gray-500">Ended</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatDate(session.created_at)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {session.message_count} messages
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isExpert && sidebarOpen ? 'ml-80' : 'ml-0'}`}>
        {/* Header */}
        <div className={`${isExpert ? 'bg-purple-600' : 'bg-blue-600'} text-white p-4 shadow-lg`}>
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              {isExpert && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition"
                  title="Toggle sessions sidebar"
                >
                  ☰
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold">
                  {isExpert ? '👨‍🏫 Expert' : '🎓 Learner'}
                </h1>
                <button
                  onClick={() => {
                    if (sessionId) {
                      // Fallback for older browsers or non-secure contexts
                      const textArea = document.createElement('textarea')
                      textArea.value = sessionId
                      textArea.style.position = 'fixed'
                      textArea.style.left = '-999999px'
                      document.body.appendChild(textArea)
                      textArea.select()
                      try {
                        document.execCommand('copy')
                        alert('Session code copied!')
                      } catch (err) {
                        alert('Failed to copy')
                      }
                      document.body.removeChild(textArea)
                    }
                  }}
                  className="text-sm opacity-90 underline underline-offset-2 hover:opacity-100 cursor-pointer"
                  title="Click to copy session id"
                >
                  Session: {sessionId}
                </button>
              </div>
            </div>
          <div className="flex gap-2">
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
              const isMCQ = msg.message_type === 'multiple_choice'
              const isChoiceResponse = msg.message_type === 'choice_response'
              
              let mcqData: MultipleChoiceData | null = null
              let responseData: any = null
              
              if (isMCQ && msg.metadata) {
                try {
                  mcqData = JSON.parse(msg.metadata)
                } catch (e) {}
              }
              
              if (isChoiceResponse && msg.metadata) {
                try {
                  responseData = JSON.parse(msg.metadata)
                } catch (e) {}
              }
              
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
                    
                    {isMCQ && mcqData ? (
                      <div
                        className={`rounded-lg px-4 py-3 ${
                          isMyMessage
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-800 border-2 border-purple-300'
                        }`}
                      >
                        <p className="font-semibold mb-3">{mcqData.question}</p>
                        <div className="space-y-2">
                          {mcqData.options.map((option, optIdx) => (
                            <button
                              key={optIdx}
                              onClick={() => !isMyMessage && handleChoiceSelection(msg.id, mcqData!.question, option)}
                              disabled={isMyMessage}
                              className={`w-full text-left px-3 py-2 rounded-lg transition ${
                                isMyMessage
                                  ? 'bg-purple-500 cursor-default'
                                  : 'bg-purple-100 hover:bg-purple-200 text-gray-800'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}. {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : isChoiceResponse && responseData ? (
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isMyMessage
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-gray-800 border border-blue-300'
                        }`}
                      >
                        <p className="text-xs opacity-75 mb-1">Answer to: {responseData.question}</p>
                        <p className="font-medium">{responseData.answer}</p>
                      </div>
                    ) : (
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
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          {showMCQForm && isExpert ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Create Multiple Choice Question</h3>
                <button
                  onClick={() => setShowMCQForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={mcqQuestion}
                onChange={(e) => setMcqQuestion(e.target.value)}
                placeholder="Enter your question..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {mcqOptions.map((option, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...mcqOptions]
                    newOptions[idx] = e.target.value
                    setMcqOptions(newOptions)
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              ))}
              <div className="flex gap-2">
                <button
                  onClick={sendMultipleChoice}
                  disabled={!mcqQuestion.trim()}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  Send Question
                </button>
                <button
                  onClick={() => setShowMCQForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                {isExpert && (
                  <button
                    onClick={() => setShowMCQForm(true)}
                    disabled={!connected}
                    className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    📝 MCQ
                  </button>
                )}
              </div>
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
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
