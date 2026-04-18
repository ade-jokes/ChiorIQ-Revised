import React, { useMemo, useRef, useState } from 'react';
import { checklistTemplate, lessonTechniques, quizBank } from '../lib/courseData';

function detectPitch(analyser, sampleRate) {
  const buffer = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buffer);

  let bestOffset = -1;
  let bestCorrelation = 0;
  const size = buffer.length;

  for (let offset = 8; offset < 1000; offset += 1) {
    let corr = 0;
    for (let i = 0; i < size - offset; i += 1) {
      corr += Math.abs(buffer[i] - buffer[i + offset]);
    }
    corr = 1 - corr / (size - offset);
    if (corr > bestCorrelation) {
      bestCorrelation = corr;
      bestOffset = offset;
    }
  }

  if (bestOffset === -1 || bestCorrelation < 0.85) {
    return null;
  }

  return sampleRate / bestOffset;
}

function frequencyToNote(freq) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midi = Math.round(12 * (Math.log(freq / 440) / Math.log(2)) + 69);
  const note = notes[((midi % 12) + 12) % 12];
  const target = 440 * (2 ** ((midi - 69) / 12));
  const cents = Math.round(1200 * Math.log2(freq / target));
  return { note, cents };
}

function Piano() {
  const keys = [
    { note: 'C4', black: false, hz: 261.63 },
    { note: 'C#4', black: true, hz: 277.18 },
    { note: 'D4', black: false, hz: 293.66 },
    { note: 'D#4', black: true, hz: 311.13 },
    { note: 'E4', black: false, hz: 329.63 },
    { note: 'F4', black: false, hz: 349.23 },
    { note: 'F#4', black: true, hz: 369.99 },
    { note: 'G4', black: false, hz: 392.0 },
    { note: 'G#4', black: true, hz: 415.3 },
    { note: 'A4', black: false, hz: 440.0 },
    { note: 'A#4', black: true, hz: 466.16 },
    { note: 'B4', black: false, hz: 493.88 }
  ];

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
  const [answered, setAnswered] = useState(false);

  const q = quizBank[index % quizBank.length];

  function pick(option) {
    if (answered) return;
    setAnswered(true);
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
          <button key={opt} onClick={() => pick(opt)} type="button">{opt}</button>
        ))}
      </div>
      <div className="toolActions">
        <strong>Score: {score}</strong>
        <button type="button" onClick={() => { setIndex((i) => i + 1); setAnswered(false); }}>Next question</button>
      </div>
    </div>
  );
}

function PitchChecker() {
  const [running, setRunning] = useState(false);
  const [reading, setReading] = useState({ note: '--', freq: 0, cents: 0 });
  const rafRef = useRef(0);
  const streamRef = useRef(null);
  const audioRef = useRef(null);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = new window.AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    audioCtx.createMediaStreamSource(stream).connect(analyser);

    streamRef.current = stream;
    audioRef.current = audioCtx;
    setRunning(true);

    const loop = () => {
      const freq = detectPitch(analyser, audioCtx.sampleRate);
      if (freq) {
        const parsed = frequencyToNote(freq);
        setReading({ note: parsed.note, freq: Math.round(freq), cents: parsed.cents });
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    loop();
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
  }

  const needle = Math.max(-50, Math.min(50, reading.cents));
  const status = Math.abs(reading.cents) <= 8 ? 'In tune' : reading.cents > 0 ? 'Sharp' : 'Flat';

  return (
    <div className="toolCard">
      <h4>Live Pitch Checker</h4>
      <p className="pitchBig">{reading.note}</p>
      <p>{reading.freq} Hz · {status}</p>
      <div className="bar meter"><span style={{ left: `${50 + needle}%` }} /></div>
      {running ? (
        <button type="button" onClick={stop}>Stop microphone</button>
      ) : (
        <button type="button" onClick={start}>Start microphone</button>
      )}
    </div>
  );
}

export default function SessionPage({ session, onComplete, onAskAi }) {
  const [tab, setTab] = useState('lesson');
  const [checked, setChecked] = useState([]);
  const [aiPrompt, setAiPrompt] = useState('How can I tighten my harmonies this week?');
  const [aiReply, setAiReply] = useState('');

  const percent = useMemo(() => Math.round((checked.length / checklistTemplate.length) * 100), [checked.length]);

  const blocks = lessonTechniques.map((group) => (
    <article key={group.id} className="lessonBlock">
      <h4>{group.title}</h4>
      <ul>
        {group.items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </article>
  ));

  async function submitAi() {
    const messages = [{ role: 'user', content: aiPrompt }];
    const res = await onAskAi(messages);
    setAiReply(res.reply || 'No response');
  }

  return (
    <main className="pageWrap">
      <section className="heroCard">
        <h2>{session?.title || 'Session'}</h2>
        <p>{session?.description || 'Session learning experience with tabbed modules and expandable techniques.'}</p>
      </section>

      <div className="tabs">
        {['lesson', 'tools', 'checklist', 'maestro'].map((name) => (
          <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)} type="button">
            {name}
          </button>
        ))}
      </div>

      {tab === 'lesson' && <section className="sectionCard grid2">{blocks}</section>}

      {tab === 'tools' && (
        <section className="sectionCard grid2">
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
            disabled={checked.length < checklistTemplate.length}
            onClick={() => onComplete({ checks: checked, theoryScore: 85, durationMin: 55, skillDeltas: { agility: 2, rhythm: 2 } })}
            type="button"
          >
            Mark Session Complete
          </button>
        </section>
      )}

      {tab === 'maestro' && (
        <section className="sectionCard">
          <h3>AI Maestro</h3>
          <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={5} />
          <button className="primary" onClick={submitAi} type="button">Ask Maestro</button>
          {aiReply && <article className="aiReply">{aiReply}</article>}
        </section>
      )}
    </main>
  );
}
