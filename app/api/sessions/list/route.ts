import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

export async function GET() {
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:data/local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    })

    // Get all sessions with message counts
    const result = await client.execute(`
      SELECT 
        s.id,
        s.created_at,
        s.ended_at,
        COUNT(m.id) as message_count
      FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `)

    return NextResponse.json({ sessions: result.rows })
  } catch (error) {
    console.error('Error listing sessions:', error)
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 })
  }
}
