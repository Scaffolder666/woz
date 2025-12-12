'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const [sessionCode, setSessionCode] = useState('')

  const createSession = async () => {
    const res = await fetch('/api/session/create', { method: 'POST' })
    const data = await res.json()
    router.push(`/chat?role=expert&session=${data.sessionId}`)
  }

  const joinSession = () => {
    if (sessionCode.trim()) {
      router.push(`/chat?role=learner&session=${sessionCode}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">CAD Tutor</h1>
          <p className="text-gray-600">Wizard of Oz Tutoring System</p>
          <Link 
            href="/history" 
            className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
          >
            📚 View Session History
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Expert Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Expert</h2>
              <p className="text-gray-600 text-sm">Start a new tutoring session</p>
            </div>
            <button
              onClick={createSession}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              Create Session
            </button>
          </div>

          {/* Learner Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Learner</h2>
              <p className="text-gray-600 text-sm">Join an existing session</p>
            </div>
            <input
              type="text"
              placeholder="Enter session code"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && joinSession()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={joinSession}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              Join Session
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
