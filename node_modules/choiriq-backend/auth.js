const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET = process.env.JWT_SECRET || 'choiriq_local_secret';
const EXPIRES = '7d';

function sanitizeUser(user) {
  if (!user) {
    return null;
  }
  const { passwordHash, ...safe } = user;
  return safe;
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      choirId: user.choirId
    },
    SECRET,
    { expiresIn: EXPIRES }
  );
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function checkPassword(password, passwordHash) {
  return bcrypt.compareSync(password, passwordHash);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(header.slice(7), SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions.' });
      }
      return next();
    });
  };
}

module.exports = {
  signToken,
  hashPassword,
  checkPassword,
  requireAuth,
  requireRole,
  sanitizeUser
};
