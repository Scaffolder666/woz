import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'chat.db')
const db = new Database(dbPath)

// Initialize database schema
db.exec(`
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
`)

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
  createSession: (id: string): Session => {
    const stmt = db.prepare('INSERT INTO sessions (id, created_at) VALUES (?, ?)')
    const timestamp = Date.now()
    stmt.run(id, timestamp)
    return { id, created_at: timestamp, ended_at: null }
  },

  getSession: (id: string): Session | null => {
    const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?')
    return stmt.get(id) as Session | null
  },

  endSession: (id: string): void => {
    const stmt = db.prepare('UPDATE sessions SET ended_at = ? WHERE id = ?')
    stmt.run(Date.now(), id)
  },

  saveMessage: (message: Message): Message => {
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
  },

  getMessages: (sessionId: string): Message[] => {
    const stmt = db.prepare(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC'
    )
    return stmt.all(sessionId) as Message[]
  },

  getSessionTranscript: (sessionId: string): { session: Session; messages: Message[] } => {
    const session = dbHelpers.getSession(sessionId)
    const messages = dbHelpers.getMessages(sessionId)
    return { session: session!, messages }
  },
}

export default db
