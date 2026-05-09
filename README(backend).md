# ChoirIQ — Full Stack

AI-powered choir training platform. Two separate frontends, one shared backend.

```
choiriq/
├── backend/          ← Node.js + Express API
│   ├── server.js     ← Entry point
│   ├── db.js         ← JSON file database (swap to Postgres for production)
│   ├── auth.js       ← JWT + bcrypt helpers & middleware
│   ├── routes/
│   │   ├── auth.js      /api/auth/*
│   │   ├── sessions.js  /api/sessions/*
│   │   ├── progress.js  /api/progress/*
│   │   ├── choir.js     /api/choir/*
│   │   ├── admin.js     /api/admin/*
│   │   └── ai.js        /api/ai/chat
│   └── data/         ← Auto-created, stores JSON files
│
├── member-app/
│   ├── index.html    ← Member portal (single file)
│   └── api.js        ← Shared API client
│
└── leader-app/
    ├── index.html    ← Director portal (single file)
    └── api.js        ← Shared API client
```

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY
npm install
npm start
# Running on http://localhost:3001
```

### 2. Member App

Open `member-app/index.html` in a browser (or serve with any static server):

```bash
cd member-app
npx serve .   # or: python3 -m http.server 3000
```

Open http://localhost:3000

### 3. Leader App

```bash
cd leader-app
npx serve . -l 3002   # or: python3 -m http.server 3002
```

Open http://localhost:3002

---

## How It Works

### Leader Flow
1. Leader registers → creates a choir → receives a **6-character join code**
2. Leader shares the code with choir members (visible in the Director portal nav bar)
3. Leader creates sessions, posts announcements, writes personal notes to members
4. Leader views real-time analytics: skill averages, completion rates, leaderboard

### Member Flow
1. Member registers with the join code → linked to the choir instantly
2. Member sees their sessions, works through modules (breathing, resonance, agility, theory, etc.)
3. Interactive tools: live pitch checker (microphone), playable piano, drill timers, theory quiz
4. Member logs session completion → skills update, streak increments
5. Member chats with Maestro AI Coach 24/7

---

## API Reference

### Auth
| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | /api/auth/register | — | name, email, password, role, choirCode\|choirName |
| POST | /api/auth/login | — | email, password |
| GET | /api/auth/me | JWT | — |
| PATCH | /api/auth/me | JWT | name, voicePart, level |

### Choir
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/choir | JWT | Get own choir info |
| PATCH | /api/choir | Leader | Update choir details |
| GET | /api/choir/members | JWT | List choir members |
| GET | /api/choir/code | Leader | Get join code |
| POST | /api/choir/code/refresh | Leader | Generate new join code |
| POST | /api/choir/announcements | Leader | Post announcement |
| PATCH | /api/choir/announcements/:id | Leader/Admin | Edit announcement |
| GET | /api/choir/announcements | JWT | Read announcements |
| POST | /api/choir/notes | Leader | Write note for a member |
| GET | /api/choir/notes/me | Member | Read own notes |
| PATCH | /api/choir/member/:id | Leader/Admin | Update member voice part / level |

### Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/admin/managers | Admin | List all registered managers and choir metadata |

### Sessions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/sessions | JWT | All sessions for choir |
| GET | /api/sessions/:id | JWT | Single session |
| POST | /api/sessions | Leader | Create session |
| PATCH | /api/sessions/:id | Leader | Edit session |
| DELETE | /api/sessions/:id | Leader | Delete session |
| GET | /api/sessions/:id/attendance | Leader | Who completed this session |

### Progress
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/progress | Member | Log session completion |
| GET | /api/progress/me | Member | Own progress + skills |
| GET | /api/progress/choir | Leader | All member analytics |
| GET | /api/progress/member/:id | Leader | Specific member deep dive |

### AI
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/ai/chat | JWT | Chat with Maestro (role-aware system prompt) |

---

## Production Upgrade Path

The `db.js` file is the only layer that touches storage. To upgrade to PostgreSQL:
1. Replace `db.js` with a Postgres implementation using `pg` or `prisma`
2. All route files stay exactly the same
3. Run `npm install pg` (or `npm install prisma`)
4. Set `DATABASE_URL` in `.env`

For hosting:
- **Backend**: Railway, Render, Fly.io, or any Node host
- **Frontend apps**: Vercel, Netlify, or any static host
- Change `window.API_BASE` in each `index.html` to your deployed backend URL

---

## Environment Variables

```env
PORT=3001
GEMINI_API_KEY=...   # Required for AI chat
JWT_SECRET=change-me-in-production
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3002
NODE_ENV=development
ADMIN_ACCESS_CODE=... # Required to enable admin self-registration
DB_FILE=... # Optional explicit SQLite path
```

Note: On Render, add a persistent disk mounted to `/data` so SQLite survives restarts.
