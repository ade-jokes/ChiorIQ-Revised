require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
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

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'choiriq-backend',
    timestamp: new Date().toISOString()
  });
});

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error(err); // eslint-disable-line no-console
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`ChoirIQ backend listening at http://localhost:${PORT}`); // eslint-disable-line no-console
  });
}

module.exports = app;
