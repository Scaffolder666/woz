import { createClient } from '@libsql/client'

// Use Turso in production, create in-memory client for local development
const useTurso = process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN

let client: any

if (useTurso) {
  // Turso (cloud SQLite) for production
  console.log('Using Turso database')
  client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
} else {
  // In-memory database for local development (or use local Turso instance)
  console.log('Using local Turso database')
  client = createClient({
    url: 'file:data/local.db'
  })
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

  await client.executeMultiple(schema)
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
    await client.execute({
      sql: 'INSERT INTO sessions (id, created_at) VALUES (?, ?)',
      args: [id, timestamp]
    })
    return { id, created_at: timestamp, ended_at: null }
  },

  getSession: async (id: string): Promise<Session | null> => {
    const result = await client.execute({
      sql: 'SELECT * FROM sessions WHERE id = ?',
      args: [id]
    })
    return result.rows[0] as Session | null
  },

  endSession: async (id: string): Promise<void> => {
    const timestamp = Date.now()
    await client.execute({
      sql: 'UPDATE sessions SET ended_at = ? WHERE id = ?',
      args: [timestamp, id]
    })
  },

  saveMessage: async (message: Message): Promise<Message> => {
    const result = await client.execute({
      sql: 'INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?) RETURNING *',
      args: [message.session_id, message.role, message.content, message.timestamp]
    })
    return result.rows[0] as Message
  },

  getMessages: async (sessionId: string): Promise<Message[]> => {
    const result = await client.execute({
      sql: 'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      args: [sessionId]
    })
    return result.rows as Message[]
  },

  getSessionTranscript: async (sessionId: string): Promise<{ session: Session; messages: Message[] }> => {
    const session = await dbHelpers.getSession(sessionId)
    const messages = await dbHelpers.getMessages(sessionId)
    return { session: session!, messages }
  },
}

export default db
