/**
 * SessionShared.jsx
 *
 * Every piece shared between LeaderSessionPage and MemberSessionPage lives
 * here and is imported from here. Nothing is duplicated across the two
 * consumer files.
 *
 * Exports
 * ───────
 *  Constants    : LESSON_PAGES, KEY_MAP, DURATIONS, DRILL_PRESETS,
 *                 MAESTRO_SUGGESTIONS, VALID_MEMBER_TABS, NOTE_NAMES, BLACK_NOTES
 *  Utilities    : detectPitch, freqToNote, storage
 *  Components   : ElapsedTimer, Piano, DrillTimer, TheoryQuiz, PitchChecker
 *                 LessonPanel, ToolsPanel, ChecklistPanel, MaestroPanel
 *  Style        : DARK_CSS  (inject once per page via <style>{DARK_CSS}</style>)
 */

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { lessonTechniques, checklistTemplate, quizBank } from '../lib/courseData';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
export const LESSON_PAGES = [
  { id: 'warmup',    label: 'Warm-Up',   feel: 'Voice feels open, breath drops low, the room sounds unified.' },
  { id: 'posture',   label: 'Posture',   feel: 'Shoulders relaxed mid-phrase. Ribcage holds open. Tone feels easier, not harder.' },
  { id: 'resonance', label: 'Resonance', feel: 'Forward buzz in the face on vowels. Less throat tension. More volume with less effort.' },
  { id: 'vocal',     label: 'Vocal',     feel: 'Runs lighter. Consonants land crisply. Phrases have a natural arc.' },
  { id: 'pitch',     label: 'Pitch',     feel: 'Harmony locks faster. Singers hear drift and self-correct without the leader.' },
  { id: 'session',   label: 'Session',   feel: 'One specific thing improved today. One concrete target for next week.' },
];

export const NOTE_NAMES  = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const BLACK_NOTES = new Set(['C#','D#','F#','G#','A#']);
export const PIANO_START = 48;
export const PIANO_END   = 83;
export const PITCH_FPS   = 100;
export const HISTORY_LEN = 48;

export const KEY_MAP = {
  a:'C4', w:'C#4', s:'D4', e:'D#4', d:'E4',
  f:'F4', t:'F#4', g:'G4', y:'G#4', h:'A4',
  u:'A#4', j:'B4', k:'C5', o:'C#5', l:'D5', p:'D#5',
};

export const DURATIONS = [
  { label: '1 min', secs: 60  },
  { label: '2 min', secs: 120 },
  { label: '5 min', secs: 300 },
  { label: '10 min',secs: 600 },
];

export const DRILL_PRESETS = [
  'Breath — 4 in / 8 out',
  'Lip trills — 5-note scale',
  'Interval matching',
  'Diction — consonant drill',
  'Part ownership — sing alone',
];

export const MAESTRO_SUGGESTIONS = [
  'Give me a warm-up plan for today\'s session.',
  'My choir goes flat on sustained notes — what\'s the fix?',
  'How do I help beginners find their head voice?',
  'What\'s the fastest way to tighten 4-part harmony?',
  'How do I build breath support for long Gospel phrases?',
  'My tenors are too quiet. How do I draw them out?',
];

/** Tabs used by the Member page (Maestro requires onAskAi prop) */
export const MEMBER_TABS = [
  { id: 'lesson',    label: 'Lesson',   icon: '♩' },
  { id: 'tools',     label: 'Tools',    icon: '◈' },
  { id: 'checklist', label: 'Progress', icon: '◎' },
  { id: 'maestro',   label: 'Maestro',  icon: '✦' },
];

/** Tabs used by the Leader page (Debrief replaces Maestro) */
export const LEADER_TABS = [
  { id: 'lesson',    label: 'Lesson',   icon: '♩' },
  { id: 'tools',     label: 'Tools',    icon: '◈' },
  { id: 'checklist', label: 'Session',  icon: '◎' },
  { id: 'debrief',   label: 'Debrief',  icon: '✦' },
];

/* ═══════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════ */
/** sessionStorage wrapper — never throws */
export const storage = {
  get: (key, fallback) => {
    try { const v = sessionStorage.getItem(key); return v !== null ? v : fallback; }
    catch { return fallback; }
  },
  set: (key, val) => { try { sessionStorage.setItem(key, val); } catch {} },
};

/** Normalised cross-correlation pitch detection */
export function detectPitch(analyser, sampleRate) {
  const size   = analyser.fftSize;
  const buffer = new Float32Array(size);
  analyser.getFloatTimeDomainData(buffer);

  let rms = 0;
  for (let i = 0; i < size; i++) rms += buffer[i] * buffer[i];
  if (Math.sqrt(rms / size) < 0.01) return null;

  const minLag = Math.floor(sampleRate / 1000);
  const maxLag = Math.floor(sampleRate / 75);
  let bestLag  = -1, bestCorr = 0;
  const corrs  = new Float32Array(maxLag + 1);

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0, normA = 0, normB = 0;
    for (let i = 0; i < size - lag; i++) {
      const a = buffer[i], b = buffer[i + lag];
      corr += a * b; normA += a * a; normB += b * b;
    }
    const n = normA * normB === 0 ? 0 : corr / Math.sqrt(normA * normB);
    corrs[lag] = n;
    if (n > bestCorr) { bestCorr = n; bestLag = lag; }
  }
  if (bestLag < 0 || bestCorr < 0.8) return null;

  if (bestLag > minLag && bestLag < maxLag) {
    const p = corrs[bestLag - 1], c = corrs[bestLag], n = corrs[bestLag + 1];
    const d = p - 2 * c + n;
    if (Math.abs(d) > 1e-9) bestLag += 0.5 * (p - n) / d;
  }
  return sampleRate / bestLag;
}

/** Hz → { note, cents, midi, nextNote, prevNote } */
export function freqToNote(freq) {
  const midi   = Math.round(12 * Math.log2(freq / 440) + 69);
  const octave = Math.floor(midi / 12) - 1;
  const name   = NOTE_NAMES[((midi % 12) + 12) % 12];
  const target = 440 * Math.pow(2, (midi - 69) / 12);
  const cents  = Math.round(1200 * Math.log2(freq / target));
  const next   = NOTE_NAMES[((midi + 1) % 12 + 12) % 12];
  const prev   = NOTE_NAMES[((midi - 1) % 12 + 12) % 12];
  return { note: `${name}${octave}`, cents, name, octave, midi, nextNote: next, prevNote: prev };
}

/* ═══════════════════════════════════════════════════════════
   ELAPSED TIMER
═══════════════════════════════════════════════════════════ */
export function ElapsedTimer() {
  const [sec, setSec] = useState(0);
  const startRef = useRef(Date.now());
  useEffect(() => {
    const id = setInterval(() => setSec(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const m = Math.floor(sec / 60), s = sec % 60;
  return <span className="sc-elapsed">{m}:{String(s).padStart(2,'0')}</span>;
}

/* ═══════════════════════════════════════════════════════════
   PIANO
═══════════════════════════════════════════════════════════ */
export const pianoKeys = (() => {
  const keys = [];
  for (let m = PIANO_START; m <= PIANO_END; m++) {
    const name   = NOTE_NAMES[m % 12];
    const octave = Math.floor(m / 12) - 1;
    keys.push({
      note: `${name}${octave}`, name, octave,
      black: BLACK_NOTES.has(name),
      hz: 440 * Math.pow(2, (m - 69) / 12), midi: m,
    });
  }
  return keys;
})();

export function Piano() {
  const ctxRef  = useRef(null);
  const [active, setActive] = useState(new Set());

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new window.AudioContext();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playNote = useCallback((hz, noteId) => {
    const ctx  = getCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.type = 'sine'; osc.frequency.value = hz;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.6);
    setActive(p => new Set([...p, noteId]));
    setTimeout(() => setActive(p => { const s = new Set(p); s.delete(noteId); return s; }), 160);
  }, [getCtx]);

  useEffect(() => {
    const handler = (e) => {
      if (e.repeat) return;
      const noteId = KEY_MAP[e.key.toLowerCase()];
      const key    = noteId && pianoKeys.find(k => k.note === noteId);
      if (key) playNote(key.hz, key.note);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [playNote]);

  useEffect(() => () => ctxRef.current?.close(), []);

  return (
    <div className="sc-piano-wrap">
      <p className="sc-piano-hint">
        Play: <kbd>A S D F G H J K L</kbd> white keys · <kbd>W E T Y U O P</kbd> black keys
      </p>
      <div className="sc-piano" role="group" aria-label="Reference piano">
        {pianoKeys.map(k => (
          <button key={k.note}
            className={`sc-key ${k.black ? 'black' : 'white'} ${active.has(k.note) ? 'pressed' : ''}`}
            onPointerDown={() => playNote(k.hz, k.note)}
            type="button" aria-label={k.note}>
            {!k.black && k.name === 'C' && <span className="sc-key-oct">{k.octave}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DRILL TIMER
═══════════════════════════════════════════════════════════ */
export function DrillTimer() {
  const [chosen,  setChosen]  = useState(60);
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const [done,    setDone]    = useState(false);
  const [preset,  setPreset]  = useState('');

  useEffect(() => { setSeconds(chosen); setRunning(false); setDone(false); }, [chosen]);

  useEffect(() => {
    if (!running) return;
    setDone(false);
    const id = setInterval(() => setSeconds(s => {
      if (s <= 1) { setRunning(false); setDone(true); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [running]);

  const pct  = (seconds / chosen) * 100;
  const circ = 2 * Math.PI * 40;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="sc-timer">
      <div className="sc-timer-preset-row">
        {DRILL_PRESETS.map(p => (
          <button key={p} className={`sc-preset-btn ${preset === p ? 'active' : ''}`}
            onClick={() => setPreset(p)} type="button">{p}</button>
        ))}
      </div>
      {preset && <p className="sc-preset-label">Drill: <strong>{preset}</strong></p>}
      <div className="sc-dur-row">
        {DURATIONS.map(d => (
          <button key={d.secs} className={`sc-dur-btn ${chosen === d.secs ? 'active' : ''}`}
            onClick={() => setChosen(d.secs)} type="button">{d.label}</button>
        ))}
      </div>
      <div className="sc-ring-wrap">
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" className="sc-ring-bg"/>
          <circle cx="48" cy="48" r="40" className="sc-ring-fill"
            style={{ strokeDasharray: circ, strokeDashoffset: circ * (1 - pct / 100),
              transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}/>
        </svg>
        <div className="sc-ring-text">
          <span className="sc-ring-digits">{mins}:{String(secs).padStart(2,'0')}</span>
          <span className="sc-ring-unit">min</span>
        </div>
      </div>
      {done && <p className="sc-timer-done">✓ Block complete — move to the next drill.</p>}
      <div className="sc-timer-btns">
        <button className="sc-btn primary"
          onClick={() => { setSeconds(chosen); setRunning(true); setDone(false); }}
          type="button">{running ? 'Restart' : 'Start'}</button>
        {running  && <button className="sc-btn" onClick={() => setRunning(false)} type="button">Pause</button>}
        {!running && seconds < chosen && seconds > 0 &&
          <button className="sc-btn" onClick={() => setRunning(true)} type="button">Resume</button>}
        <button className="sc-btn"
          onClick={() => { setSeconds(chosen); setRunning(false); setDone(false); }}
          type="button">Reset</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   THEORY QUIZ
═══════════════════════════════════════════════════════════ */
export function TheoryQuiz({ onScoreChange }) {
  const [index,    setIndex]    = useState(0);
  const [score,    setScore]    = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState('');
  const [anim,     setAnim]     = useState('in');

  const q = quizBank[index % quizBank.length];

  const pick = useCallback((opt) => {
    if (answered) return;
    const correct = opt === q.answer;
    const ns = score + (correct ? 1 : 0), na = attempts + 1;
    setSelected(opt); setAnswered(true); setScore(ns); setAttempts(na);
    onScoreChange?.({ score: ns, attempts: na });
  }, [answered, q.answer, score, attempts, onScoreChange]);

  const next = useCallback(() => {
    setAnim('out');
    setTimeout(() => { setIndex(i => i + 1); setAnswered(false); setSelected(''); setAnim('in'); }, 200);
  }, []);

  const pct   = attempts === 0 ? 0 : Math.round((score / attempts) * 100);
  const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';

  return (
    <div className={`sc-quiz anim-${anim}`}>
      <div className="sc-quiz-header">
        <span className="sc-quiz-idx">Question {(index % quizBank.length) + 1} / {quizBank.length}</span>
        <span className="sc-quiz-grade">
          {attempts > 0 ? `${score}/${attempts} · ${pct}% · Grade ${grade}` : 'No answers yet'}
        </span>
      </div>
      {attempts > 0 && (
        <div className="sc-quiz-bar"><div className="sc-quiz-bar-fill" style={{ width: `${pct}%` }}/></div>
      )}
      <p className="sc-quiz-q">{q.question}</p>
      <div className="sc-quiz-opts">
        {q.options.map(opt => {
          const isRight = answered && opt === q.answer;
          const isWrong = answered && opt === selected && opt !== q.answer;
          return (
            <button key={opt} type="button" disabled={answered}
              className={`sc-opt ${isRight ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
              onClick={() => pick(opt)}>{opt}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`sc-quiz-fb ${selected === q.answer ? 'correct' : 'wrong'}`}>
          {selected === q.answer
            ? '✓ Correct. Your ear is getting sharper.'
            : `✗ The answer is: ${q.answer}. Revisit this in your home practice.`}
        </div>
      )}
      {answered && (
        <button className="sc-btn" onClick={next} type="button" style={{ marginTop: 12 }}>
          Next question →
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PITCH CHECKER
═══════════════════════════════════════════════════════════ */
export function PitchChecker() {
  const [running, setRunning] = useState(false);
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [error,   setError]   = useState('');

  const rafRef      = useRef(0);
  const streamRef   = useRef(null);
  const ctxRef      = useRef(null);
  const analyserRef = useRef(null);
  const smoothRef   = useRef([]);
  const lastTickRef = useRef(0);

  const stop = useCallback(() => {
    setRunning(false);
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    ctxRef.current?.close();
    ctxRef.current = null; analyserRef.current = null; smoothRef.current = [];
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async () => {
    setError(''); setHistory([]); setReading(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: false, autoGainControl: false, echoCancellation: false },
      });
      const audioCtx = new window.AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 4096; analyser.smoothingTimeConstant = 0;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      streamRef.current = stream; ctxRef.current = audioCtx; analyserRef.current = analyser;
      smoothRef.current = [];
      setRunning(true);
      const loop = (ts) => {
        rafRef.current = requestAnimationFrame(loop);
        if (ts - lastTickRef.current < PITCH_FPS) return;
        lastTickRef.current = ts;
        const freq = detectPitch(analyser, audioCtx.sampleRate);
        if (!freq) return;
        const h = smoothRef.current;
        h.push(freq); if (h.length > 6) h.shift();
        const avg  = h.reduce((a, b) => a + b, 0) / h.length;
        const info = freqToNote(avg);
        setReading(info);
        setHistory(prev => {
          const next = [...prev, info.cents];
          return next.length > HISTORY_LEN ? next.slice(-HISTORY_LEN) : next;
        });
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      setError(err?.message || 'Microphone access denied.');
    }
  }, []);

  const cents  = reading?.cents ?? 0;
  const needle = Math.max(-50, Math.min(50, cents));
  const status = !reading ? 'idle' : Math.abs(cents) <= 8 ? 'intune' : cents > 0 ? 'sharp' : 'flat';
  const statusText = {
    idle:   'Sing into your microphone',
    intune: '✓ In tune',
    sharp:  '↑ Sharp — relax the back of the throat slightly',
    flat:   '↓ Flat — support from the diaphragm and lift the soft palate',
  }[status];
  const targetHint = reading
    ? status === 'sharp' ? `Aim down toward ${reading.note}`
    : status === 'flat'  ? `Lift up toward ${reading.note}`
    : `Locked on ${reading.note}` : '';

  const spark = useMemo(() => {
    if (history.length < 2) return '';
    const W = 260, H = 44, mid = H / 2;
    return history.map((c, i) => {
      const x = (i / (HISTORY_LEN - 1)) * W;
      const y = mid - (Math.max(-50, Math.min(50, c)) / 50) * (mid - 4);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join('');
  }, [history]);

  return (
    <div className="sc-pitch">
      <div className="sc-pitch-note-row">
        <span className="sc-pitch-note">{reading?.note ?? '—'}</span>
        <span className="sc-pitch-freq">
          {reading ? `${Math.round(440 * Math.pow(2, (reading.midi - 69) / 12))} Hz` : ''}
        </span>
      </div>
      <div className="sc-meter">
        <div className="sc-meter-zone"/>
        <div className="sc-meter-needle" style={{ left: `${50 + needle}%` }}/>
        <div className="sc-meter-labels">
          <span>Flat ↓</span><span>In tune</span><span>↑ Sharp</span>
        </div>
      </div>
      <div className={`sc-pitch-status ${status}`}>{statusText}</div>
      {targetHint && <p className="sc-pitch-hint">{targetHint}</p>}
      {history.length > 1 && (
        <svg className="sc-spark" viewBox="0 0 260 44" preserveAspectRatio="none">
          <line x1="0" y1="22" x2="260" y2="22" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
          <path d={spark} fill="none" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )}
      {error && <p className="sc-error">{error}</p>}
      <button className={`sc-mic-btn ${running ? 'active' : ''}`}
        onClick={running ? stop : start} type="button">
        {running ? '⏹ Stop listening' : '🎤 Start listening'}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LESSON PANEL  (identical content in both apps)
═══════════════════════════════════════════════════════════ */
export function LessonPanel({ session }) {
  const [pageIdx, setPageIdx] = useState(0);
  const page = LESSON_PAGES[pageIdx];

  const techniqueById = useMemo(
    () => lessonTechniques.reduce((a, g) => { a[g.id] = g; return a; }, {}),
    [],
  );
  const sessionModules = Array.isArray(session?.modules) ? session.modules : [];

  const body = useMemo(() => {
    switch (page.id) {
      case 'warmup':
        return (
          <div className="sc-lesson-grid">
            <div className="sc-lcard full">
              <h4>10-Minute Warm-Up Sequence</h4>
              <p>Every session opens with this exact sequence. The body before the voice — always.</p>
              <ol className="sc-ol">
                <li><strong>2 min · Body release</strong> — shake hands → arms → shoulders. Slow head rolls (never full circle). Ribcage breath: 3 × (inhale wide, exhale on "ssss"). Shoulders must not rise.</li>
                <li><strong>2 min · Face activation</strong> — exaggerated chewing, jaw massage, scrunch-and-release × 3. Lip trills descending from a comfortable high note.</li>
                <li><strong>2 min · Coax the voice</strong> — hum with one hand on chest. Feel vibration move chest → face as you slide upward. "Ng" → open to "ahhh" × 5 on descending scale.</li>
                <li><strong>2 min · 5-note scales</strong> — "Ma-may-mee-moh-moo" ascending by semitone to a comfortable top, back down. Opens all five core vowels.</li>
                <li><strong>2 min · Ensemble tuning</strong> — staggered chord entry (bass → tenor → alto → soprano). Hold 8 counts. Everyone disappears into the blend. Call-and-response × 4 phrases.</li>
              </ol>
            </div>
            <div className="sc-lcard">
              <h4>Why sequence matters</h4>
              <p>A cold voice tears before it soars. This order — body, face, breath, pitch, ensemble — mirrors how the nervous system unlocks motor control. Skip a step and the next costs twice the effort.</p>
              <p className="sc-note">By week 3, this takes 8 minutes. The body learns the ritual. That is the signal it is working.</p>
            </div>
            <div className="sc-lcard">
              <h4>Common mistakes</h4>
              <ul className="sc-ul">
                <li>Shoulders rising on inhale → "Breathe into your back pockets"</li>
                <li>Tight jaw on lip trills → "Let the face be stupid"</li>
                <li>Pushing volume too early → all warm-up is mp or below</li>
                <li>Standing still → movement = release, model it yourself</li>
              </ul>
            </div>
          </div>
        );

      case 'posture': {
        const appoggio = techniqueById.resonance?.items?.find(i => i.name?.includes('Appoggio'));
        return (
          <div className="sc-lesson-grid">
            <div className="sc-lcard full">
              <h4>Posture as the first instrument</h4>
              <p>Before a single note — check the body. Efficient alignment means the diaphragm has room to drop, the throat stays unconstricted, and sound travels forward unobstructed.</p>
              {appoggio && (
                <div className="sc-drill-block">
                  <span className="sc-drill-label">Drill</span>
                  <p>{appoggio.exercise}</p>
                  <p className="sc-note">Progress signal: {appoggio.progressSignal}</p>
                </div>
              )}
            </div>
            <div className="sc-lcard">
              <h4>The 4-point self-check</h4>
              <ol className="sc-ol">
                <li>Ears over shoulders — no chin jut</li>
                <li>Shoulders over hips — not hunched or arched</li>
                <li>Ribcage lifts slightly and stays lifted throughout a phrase</li>
                <li>Knees soft — never locked</li>
              </ol>
            </div>
            <div className="sc-lcard">
              <h4>Correction cues</h4>
              <ul className="sc-ul">
                <li>"Stack your bones" — head, neck, spine one column</li>
                <li>"Breathe into your sides and back, not your front"</li>
                <li>"Hold the ribcage open while you sing"</li>
                <li>Partner check before every skill block</li>
              </ul>
            </div>
          </div>
        );
      }

      case 'resonance': {
        const items = techniqueById.resonance?.items ?? [];
        return (
          <div className="sc-lesson-grid">
            <div className="sc-lcard full">
              <h4>Resonance — where your real voice lives</h4>
              <p>Volume is not loudness. Resonance is amplification of tone through natural cavities — chest, pharynx, mask, head. Connecting all four gives power without strain.</p>
              <div className="sc-drill-block">
                <span className="sc-drill-label">Core drills</span>
                <p><strong>"Ng" → Ah:</strong> Hold "ng" — feel the buzz forward in your face. Slowly open to "ahhh" without losing that buzz. 8 reps on a descending scale.</p>
                <p><strong>Hum placement check:</strong> One hand on chest, one on forehead. Hum at medium pitch — feel both vibrate. Slide up: more forehead. Slide down: more chest. This is register awareness.</p>
              </div>
            </div>
            {items.slice(0, 4).map(item => (
              <div className="sc-lcard" key={item.name}>
                <h5>{item.name}</h5>
                <p>{item.meaning}</p>
                <p className="sc-note"><strong>Exercise:</strong> {item.exercise}</p>
              </div>
            ))}
          </div>
        );
      }

      case 'vocal': {
        const groups = lessonTechniques.filter(g => ['agility','gospel','language'].includes(g.id));
        return (
          <div className="sc-lesson-grid">
            <div className="sc-lcard full">
              <h4>Vocal technique — consistency over brilliance</h4>
              <p>Technique is what makes brilliance repeatable. Agility, diction, and Gospel phrasing are the three pillars.</p>
              <div className="sc-drill-block">
                <span className="sc-drill-label">Diction drill</span>
                <p>Say these words with exaggerated endings: <em>Great · Lord · Amen · Blessed · Kingdom · Hallelujah</em>. Then sing them the same way. A choir heard clearly worships twice as effectively.</p>
              </div>
            </div>
            {groups.map(g => (
              <div className="sc-lcard" key={g.id}>
                <h5>{g.title}</h5>
                <p>{g.items[0]?.meaning}</p>
                <p className="sc-note"><strong>Try now:</strong> {g.items[0]?.exercise}</p>
              </div>
            ))}
            <div className="sc-lcard">
              <h4>The three-reading exercise</h4>
              <p>Sing any 8-bar phrase three ways:</p>
              <ol className="sc-ol">
                <li>Completely flat — no dynamics, robotic</li>
                <li>Technically correct — dynamics right but mechanical</li>
                <li>Full conviction — belief behind every word</li>
              </ol>
              <p className="sc-note">The contrast between 1 and 3 is always revelatory.</p>
            </div>
          </div>
        );
      }

      case 'pitch': {
        const items = techniqueById.theory?.items ?? [];
        return (
          <div className="sc-lesson-grid">
            <div className="sc-lcard full">
              <h4>Pitch accuracy — the ensemble's currency</h4>
              <p>Out-of-tune harmony disrupts every voice around it. Ear training is the most compounding skill in choral work: improve it once and every subsequent rehearsal improves with it.</p>
              <div className="sc-drill-block">
                <span className="sc-drill-label">Interval matching drill</span>
                <p>Play a note on the piano. Choir sings it back in unison. Leader plays the note a third above — choir finds it without piano first, then checks. 10 repetitions. Wrong answers are expected and useful.</p>
              </div>
            </div>
            {items.map(item => (
              <div className="sc-lcard" key={item.name}>
                <h5>{item.name}</h5>
                <p>{item.meaning}</p>
                <p className="sc-note"><strong>Exercise:</strong> {item.exercise}</p>
              </div>
            ))}
            <div className="sc-lcard">
              <h4>Self-correction as a skill</h4>
              <p>The goal is not for the leader to correct pitch — it is for each singer to hear themselves drift and self-correct mid-phrase. This takes 4–6 weeks of consistent ear training.</p>
              <p className="sc-note">Cue: "Can you hear the note you just left? Can you hear where you landed? That gap is your ear training target."</p>
            </div>
          </div>
        );
      }

      default: {
        const mods = sessionModules.length > 0
          ? sessionModules
          : [{ id: 'default', title: 'Session Reflection', details: 'Compare today to last session. What specifically improved? What is the one target for next week?' }];
        return (
          <div className="sc-lesson-grid">
            <div className="sc-lcard full">
              <h4>Session synthesis</h4>
              <p>Reflection converts practice into measurable growth. A rehearsal without a debrief is a rehearsal half-learned.</p>
              <div className="sc-drill-block">
                <span className="sc-drill-label">Debrief protocol</span>
                <ol className="sc-ol">
                  <li>Name one thing each section did measurably better than last week — specific, earned</li>
                  <li>Name one technical target for each section before next Saturday</li>
                  <li>Assign this week's 5-minute home practice verbally and confirm everyone heard it</li>
                  <li>Close on a held chord — let it ring, then silence</li>
                </ol>
              </div>
            </div>
            {mods.map(m => (
              <div className="sc-lcard" key={m.id ?? m.title}>
                <h5>{m.title ?? m.label}</h5>
                <p>{m.details ?? m.content ?? 'Module content appears here.'}</p>
              </div>
            ))}
          </div>
        );
      }
    }
  }, [page.id, techniqueById, sessionModules]);

  return (
    <div className="sc-panel">
      <div className="sc-lesson-nav">
        {LESSON_PAGES.map((p, i) => (
          <button key={p.id} type="button"
            className={`sc-lnav-btn ${pageIdx === i ? 'active' : ''} ${i < pageIdx ? 'visited' : ''}`}
            onClick={() => setPageIdx(i)}>
            {i < pageIdx ? '✓ ' : ''}{p.label}
          </button>
        ))}
      </div>
      <div className="sc-feel-bar">
        <span className="sc-feel-label">What you should feel when this page is done</span>
        <p className="sc-feel-text">{page.feel}</p>
      </div>
      <div className="sc-lesson-body">{body}</div>
      <div className="sc-lesson-footer">
        <button className="sc-btn" onClick={() => setPageIdx(i => Math.max(0, i - 1))}
          disabled={pageIdx === 0} type="button">← Previous</button>
        <span className="sc-page-dot">{pageIdx + 1} / {LESSON_PAGES.length}</span>
        <button className="sc-btn primary"
          onClick={() => setPageIdx(i => Math.min(LESSON_PAGES.length - 1, i + 1))}
          disabled={pageIdx === LESSON_PAGES.length - 1} type="button">Next →</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TOOLS PANEL  (identical in both apps)
═══════════════════════════════════════════════════════════ */
export function ToolsPanel({ onQuizScore }) {
  return (
    <div className="sc-panel">
      <div className="sc-tools-intro sc-lcard">
        <h4>Coaching tools</h4>
        <div className="sc-tool-desc-grid">
          <div><strong>Pitch Tuner</strong> — live note detection with targeted correction cues and a history sparkline.</div>
          <div><strong>Reference Piano</strong> — play any note for matching and interval drills. Keyboard shortcuts supported.</div>
          <div><strong>Drill Timer</strong> — named drill presets with configurable duration and progress ring.</div>
          <div><strong>Theory Quiz</strong> — cumulative literacy score across sessions. Grade feeds into completion.</div>
        </div>
      </div>
      <div className="sc-tool-section"><h5 className="sc-tool-h">Live pitch tuner</h5><PitchChecker/></div>
      <div className="sc-tool-section"><h5 className="sc-tool-h">Drill timer</h5><DrillTimer/></div>
      <div className="sc-tool-section"><h5 className="sc-tool-h">Music theory quiz</h5><TheoryQuiz onScoreChange={onQuizScore}/></div>
      <div className="sc-tool-section"><h5 className="sc-tool-h">Reference piano · C3 – B5</h5><Piano/></div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CHECKLIST PANEL  (shared — each page can pass its own
   checklistItems and sessionId key)
═══════════════════════════════════════════════════════════ */
const CHECKLIST_GROUPS = [
  { label: 'Preparation', items: checklistTemplate.slice(0, 2) },
  { label: 'Technique',   items: checklistTemplate.slice(2, 5) },
  { label: 'Ensemble',    items: checklistTemplate.slice(5, 8) },
  { label: 'Reflection',  items: checklistTemplate.slice(8)    },
];

export function ChecklistPanel({ checked, setChecked, onComplete, sessionReady, quizScore, sessionId }) {
  const [loading,    setLoading]    = useState(false);
  const [message,    setMessage]    = useState('');
  const [error,      setError]      = useState('');
  const [reflection, setReflection] = useState(
    () => localStorage.getItem(`reflection_${sessionId}`) ?? ''
  );

  const pct     = Math.round((checked.size / checklistTemplate.length) * 100);
  const allDone = checked.size === checklistTemplate.length;

  const toggle = useCallback((task) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(task) ? next.delete(task) : next.add(task);
      return next;
    });
  }, [setChecked]);

  const saveReflection = useCallback((val) => {
    setReflection(val);
    localStorage.setItem(`reflection_${sessionId}`, val);
  }, [sessionId]);

  const submit = async () => {
    setError(''); setMessage(''); setLoading(true);
    try {
      await onComplete({
        checks:      [...checked],
        theoryScore: quizScore.attempts > 0
          ? Math.round((quizScore.score / quizScore.attempts) * 100) : 0,
        reflection,
        durationMin:  55,
        skillDeltas:  { agility: 2, rhythm: 2 },
      });
      setMessage('✓ Session saved. The growth compounds.');
    } catch (err) {
      setError(err?.message ?? 'Could not save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sc-panel">
      <div className="sc-checklist-card sc-lcard">
        <div className="sc-cl-header">
          <div>
            <h3>Session checklist</h3>
            <p>Every item maps to a coaching outcome. Complete all before marking done.</p>
          </div>
          <span className="sc-pct-pill">{pct}%</span>
        </div>
        <div className="sc-prog-bar"><div className="sc-prog-fill" style={{ width: `${pct}%` }}/></div>
        <div className="sc-cl-bulk">
          <button className="sc-btn" onClick={() => setChecked(new Set(checklistTemplate))} type="button">Mark all</button>
          <button className="sc-btn" onClick={() => setChecked(new Set())} type="button">Clear all</button>
        </div>
        {CHECKLIST_GROUPS.map(group => (
          <div key={group.label} className="sc-cl-group">
            <p className="sc-cl-group-label">{group.label}</p>
            {group.items.map(task => {
              const done = checked.has(task);
              return (
                <div key={task} className={`sc-cl-item ${done ? 'done' : ''}`}
                  onClick={() => toggle(task)} role="checkbox" aria-checked={done} tabIndex={0}
                  onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(task); }}}>
                  <div className="sc-checkbox">{done ? '✓' : ''}</div>
                  <span>{task}</span>
                </div>
              );
            })}
          </div>
        ))}
        {quizScore.attempts > 0 && (
          <p className="sc-quiz-score-line">
            Theory literacy: {quizScore.score}/{quizScore.attempts}
            · {Math.round(quizScore.score / quizScore.attempts * 100)}%
            · Grade {(() => {
              const p = Math.round(quizScore.score / quizScore.attempts * 100);
              return p >= 90 ? 'A' : p >= 80 ? 'B' : p >= 70 ? 'C' : p >= 60 ? 'D' : 'F';
            })()}
          </p>
        )}
        <div className="sc-reflection">
          <label className="sc-refl-label">What improved today? What is your one target for next week?</label>
          <textarea className="sc-refl-area" rows={3} value={reflection}
            onChange={e => saveReflection(e.target.value)}
            placeholder="Write one specific thing that moved today and one specific target for next Saturday…"/>
          <p className="sc-refl-hint">Saved automatically. Converts practice into measurable growth.</p>
        </div>
        <button className="sc-btn primary sc-complete-btn"
          disabled={!allDone || loading || !sessionReady} onClick={submit} type="button">
          {loading ? 'Saving…' : allDone ? 'Mark session complete →' : `${checklistTemplate.length - checked.size} items remaining`}
        </button>
        {message && <p className="sc-success">{message}</p>}
        {error   && <p className="sc-error">{error}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAESTRO PANEL  (Member only — leader imports DebriefPanel)
═══════════════════════════════════════════════════════════ */
export function MaestroPanel({ onAskAi, session }) {
  const weekContext = session
    ? `Session: ${session.title ?? 'Unknown'}, Phase: ${session.phase ?? 'Unknown'}.`
    : '';

  const [history, setHistory] = useState([{
    role: 'assistant',
    content: `I'm Maestro — your AI vocal coach. ${weekContext ? `I know you're working on ${session?.title}.` : ''} Ask me anything about today's session, your voice, or choral technique. I remember everything we discuss.`,
  }]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history, loading]);

  const send = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setError(''); setInput('');
    const userMsg  = { role: 'user', content: msg };
    const nextHist = [...history, userMsg];
    setHistory(nextHist);
    setLoading(true);
    try {
      if (typeof onAskAi !== 'function') throw new Error('AI coach is unavailable.');
      const apiMsgs = nextHist.map(m => ({ role: m.role, content: m.content }));
      if (weekContext && apiMsgs[0]?.role === 'user') {
        apiMsgs[0] = { ...apiMsgs[0], content: `[Context: ${weekContext}]\n\n${apiMsgs[0].content}` };
      }
      const res = await onAskAi(apiMsgs);
      setHistory(h => [...h, { role: 'assistant', content: res.reply ?? 'No response.' }]);
    } catch (err) {
      setError(err?.message ?? 'Maestro is unavailable right now.');
      setHistory(h => h.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [input, history, onAskAi, weekContext]);

  return (
    <div className="sc-panel">
      <div className="sc-maestro-wrap">
        <div className="sc-suggestions">
          {MAESTRO_SUGGESTIONS.map(s => (
            <button key={s} className="sc-suggest" onClick={() => send(s)}
              disabled={loading} type="button">{s}</button>
          ))}
        </div>
        <div className="sc-chat-msgs">
          {history.map((m, i) => (
            <div key={i} className={`sc-bubble ${m.role}`}>
              {m.role === 'assistant' && <span className="sc-bubble-from">Maestro</span>}
              <p>{m.content}</p>
            </div>
          ))}
          {loading && (
            <div className="sc-bubble assistant">
              <span className="sc-bubble-from">Maestro</span>
              <p className="sc-dots"><span/><span/><span/></p>
            </div>
          )}
          <div ref={endRef}/>
        </div>
        {error && <p className="sc-error" style={{ padding: '0 16px 8px' }}>{error}</p>}
        <div className="sc-chat-input-row">
          <textarea className="sc-chat-input" rows={2} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }}}
            placeholder="Ask Maestro anything — technique, harmony, member challenges… (Enter to send)"/>
          <button className="sc-btn primary" onClick={() => send()}
            disabled={loading || !input.trim()} type="button">Send</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHARED HEADER SHELL  (renders hero + tab bar; panels
   are injected by the consumer via children)
═══════════════════════════════════════════════════════════ */
export function SessionShell({ session, tabs, activeTab, onTabChange, onBack, sessionReady, children }) {
  return (
    <main className="sc-root">
      <header className="sc-header">
        <button className="sc-back" onClick={onBack} type="button">← Dashboard</button>
        <div className="sc-header-center">
          <span className="sc-phase-tag">{session?.phase ?? 'Session'}</span>
        </div>
        <ElapsedTimer/>
      </header>

      <div className="sc-hero">
        <h1 className="sc-hero-title">{session?.title ?? 'Vocal Training Session'}</h1>
        <p className="sc-hero-desc">{session?.description ?? 'Work through each tab in order. Every section builds on the last.'}</p>
        {!sessionReady && (
          <p className="sc-error" style={{ marginTop: 8 }}>
            Session details will appear here once the dashboard selects an active lesson.
          </p>
        )}
      </div>

      <nav className="sc-tabbar" role="tablist">
        {tabs.map(t => (
          <button key={t.id} role="tab" aria-selected={activeTab === t.id}
            className={`sc-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => onTabChange(t.id)} type="button">
            <span className="sc-tab-icon">{t.icon}</span>
            <span className="sc-tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {children}
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════
   DARK CSS  (Conservatory aesthetic — injected once per page)
═══════════════════════════════════════════════════════════ */
export const DARK_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Outfit:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');

.sc-root {
  --bg:#0e0e0f; --surface:#16161a; --surface2:#1e1e24;
  --border:rgba(255,255,255,0.07); --border2:rgba(255,255,255,0.12);
  --amber:#e8a830; --amber-d:#b5821f; --amber-bg:rgba(232,168,48,0.08);
  --sage:#4a9e6e; --sage-bg:rgba(74,158,110,0.1);
  --danger:#c94040; --danger-bg:rgba(201,64,64,0.1);
  --text:#e8e4dc; --muted:#7a7472; --muted2:#5a5654;
  --radius:10px; --radius-lg:16px;
  font-family:'Outfit',sans-serif; font-weight:300;
  background:var(--bg); color:var(--text);
  min-height:100vh; max-width:800px; margin:0 auto;
  padding-bottom:60px; letter-spacing:0.01em;
}
.sc-header { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-bottom:1px solid var(--border); position:sticky; top:0; background:var(--bg); z-index:20; backdrop-filter:blur(12px); }
.sc-back { font-size:13px; color:var(--muted); background:none; border:none; cursor:pointer; font-family:'Outfit',sans-serif; font-weight:400; letter-spacing:0.02em; transition:color .15s; }
.sc-back:hover { color:var(--text); }
.sc-header-center { flex:1; display:flex; justify-content:center; }
.sc-phase-tag { font-size:11px; font-weight:500; letter-spacing:0.12em; text-transform:uppercase; color:var(--amber); border:1px solid var(--amber-d); border-radius:20px; padding:3px 12px; }
.sc-elapsed { font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--muted); }
.sc-hero { padding:36px 24px 28px; background:linear-gradient(160deg,#13130f 0%,#0e0e0f 60%); border-bottom:1px solid var(--border); }
.sc-hero-title { font-family:'Cormorant Garamond',serif; font-size:clamp(26px,5vw,36px); font-weight:600; line-height:1.15; color:#f0ece4; margin-bottom:8px; }
.sc-hero-desc { font-size:14px; color:var(--muted); line-height:1.7; max-width:520px; }
.sc-tabbar { display:flex; border-bottom:1px solid var(--border); background:var(--bg); position:sticky; top:53px; z-index:19; }
.sc-tab { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; padding:11px 4px; border:none; background:none; cursor:pointer; font-family:'Outfit',sans-serif; color:var(--muted2); border-bottom:2px solid transparent; transition:color .2s,border-color .2s; }
.sc-tab.active { color:var(--amber); border-bottom-color:var(--amber); }
.sc-tab-icon { font-size:16px; }
.sc-tab-label { font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.08em; }
.sc-panel { padding:20px; display:flex; flex-direction:column; gap:14px; }
.sc-lcard { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px 22px; }
.sc-lcard.full { grid-column:1/-1; }
.sc-lcard h4 { font-family:'Cormorant Garamond',serif; font-size:18px; font-weight:600; color:#f0ece4; margin-bottom:8px; }
.sc-lcard h5 { font-size:14px; font-weight:500; color:var(--amber); margin-bottom:6px; }
.sc-lcard p  { font-size:13px; color:var(--muted); line-height:1.65; margin-bottom:8px; }
.sc-lcard p:last-child { margin-bottom:0; }
.sc-note { font-size:12px !important; color:var(--muted2) !important; font-style:italic; }
.sc-ol,.sc-ul { padding-left:18px; font-size:13px; color:var(--muted); line-height:1.9; margin:8px 0 0; }
.sc-lesson-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media(max-width:580px){ .sc-lesson-grid { grid-template-columns:1fr; } }
.sc-drill-block { background:var(--surface2); border-left:2px solid var(--amber-d); border-radius:0 8px 8px 0; padding:12px 14px; margin-top:12px; }
.sc-drill-label { font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.1em; color:var(--amber-d); display:block; margin-bottom:6px; }
.sc-lesson-nav { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; }
.sc-lnav-btn { font-size:12px; font-weight:400; border:1px solid var(--border); border-radius:20px; padding:5px 14px; background:none; color:var(--muted); cursor:pointer; font-family:'Outfit',sans-serif; transition:all .15s; }
.sc-lnav-btn.active  { background:var(--amber-bg); border-color:var(--amber-d); color:var(--amber); }
.sc-lnav-btn.visited { color:var(--sage); border-color:var(--sage); }
.sc-feel-bar { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:10px 14px; margin-bottom:14px; }
.sc-feel-label { font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted2); display:block; margin-bottom:4px; }
.sc-feel-text  { font-size:13px; color:var(--muted); font-style:italic; margin:0; line-height:1.5; }
.sc-lesson-body { display:flex; flex-direction:column; gap:12px; }
.sc-lesson-footer { display:flex; align-items:center; justify-content:space-between; padding-top:14px; margin-top:4px; border-top:1px solid var(--border); }
.sc-page-dot { font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--muted); }
.sc-btn { font-size:13px; font-weight:400; border:1px solid var(--border2); border-radius:8px; padding:8px 18px; background:var(--surface2); color:var(--text); cursor:pointer; font-family:'Outfit',sans-serif; transition:all .15s; letter-spacing:0.02em; }
.sc-btn:hover:not(:disabled) { border-color:var(--amber-d); color:var(--amber); }
.sc-btn:disabled { opacity:.4; cursor:not-allowed; }
.sc-btn.primary { background:var(--amber-bg); border-color:var(--amber-d); color:var(--amber); }
.sc-btn.primary:hover:not(:disabled) { background:var(--amber); color:var(--bg); border-color:var(--amber); }
.sc-tools-intro { margin-bottom:4px; }
.sc-tool-desc-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px; font-size:13px; color:var(--muted); line-height:1.6; }
@media(max-width:540px){ .sc-tool-desc-grid { grid-template-columns:1fr; } }
.sc-tool-section { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px 18px; }
.sc-tool-h { font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted2); margin-bottom:14px; }
.sc-timer { display:flex; flex-direction:column; align-items:center; padding:4px 0; }
.sc-timer-preset-row { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-bottom:10px; }
.sc-preset-btn { font-size:11px; border:1px solid var(--border); border-radius:20px; padding:4px 12px; background:none; color:var(--muted); cursor:pointer; font-family:'Outfit',sans-serif; transition:all .15s; white-space:nowrap; }
.sc-preset-btn.active { border-color:var(--amber-d); color:var(--amber); background:var(--amber-bg); }
.sc-preset-label { font-size:12px; color:var(--muted); margin-bottom:8px; }
.sc-dur-row { display:flex; gap:6px; flex-wrap:wrap; justify-content:center; margin-bottom:14px; }
.sc-dur-btn { font-size:12px; border:1px solid var(--border); border-radius:8px; padding:5px 14px; background:none; color:var(--muted); cursor:pointer; font-family:'Outfit',sans-serif; transition:all .15s; }
.sc-dur-btn.active { border-color:var(--amber-d); color:var(--amber); }
.sc-ring-wrap { position:relative; width:96px; height:96px; margin-bottom:12px; }
.sc-ring-bg   { fill:none; stroke:var(--surface2); stroke-width:8; }
.sc-ring-fill { fill:none; stroke:var(--amber); stroke-width:8; stroke-linecap:round; transition:stroke-dashoffset .9s linear; }
.sc-ring-text { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.sc-ring-digits { font-family:'JetBrains Mono',monospace; font-size:22px; font-weight:500; color:var(--text); line-height:1; }
.sc-ring-unit   { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em; margin-top:2px; }
.sc-timer-btns { display:flex; gap:8px; margin-top:10px; }
.sc-timer-done { font-size:13px; color:var(--sage); margin:8px 0 0; }
.sc-quiz { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:18px; }
.sc-quiz.anim-out { animation:quizOut .2s ease both; }
.sc-quiz.anim-in  { animation:quizIn  .2s ease both; }
@keyframes quizOut { to  { opacity:0; transform:translateX(-10px); } }
@keyframes quizIn  { from{ opacity:0; transform:translateX(10px);  } }
.sc-quiz-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.sc-quiz-idx   { font-size:12px; color:var(--muted); }
.sc-quiz-grade { font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--amber); }
.sc-quiz-bar   { height:3px; background:var(--surface2); border-radius:99px; overflow:hidden; margin-bottom:12px; }
.sc-quiz-bar-fill { height:100%; background:var(--amber); border-radius:99px; transition:width .4s ease; }
.sc-quiz-q { font-size:15px; font-weight:400; color:var(--text); line-height:1.55; margin-bottom:14px; }
.sc-quiz-opts { display:flex; flex-direction:column; gap:8px; }
.sc-opt { text-align:left; border:1px solid var(--border); border-radius:8px; padding:10px 13px; font-size:13px; cursor:pointer; font-family:'Outfit',sans-serif; background:var(--surface2); color:var(--muted); transition:all .15s; }
.sc-opt:hover:not(:disabled) { border-color:var(--amber-d); color:var(--amber); }
.sc-opt.correct { background:var(--sage-bg); border-color:var(--sage); color:var(--sage); }
.sc-opt.wrong   { background:var(--danger-bg); border-color:var(--danger); color:var(--danger); }
.sc-quiz-fb { font-size:13px; margin-top:12px; padding:10px 13px; border-radius:8px; line-height:1.5; }
.sc-quiz-fb.correct { background:var(--sage-bg); color:var(--sage); }
.sc-quiz-fb.wrong   { background:var(--danger-bg); color:var(--danger); }
.sc-pitch { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px; text-align:center; }
.sc-pitch-note-row { margin-bottom:12px; }
.sc-pitch-note { display:block; font-family:'Cormorant Garamond',serif; font-size:54px; font-weight:600; color:#f0ece4; line-height:1; }
.sc-pitch-freq { font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--muted); }
.sc-meter { position:relative; height:6px; background:var(--surface2); border-radius:99px; margin:10px 0 6px; }
.sc-meter-zone { position:absolute; left:40%; width:20%; height:100%; background:rgba(74,158,110,0.3); border-radius:99px; }
.sc-meter-needle { position:absolute; top:-6px; width:3px; height:18px; background:var(--amber); border-radius:2px; transform:translateX(-50%); transition:left 0.12s ease; }
.sc-meter-labels { display:flex; justify-content:space-between; font-size:10px; color:var(--muted2); margin-top:4px; }
.sc-pitch-status { font-size:13px; font-weight:500; margin:12px 0 4px; }
.sc-pitch-status.intune { color:var(--sage); }
.sc-pitch-status.sharp  { color:var(--amber); }
.sc-pitch-status.flat   { color:var(--danger); }
.sc-pitch-status.idle   { color:var(--muted); }
.sc-pitch-hint { font-size:12px; color:var(--muted); font-style:italic; margin:0 0 8px; }
.sc-spark { display:block; width:100%; height:44px; margin:10px 0 8px; border-radius:6px; overflow:hidden; background:var(--surface2); }
.sc-mic-btn { width:100%; margin-top:8px; padding:11px; border:1px solid var(--border2); border-radius:8px; background:var(--surface2); font-size:14px; font-weight:500; cursor:pointer; font-family:'Outfit',sans-serif; color:var(--text); transition:all .15s; }
.sc-mic-btn:hover  { border-color:var(--amber-d); color:var(--amber); }
.sc-mic-btn.active { background:var(--danger-bg); border-color:var(--danger); color:var(--danger); }
.sc-piano-wrap { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px 16px 20px; overflow-x:auto; }
.sc-piano-hint { font-size:12px; color:var(--muted); margin-bottom:12px; line-height:1.6; }
.sc-piano-hint kbd { font-family:'JetBrains Mono',monospace; font-size:11px; background:var(--surface2); border:1px solid var(--border2); border-radius:4px; padding:1px 5px; color:var(--text); }
.sc-piano { display:flex; position:relative; height:110px; min-width:580px; user-select:none; }
.sc-key { border:none; cursor:pointer; display:flex; align-items:flex-end; justify-content:center; padding-bottom:6px; transition:background .07s; }
.sc-key.white { flex-shrink:0; width:30px; height:110px; background:#f5f0e8; border:1px solid #c8bfb0; border-radius:0 0 5px 5px; color:#999; font-size:0; }
.sc-key.white:hover   { background:#fffaee; }
.sc-key.white.pressed { background:var(--amber); }
.sc-key.black { flex-shrink:0; width:20px; height:68px; background:#1a1a1a; border:1px solid #333; margin:0 -10px; z-index:2; border-radius:0 0 5px 5px; position:relative; }
.sc-key.black:hover   { background:#2a2a2a; }
.sc-key.black.pressed { background:var(--amber-d); }
.sc-key-oct { font-size:9px; color:#aaa; font-family:'JetBrains Mono',monospace; }
.sc-checklist-card {}
.sc-cl-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:10px; }
.sc-cl-header h3 { font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:600; color:#f0ece4; margin-bottom:4px; }
.sc-cl-header p  { font-size:13px; color:var(--muted); }
.sc-pct-pill { font-family:'JetBrains Mono',monospace; font-size:14px; font-weight:500; color:var(--amber); background:var(--amber-bg); border:1px solid var(--amber-d); padding:4px 14px; border-radius:20px; flex-shrink:0; }
.sc-prog-bar { height:4px; background:var(--surface2); border-radius:99px; overflow:hidden; margin:12px 0 10px; }
.sc-prog-fill { height:100%; background:var(--amber); border-radius:99px; transition:width .5s ease; }
.sc-cl-bulk { display:flex; gap:8px; margin-bottom:16px; }
.sc-cl-group { margin-bottom:18px; }
.sc-cl-group-label { font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); margin-bottom:7px; }
.sc-cl-item { display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:var(--surface2); cursor:pointer; font-size:14px; color:var(--muted); margin-bottom:5px; transition:all .12s; }
.sc-cl-item:hover { border-color:var(--border2); color:var(--text); }
.sc-cl-item.done { background:var(--sage-bg); border-color:var(--sage); color:var(--sage); }
.sc-checkbox { width:20px; height:20px; border:1.5px solid var(--border2); border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0; background:var(--surface); transition:all .12s; }
.sc-cl-item.done .sc-checkbox { background:var(--sage); border-color:var(--sage); color:#fff; }
.sc-quiz-score-line { font-size:13px; color:var(--amber); margin:10px 0; font-family:'JetBrains Mono',monospace; }
.sc-reflection { margin:16px 0; }
.sc-refl-label { font-size:12px; font-weight:500; color:var(--muted); display:block; margin-bottom:6px; letter-spacing:0.02em; }
.sc-refl-area { width:100%; border:1px solid var(--border2); border-radius:8px; background:var(--surface2); color:var(--text); padding:10px 12px; font-size:14px; font-family:'Outfit',sans-serif; font-weight:300; resize:vertical; outline:none; line-height:1.6; transition:border-color .2s; }
.sc-refl-area:focus { border-color:var(--amber-d); }
.sc-refl-hint { font-size:11px; color:var(--muted2); margin-top:5px; font-style:italic; }
.sc-complete-btn { width:100%; padding:14px; font-size:15px; border-radius:10px; margin-top:8px; }
.sc-maestro-wrap { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; }
.sc-suggestions { display:flex; flex-wrap:wrap; gap:6px; padding:14px 14px 10px; border-bottom:1px solid var(--border); }
.sc-suggest { font-size:12px; border:1px solid var(--border2); border-radius:20px; padding:5px 12px; background:none; cursor:pointer; color:var(--muted); font-family:'Outfit',sans-serif; transition:all .15s; }
.sc-suggest:hover:not(:disabled) { border-color:var(--amber-d); color:var(--amber); }
.sc-suggest:disabled { opacity:0.4; cursor:not-allowed; }
.sc-chat-msgs { padding:16px; min-height:300px; max-height:420px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; scroll-behavior:smooth; }
.sc-bubble { max-width:82%; display:flex; flex-direction:column; gap:3px; }
.sc-bubble.assistant { align-self:flex-start; }
.sc-bubble.user      { align-self:flex-end; }
.sc-bubble-from { font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.1em; color:var(--amber); }
.sc-bubble p { padding:11px 14px; border-radius:12px; font-size:14px; line-height:1.7; margin:0; font-weight:300; }
.sc-bubble.assistant p { background:var(--surface2); border-bottom-left-radius:3px; color:var(--text); }
.sc-bubble.user      p { background:var(--amber); color:var(--bg); border-bottom-right-radius:3px; font-weight:400; }
.sc-dots { display:flex !important; align-items:center; gap:5px; padding:14px !important; }
.sc-dots span { width:7px; height:7px; background:var(--muted); border-radius:50%; animation:dot 1.3s ease-in-out infinite; }
.sc-dots span:nth-child(2) { animation-delay:.2s; }
.sc-dots span:nth-child(3) { animation-delay:.4s; }
@keyframes dot { 0%,80%,100%{transform:scale(.75);opacity:.3}40%{transform:scale(1.1);opacity:1} }
.sc-chat-input-row { display:flex; gap:8px; padding:12px 14px; border-top:1px solid var(--border); }
.sc-chat-input { flex:1; border:1px solid var(--border2); border-radius:8px; padding:10px 12px; font-size:14px; font-family:'Outfit',sans-serif; font-weight:300; background:var(--surface2); color:var(--text); outline:none; resize:none; transition:border-color .2s; line-height:1.5; }
.sc-chat-input:focus { border-color:var(--amber-d); }
.sc-success { font-size:13px; color:var(--sage); margin-top:10px; line-height:1.5; }
.sc-error   { font-size:13px; color:var(--danger); margin-top:6px; line-height:1.5; }
/* ── Leader-only debrief styles ── */
.sc-debrief { display:flex; flex-direction:column; gap:14px; }
.sc-section-notes-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:12px; }
@media(max-width:520px){ .sc-section-notes-grid { grid-template-columns:1fr; } }
.sc-section-note { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:12px 14px; }
.sc-section-note label { font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:0.1em; color:var(--amber-d); display:block; margin-bottom:6px; }
.sc-section-note textarea { width:100%; background:none; border:none; color:var(--text); font-size:13px; font-family:'Outfit',sans-serif; font-weight:300; resize:none; outline:none; line-height:1.6; }
`;

export default function SessionPage({ session, onAskAi, onComplete }) {
  const sessionId = session?.id ?? 'unknown-session';

  const [activeTab, setActiveTab] = useState('lesson');
  const [checked, setChecked] = useState(() => new Set());
  const [quizScore, setQuizScore] = useState({ score: 0, attempts: 0 });

  useEffect(() => {
    setActiveTab('lesson');
    setChecked(new Set());
    setQuizScore({ score: 0, attempts: 0 });
  }, [sessionId]);

  const tabs = useMemo(() => {
    const baseTabs = MEMBER_TABS;
    return baseTabs.filter((t) => t.id !== 'maestro' || typeof onAskAi === 'function');
  }, [onAskAi]);

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0]?.id ?? 'lesson');
    }
  }, [activeTab, tabs]);

  const sessionReady = Boolean(session?.id);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign('/dashboard');
  }, []);

  const handleComplete = useCallback(
    (payload) => {
      if (typeof onComplete !== 'function') {
        return Promise.reject(new Error('Saving progress is unavailable.'));
      }
      return onComplete(payload);
    },
    [onComplete],
  );

  const panel = (() => {
    switch (activeTab) {
      case 'tools':
        return <ToolsPanel key={`tools-${sessionId}`} onQuizScore={setQuizScore} />;
      case 'checklist':
        return (
          <ChecklistPanel
            key={`checklist-${sessionId}`}
            checked={checked}
            setChecked={setChecked}
            onComplete={handleComplete}
            sessionReady={sessionReady}
            quizScore={quizScore}
            sessionId={sessionId}
          />
        );
      case 'maestro':
        return <MaestroPanel key={`maestro-${sessionId}`} onAskAi={onAskAi} session={session} />;
      case 'lesson':
      default:
        return <LessonPanel key={`lesson-${sessionId}`} session={session} />;
    }
  })();

  return (
    <>
      <style>{DARK_CSS}</style>
      <SessionShell
        session={session}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBack={handleBack}
        sessionReady={sessionReady}
      >
        {panel}
      </SessionShell>
    </>
  );
}