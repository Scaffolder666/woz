import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { dbHelpers } from '@/lib/db'

export async function POST() {
  try {
    const sessionId = nanoid(8) // Generate 8-character session code
    await dbHelpers.createSession(sessionId)
    
    return NextResponse.json({ sessionId })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
