const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data');

if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync(DB_PATH, { recursive: true });
}

const FILES = {
  users: path.join(DB_PATH, 'users.json'),
  choirs: path.join(DB_PATH, 'choirs.json'),
  sessions: path.join(DB_PATH, 'sessions.json'),
  progress: path.join(DB_PATH, 'progress.json'),
  announcements: path.join(DB_PATH, 'announcements.json'),
  notes: path.join(DB_PATH, 'notes.json')
};

function now() {
  return new Date().toISOString();
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function read(file) {
  try {
    if (!fs.existsSync(file)) {
      return [];
    }
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function write(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function getCollection(name) {
  return read(FILES[name]);
}

function saveCollection(name, rows) {
  write(FILES[name], rows);
}

function updateById(name, id, patch) {
  const rows = getCollection(name);
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) {
    return null;
  }
  rows[index] = { ...rows[index], ...patch, updatedAt: now() };
  saveCollection(name, rows);
  return rows[index];
}

function deleteById(name, id) {
  const rows = getCollection(name);
  const next = rows.filter((row) => row.id !== id);
  saveCollection(name, next);
}

function randomJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createChoir(payload) {
  const choirs = getCollection('choirs');
  let joinCode = randomJoinCode();
  const existing = new Set(choirs.map((choir) => choir.joinCode));
  while (existing.has(joinCode)) {
    joinCode = randomJoinCode();
  }
  const choir = {
    id: uid('choir'),
    joinCode,
    createdAt: now(),
    ...payload
  };
  choirs.push(choir);
  saveCollection('choirs', choirs);
  return choir;
}

function createUser(payload) {
  const users = getCollection('users');
  const user = {
    id: uid('usr'),
    streak: 0,
    lastActive: null,
    skills: {
      agility: 20,
      resonance: 20,
      solfege: 20,
      theory: 20,
      phrasing: 20,
      rhythm: 20,
      vowels: 20,
      diction: 20
    },
    createdAt: now(),
    ...payload
  };
  users.push(user);
  saveCollection('users', users);
  return user;
}

function createSession(payload) {
  const sessions = getCollection('sessions');
  const session = {
    id: uid('ses'),
    createdAt: now(),
    status: 'scheduled',
    modules: [],
    ...payload
  };
  sessions.push(session);
  saveCollection('sessions', sessions);
  return session;
}

function upsertProgress(payload) {
  const rows = getCollection('progress');
  const index = rows.findIndex(
    (row) => row.userId === payload.userId && row.sessionId === payload.sessionId
  );
  if (index >= 0) {
    rows[index] = { ...rows[index], ...payload, updatedAt: now() };
    saveCollection('progress', rows);
    return rows[index];
  }
  const created = {
    id: uid('prg'),
    createdAt: now(),
    updatedAt: now(),
    ...payload
  };
  rows.push(created);
  saveCollection('progress', rows);
  return created;
}

function createAnnouncement(payload) {
  const rows = getCollection('announcements');
  const created = {
    id: uid('ann'),
    createdAt: now(),
    ...payload
  };
  rows.push(created);
  saveCollection('announcements', rows);
  return created;
}

function createNote(payload) {
  const rows = getCollection('notes');
  const created = {
    id: uid('note'),
    createdAt: now(),
    ...payload
  };
  rows.push(created);
  saveCollection('notes', rows);
  return created;
}

function seedDefaultSessions(choirId, managerId) {
  const labels = [
    'Breath Foundations',
    'Resonance Control',
    'Agility and Runs',
    'Blend and Harmony',
    'Rhythm and Syncopation',
    'Dynamics and Expression',
    'Gospel Phrasing',
    'Performance Readiness'
  ];

  labels.forEach((title, i) => {
    createSession({
      choirId,
      managerId,
      order: i + 1,
      title,
      phase: i < 3 ? 'Foundation' : i < 6 ? 'Skill Build' : 'Performance',
      description: `Session ${i + 1}: ${title}`,
      durationMin: 75,
      modules: [
        { id: 'warmup', title: 'Warm-up', details: 'Breath and resonance setup for the day.' },
        { id: 'technique', title: 'Technique', details: 'Targeted drills for consistency and control.' },
        { id: 'application', title: 'Application', details: 'Apply techniques in arrangement excerpts.' }
      ]
    });
  });
}

function resetAll() {
  Object.keys(FILES).forEach((key) => write(FILES[key], []));
}

module.exports = {
  getCollection,
  saveCollection,
  updateById,
  deleteById,
  createChoir,
  createUser,
  createSession,
  upsertProgress,
  createAnnouncement,
  createNote,
  seedDefaultSessions,
  resetAll,
  randomJoinCode
};
