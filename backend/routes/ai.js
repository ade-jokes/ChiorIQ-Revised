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
  const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const modelCandidates = [
    preferredModel,
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash'
  ].filter((value, index, arr) => value && arr.indexOf(value) === index);

  const apiVersions = ['v1beta', 'v1'];

  function shouldTryFallback(errorMessage, statusCode) {
    if (statusCode === 404) {
      return true;
    }

    if (!errorMessage) {
      return false;
    }

    const msg = errorMessage.toLowerCase();
    return msg.includes('not found') || msg.includes('not supported for generatecontent') || msg.includes('unknown model');
  }

  function requestOnce(payload, modelName, apiVersion) {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'generativelanguage.googleapis.com',
          path: `/${apiVersion}/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`,
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
                return reject({
                  statusCode: response.statusCode,
                  message: parsed.error?.message || 'Gemini API request failed.'
                });
              }
              return resolve(parsed);
            } catch {
              return reject({ statusCode: response.statusCode || 500, message: 'Failed to parse AI response.' });
            }
          });
        }
      );

      req.on('error', (error) => reject({ statusCode: 502, message: error.message || 'AI request failed.' }));
      req.write(payload);
      req.end();
    });
  }

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    (async () => {
      let lastError = null;

      for (const version of apiVersions) {
        for (const modelName of modelCandidates) {
          try {
            const result = await requestOnce(payload, modelName, version);
            return resolve(result);
          } catch (error) {
            lastError = error;
            if (!shouldTryFallback(error?.message, error?.statusCode)) {
              return reject(new Error(error?.message || 'Gemini API request failed.'));
            }
          }
        }
      }

      return reject(new Error(lastError?.message || 'No available Gemini model could serve this request.'));
    })().catch((error) => reject(new Error(error?.message || 'Gemini API request failed.')));
  });
}

router.post('/chat', requireAuth, async (req, res, next) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured. Add it to backend/.env and restart the backend server.'
      });
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
