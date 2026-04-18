const express = require('express');
const https = require('https');
const { requireAuth } = require('../auth');

const router = express.Router();

const memberPrompt = `You are AI Maestro, a vocal coach for choir members.
Help with gospel and choral technique in plain language.
Prioritize encouragement, healthy singing habits, and practical exercises.
Keep answers concise with clear next steps.`;

const leaderPrompt = `You are AI Maestro, a strategic assistant for choir leaders.
Help with rehearsal plans, section balancing, attendance motivation, and pedagogy.
Be concrete and suggest leader-ready actions.`;

function normalizeMessages(messages) {
  return messages
    .slice(-12)
    .map((msg) => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      let text = '';

      if (typeof msg.content === 'string') {
        text = msg.content;
      } else if (Array.isArray(msg.content)) {
        text = msg.content
          .map((part) => (typeof part === 'string' ? part : part?.text || ''))
          .join('\n');
      }

      return {
        role,
        parts: [{ text: text || '' }]
      };
    })
    .filter((msg) => msg.parts[0].text.trim().length > 0);
}

function postGemini(body, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload)
        }
      },
      (response) => {
        let raw = '';
        response.on('data', (chunk) => {
          raw += chunk;
        });
        response.on('end', () => {
          try {
            const parsed = JSON.parse(raw || '{}');
            if (response.statusCode >= 400) {
              return reject(new Error(parsed.error?.message || 'Gemini API request failed.'));
            }
            return resolve(parsed);
          } catch {
            return reject(new Error('Failed to parse AI response.'));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

router.post('/chat', requireAuth, async (req, res, next) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    if (!messages.length) {
      return res.status(400).json({ error: 'messages array is required.' });
    }

    const system = req.user.role === 'member' ? memberPrompt : leaderPrompt;
    const response = await postGemini(
      {
        systemInstruction: {
          parts: [{ text: system }]
        },
        generationConfig: {
          maxOutputTokens: 600,
          temperature: 0.7
        },
        contents: normalizeMessages(messages)
      },
      apiKey
    );

    const text = response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('\n') || 'I could not generate a response at the moment.';
    return res.json({ reply: text });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
