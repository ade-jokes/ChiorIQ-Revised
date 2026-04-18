const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireLeader } = require('../auth');

// ── POST /api/progress — member logs session completion ───────
// Body: { sessionId, checks, theoryScore, skillDeltas, durationMin, notes }
router.post('/', requireAuth, (req, res) => {
  const { sessionId, checks, theoryScore, skillDeltas, durationMin, notes } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const session = db.getSessionById(sessionId);
  if (!session || session.choirId !== req.user.choirId) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Compute new skills
  const user = db.getUserById(req.user.id);
  const skills = { ...user.skills };
  if (skillDeltas) {
    Object.keys(skillDeltas).forEach(k => {
      if (skills[k] !== undefined) {
        skills[k] = Math.min(100, skills[k] + (skillDeltas[k] || 0));
      }
    });
  }

  // Update user skills + streak
  const lastActive = user.lastActive ? new Date(user.lastActive) : null;
  const today = new Date();
  const daysSinceLast = lastActive
    ? Math.floor((today - lastActive) / 86400000)
    : null;
  const newStreak = daysSinceLast === 1
    ? (user.streak || 0) + 1
    : daysSinceLast === 0
      ? user.streak
      : 1;

  db.updateUser(req.user.id, { skills, streak: newStreak, lastActive: today.toISOString() });

  const entry = db.upsertProgress({
    userId: req.user.id,
    sessionId,
    choirId: req.user.choirId,
    completed: true,
    completedAt: today.toISOString(),
    checks: checks || {},
    theoryScore: theoryScore || 0,
    skillDeltas: skillDeltas || {},
    durationMin: durationMin || 0,
    notes: notes || '',
  });

  const updatedUser = db.getUserById(req.user.id);
  res.status(201).json({
    progress: entry,
    streak: updatedUser.streak,
    skills: updatedUser.skills,
  });
});

// ── GET /api/progress/me — member gets own progress ───────────
router.get('/me', requireAuth, (req, res) => {
  const progress = db.getProgressByUser(req.user.id);
  const user = db.getUserById(req.user.id);
  res.json({ progress, streak: user.streak, skills: user.skills });
});

// ── GET /api/progress/choir — leader views all choir progress ─
router.get('/choir', requireLeader, (req, res) => {
  const allProgress = db.getProgressByChoir(req.user.choirId);
  const members = db.getUsersByChoir(req.user.choirId).filter(u => u.role === 'member');
  const sessions = db.getSessionsByChoir(req.user.choirId);

  // Aggregate stats
  const memberStats = members.map(m => {
    const mp = allProgress.filter(p => p.userId === m.id);
    return {
      id: m.id,
      name: m.name,
      voicePart: m.voicePart,
      level: m.level,
      streak: m.streak,
      sessionsCompleted: mp.length,
      skills: m.skills,
      lastActive: m.lastActive,
      avgTheory: mp.length
        ? Math.round(mp.reduce((a, p) => a + (p.theoryScore || 0), 0) / mp.length)
        : 0,
    };
  });

  const sessionStats = sessions.map(s => {
    const sp = allProgress.filter(p => p.sessionId === s.id);
    return {
      id: s.id,
      title: s.title,
      date: s.date,
      completionCount: sp.length,
      completionRate: members.length ? Math.round((sp.length / members.length) * 100) : 0,
    };
  });

  res.json({ memberStats, sessionStats, totalMembers: members.length });
});

// ── GET /api/progress/member/:userId — leader views a specific member ─
router.get('/member/:userId', requireLeader, (req, res) => {
  const member = db.getUserById(req.params.userId);
  if (!member || member.choirId !== req.user.choirId) {
    return res.status(404).json({ error: 'Member not found in your choir' });
  }
  const progress = db.getProgressByUser(req.params.userId);
  const notes = db.getNotesByMember(req.params.userId);
  res.json({
    member: { id: member.id, name: member.name, voicePart: member.voicePart, streak: member.streak, skills: member.skills, level: member.level },
    progress,
    notes,
  });
});

module.exports = router;
