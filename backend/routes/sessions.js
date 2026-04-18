const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const sessions = db
    .getCollection('sessions')
    .filter((session) => session.choirId === req.user.choirId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json({ sessions });
});

router.post('/', requireRole('manager', 'admin'), (req, res) => {
  const { title, phase, description, date, durationMin, modules, order } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required.' });
  }

  const session = db.createSession({
    title,
    phase: phase || 'General',
    description: description || '',
    date: date || null,
    durationMin: durationMin || 60,
    modules: Array.isArray(modules) ? modules : [],
    order: Number(order || 1),
    choirId: req.user.choirId,
    managerId: req.user.id
  });

  return res.status(201).json({ session });
});

router.patch('/:id', requireRole('manager', 'admin'), (req, res) => {
  const session = db.getCollection('sessions').find((item) => item.id === req.params.id);
  if (!session || session.choirId !== req.user.choirId) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  const allowed = ['title', 'phase', 'description', 'date', 'durationMin', 'modules', 'status', 'order'];
  const patch = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      patch[field] = req.body[field];
    }
  });

  const updated = db.updateById('sessions', req.params.id, patch);
  return res.json({ session: updated });
});

router.delete('/:id', requireRole('manager', 'admin'), (req, res) => {
  const session = db.getCollection('sessions').find((item) => item.id === req.params.id);
  if (!session || session.choirId !== req.user.choirId) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  db.deleteById('sessions', req.params.id);
  return res.json({ ok: true });
});

router.get('/:id/attendance', requireRole('manager', 'admin'), (req, res) => {
  const session = db.getCollection('sessions').find((item) => item.id === req.params.id);
  if (!session || session.choirId !== req.user.choirId) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  const users = db.getCollection('users');
  const attendance = db
    .getCollection('progress')
    .filter((item) => item.sessionId === req.params.id)
    .map((item) => {
      const member = users.find((user) => user.id === item.userId);
      return {
        ...item,
        memberName: member ? member.name : 'Unknown',
        voicePart: member ? member.voicePart : 'Unassigned'
      };
    });

  return res.json({ attendance });
});

module.exports = router;
