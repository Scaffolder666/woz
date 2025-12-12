'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Message {
  id: number
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
}

export default function TranscriptPage() {
  const params = useParams()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTranscript()
  }, [sessionId])

  const fetchTranscript = async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}`)
      const data = await res.json()
      setSession(data.session)
      setMessages(data.messages)
    } catch (error) {
      console.error('Error fetching transcript:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const downloadJSON = () => {
    const output = {
      session: {
        id: session!.id,
        created_at: new Date(session!.created_at).toISOString(),
        ended_at: session!.ended_at ? new Date(session!.ended_at).toISOString() : null,
        duration_minutes: session!.ended_at
          ? Math.round((session!.ended_at - session!.created_at) / 1000 / 60)
          : null,
        message_count: messages.length
      },
      messages: messages.map(msg => {
        const baseMessage: any = {
          role: msg.role,
          content: msg.content,
          message_type: msg.message_type || 'text',
          timestamp: new Date(msg.timestamp).toISOString()
        }
        
        if (msg.metadata) {
          try {
            baseMessage.metadata = JSON.parse(msg.metadata)
          } catch (e) {
            baseMessage.metadata = msg.metadata
          }
        }
        
        return baseMessage
      })
    }

    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `session-${sessionId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading transcript...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">Session not found</p>
          <Link href="/history" className="text-blue-600 hover:text-blue-700">
            ← Back to History
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/history"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block"
          >
            ← Back to History
          </Link>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Session Transcript
                </h1>
                <p className="text-gray-600 text-sm mt-1">ID: {session.id}</p>
              </div>
              <button
                onClick={downloadJSON}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export JSON
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Started:</span>
                <p className="font-medium text-gray-800">
                  {formatDate(session.created_at)}
                </p>
              </div>
              {session.ended_at && (
                <>
                  <div>
                    <span className="text-gray-500">Ended:</span>
                    <p className="font-medium text-gray-800">
                      {formatDate(session.ended_at)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <p className="font-medium text-gray-800">
                      {Math.round((session.ended_at - session.created_at) / 1000 / 60)} minutes
                    </p>
                  </div>
                </>
              )}
              <div>
                <span className="text-gray-500">Messages:</span>
                <p className="font-medium text-gray-800">{messages.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No messages in this session</p>
            </div>
          ) : (
            messages.map((msg) => {
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
                  key={msg.id}
                  className="bg-white rounded-lg shadow p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      msg.role === 'expert' 
                        ? 'bg-purple-100' 
                        : 'bg-blue-100'
                    }`}>
                      {msg.role === 'expert' ? '👨‍🏫' : '🎓'}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`font-semibold ${
                          msg.role === 'expert' ? 'text-purple-600' : 'text-blue-600'
                        }`}>
                          {msg.role === 'expert' ? 'Expert' : 'Learner'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(msg.timestamp)}
                        </span>
                        {isMCQ && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                            Multiple Choice
                          </span>
                        )}
                        {isChoiceResponse && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                            Answer
                          </span>
                        )}
                      </div>
                      
                      {isMCQ && mcqData ? (
                        <div>
                          <p className="text-gray-800 font-semibold mb-3">{mcqData.question}</p>
                          <div className="space-y-2">
                            {mcqData.options.map((option, idx) => (
                              <div
                                key={idx}
                                className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-gray-700"
                              >
                                {String.fromCharCode(65 + idx)}. {option}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : isChoiceResponse && responseData ? (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Answer to: {responseData.question}</p>
                          <p className="text-gray-800 font-medium">✓ {responseData.answer}</p>
                        </div>
                      ) : (
                        <p className="text-gray-800 whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
