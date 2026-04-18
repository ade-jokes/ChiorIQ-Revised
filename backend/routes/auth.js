const express = require('express');
const db = require('../db');
const {
  hashPassword,
  checkPassword,
  signToken,
  requireAuth,
  sanitizeUser
} = require('../auth');

const router = express.Router();

function findUserByEmail(email) {
  const users = db.getCollection('users');
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

router.post('/register', (req, res) => {
  const {
    name,
    email,
    password,
    role,
    voicePart,
    level,
    choirName,
    joinCode
  } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password and role are required.' });
  }

  if (findUserByEmail(email)) {
    return res.status(409).json({ error: 'Email already registered.' });
  }

  if (!['admin', 'manager', 'member'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin, manager, or member.' });
  }

  let choir;

  if (role === 'member') {
    if (!joinCode) {
      return res.status(400).json({ error: 'joinCode is required for members.' });
    }
    const choirs = db.getCollection('choirs');
    choir = choirs.find((item) => item.joinCode === String(joinCode).toUpperCase());
    if (!choir) {
      return res.status(400).json({ error: 'Invalid join code.' });
    }
  } else {
    choir = db.createChoir({
      name: choirName || `${name.split(' ')[0]}'s Choir`,
      createdByRole: role
    });
  }

  const user = db.createUser({
    name,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    role,
    voicePart: voicePart || 'Unassigned',
    level: level || 'Beginner',
    choirId: choir.id
  });

  if (role === 'manager' || role === 'admin') {
    db.seedDefaultSessions(choir.id, user.id);
  }

  const token = signToken(user);
  return res.status(201).json({
    token,
    user: sanitizeUser(user),
    choir: {
      id: choir.id,
      name: choir.name,
      joinCode: choir.joinCode
    }
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  const user = findUserByEmail(email);
  if (!user || !checkPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const choirs = db.getCollection('choirs');
  const choir = choirs.find((item) => item.id === user.choirId);

  return res.json({
    token: signToken(user),
    user: sanitizeUser(user),
    choir: choir
      ? {
          id: choir.id,
          name: choir.name,
          joinCode: choir.joinCode
        }
      : null
  });
});

router.get('/me', requireAuth, (req, res) => {
  const users = db.getCollection('users');
  const user = users.find((item) => item.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  return res.json({ user: sanitizeUser(user) });
});

router.patch('/me', requireAuth, (req, res) => {
  const allowed = ['name', 'voicePart', 'level'];
  const patch = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      patch[field] = req.body[field];
    }
  });

  const updated = db.updateById('users', req.user.id, patch);
  if (!updated) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json({ user: sanitizeUser(updated) });
});

module.exports = router;
