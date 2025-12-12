# CAD Tutor - Wizard of Oz System

A real-time tutoring system for CAD learning that enables experts to provide text-based feedback to learners during their design sessions.

## Features

- 🎯 **Role-Based Interface**: Separate views for Expert and Learner
- 💬 **Real-time Chat**: Instant text communication using Socket.IO
- 📝 **Session Recording**: All conversations are saved to SQLite database
- 🔗 **Simple Session Sharing**: Expert creates a session, Learner joins with code
- 📹 **Screen Sharing Ready**: Use Zoom alongside for visual context
- 📊 **Data Collection**: Timestamps and full transcripts for AI training
- 📚 **Session History**: Web interface to view and export all past sessions

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Network Access (Multiple Computers)

To allow Expert and Learner to use different computers:

1. **Find your server's IP address:**
   ```bash
   # On macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # On Windows
   ipconfig
   ```

2. **Start the server:**
   ```bash
   npm run dev
   ```

3. **Access from other computers:**
   - Expert computer: `http://[SERVER_IP]:3000` (e.g., `http://192.168.1.100:3000`)
   - Learner computer: Use the same URL
   - Both computers must be on the same network (same WiFi/LAN)

4. **Firewall settings:**
   - Make sure port 3000 is allowed through your firewall
   - On macOS: System Settings → Network → Firewall
   - On Windows: Windows Defender Firewall → Allow an app

### Usage

1. **Expert starts a session:**
   - Go to homepage
   - Click "Create Session"
   - Share the session code with learner
   - Start a Zoom meeting and share your screen (optional)

2. **Learner joins:**
   - Go to homepage
   - Enter the session code
   - Click "Join Session"
   - Join the Zoom meeting (optional)

3. **Chat in real-time:**
   - Both parties can send messages
   - All messages are timestamped and saved
   - Expert can end the session when done

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Real-time**: Socket.IO
- **Database**: SQLite (via better-sqlite3)
- **Session IDs**: nanoid

## Database Schema

### Sessions Table
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  ended_at INTEGER
);
```

### Messages Table
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'expert' or 'learner'
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

## API Endpoints

### POST `/api/session/create`
Creates a new session and returns a session ID.

**Response:**
```json
{
  "sessionId": "abc12345"
}
```

### GET `/api/session/[id]`
Retrieves session details and all messages.

**Response:**
```json
{
  "session": {
    "id": "abc12345",
    "created_at": 1234567890,
    "ended_at": null
  },
  "messages": [
    {
      "id": 1,
      "session_id": "abc12345",
      "role": "expert",
      "content": "Hello!",
      "timestamp": 1234567890
    }
  ]
}
```

## Socket.IO Events

### Client → Server

- `join-session`: Join a session room
  ```ts
  { sessionId: string, role: 'expert' | 'learner' }
  ```

- `send-message`: Send a message
  ```ts
  { sessionId: string, role: 'expert' | 'learner', content: string }
  ```

- `end-session`: End a session
  ```ts
  { sessionId: string }
  ```

### Server → Client

- `load-messages`: Initial message history
- `new-message`: New message broadcast
- `user-joined`: Another user joined the session
- `session-ended`: Session has been terminated

## Data Storage

All data is stored in `./data/chat.db` (SQLite database).

### Viewing Session History

**Via Web Interface:**
1. Go to `http://localhost:3000/history`
2. Browse all sessions (active and completed)
3. Click on any session to view full transcript
4. Export individual sessions as JSON

**Via Command Line:**
```bash
# List all sessions
npm run sessions

# Export specific session
npm run export [session-id] [output-path]
# Example: npm run export abc123 ./my-session.json
```

### Programmatic Access

To export session transcripts for AI training:

```javascript
import { dbHelpers } from './lib/db'

// Get full transcript
const transcript = dbHelpers.getSessionTranscript('session-id')
console.log(JSON.stringify(transcript, null, 2))
```

## Future: AI Integration

This WoZ system is designed to eventually replace the human expert with AI. The collected data will be used to:

1. Train vision models to understand CAD screen activity
2. Fine-tune LLMs on expert feedback patterns
3. Build context-aware tutoring agents

### Next Steps for AI:
- Add screen capture/recording capability
- Implement frame sampling and diff detection
- Integrate Claude API for response generation
- Build evaluation framework using WoZ transcripts

## Development Notes

### File Structure
```
cad-tutor-woz/
├── app/
│   ├── api/
│   │   └── session/
│   │       ├── create/route.ts
│   │       └── [id]/route.ts
│   ├── chat/
│   │   └── page.tsx          # Chat interface
│   ├── page.tsx              # Homepage (role selection)
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   └── db.ts                 # Database helpers
├── data/
│   └── chat.db               # SQLite database
├── server.ts                 # Custom server with Socket.IO
├── package.json
└── tsconfig.json
```

### Running in Production

```bash
# Build
npm run build

# Start production server
npm start
```

## Deployment

### Deploy to Vercel (Recommended - Free)

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com) and sign up (free)
   - Click "New Project"
   - Import your GitHub repository
   - Click "Deploy" (no configuration needed!)

3. **Access your app:**
   - Vercel will give you a URL like `https://your-app.vercel.app`
   - Share this URL with Expert and Learner
   - Works from anywhere in the world! 🌍

**Note:** SQLite database will reset on each deployment. For production use, consider:
- Using Vercel Postgres (free tier available)
- Or deploy to Railway instead (supports persistent SQLite)

### Alternative: Deploy to Railway ($5/month)

Railway is better if you need persistent SQLite database:

1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Deploy automatically
4. Database persists between deployments

## Troubleshooting

### Port already in use
If port 3000 is taken, edit `server.ts` and change the port number.

### Database locked
SQLite doesn't handle concurrent writes well. The current implementation should be fine for WoZ sessions (1 expert + 1 learner).

### Socket connection issues
The app now automatically connects to the correct server. No configuration needed!

## License

MIT
