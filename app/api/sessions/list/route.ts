import { NextResponse } from 'next/server'
import { dbHelpers } from '@/lib/db'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

export async function GET() {
  try {
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    const dbPath = path.join(dataDir, 'chat.db')
    const db = new Database(dbPath)

    // Get all sessions with message counts
    const sessions = db.prepare(`
      SELECT 
        s.id,
        s.created_at,
        s.ended_at,
        COUNT(m.id) as message_count
      FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `).all()

    db.close()

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error listing sessions:', error)
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 })
  }
}
