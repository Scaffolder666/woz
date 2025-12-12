import { NextResponse } from 'next/server'
import { dbHelpers } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id
    const session = await dbHelpers.getSession(sessionId)
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const messages = await dbHelpers.getMessages(sessionId)
    
    return NextResponse.json({ session, messages })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
