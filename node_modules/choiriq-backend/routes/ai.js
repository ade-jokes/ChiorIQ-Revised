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

function postAnthropic(body, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
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
              return reject(new Error(parsed.error?.message || 'Anthropic API request failed.'));
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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured.' });
    }

    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    if (!messages.length) {
      return res.status(400).json({ error: 'messages array is required.' });
    }

    const system = req.user.role === 'member' ? memberPrompt : leaderPrompt;
    const response = await postAnthropic(
      {
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 600,
        system,
        messages: messages.slice(-12)
      },
      apiKey
    );

    const text = response.content?.[0]?.text || 'I could not generate a response at the moment.';
    return res.json({ reply: text });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
