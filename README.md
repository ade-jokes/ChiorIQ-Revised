# ChoirIQ-Revised

ChoirIQ-Revised is now implemented as a modular monorepo with:

- React + TanStack member app ([member-app](member-app))
- React + TanStack leader app ([leader-app](leader-app))
- Shared starter frontend ([frontend](frontend))
- Node.js + Express backend ([backend](backend))
- Shared API client ([api.js](api.js))

## What Was Built

### Frontend (React + TanStack)

- Role-based onboarding for **Admin**, **Choir Manager**, and **Choir Member**
- Dedicated app split:
  - Member Portal: [member-app](member-app)
  - Leader Portal: [leader-app](leader-app)
- 8-session learning dashboard with unlock flow and streak visibility
- Session experience with tabbed modules and expandable technique coverage
- Interactive tools:
  - Live Pitch Checker (Web Audio + tuning needle)
  - Playable Piano
  - Drill Timer
  - Music Theory Quiz (8 rotating categories)
  - Session Checklist and completion logging
  - AI Maestro chat panel
- Leader command center:
  - Member roster (TanStack Table)
  - Choir analytics
  - Announcements
  - Member notes

### Backend ([backend](backend))

- [backend/server.js](backend/server.js): Express app, CORS, routing, health endpoint, errors
- [backend/db.js](backend/db.js): file-based JSON data layer isolated in one place
- [backend/auth.js](backend/auth.js): JWT auth, bcrypt hashing, role middleware
- [backend/routes/auth.js](backend/routes/auth.js): register, login, me (get + update)
- [backend/routes/sessions.js](backend/routes/sessions.js): CRUD sessions + attendance
- [backend/routes/progress.js](backend/routes/progress.js): completion logging + analytics
- [backend/routes/choir.js](backend/routes/choir.js): join codes, announcements, notes, member management
- [backend/routes/ai.js](backend/routes/ai.js): secure server-side AI proxy

### Shared Client

- [api.js](api.js): shared API wrapper that sets `window.api` and is imported by all frontends.

## Architecture Notes

- Leaders/admins create choirs and receive 6-character join codes.
- Members register with join code and are scoped to that choir.
- JWT includes `role` + `choirId` for request scoping.
- AI calls are proxied through backend only; browser never sees Gemini key.

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Copy backend env file and configure key:

```bash
copy backend\.env.example backend\.env
```

Set `GEMINI_API_KEY` in [backend/.env](backend/.env).

3. Start backend:

```bash
npm run dev:backend
```

4. Start member frontend:

```bash
npm run dev:member
```

5. Start leader frontend:

```bash
npm run dev:leader
```

Member app runs on `http://localhost:5173`, leader app runs on `http://localhost:5174`, and backend runs on `http://localhost:3001`.

## Testing

- Backend API tests:

```bash
npm run test:backend
```

- Frontend build validation (all):

```bash
npm run build --workspace frontend
npm run build:member
npm run build:leader
```

## Project Layout

```
backend/
  server.js
  db.js
  auth.js
  routes/
    auth.js
    sessions.js
    progress.js
    choir.js
    ai.js
  tests/
    api.test.js
frontend/
  src/
    components/
    lib/
    main.jsx
    styles.css
member-app/
  src/
    components/
    lib/
    main.jsx
    styles.css
leader-app/
  src/
    components/
    lib/
    main.jsx
    styles.css
api.js
```
