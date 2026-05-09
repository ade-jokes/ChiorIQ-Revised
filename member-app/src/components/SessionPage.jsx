import React, { useMemo, useRef, useState } from 'react';
import { checklistTemplate, lessonTechniques, quizBank } from '../lib/courseData';

function detectPitch(analyser, sampleRate) {
  const size = analyser.fftSize;
  const buffer = new Float32Array(size);
  analyser.getFloatTimeDomainData(buffer);

  let rms = 0;
  for (let i = 0; i < size; i += 1) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / size);

  if (rms < 0.01) {
    return null;
  }

  const minFrequency = 75;
  const maxFrequency = 1000;
  const minLag = Math.floor(sampleRate / maxFrequency);
  const maxLag = Math.floor(sampleRate / minFrequency);

  let bestLag = -1;
  let bestCorrelation = 0;
  const correlations = new Float32Array(maxLag + 1);

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < size - lag; i += 1) {
      const a = buffer[i];
      const b = buffer[i + lag];
      correlation += a * b;
      normA += a * a;
      normB += b * b;
    }

    if (normA === 0 || normB === 0) {
      correlations[lag] = 0;
      continue;
    }

    const normalized = correlation / Math.sqrt(normA * normB);
    correlations[lag] = normalized;

    if (normalized > bestCorrelation) {
      bestCorrelation = normalized;
      bestLag = lag;
    }
  }

  if (bestLag < 0 || bestCorrelation < 0.8) {
    return null;
  }

  let refinedLag = bestLag;
  if (bestLag > minLag && bestLag < maxLag) {
    const prev = correlations[bestLag - 1];
    const curr = correlations[bestLag];
    const next = correlations[bestLag + 1];
    const denominator = prev - (2 * curr) + next;

    if (Math.abs(denominator) > 1e-9) {
      const shift = 0.5 * (prev - next) / denominator;
      refinedLag = bestLag + shift;
    }
  }

  return sampleRate / refinedLag;
}

function frequencyToNote(freq) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midi = Math.round(12 * (Math.log(freq / 440) / Math.log(2)) + 69);
  const octave = Math.floor(midi / 12) - 1;
  const note = `${notes[((midi % 12) + 12) % 12]}${octave}`;
  const target = 440 * (2 ** ((midi - 69) / 12));
  const cents = Math.round(1200 * Math.log2(freq / target));
  return { note, cents };
}

function Piano() {
  const keys = useMemo(() => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const blackNotes = new Set(['C#', 'D#', 'F#', 'G#', 'A#']);
    const rangeStart = 48; // C3
    const rangeEnd = 83; // B5

    const generated = [];
    for (let midi = rangeStart; midi <= rangeEnd; midi += 1) {
      const noteName = notes[midi % 12];
      const octave = Math.floor(midi / 12) - 1;
      const hz = 440 * (2 ** ((midi - 69) / 12));
      generated.push({
        note: `${noteName}${octave}`,
        black: blackNotes.has(noteName),
        hz
      });
    }
    return generated;
  }, []);

  function play(freq) {
    const ctx = new window.AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 450);
  }

  return (
    <div className="pianoRow">
      {keys.map((k) => (
        <button key={k.note} className={k.black ? 'key black' : 'key'} onClick={() => play(k.hz)} type="button">
          {k.note}
        </button>
      ))}
    </div>
  );
}

function DrillTimer() {
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);

  React.useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const progress = Math.max(0, Math.min(100, (seconds / 60) * 100));

  return (
    <div className="toolCard">
      <h4>Drill Timer</h4>
      <p>{seconds}s</p>
      <div className="bar"><span style={{ width: `${progress}%` }} /></div>
      <div className="toolActions">
        <button onClick={() => { setSeconds(60); setRunning(true); }} type="button">Start</button>
        <button onClick={() => setRunning(false)} type="button">Pause</button>
        <button onClick={() => { setSeconds(60); setRunning(false); }} type="button">Reset</button>
      </div>
    </div>
  );
}

function TheoryQuiz() {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState('');

  const q = quizBank[index % quizBank.length];
  const percent = attempts === 0 ? 0 : Math.round((score / attempts) * 100);

  function pick(option) {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    setAttempts((a) => a + 1);
    if (option === q.answer) {
      setScore((s) => s + 1);
    }
  }

  return (
    <div className="toolCard">
      <h4>Music Theory Quiz</h4>
      <p className="quizType">{q.type}</p>
      <p>{q.question}</p>
      <div className="quizOptions">
        {q.options.map((opt) => (
          <button
            key={opt}
            className={[
              answered && opt === q.answer ? 'correct' : '',
              answered && selected === opt && opt !== q.answer ? 'wrong' : ''
            ].join(' ').trim()}
            onClick={() => pick(opt)}
            type="button"
          >
            {opt}
          </button>
        ))}
      </div>
      {answered && (
        <p className={selected === q.answer ? 'successText' : 'errorMsg'}>
          {selected === q.answer ? 'Correct answer.' : `Incorrect. Correct answer: ${q.answer}`}
        </p>
      )}
      <div className="toolActions">
        <strong>Score: {score}/{attempts} ({percent}%)</strong>
        <button
          type="button"
          onClick={() => {
            setIndex((i) => i + 1);
            setAnswered(false);
            setSelected('');
          }}
        >
          Next question
        </button>
      </div>
    </div>
  );
}

function PitchChecker() {
  const [running, setRunning] = useState(false);
  const [reading, setReading] = useState({ note: '--', freq: 0, cents: 0 });
  const [error, setError] = useState('');
  const rafRef = useRef(0);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const smoothRef = useRef([]);

  async function start() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: false,
          autoGainControl: false,
          echoCancellation: false
        }
      });
      const audioCtx = new window.AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0;
      audioCtx.createMediaStreamSource(stream).connect(analyser);

      streamRef.current = stream;
      audioRef.current = audioCtx;
      smoothRef.current = [];
      setRunning(true);

      const loop = () => {
        const freq = detectPitch(analyser, audioCtx.sampleRate);
        if (freq) {
          const history = smoothRef.current;
          history.push(freq);
          if (history.length > 5) {
            history.shift();
          }

          const avgFreq = history.reduce((sum, value) => sum + value, 0) / history.length;
          const parsed = frequencyToNote(avgFreq);
          setReading({ note: parsed.note, freq: Math.round(avgFreq), cents: parsed.cents });
        }
        rafRef.current = requestAnimationFrame(loop);
      };

      loop();
    } catch (err) {
      setError(err?.message || 'Microphone access was denied.');
    }
  }

  function stop() {
    setRunning(false);
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioRef.current) {
      audioRef.current.close();
    }
    smoothRef.current = [];
  }

  const needle = Math.max(-50, Math.min(50, reading.cents));
  const status = Math.abs(reading.cents) <= 8 ? 'In tune' : reading.cents > 0 ? 'Sharp' : 'Flat';

  return (
    <div className="toolCard">
      <h4>Live Pitch Checker</h4>
      <p className="pitchBig">{reading.note}</p>
      <p>{reading.freq} Hz · {status}</p>
      <div className="bar meter"><span style={{ left: `${50 + needle}%` }} /></div>
      {error && <p className="errorMsg">{error}</p>}
      {running ? (
        <button type="button" onClick={stop}>Stop microphone</button>
      ) : (
        <button type="button" onClick={start}>Start microphone</button>
      )}
    </div>
  );
}

export default function SessionPage({ session, onComplete, onAskAi }) {
  const [tab, setTab] = useState(() => window.localStorage.getItem('memberSessionTab') || 'lesson');
  const lessonPages = ['Warm-Up', 'Posture', 'Resonance', 'Vocal', 'Pitch', 'Session'];
  const [lessonPage, setLessonPage] = useState('Warm-Up');
  const [checked, setChecked] = useState([]);
  const [aiPrompt, setAiPrompt] = useState('How can I tighten my harmonies this week?');
  const [aiReply, setAiReply] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [completeLoading, setCompleteLoading] = useState(false);
  const [completeMessage, setCompleteMessage] = useState('');
  const [completeError, setCompleteError] = useState('');

  const percent = useMemo(() => Math.round((checked.length / checklistTemplate.length) * 100), [checked.length]);
  const sessionReady = Boolean(session?.id);
  const sessionModules = Array.isArray(session?.modules) ? session.modules : [];
  const promptSuggestions = [
    'Give me a 5-minute warm-up plan for today.',
    'How do I blend better in three-part harmony?',
    'How can I improve breath support in long phrases?'
  ];

  React.useEffect(() => {
    window.localStorage.setItem('memberSessionTab', tab);
  }, [tab]);

  const blocks = lessonTechniques.map((group) => (
    <article key={group.id} className="lessonBlock">
      <h4>{group.title}</h4>
      <div className="explainerGrid">
        {group.items.map((item) => (
          <article className="explainerCard" key={item.name}>
            <h5>{item.name}</h5>
            <p><strong>Meaning:</strong> {item.meaning}</p>
            <p><strong>Coaching exercise:</strong> {item.exercise}</p>
            <p><strong>Progress sign:</strong> {item.progressSignal}</p>
          </article>
        ))}
      </div>
    </article>
  ));

  const techniqueById = useMemo(() => {
    return lessonTechniques.reduce((acc, group) => {
      acc[group.id] = group;
      return acc;
    }, {});
  }, []);

  const warmupChecklist = checklistTemplate.slice(0, 2);

  const lessonContent = useMemo(() => {
    if (lessonPage === 'Warm-Up') {
      return (
        <section className="grid2">
          <article className="toolCard">
            <h4>Warm-Up Routine</h4>
            <p>Use this short routine to prepare breath, pitch center, and vocal flexibility before deeper drills.</p>
            <div className="checkList">
              {warmupChecklist.map((item) => <button key={item} type="button">Step · {item}</button>)}
            </div>
          </article>
          <article className="toolCard">
            <h4>Target Outcome</h4>
            <p>By the end of warm-up, your tone should feel stable, your breathing should feel less shallow, and note attacks should be cleaner.</p>
          </article>
        </section>
      );
    }

    if (lessonPage === 'Posture') {
      const support = techniqueById.resonance?.items.find((item) => item.name.includes('Appoggio'));
      return (
        <section className="grid2">
          <article className="toolCard">
            <h4>Posture and Breath Support</h4>
            <p>Build a lifted but relaxed stance: neutral neck, open ribs, steady knees, and grounded feet.</p>
            {support && (
              <>
                <p><strong>Core drill:</strong> {support.exercise}</p>
                <p><strong>Progress sign:</strong> {support.progressSignal}</p>
              </>
            )}
          </article>
          <article className="toolCard">
            <h4>Quick Self-Check</h4>
            <p>1. Shoulders down, not raised.</p>
            <p>2. Jaw free, no neck tension.</p>
            <p>3. Breath starts low and wide.</p>
          </article>
        </section>
      );
    }

    if (lessonPage === 'Resonance') {
      const resonanceItems = techniqueById.resonance?.items || [];
      return (
        <section className="grid2">
          <article className="toolCard">
            <h4>Resonance Balance</h4>
            <p>Focus on chest-mask-head connection so your voice stays rich and consistent across range changes.</p>
          </article>
          {resonanceItems.map((item) => (
            <article className="explainerCard" key={item.name}>
              <h5>{item.name}</h5>
              <p><strong>Meaning:</strong> {item.meaning}</p>
              <p><strong>Exercise:</strong> {item.exercise}</p>
            </article>
          ))}
        </section>
      );
    }

    if (lessonPage === 'Vocal') {
      return (
        <section className="grid2">
          <article className="toolCard">
            <h4>Vocal Technique</h4>
            <p>Blend agility, diction, and gospel phrasing to keep your delivery expressive and controlled.</p>
          </article>
          {lessonTechniques
            .filter((group) => ['agility', 'gospel', 'language'].includes(group.id))
            .map((group) => (
              <article className="explainerCard" key={group.id}>
                <h5>{group.title}</h5>
                <p>{group.items[0]?.meaning || 'Technique details available in this module.'}</p>
                <p><strong>Try now:</strong> {group.items[0]?.exercise || 'Practice your assigned drill.'}</p>
              </article>
            ))}
        </section>
      );
    }

    if (lessonPage === 'Pitch') {
      const theoryItems = techniqueById.theory?.items || [];
      return (
        <section className="grid2">
          <article className="toolCard">
            <h4>Pitch Accuracy</h4>
            <p>Train your ear with interval awareness and solfege so harmonies lock faster in rehearsal.</p>
          </article>
          {theoryItems.map((item) => (
            <article className="explainerCard" key={item.name}>
              <h5>{item.name}</h5>
              <p>{item.meaning}</p>
              <p><strong>Exercise:</strong> {item.exercise}</p>
            </article>
          ))}
        </section>
      );
    }

    const sessionItems = sessionModules.length > 0 ? sessionModules : [
      {
        id: 'session-plan',
        title: 'Session Flow',
        details: 'Warm up, run targeted drills, then complete checklist and reflect with AI Maestro.'
      }
    ];

    return (
      <section className="grid2">
        <article className="toolCard">
          <h4>Session Plan</h4>
          <p>Use this page as your session recap and action plan before marking completion.</p>
        </article>
        {sessionItems.map((module) => (
          <article className="explainerCard" key={module.id || module.key || module.title}>
            <h5>{module.title || module.label}</h5>
            <p>{module.details || module.content || 'Module guidance will appear here.'}</p>
          </article>
        ))}
      </section>
    );
  }, [lessonPage, lessonTechniques, sessionModules, techniqueById, warmupChecklist]);

  async function submitAi() {
    setAiError('');
    setAiReply('');
    setAiLoading(true);
    try {
      const messages = [{ role: 'user', content: aiPrompt }];
      const res = await onAskAi(messages);
      setAiReply(res.reply || 'No response');
    } catch (error) {
      setAiError(error?.message || 'Maestro is unavailable right now.');
    } finally {
      setAiLoading(false);
    }
  }

  async function submitCompletion() {
    setCompleteError('');
    setCompleteMessage('');

    if (!sessionReady) {
      setCompleteError('Session data is still loading. Please wait a moment and try again.');
      return;
    }

    setCompleteLoading(true);
    try {
      await onComplete({
        checks: checked,
        theoryScore: 85,
        durationMin: 55,
        skillDeltas: { agility: 2, rhythm: 2 }
      });
      setCompleteMessage('Great work. Your session progress has been saved successfully.');
    } catch (error) {
      setCompleteError(error?.message || 'Could not save completion right now.');
    } finally {
      setCompleteLoading(false);
    }
  }

  return (
    <main className="pageWrap">
      <section className="heroCard">
        <h2>{session?.title || 'Session'}</h2>
        <p>{session?.description || 'Session learning experience with tabbed modules and expandable techniques.'}</p>
        {!sessionReady && <p className="errorMsg">Loading session details... if this persists, return to Dashboard and re-open the session.</p>}
      </section>

      <div className="tabs">
        {['lesson', 'tools', 'checklist', 'maestro'].map((name) => (
          <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)} type="button">
            {name}
          </button>
        ))}
      </div>

      {tab === 'lesson' && (
        <section className="sectionCard">
          <article className="toolCard">
            <h4>Lesson Pages</h4>
            <p>Move through the pages in order for a complete coaching cycle.</p>
            <div className="lessonPager">
              {lessonPages.map((name) => (
                <button
                  className={lessonPage === name ? 'active' : ''}
                  key={name}
                  onClick={() => setLessonPage(name)}
                  type="button"
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="lessonPagerActions">
              <button
                onClick={() => {
                  const currentIndex = lessonPages.indexOf(lessonPage);
                  setLessonPage(lessonPages[Math.max(0, currentIndex - 1)]);
                }}
                type="button"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  const currentIndex = lessonPages.indexOf(lessonPage);
                  setLessonPage(lessonPages[Math.min(lessonPages.length - 1, currentIndex + 1)]);
                }}
                type="button"
              >
                Next
              </button>
            </div>
          </article>
          {lessonContent}
        </section>
      )}

      {tab === 'tools' && (
        <section className="sectionCard grid2">
          <article className="toolCard">
            <h4>What these coaching tools do</h4>
            <p><strong>Pitch Checker:</strong> tracks note center and sharp/flat drift in real time.</p>
            <p><strong>Piano:</strong> gives reference tones for matching and interval drills.</p>
            <p><strong>Timer:</strong> enforces focused practice blocks with measurable consistency.</p>
            <p><strong>Theory Quiz:</strong> strengthens literacy for faster rehearsals and cleaner harmonies.</p>
          </article>
          <PitchChecker />
          <DrillTimer />
          <TheoryQuiz />
          <div className="toolCard">
            <h4>Playable Piano</h4>
            <Piano />
          </div>
        </section>
      )}

      {tab === 'checklist' && (
        <section className="sectionCard">
          <h3>Daily Session Checklist</h3>
          <p>Each checklist action maps to measurable coaching growth. Complete all tasks before marking the session complete.</p>
          <div className="bar"><span style={{ width: `${percent}%` }} /></div>
          <div className="toolActions toolActionsInline">
            <button onClick={() => setChecked(checklistTemplate)} type="button">Mark all</button>
            <button onClick={() => setChecked([])} type="button">Clear all</button>
          </div>
          <div className="checkList">
            {checklistTemplate.map((task) => {
              const done = checked.includes(task);
              return (
                <button
                  className={done ? 'checked' : ''}
                  key={task}
                  onClick={() => {
                    setChecked((prev) => done ? prev.filter((x) => x !== task) : [...prev, task]);
                  }}
                  type="button"
                >
                  {done ? 'Done' : 'Todo'} · {task}
                </button>
              );
            })}
          </div>
          <p>Completion: {percent}%</p>
          <button
            className="primary"
            disabled={checked.length < checklistTemplate.length || completeLoading || !sessionReady}
            onClick={submitCompletion}
            type="button"
          >
            {completeLoading ? 'Saving...' : 'Mark Session Complete'}
          </button>
          {completeMessage && <p className="successText">{completeMessage}</p>}
          {completeError && <p className="errorMsg">{completeError}</p>}
        </section>
      )}

      {tab === 'maestro' && (
        <section className="sectionCard">
          <h3>AI Maestro</h3>
          <p>Ask about technique, breath support, phrasing, or harmony strategy. Maestro responds with coaching-focused guidance.</p>
          <div className="promptSuggestions">
            {promptSuggestions.map((suggestion) => (
              <button key={suggestion} onClick={() => setAiPrompt(suggestion)} type="button">{suggestion}</button>
            ))}
          </div>
          <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={5} />
          <button className="primary" disabled={aiLoading || !aiPrompt.trim()} onClick={submitAi} type="button">
            {aiLoading ? 'Maestro is thinking...' : 'Ask Maestro'}
          </button>
          {aiError && <p className="errorMsg">{aiError}</p>}
          {aiReply && <article className="aiReply">{aiReply}</article>}
        </section>
      )}
    </main>
  );
}