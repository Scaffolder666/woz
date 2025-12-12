import { createClient } from '@libsql/client'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// Use Turso in production, SQLite locally
const useTurso = process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN

let db: any
let tursoClient: any

if (useTurso) {
  // Turso (cloud SQLite) for production
  console.log('Using Turso database')
  tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
} else {
  // Local SQLite for development
  console.log('Using local SQLite database')
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    console.log('Creating data directory:', dataDir)
    fs.mkdirSync(dataDir, { recursive: true })
  }
  const dbPath = path.join(dataDir, 'chat.db')
  db = new Database(dbPath)
}

// Initialize database schema
const initSchema = async () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      ended_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
  `

  if (useTurso) {
    await tursoClient.executeMultiple(schema)
  } else {
    db.exec(schema)
  }
}

// Initialize on import
initSchema().catch(console.error)

export interface Message {
  id?: number
  session_id: string
  role: 'expert' | 'learner'
  content: string
  timestamp: number
}

export interface Session {
  id: string
  created_at: number
  ended_at: number | null
}

export const dbHelpers = {
  createSession: async (id: string): Promise<Session> => {
    const timestamp = Date.now()
    if (useTurso) {
      await tursoClient.execute({
        sql: 'INSERT INTO sessions (id, created_at) VALUES (?, ?)',
        args: [id, timestamp]
      })
    } else {
      const stmt = db.prepare('INSERT INTO sessions (id, created_at) VALUES (?, ?)')
      stmt.run(id, timestamp)
    }
    return { id, created_at: timestamp, ended_at: null }
  },

  getSession: async (id: string): Promise<Session | null> => {
    if (useTurso) {
      const result = await tursoClient.execute({
        sql: 'SELECT * FROM sessions WHERE id = ?',
        args: [id]
      })
      return result.rows[0] as Session | null
    } else {
      const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?')
      return stmt.get(id) as Session | null
    }
  },

  endSession: async (id: string): Promise<void> => {
    const timestamp = Date.now()
    if (useTurso) {
      await tursoClient.execute({
        sql: 'UPDATE sessions SET ended_at = ? WHERE id = ?',
        args: [timestamp, id]
      })
    } else {
      const stmt = db.prepare('UPDATE sessions SET ended_at = ? WHERE id = ?')
      stmt.run(timestamp, id)
    }
  },

  saveMessage: async (message: Message): Promise<Message> => {
    if (useTurso) {
      const result = await tursoClient.execute({
        sql: 'INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?) RETURNING *',
        args: [message.session_id, message.role, message.content, message.timestamp]
      })
      return result.rows[0] as Message
    } else {
      const stmt = db.prepare(
        'INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)'
      )
      const info = stmt.run(
        message.session_id,
        message.role,
        message.content,
        message.timestamp
      )
      return { ...message, id: info.lastInsertRowid as number }
    }
  },

  getMessages: async (sessionId: string): Promise<Message[]> => {
    if (useTurso) {
      const result = await tursoClient.execute({
        sql: 'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
        args: [sessionId]
      })
      return result.rows as Message[]
    } else {
      const stmt = db.prepare(
        'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC'
      )
      return stmt.all(sessionId) as Message[]
    }
  },

  getSessionTranscript: async (sessionId: string): Promise<{ session: Session; messages: Message[] }> => {
    const session = await dbHelpers.getSession(sessionId)
    const messages = await dbHelpers.getMessages(sessionId)
    return { session: session!, messages }
  },
}

export default db
