const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean)
  : [];

// Hardcode the Vercel domain to ensure CORS always works for deployed app
const VERCEL_DOMAIN = 'https://chioriq-steel.vercel.app';

function isLocalDevOrigin(origin) {
  if (!origin) return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function isTrustedHostedOrigin(origin) {
  if (!origin) return false;

  // Support Vercel production and preview deployments out of the box.
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    return true;
  }

  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    // Allow the deployed Vercel domain
    if (origin === VERCEL_DOMAIN) {
      return callback(null, true);
    }

    if (configuredOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (isTrustedHostedOrigin(origin)) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== 'production' && isLocalDevOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`); // eslint-disable-line no-console
    next();
  });
}

app.use('/api/auth', require('./routes/auth'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/choir', require('./routes/choir'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'choiriq-backend',
    timestamp: new Date().toISOString()
  });
});

// Database persistence test endpoint - useful for diagnosing data loss
app.get('/api/health/persistence-test', (_req, res) => {
  const db = require('./db');
  const testId = `persist-test-${Date.now()}`;
  
  try {
    // Create a test choir to verify writes work
    const testChoir = db.createChoir({
      name: `[PERSISTENCE TEST ${Date.now()}]`,
      createdByRole: 'test'
    });
    
    // Immediately read it back to verify persistence
    const readBack = db.getCollection('choirs').find(c => c.id === testChoir.id);
    
    if (!readBack) {
      return res.status(500).json({
        status: 'error',
        message: 'Database write/read failed: Created choir not found immediately after write',
        dbPath: db.DB_FILE,
        timestamp: new Date().toISOString()
      });
    }

    // Clean up the test record
    db.deleteById('choirs', testChoir.id);

    return res.json({
      status: 'ok',
      message: 'Database persistence verified - writes and reads working',
      dbPath: db.DB_FILE,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: `Database persistence test failed: ${err.message}`,
      dbPath: db.DB_FILE,
      timestamp: new Date().toISOString()
    });
  }
});

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error(err); // eslint-disable-line no-console
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

if (require.main === module) {
  const db = require('./db');
  const fs = require('fs');

  const server = app.listen(PORT, () => {
    console.log(`ChoirIQ backend listening at http://localhost:${PORT}`); // eslint-disable-line no-console
    console.log(`📊 Database: ${db.DB_FILE}`); // eslint-disable-line no-console

    // Warn if database is not on persistent disk (on Render)
    if (process.env.NODE_ENV === 'production') {
      const dbPath = db.DB_FILE;
      if (dbPath.includes('/backend/data')) {
        console.warn('⚠️  WARNING: Database is not using Render persistent disk!'); // eslint-disable-line no-console
        console.warn('⚠️  Data will be lost on every deployment/restart.'); // eslint-disable-line no-console
        console.warn('⚠️  Add a persistent disk to your Render service:'); // eslint-disable-line no-console
        console.warn('⚠️  https://render.com/docs/disks#creating-a-new-disk'); // eslint-disable-line no-console
      } else if (dbPath.includes('/data')) {
        console.log('✅ Using Render persistent disk for database'); // eslint-disable-line no-console
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn(`GEMINI_API_KEY missing. Configure it in ${path.join(__dirname, '.env')}`); // eslint-disable-line no-console
    }
  });

  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. A backend instance may already be running.`); // eslint-disable-line no-console
      console.error('Use the existing backend process, stop it, or change PORT in backend/.env.'); // eslint-disable-line no-console
      process.exit(1);
    }

    throw error;
  });
}

module.exports = app;
