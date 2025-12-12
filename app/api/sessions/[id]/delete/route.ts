import { NextResponse } from 'next/server'
import getClient from '@/lib/db'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = getClient()
    const sessionId = params.id

    // Delete messages first (foreign key constraint)
    await client.execute({
      sql: 'DELETE FROM messages WHERE session_id = ?',
      args: [sessionId]
    })

    // Delete session
    await client.execute({
      sql: 'DELETE FROM sessions WHERE id = ?',
      args: [sessionId]
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}
