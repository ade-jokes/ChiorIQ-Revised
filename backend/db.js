const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const IS_TEST_ENV = process.env.NODE_ENV === 'test';
const DEFAULT_DB_FILE = IS_TEST_ENV
  ? path.join(DATA_DIR, 'choiriq.test.sqlite')
  : path.join(DATA_DIR, 'choiriq.sqlite');

const configuredDbFile = process.env.DB_FILE;
const DB_FILE = configuredDbFile
  ? (path.isAbsolute(configuredDbFile)
      ? configuredDbFile
      : path.resolve(__dirname, configuredDbFile))
  : DEFAULT_DB_FILE;

const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(DB_FILE);
sqlite.pragma('journal_mode = WAL');

const SCHEMAS = {
  users: {
    table: 'users',
    columns: [
      'id', 'name', 'email', 'passwordHash', 'role', 'voicePart', 'level',
      'choirId', 'streak', 'lastActive', 'skills', 'createdAt', 'updatedAt'
    ]
  },
  choirs: {
    table: 'choirs',
    columns: ['id', 'joinCode', 'name', 'createdByRole', 'createdAt', 'updatedAt']
  },
  sessions: {
    table: 'sessions',
    columns: [
      'id', 'choirId', 'managerId', 'title', 'phase', 'description', 'date',
      'durationMin', 'status', 'orderIndex', 'modules', 'createdAt', 'updatedAt'
    ]
  },
  progress: {
    table: 'progress',
    columns: [
      'id', 'choirId', 'userId', 'sessionId', 'checks', 'theoryScore', 'skillDeltas',
      'durationMin', 'notes', 'completed', 'completedAt', 'createdAt', 'updatedAt'
    ]
  },
  announcements: {
    table: 'announcements',
    columns: ['id', 'choirId', 'managerId', 'title', 'text', 'type', 'createdAt', 'updatedAt']
  },
  notes: {
    table: 'notes',
    columns: ['id', 'choirId', 'managerId', 'memberId', 'text', 'type', 'createdAt', 'updatedAt']
  }
};

initSchema();

function initSchema() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL,
      voicePart TEXT,
      level TEXT,
      choirId TEXT NOT NULL,
      streak INTEGER NOT NULL DEFAULT 0,
      lastActive TEXT,
      skills TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS choirs (
      id TEXT PRIMARY KEY,
      joinCode TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      createdByRole TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      choirId TEXT NOT NULL,
      managerId TEXT,
      title TEXT NOT NULL,
      phase TEXT,
      description TEXT,
      date TEXT,
      durationMin INTEGER,
      status TEXT,
      orderIndex INTEGER,
      modules TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS progress (
      id TEXT PRIMARY KEY,
      choirId TEXT NOT NULL,
      userId TEXT NOT NULL,
      sessionId TEXT NOT NULL,
      checks TEXT,
      theoryScore INTEGER,
      skillDeltas TEXT,
      durationMin INTEGER,
      notes TEXT,
      completed INTEGER,
      completedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(userId, sessionId)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      choirId TEXT NOT NULL,
      managerId TEXT,
      title TEXT,
      text TEXT NOT NULL,
      type TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      choirId TEXT NOT NULL,
      managerId TEXT,
      memberId TEXT NOT NULL,
      text TEXT NOT NULL,
      type TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );
  `);
}

function now() {
  return new Date().toISOString();
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function randomJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toDb(collection, row) {
  const next = { ...row };

  if (collection === 'users') {
    next.skills = JSON.stringify(next.skills || {});
    next.streak = Number(next.streak || 0);
  }

  if (collection === 'sessions') {
    next.orderIndex = next.order !== undefined ? Number(next.order) : Number(next.orderIndex || 0);
    delete next.order;
    next.modules = JSON.stringify(next.modules || []);
    next.durationMin = Number(next.durationMin || 0);
  }

  if (collection === 'progress') {
    next.checks = JSON.stringify(next.checks || {});
    next.skillDeltas = JSON.stringify(next.skillDeltas || {});
    next.completed = next.completed ? 1 : 0;
    next.theoryScore = Number(next.theoryScore || 0);
    next.durationMin = Number(next.durationMin || 0);
  }

  return next;
}

function fromDb(collection, row) {
  if (!row) return row;
  const next = { ...row };

  if (collection === 'users') {
    next.skills = parseJson(next.skills, {
      agility: 20,
      resonance: 20,
      solfege: 20,
      theory: 20,
      phrasing: 20,
      rhythm: 20,
      vowels: 20,
      diction: 20
    });
  }

  if (collection === 'sessions') {
    next.modules = parseJson(next.modules, []);
    next.order = next.orderIndex;
    delete next.orderIndex;
  }

  if (collection === 'progress') {
    next.checks = parseJson(next.checks, {});
    next.skillDeltas = parseJson(next.skillDeltas, {});
    next.completed = Boolean(next.completed);
  }

  return next;
}

function schemaFor(collection) {
  const schema = SCHEMAS[collection];
  if (!schema) {
    throw new Error(`Unknown collection: ${collection}`);
  }
  return schema;
}

function insertOrReplace(collection, row) {
  const schema = schemaFor(collection);
  const dbRow = toDb(collection, row);
  const placeholders = schema.columns.map((c) => `@${c}`).join(', ');
  const columns = schema.columns.join(', ');
  const stmt = sqlite.prepare(`INSERT OR REPLACE INTO ${schema.table} (${columns}) VALUES (${placeholders})`);

  const values = {};
  schema.columns.forEach((column) => {
    values[column] = dbRow[column] !== undefined ? dbRow[column] : null;
  });

  stmt.run(values);
}

function getCollection(collection) {
  const schema = schemaFor(collection);
  const rows = sqlite.prepare(`SELECT * FROM ${schema.table}`).all();
  return rows.map((row) => fromDb(collection, row));
}

function saveCollection(collection, rows) {
  const schema = schemaFor(collection);
  const tx = sqlite.transaction((allRows) => {
    sqlite.prepare(`DELETE FROM ${schema.table}`).run();
    allRows.forEach((row) => insertOrReplace(collection, row));
  });
  tx(rows || []);
}

function findById(collection, id) {
  const schema = schemaFor(collection);
  const row = sqlite.prepare(`SELECT * FROM ${schema.table} WHERE id = ?`).get(id);
  return fromDb(collection, row);
}

function updateById(collection, id, patch) {
  const current = findById(collection, id);
  if (!current) {
    return null;
  }

  const updated = { ...current, ...patch, updatedAt: now() };
  insertOrReplace(collection, updated);
  return findById(collection, id);
}

function deleteById(collection, id) {
  const schema = schemaFor(collection);
  sqlite.prepare(`DELETE FROM ${schema.table} WHERE id = ?`).run(id);
}

function createChoir(payload) {
  let joinCode = randomJoinCode();
  while (sqlite.prepare('SELECT 1 FROM choirs WHERE joinCode = ?').get(joinCode)) {
    joinCode = randomJoinCode();
  }

  const choir = {
    id: uid('choir'),
    joinCode,
    createdAt: now(),
    ...payload
  };
  insertOrReplace('choirs', choir);
  return findById('choirs', choir.id);
}

function createUser(payload) {
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
  insertOrReplace('users', user);
  return findById('users', user.id);
}

function createSession(payload) {
  const session = {
    id: uid('ses'),
    createdAt: now(),
    status: 'scheduled',
    modules: [],
    ...payload
  };
  insertOrReplace('sessions', session);
  return findById('sessions', session.id);
}

function upsertProgress(payload) {
  const existing = sqlite
    .prepare('SELECT * FROM progress WHERE userId = ? AND sessionId = ?')
    .get(payload.userId, payload.sessionId);

  if (existing) {
    const current = fromDb('progress', existing);
    const next = {
      ...current,
      ...payload,
      id: current.id,
      updatedAt: now()
    };
    insertOrReplace('progress', next);
    return findById('progress', current.id);
  }

  const created = {
    id: uid('prg'),
    createdAt: now(),
    updatedAt: now(),
    ...payload
  };

  insertOrReplace('progress', created);
  return findById('progress', created.id);
}

function createAnnouncement(payload) {
  const created = {
    id: uid('ann'),
    createdAt: now(),
    ...payload
  };
  insertOrReplace('announcements', created);
  return findById('announcements', created.id);
}

function createNote(payload) {
  const created = {
    id: uid('note'),
    createdAt: now(),
    ...payload
  };
  insertOrReplace('notes', created);
  return findById('notes', created.id);
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
  if (!IS_TEST_ENV && process.env.ALLOW_DB_RESET !== 'true') {
    throw new Error('Refusing to reset database outside test environment. Set ALLOW_DB_RESET=true only for intentional full wipes.');
  }

  const tx = sqlite.transaction(() => {
    sqlite.prepare('DELETE FROM progress').run();
    sqlite.prepare('DELETE FROM notes').run();
    sqlite.prepare('DELETE FROM announcements').run();
    sqlite.prepare('DELETE FROM sessions').run();
    sqlite.prepare('DELETE FROM users').run();
    sqlite.prepare('DELETE FROM choirs').run();
  });
  tx();
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
  randomJoinCode,
  DB_FILE
};
