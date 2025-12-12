import { config } from 'dotenv'
import { createClient } from '@libsql/client'

// Load environment variables
config({ path: '.env.local' })

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set')
  process.exit(1)
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function migrateDatabase() {
  console.log('🔄 Migrating Turso database schema...\n')

  try {
    // Add new columns to messages table
    await client.execute(`
      ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text'
    `)
    console.log('✅ Added message_type column')

    await client.execute(`
      ALTER TABLE messages ADD COLUMN metadata TEXT
    `)
    console.log('✅ Added metadata column')

    console.log('\n🎉 Migration completed successfully!')
  } catch (error: any) {
    if (error.message?.includes('duplicate column name')) {
      console.log('✅ Columns already exist, no migration needed')
    } else {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
  }
}

migrateDatabase()
