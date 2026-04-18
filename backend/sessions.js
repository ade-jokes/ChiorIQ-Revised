const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireLeader } = require('../auth');

// ── GET /api/sessions — get all sessions for caller's choir ──
router.get('/', requireAuth, (req, res) => {
  const sessions = db.getSessionsByChoir(req.user.choirId);
  res.json({ sessions });
});

// ── GET /api/sessions/:id ─────────────────────────────────────
router.get('/:id', requireAuth, (req, res) => {
  const session = db.getSessionById(req.params.id);
  if (!session || session.choirId !== req.user.choirId) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ session });
});

// ── POST /api/sessions — leader creates a session ─────────────
router.post('/', requireLeader, (req, res) => {
  const { title, date, phase, description, modules, durationMin } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'title and date required' });

  const session = db.createSession({
    choirId: req.user.choirId,
    leaderId: req.user.id,
    title,
    date,
    phase: phase || 'General',
    description: description || '',
    modules: modules || [],
    durationMin: durationMin || 60,
    status: 'scheduled', // scheduled | active | completed
  });
  res.status(201).json({ session });
});

// ── PATCH /api/sessions/:id — leader edits ───────────────────
router.patch('/:id', requireLeader, (req, res) => {
  const session = db.getSessionById(req.params.id);
  if (!session || session.choirId !== req.user.choirId) {
    return res.status(404).json({ error: 'Session not found' });
  }
  const allowed = ['title', 'date', 'phase', 'description', 'modules', 'durationMin', 'status', 'focusNotes'];
  const patch = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) patch[k] = req.body[k]; });
  const updated = db.updateSession(req.params.id, patch);
  res.json({ session: updated });
});

// ── DELETE /api/sessions/:id ─────────────────────────────────
router.delete('/:id', requireLeader, (req, res) => {
  const session = db.getSessionById(req.params.id);
  if (!session || session.choirId !== req.user.choirId) {
    return res.status(404).json({ error: 'Session not found' });
  }
  db.deleteSession(req.params.id);
  res.json({ ok: true });
});

// ── GET /api/sessions/:id/attendance — who completed this session ─
router.get('/:id/attendance', requireLeader, (req, res) => {
  const session = db.getSessionById(req.params.id);
  if (!session || session.choirId !== req.user.choirId) {
    return res.status(404).json({ error: 'Session not found' });
  }
  const progress = db.getProgressBySession(req.params.id);
  // Enrich with user name/voicePart
  const enriched = progress.map(p => {
    const user = db.getUserById(p.userId);
    return {
      ...p,
      memberName: user ? user.name : 'Unknown',
      voicePart: user ? user.voicePart : null,
    };
  });
  res.json({ attendance: enriched });
});

module.exports = router;
