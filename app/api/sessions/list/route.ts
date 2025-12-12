import { NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'chat.db')
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

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error listing sessions:', error)
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 })
  }
}
