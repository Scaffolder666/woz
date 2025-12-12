import { NextResponse } from 'next/server'
import getClient from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const client = getClient()

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

    console.log('Sessions found:', result.rows.length)

    return NextResponse.json({ 
      sessions: result.rows,
      database: process.env.TURSO_DATABASE_URL ? 'Turso Cloud' : 'Local'
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Error listing sessions:', error)
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 })
  }
}
