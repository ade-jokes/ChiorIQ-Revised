const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireLeader, sanitizeUser } = require('../auth');

// ── GET /api/choir — get own choir info ───────────────────────
router.get('/', requireAuth, (req, res) => {
  const choir = db.getChoirById(req.user.choirId);
  if (!choir) return res.status(404).json({ error: 'Choir not found' });
  res.json({ choir });
});

// ── PATCH /api/choir — leader updates choir info ─────────────
router.patch('/', requireLeader, (req, res) => {
  const allowed = ['name', 'description', 'genre', 'meetingTime', 'meetingDay'];
  const patch = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) patch[k] = req.body[k]; });
  const updated = db.updateChoir(req.user.choirId, patch);
  res.json({ choir: updated });
});

// ── GET /api/choir/members — all members of the choir ─────────
router.get('/members', requireAuth, (req, res) => {
  const members = db.getUsersByChoir(req.user.choirId)
    .filter(u => u.role === 'member')
    .map(sanitizeUser);
  res.json({ members });
});

// ── GET /api/choir/code — leader fetches join code ────────────
router.get('/code', requireLeader, (req, res) => {
  const choir = db.getChoirById(req.user.choirId);
  res.json({ joinCode: choir.joinCode });
});

// ── POST /api/choir/code/refresh — regenerate join code ───────
router.post('/code/refresh', requireLeader, (req, res) => {
  // Generate a new code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  const updated = db.updateChoir(req.user.choirId, { joinCode: code });
  res.json({ joinCode: updated.joinCode });
});

// ── POST /api/choir/announce — leader posts announcement ──────
router.post('/announce', requireLeader, (req, res) => {
  const { text, type } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const msg = db.createMessage({
    choirId: req.user.choirId,
    leaderId: req.user.id,
    text,
    type: type || 'info', // info | reminder | praise
  });
  res.status(201).json({ message: msg });
});

// ── GET /api/choir/announcements ─────────────────────────────
router.get('/announcements', requireAuth, (req, res) => {
  const msgs = db.getMessagesByChoir(req.user.choirId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20);
  res.json({ announcements: msgs });
});

// ── POST /api/choir/notes — leader writes note for a member ──
router.post('/notes', requireLeader, (req, res) => {
  const { memberId, text, type } = req.body;
  if (!memberId || !text) return res.status(400).json({ error: 'memberId and text required' });

  const member = db.getUserById(memberId);
  if (!member || member.choirId !== req.user.choirId) {
    return res.status(404).json({ error: 'Member not found in your choir' });
  }
  const note = db.createNote({
    choirId: req.user.choirId,
    leaderId: req.user.id,
    memberId,
    text,
    type: type || 'general', // general | praise | improvement | health
  });
  res.status(201).json({ note });
});

// ── GET /api/choir/notes/me — member sees their own notes ─────
router.get('/notes/me', requireAuth, (req, res) => {
  const notes = db.getNotesByMember(req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ notes });
});

// ── PATCH /api/choir/member/:id — leader updates member voicePart/level ─
router.patch('/member/:id', requireLeader, (req, res) => {
  const member = db.getUserById(req.params.id);
  if (!member || member.choirId !== req.user.choirId) {
    return res.status(404).json({ error: 'Member not found' });
  }
  const allowed = ['voicePart', 'level', 'name'];
  const patch = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) patch[k] = req.body[k]; });
  const updated = db.updateUser(req.params.id, patch);
  res.json({ member: sanitizeUser(updated) });
});

module.exports = router;
