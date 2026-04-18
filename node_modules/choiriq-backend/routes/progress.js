const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, sanitizeUser } = require('../auth');

const router = express.Router();

function updateSkillMap(current, deltas = {}) {
  const next = { ...current };
  Object.keys(next).forEach((key) => {
    if (typeof deltas[key] === 'number') {
      next[key] = Math.max(0, Math.min(100, next[key] + deltas[key]));
    }
  });
  return next;
}

router.post('/', requireAuth, (req, res) => {
  const {
    sessionId,
    checks,
    theoryScore,
    skillDeltas,
    durationMin,
    notes
  } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required.' });
  }

  const session = db.getCollection('sessions').find((item) => item.id === sessionId);
  if (!session || session.choirId !== req.user.choirId) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  const users = db.getCollection('users');
  const user = users.find((item) => item.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const today = new Date();
  const last = user.lastActive ? new Date(user.lastActive) : null;
  let streak = user.streak || 0;

  if (!last) {
    streak = 1;
  } else {
    const deltaDays = Math.floor((today - last) / 86400000);
    if (deltaDays === 1) streak += 1;
    else if (deltaDays > 1) streak = 1;
  }

  const skills = updateSkillMap(user.skills || {}, skillDeltas || {});
  db.updateById('users', user.id, { streak, skills, lastActive: today.toISOString() });

  const progress = db.upsertProgress({
    choirId: req.user.choirId,
    userId: req.user.id,
    sessionId,
    checks: checks || {},
    theoryScore: Number(theoryScore || 0),
    skillDeltas: skillDeltas || {},
    durationMin: Number(durationMin || 0),
    notes: notes || '',
    completed: true,
    completedAt: today.toISOString()
  });

  const updatedUser = db.getCollection('users').find((item) => item.id === req.user.id);
  return res.status(201).json({
    progress,
    user: sanitizeUser(updatedUser)
  });
});

router.get('/me', requireAuth, (req, res) => {
  const progress = db
    .getCollection('progress')
    .filter((item) => item.userId === req.user.id)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  const user = db.getCollection('users').find((item) => item.id === req.user.id);
  return res.json({ progress, user: sanitizeUser(user) });
});

router.get('/choir', requireRole('manager', 'admin'), (req, res) => {
  const allUsers = db.getCollection('users');
  const members = allUsers.filter((user) => user.choirId === req.user.choirId && user.role === 'member');
  const progress = db.getCollection('progress').filter((item) => item.choirId === req.user.choirId);
  const sessions = db.getCollection('sessions').filter((item) => item.choirId === req.user.choirId);

  const memberStats = members.map((member) => {
    const rows = progress.filter((row) => row.userId === member.id);
    const avgTheory = rows.length
      ? Math.round(rows.reduce((acc, row) => acc + Number(row.theoryScore || 0), 0) / rows.length)
      : 0;

    return {
      id: member.id,
      name: member.name,
      voicePart: member.voicePart,
      level: member.level,
      streak: member.streak || 0,
      sessionsCompleted: rows.length,
      avgTheory,
      skills: member.skills || {},
      lastActive: member.lastActive
    };
  });

  const sessionStats = sessions.map((session) => {
    const rows = progress.filter((row) => row.sessionId === session.id);
    return {
      id: session.id,
      title: session.title,
      order: session.order,
      completionCount: rows.length,
      completionRate: members.length ? Math.round((rows.length / members.length) * 100) : 0
    };
  });

  return res.json({
    memberStats,
    sessionStats,
    totalMembers: members.length
  });
});

module.exports = router;
