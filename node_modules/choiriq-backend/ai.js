const express = require('express');
const router = express.Router();
const https = require('https');
const { requireAuth } = require('../auth');
const db = require('../db');

const SYSTEM_LEADER = `You are Maestro, an expert AI vocal coach and choir management advisor embedded in ChoirIQ — a professional choir training platform. You are speaking to a CHOIR LEADER / DIRECTOR.

Your expertise spans: choir management, SATB section leadership, rehearsal planning, vocal technique (breathing, resonance, agility, placement), harmony & blend, music theory, gospel phrasing, dynamics, diction, and vocal health.

Adapt your advice for gospel and contemporary Christian choirs of 21+ college students with mixed skill levels.

Be direct, professional, and specific. Give actionable rehearsal strategies and leadership advice. Use bold text for key terms. Keep responses to 3–5 paragraphs.`;

const SYSTEM_MEMBER = `You are Maestro, an expert AI vocal coach embedded in ChoirIQ — a professional choir training app. You are speaking to a CHOIR MEMBER (college student).

Your expertise spans: diaphragmatic breathing, vocal resonance & placement (chest/mask/head voice), vocal agility (runs, melisma, ornaments), pitch accuracy & ear training, SATB harmony & blend, dynamics & expression, gospel phrasing & style, music theory (solfège, intervals, scales, rhythm), diction & articulation, and vocal health.

Be warm, encouraging, and specific. Give actionable advice tailored to a developing singer. Use bold text for key terms. Keep responses to 2–4 paragraphs.`;

// POST /api/ai/chat
router.post('/chat', requireAuth, (req, res) => {
  const { messages, context } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const user = db.getUserById(req.user.id);
  const system = req.user.role === 'leader' ? SYSTEM_LEADER : SYSTEM_MEMBER;

  // Add user context to system prompt
  const systemWithCtx = system + `\n\nSpeaking with: ${user.name} (${user.voicePart || 'voice part unset'}, ${user.level} level).`;

  const contents = messages
    .slice(-10)
    .map((msg) => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      const text = typeof msg.content === 'string'
        ? msg.content
        : Array.isArray(msg.content)
          ? msg.content.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('\n')
          : '';
      return {
        role,
        parts: [{ text }],
      };
    })
    .filter((item) => item.parts[0].text.trim().length > 0);

  const body = JSON.stringify({
    systemInstruction: {
      parts: [{ text: systemWithCtx }],
    },
    generationConfig: {
      maxOutputTokens: 800,
      temperature: 0.7,
    },
    contents,
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI service not configured. Set GEMINI_API_KEY.' });
  }

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const text = parsed.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || '')
          .join('\n') || 'Sorry, I could not generate a response.';
        res.json({ reply: text });
      } catch {
        res.status(500).json({ error: 'AI response parse error' });
      }
    });
  });

  proxyReq.on('error', (e) => {
    console.error('AI proxy error:', e);
    res.status(502).json({ error: 'AI service unavailable' });
  });

  proxyReq.write(body);
  proxyReq.end();
});

module.exports = router;
