const express = require('express');
const db = require('../db');
const { requireRole, sanitizeUser } = require('../auth');

const router = express.Router();

router.get('/managers', requireRole('admin'), (req, res) => {
  const allChoirs = db.getCollection('choirs');
  const managers = db
    .getCollection('users')
    .filter((user) => user.role === 'manager')
    .map((user) => {
      const safe = sanitizeUser(user);
      const choir = allChoirs.find((item) => item.id === safe.choirId);
      return {
        ...safe,
        choir: choir
          ? {
              id: choir.id,
              name: choir.name,
              joinCode: choir.joinCode,
              createdByRole: choir.createdByRole,
              createdAt: choir.createdAt
            }
          : null
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json({ managers });
});

module.exports = router;
