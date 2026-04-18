const express = require('express');
const router = express.Router();
const db = require('../db');
const { signToken, hashPassword, checkPassword, requireAuth, sanitizeUser } = require('../auth');

// ── POST /api/auth/register ───────────────────────────────────
// Body: { name, email, password, role: 'leader'|'member', voicePart?, choirCode? (member), choirName? (leader) }
router.post('/register', (req, res) => {
  const { name, email, password, role, voicePart, choirCode, choirName, level } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password and role are required' });
  }
  if (!['leader', 'member'].includes(role)) {
    return res.status(400).json({ error: 'role must be leader or member' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  let choirId = null;

  if (role === 'leader') {
    if (!choirName) return res.status(400).json({ error: 'choirName is required for leaders' });
    const choir = db.createChoir({ name: choirName, leaderId: null }); // updated after user created
    choirId = choir.id;
  } else {
    // member must supply a join code
    if (!choirCode) return res.status(400).json({ error: 'choirCode is required for members' });
    const choir = db.getChoirByCode(choirCode);
    if (!choir) return res.status(404).json({ error: 'Choir not found. Check your join code.' });
    choirId = choir.id;
  }

  const user = db.createUser({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashPassword(password),
    role,
    choirId,
    voicePart: voicePart || null,
    level: level || 'beginner',
    streak: 0,
    lastActive: null,
    skills: {
      breath: 5, resonance: 5, pitch: 5, harmony: 5,
      agility: 5, dynamics: 5, diction: 5, theory: 5,
      rhythm: 5, gospel: 5,
    },
  });

  // If leader, update choir with their userId
  if (role === 'leader') {
    db.updateChoir(choirId, { leaderId: user.id });
  }

  const token = signToken({ id: user.id, role: user.role, choirId: user.choirId });
  return res.status(201).json({ token, user: sanitizeUser(user) });
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const user = db.getUserByEmail(email);
  if (!user || !checkPassword(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Touch lastActive
  db.updateUser(user.id, { lastActive: new Date().toISOString() });

  const token = signToken({ id: user.id, role: user.role, choirId: user.choirId });
  return res.json({ token, user: sanitizeUser(user) });
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: sanitizeUser(user) });
});

// ── PATCH /api/auth/me ────────────────────────────────────────
router.patch('/me', requireAuth, (req, res) => {
  const allowed = ['name', 'voicePart', 'level'];
  const patch = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) patch[k] = req.body[k]; });
  const updated = db.updateUser(req.user.id, patch);
  res.json({ user: sanitizeUser(updated) });
});

module.exports = router;
