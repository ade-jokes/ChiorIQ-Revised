const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const db = require('../db');
const app = require('../server');

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@choiriq.dev`;
}

test('auth register, login, and me profile', async () => {
  db.resetAll();

  const managerPayload = {
    name: 'Director One',
    email: uniqueEmail('manager'),
    password: 'Pass1234!',
    role: 'manager',
    choirName: 'Revised Voices',
    voicePart: 'Alto',
    level: 'Advanced'
  };

  const registerRes = await request(app).post('/api/auth/register').send(managerPayload);
  assert.equal(registerRes.status, 201);
  assert.ok(registerRes.body.token);
  assert.equal(registerRes.body.user.role, 'manager');
  assert.ok(registerRes.body.choir.joinCode);

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: managerPayload.email, password: managerPayload.password });
  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.body.token);

  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${loginRes.body.token}`);
  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.user.name, managerPayload.name);
});

test('member joins with code and logs progress', async () => {
  db.resetAll();

  const manager = await request(app).post('/api/auth/register').send({
    name: 'Manager',
    email: uniqueEmail('manager'),
    password: 'Pass1234!',
    role: 'manager',
    choirName: 'Main Choir',
    voicePart: 'Tenor',
    level: 'Advanced'
  });

  const joinCode = manager.body.choir.joinCode;
  const managerToken = manager.body.token;

  const member = await request(app).post('/api/auth/register').send({
    name: 'Member',
    email: uniqueEmail('member'),
    password: 'Pass1234!',
    role: 'member',
    joinCode,
    voicePart: 'Soprano',
    level: 'Beginner'
  });

  assert.equal(member.status, 201);
  const memberToken = member.body.token;

  const sessionsRes = await request(app)
    .get('/api/sessions')
    .set('Authorization', `Bearer ${memberToken}`);

  assert.equal(sessionsRes.status, 200);
  assert.ok(sessionsRes.body.sessions.length >= 8);

  const firstSessionId = sessionsRes.body.sessions[0].id;
  const progressRes = await request(app)
    .post('/api/progress')
    .set('Authorization', `Bearer ${memberToken}`)
    .send({
      sessionId: firstSessionId,
      checks: { warmup: true },
      theoryScore: 80,
      durationMin: 50,
      skillDeltas: { agility: 2, rhythm: 1 }
    });

  assert.equal(progressRes.status, 201);

  const choirStatsRes = await request(app)
    .get('/api/progress/choir')
    .set('Authorization', `Bearer ${managerToken}`);

  assert.equal(choirStatsRes.status, 200);
  assert.equal(choirStatsRes.body.totalMembers, 1);
  assert.ok(Array.isArray(choirStatsRes.body.sessionStats));
});
