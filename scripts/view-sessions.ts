import { dbHelpers } from '../lib/db'
import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'

// Get database path
const dbPath = path.join(process.cwd(), 'data', 'chat.db')
const db = new Database(dbPath)

// Get all sessions
const sessions = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all()

console.log(`\n📊 Total sessions: ${sessions.length}\n`)

sessions.forEach((session: any) => {
  const messages = dbHelpers.getMessages(session.id)
  const status = session.ended_at ? '✅ Ended' : '🔄 Active'
  const duration = session.ended_at 
    ? Math.round((session.ended_at - session.created_at) / 1000 / 60) 
    : 'ongoing'
  
  console.log(`${status} Session: ${session.id}`)
  console.log(`  Created: ${new Date(session.created_at).toLocaleString()}`)
  if (session.ended_at) {
    console.log(`  Ended: ${new Date(session.ended_at).toLocaleString()}`)
    console.log(`  Duration: ${duration} minutes`)
  }
  console.log(`  Messages: ${messages.length}`)
  console.log()
})

// Export function to get specific session
export function exportSession(sessionId: string, outputPath?: string) {
  const transcript = dbHelpers.getSessionTranscript(sessionId)
  
  if (!transcript.session) {
    console.error(`Session ${sessionId} not found`)
    return
  }

  const output = {
    session: {
      id: transcript.session.id,
      created_at: new Date(transcript.session.created_at).toISOString(),
      ended_at: transcript.session.ended_at 
        ? new Date(transcript.session.ended_at).toISOString() 
        : null,
      duration_minutes: transcript.session.ended_at
        ? Math.round((transcript.session.ended_at - transcript.session.created_at) / 1000 / 60)
        : null,
      message_count: transcript.messages.length
    },
    messages: transcript.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp).toISOString()
    }))
  }

  const jsonStr = JSON.stringify(output, null, 2)

  if (outputPath) {
    fs.writeFileSync(outputPath, jsonStr)
    console.log(`✅ Exported to ${outputPath}`)
  } else {
    console.log(jsonStr)
  }

  return output
}

// If run directly (not imported)
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.length > 0 && args[0] === 'export' && args[1]) {
    const sessionId = args[1]
    const outputPath = args[2] || `./exports/${sessionId}.json`
    
    // Create exports directory if it doesn't exist
    const exportsDir = path.dirname(outputPath)
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true })
    }
    
    exportSession(sessionId, outputPath)
  }
}
