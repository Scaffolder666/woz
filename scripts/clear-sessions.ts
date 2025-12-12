import { config } from 'dotenv'
import { createClient } from '@libsql/client'

// Load environment variables
config({ path: '.env.local' })

// Get database client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:data/local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function clearAllSessions() {
  console.log('🗑️  Clearing all sessions from database...\n')

  // Get count before deletion
  const countBefore = await client.execute('SELECT COUNT(*) as count FROM sessions')
  const sessionCount = countBefore.rows[0].count

  console.log(`Found ${sessionCount} sessions`)

  if (sessionCount === 0) {
    console.log('✅ Database is already empty')
    return
  }

  // Confirm deletion
  console.log('\n⚠️  WARNING: This will DELETE ALL sessions and messages!')
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...')
  
  await new Promise(resolve => setTimeout(resolve, 3000))

  // Delete all messages first (foreign key constraint)
  await client.execute('DELETE FROM messages')
  console.log('✅ Deleted all messages')

  // Delete all sessions
  await client.execute('DELETE FROM sessions')
  console.log('✅ Deleted all sessions')

  console.log('\n🎉 Database cleared successfully!')
}

clearAllSessions().catch(console.error)
