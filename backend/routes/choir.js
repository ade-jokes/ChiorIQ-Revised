const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, sanitizeUser } = require('../auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const choir = db.getCollection('choirs').find((item) => item.id === req.user.choirId);
  if (!choir) {
    return res.status(404).json({ error: 'Choir not found.' });
  }
  return res.json({ choir });
});

router.get('/code', requireRole('manager', 'admin'), (req, res) => {
  const choir = db.getCollection('choirs').find((item) => item.id === req.user.choirId);
  if (!choir) {
    return res.status(404).json({ error: 'Choir not found.' });
  }
  return res.json({ joinCode: choir.joinCode });
});

router.post('/code/refresh', requireRole('manager', 'admin'), (req, res) => {
  const choir = db.getCollection('choirs').find((item) => item.id === req.user.choirId);
  if (!choir) {
    return res.status(404).json({ error: 'Choir not found.' });
  }
  const joinCode = db.randomJoinCode();
  const updated = db.updateById('choirs', choir.id, { joinCode });
  return res.json({ joinCode: updated.joinCode });
});

router.get('/members', requireRole('manager', 'admin'), (req, res) => {
  const members = db
    .getCollection('users')
    .filter((user) => user.choirId === req.user.choirId && user.role === 'member')
    .map(sanitizeUser);
  return res.json({ members });
});

router.patch('/member/:id', requireRole('manager', 'admin'), (req, res) => {
  const target = db.getCollection('users').find((user) => user.id === req.params.id);
  if (!target || target.choirId !== req.user.choirId) {
    return res.status(404).json({ error: 'Member not found.' });
  }

  const allowed = ['name', 'voicePart', 'level'];
  const patch = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      patch[field] = req.body[field];
    }
  });

  const updated = db.updateById('users', target.id, patch);
  return res.json({ member: sanitizeUser(updated) });
});

router.post('/announcements', requireRole('manager', 'admin'), (req, res) => {
  const { title, text, type } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'text is required.' });
  }

  const created = db.createAnnouncement({
    choirId: req.user.choirId,
    managerId: req.user.id,
    title: title || 'Choir Update',
    text,
    type: type || 'info'
  });

  return res.status(201).json({ announcement: created });
});

router.patch('/announcements/:id', requireRole('manager', 'admin'), (req, res) => {
  const announcement = db.getCollection('announcements').find((item) => item.id === req.params.id);
  if (!announcement || announcement.choirId !== req.user.choirId) {
    return res.status(404).json({ error: 'Announcement not found.' });
  }

  const allowed = ['title', 'text', 'type'];
  const patch = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      patch[field] = req.body[field];
    }
  });

  if (patch.text !== undefined && !patch.text) {
    return res.status(400).json({ error: 'text is required.' });
  }

  const updated = db.updateById('announcements', announcement.id, patch);
  return res.json({ announcement: updated });
});

router.get('/announcements', requireAuth, (req, res) => {
  const announcements = db
    .getCollection('announcements')
    .filter((item) => item.choirId === req.user.choirId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json({ announcements });
});

router.post('/notes', requireRole('manager', 'admin'), (req, res) => {
  const { memberId, text, type } = req.body;
  if (!memberId || !text) {
    return res.status(400).json({ error: 'memberId and text are required.' });
  }

  const member = db.getCollection('users').find((user) => user.id === memberId);
  if (!member || member.choirId !== req.user.choirId || member.role !== 'member') {
    return res.status(404).json({ error: 'Member not found.' });
  }

  const note = db.createNote({
    choirId: req.user.choirId,
    managerId: req.user.id,
    memberId,
    text,
    type: type || 'general'
  });

  return res.status(201).json({ note });
});

router.get('/notes/me', requireAuth, (req, res) => {
  const notes = db
    .getCollection('notes')
    .filter((item) => item.memberId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json({ notes });
});

module.exports = router;
