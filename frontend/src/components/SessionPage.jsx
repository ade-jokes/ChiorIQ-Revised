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

const lessonBlueprints = {
  Foundation: {
    label: 'Foundation lesson',
    goal: 'Build breath, resonance, and pitch stability before adding speed or complexity.',
    outcomes: ['You can start the phrase with steady airflow.', 'You can match a reference pitch quickly.', 'You can identify one correction before repeating a phrase.'],
    coachCue: 'Listen for a tall vowel and a centered first tone.',
    checklistLead: 'Use the checklist to verify posture, pitch, and repetition before you finish.'
  },
  'Skill Build': {
    label: 'Skill-building lesson',
    goal: 'Layer blend, rhythm, diction, and control into the choir sound.',
    outcomes: ['You can keep the section together on the beat.', 'You can shape vowels to match the ensemble.', 'You can apply the technique in an excerpt.'],
    coachCue: 'Make the vowel shape match first, then add clarity to the consonants.',
    checklistLead: 'The lesson should feel complete only after the technique is applied in context.'
  },
  Performance: {
    label: 'Performance lesson',
    goal: 'Turn rehearsal detail into confident phrasing and stage-ready consistency.',
    outcomes: ['You can sing the passage with energy and accuracy.', 'You can recover quickly if the phrase slips.', 'You can complete the whole lesson without losing the musical line.'],
    coachCue: 'Keep the musical line forward even when the passage gets demanding.',
    checklistLead: 'Finish by reviewing one take and naming the next correction.'
  }
};

export default function SessionPage({ session, onComplete, onAskAi }) {
  const [tab, setTab] = useState('lesson');
  const [checked, setChecked] = useState([]);
  const [aiPrompt, setAiPrompt] = useState('How should I rehearse this lesson to sound more together?');
  const [aiReply, setAiReply] = useState('');

  const activeSession = session || {
    title: 'Lesson session',
    phase: 'Foundation',
    description: 'Open a session from the dashboard to begin the guided rehearsal path.',
    durationMin: 75,
    modules: []
  };

  const blueprint = lessonBlueprints[activeSession.phase] || lessonBlueprints.Foundation;
  const modules = activeSession.modules && activeSession.modules.length > 0
    ? activeSession.modules
    : [
        { id: 'warmup', title: 'Warm-up', details: 'Breath and resonance setup for the day.' },
        { id: 'technique', title: 'Technique', details: 'Targeted drills for consistency and control.' },
        { id: 'application', title: 'Application', details: 'Apply the lesson in an excerpt or phrase.' }
      ];

  const lessonChecklist = [
    `Prepare the body and breath for ${activeSession.title}`,
    'Complete the technique block with the reference tool',
    'Apply the skill in a phrase or excerpt',
    'Review one recording or run-through for correction',
    'Mark the lesson complete when the work is steady'
  ];

  const percent = useMemo(() => Math.round((checked.length / lessonChecklist.length) * 100), [checked.length, lessonChecklist.length]);

  const lessonBlocks = lessonTechniques.map((group) => (
    <article key={group.id} className="lessonBlock lessonTechniqueBlock">
      <div className="lessonBlockHeaderCopy">
        <span className="metaPill">Technique bank</span>
        <h4>{group.title}</h4>
      </div>
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
    <main className="pageWrap lessonSession">
      <section className="heroCard lessonSessionHero">
        <div className="sessionHeroTop">
          <div>
            <div className="sessionPhaseTag">{blueprint.label}</div>
            <h2 className="sessionTitle">{activeSession.title}</h2>
            <p className="sessionIntro">{activeSession.description || blueprint.goal}</p>
          </div>
          <div className="sessionHeroMeta">
            <span>{activeSession.phase}</span>
            <span>{activeSession.durationMin || 75} min</span>
            <span>{modules.length} blocks</span>
          </div>
        </div>

        <div className="sessionSignalGrid">
          <article>
            <h3>Lesson goal</h3>
            <p>{blueprint.goal}</p>
          </article>
          <article>
            <h3>Coach cue</h3>
            <p>{blueprint.coachCue}</p>
          </article>
          <article>
            <h3>Finish line</h3>
            <p>{blueprint.checklistLead}</p>
          </article>
        </div>
      </section>

      <section className="sectionCard lessonIntroPanel">
        <div className="sectionHeading">
          <div>
            <h3>Session path</h3>
            <p>The page reads like a lesson plan: what to learn, how to practice it, and what counts as done.</p>
          </div>
        </div>
        <div className="lessonStepRail">
          {modules.map((module, index) => (
            <article key={module.id || module.title} className="lessonStepCard">
              <div className="lessonStepNumber">0{index + 1}</div>
              <div>
                <h4>{module.title}</h4>
                <p>{module.details}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="lessonTabs">
        {[
          { key: 'lesson', label: 'Lesson' },
          { key: 'practice', label: 'Practice' },
          { key: 'checklist', label: 'Checklist' },
          { key: 'coach', label: 'Coach' }
        ].map((item) => (
          <button key={item.key} className={tab === item.key ? 'active' : ''} onClick={() => setTab(item.key)} type="button">
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'lesson' && (
        <section className="sectionCard lessonLayout">
          <div className="lessonMainColumn">
            <div className="sectionHeading">
              <div>
                <h3>Lesson blocks</h3>
                <p>Work through the blocks in order so the technique, repetition, and application stay connected.</p>
              </div>
            </div>
            <div className="lessonModuleGrid">
              {modules.map((module, index) => (
                <article key={module.id || module.title} className="lessonModuleCard">
                  <div className="lessonModuleIndex">{index + 1}</div>
                  <div>
                    <h4>{module.title}</h4>
                    <p>{module.details}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="lessonSidebar">
            <article className="lessonSidebarCard">
              <h4>Learning outcomes</h4>
              <ul>
                {blueprint.outcomes.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
            <article className="lessonSidebarCard lessonCalloutCard">
              <h4>What to listen for</h4>
              <p>
                A stable first pitch, consistent vowel shape, and a phrase that does not rush when the notes get harder.
              </p>
            </article>
          </aside>
        </section>
      )}

      {tab === 'practice' && (
        <section className="sectionCard practiceGrid">
          <div className="practiceIntroCard">
            <span className="metaPill">Practice lab</span>
            <h3>Use these drills to rehearse the lesson, not just inspect it.</h3>
            <p>Each tool reinforces the session goal so the page feels like a guided tutorial, not a random toolbox.</p>
          </div>
          <PitchChecker />
          <DrillTimer />
          <TheoryQuiz />
          <div className="toolCard pianoCard">
            <h4>Playable piano</h4>
            <p>Use the keyboard to anchor your starting pitch before you rehearse the phrase.</p>
            <Piano />
          </div>
        </section>
      )}

      {tab === 'checklist' && (
        <section className="sectionCard checklistPanel">
          <div className="sectionHeading">
            <div>
              <h3>Lesson checklist</h3>
              <p>{blueprint.checklistLead}</p>
            </div>
            <span className="metaPill">{percent}% complete</span>
          </div>

          <div className="checkList lessonChecklist">
            {lessonChecklist.map((task) => {
              const done = checked.includes(task);
              return (
                <button
                  className={done ? 'checked' : ''}
                  key={task}
                  onClick={() => {
                    setChecked((prev) => (done ? prev.filter((x) => x !== task) : [...prev, task]));
                  }}
                  type="button"
                >
                  {done ? 'Done' : 'Todo'} · {task}
                </button>
              );
            })}
          </div>

          <div className="lessonCompletionRow">
            <p>
              Finish the checklist before marking the lesson complete. That keeps the platform behaving like a course,
              not a passive tracker.
            </p>
            <button
              className="primary"
              disabled={checked.length < lessonChecklist.length}
              onClick={() => onComplete({ checks: checked, theoryScore: 85, durationMin: activeSession.durationMin || 75, skillDeltas: { agility: 2, rhythm: 2 } })}
              type="button"
            >
              Mark lesson complete
            </button>
          </div>
        </section>
      )}

      {tab === 'coach' && (
        <section className="sectionCard coachPanel">
          <div className="sectionHeading">
            <div>
              <h3>Coach guidance</h3>
              <p>Ask for feedback on the exact lesson you are working through.</p>
            </div>
          </div>
          <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={5} />
          <button className="primary" onClick={submitAi} type="button">Ask coach</button>
          {aiReply && <article className="aiReply">{aiReply}</article>}
        </section>
      )}

      <section className="sectionCard">
        <div className="sectionHeading">
          <div>
            <h3>Technique reference</h3>
            <p>These core skills stay visible across the platform as the lesson path progresses.</p>
          </div>
        </div>
        <div className="grid2 techniqueReferenceGrid">{lessonBlocks}</div>
      </section>
    </main>
  );
}
