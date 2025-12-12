import { createClient } from '@libsql/client'
import fs from 'fs'
import path from 'path'

// Get database client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:data/local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function viewSessions() {
  // Get all sessions
  const result = await client.execute('SELECT * FROM sessions ORDER BY created_at DESC')
  const sessions = result.rows

  console.log(`\n📊 Total sessions: ${sessions.length}\n`)

  for (const session of sessions) {
    const messagesResult = await client.execute({
      sql: 'SELECT * FROM messages WHERE session_id = ?',
      args: [session.id as string]
    })
    const messages = messagesResult.rows
    const status = session.ended_at ? '✅ Ended' : '🔄 Active'
    const duration = session.ended_at 
      ? Math.round((Number(session.ended_at) - Number(session.created_at)) / 1000 / 60) 
      : 'ongoing'
  
  console.log(`${status} Session: ${session.id}`)
  console.log(`  Created: ${new Date(Number(session.created_at)).toLocaleString()}`)
  if (session.ended_at) {
    console.log(`  Ended: ${new Date(Number(session.ended_at)).toLocaleString()}`)
    console.log(`  Duration: ${duration} minutes`)
  }
  console.log(`  Messages: ${messages.length}`)
  console.log()
  }
}

viewSessions().catch(console.error)
