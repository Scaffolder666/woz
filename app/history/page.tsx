'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Session {
  id: string
  created_at: number
  ended_at: number | null
  message_count: number
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions/list')
      const data = await res.json()
      setSessions(data.sessions)
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDuration = (createdAt: number, endedAt: number | null) => {
    if (!endedAt) return 'Active'
    const minutes = Math.round((endedAt - createdAt) / 1000 / 60)
    return `${minutes} min`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading sessions...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Session History</h1>
            <p className="text-gray-600 mt-1">View all tutoring sessions and transcripts</p>
          </div>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            ← Back Home
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No sessions yet</p>
            <Link
              href="/"
              className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Start your first session →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-800">
                        Session {session.id}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          session.ended_at
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {session.ended_at ? '✅ Completed' : '🔄 Active'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mt-3">
                      <div>
                        <span className="text-gray-500">Started:</span>
                        <p className="font-medium text-gray-700">
                          {formatDate(session.created_at)}
                        </p>
                      </div>
                      {session.ended_at && (
                        <div>
                          <span className="text-gray-500">Ended:</span>
                          <p className="font-medium text-gray-700">
                            {formatDate(session.ended_at)}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <p className="font-medium text-gray-700">
                          {getDuration(session.created_at, session.ended_at)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Messages:</span>
                        <p className="font-medium text-gray-700">
                          {session.message_count}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/history/${session.id}`}
                    className="ml-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    View Transcript
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Export Data</h3>
          <p className="text-sm text-blue-800">
            To export sessions for AI training, run:{' '}
            <code className="bg-blue-100 px-2 py-1 rounded">npm run sessions</code> or{' '}
            <code className="bg-blue-100 px-2 py-1 rounded">npm run export [session-id]</code>
          </p>
        </div>
      </div>
    </div>
  )
}
