import React, { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';

const LESSON_MODULES = {
  warmup: {
    icon: '🌅',
    title: 'Warm-Up Sequence',
    badge: 'Follow along',
    content: (
      <div className="lesson-block">
        <div className="lesson-block-header">
          <div className="lb-icon">🌅</div>
          <div className="lb-title">10-Minute Warm-Up Sequence</div>
          <div className="lb-badge">Follow along</div>
          <span className="lb-chevron">▾</span>
        </div>
        <div className="lesson-block-body open">
          <div className="lesson-block-body-inner">
            <div className="drill-timer">
              <div className="timer-label">Diaphragmatic breathing — 4 counts in, hold 4, out 8</div>
              <div className="timer-display">2:00</div>
              <div className="timer-progress"><div className="timer-progress-fill" style={{width: '100%'}}></div></div>
              <div className="timer-controls">
                <button className="timer-btn primary">Start</button>
                <button className="timer-btn">Reset</button>
              </div>
            </div>
            <div className="technique-grid">
              <div className="technique-card"><div className="tc-name">🌬️ Hiss Release</div><div className="tc-desc">Inhale fully. Release on a steady hiss for 8–12 counts. Feel the diaphragm engage throughout.</div></div>
              <div className="technique-card"><div className="tc-name">👄 Lip Trills</div><div className="tc-desc">Loose lips buzz on a comfortable pitch. Slide up and down. Releases jaw tension and warms the passaggio.</div></div>
              <div className="technique-card"><div className="tc-name">🎵 Humming</div><div className="tc-desc">Hum on a mid-range pitch. Feel the buzz in your cheekbones and nose bridge — that is forward resonance.</div></div>
              <div className="technique-card"><div className="tc-name">🔊 Yawn-Sigh</div><div className="tc-desc">Fake a big yawn, then sigh from the top of your range down to the bottom. Opens the soft palate.</div></div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  breath: {
    icon: '💨',
    title: 'Breathing & Breath Support',
    badge: 'Technique',
    content: (
      <div className="lesson-block">
        <div className="lesson-block-header">
          <div className="lb-icon">💨</div>
          <div className="lb-title">Diaphragmatic Breathing</div>
          <div className="lb-badge">Foundation</div>
          <span className="lb-chevron">▾</span>
        </div>
        <div className="lesson-block-body open">
          <div className="lesson-block-body-inner">
            <div className="ai-tip"><strong>Grammy Coach Insight:</strong> 95% of pitch, tone, and power problems trace back to breath. Fix the breath, fix the voice. The diaphragm is a dome-shaped muscle — it does not push air up, it drops down to create a vacuum that pulls air in.</div>
            <div className="technique-grid">
              <div className="technique-card"><div className="tc-name">Hand on Belly Check</div><div className="tc-desc">Place one hand on belly, one on chest. Only the belly hand should move when you breathe. Chest breathing is your enemy.</div></div>
              <div className="technique-card"><div className="tc-name">4-7-8 Breathing</div><div className="tc-desc">Inhale 4 counts → Hold 7 counts → Exhale 8 counts. Builds breath control and lung capacity over weeks.</div></div>
              <div className="technique-card"><div className="tc-name">Appoggio (Support)</div><div className="tc-desc">Italian technique used by opera and gospel pros. Maintain the expansion of your ribcage WHILE you sing — do not let it collapse.</div></div>
              <div className="technique-card"><div className="tc-name">Staccato Bursts</div><div className="tc-desc">Say "ha ha ha ha" rapidly from the belly. Each "ha" should feel like a small punch from your core.</div></div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  pitch_check: {
    icon: '🎵',
    title: 'Pitch Accuracy Checker',
    badge: 'Interactive',
    content: (
      <div className="lesson-block">
        <div className="lesson-block-header">
          <div className="lb-icon">🎵</div>
          <div className="lb-title">Interactive Pitch Checker</div>
          <div className="lb-badge">AI Tool</div>
          <span className="lb-chevron">▾</span>
        </div>
        <div className="lesson-block-body open">
          <div className="lesson-block-body-inner">
            <div className="pitch-checker">
              <div className="pitch-header">
                <span style={{fontSize: '13px', fontWeight: '600'}}>Live tuner</span>
                <span style={{fontSize: '11px', color: 'var(--muted)'}}>Sing → match → hold</span>
              </div>
              <div className="pitch-note-display">—</div>
              <div className="pitch-freq">Press mic to begin</div>
              <div className="pitch-meter">
                <div className="pitch-needle" style={{left: '50%'}}></div>
              </div>
              <div className="pitch-label-row"><span>♭ Flat</span><span>In tune</span><span>Sharp ♯</span></div>
              <button className="mic-btn">🎤 Start listening</button>
            </div>
          </div>
        </div>
      </div>
    )
  },
  theory: {
    icon: '📖',
    title: 'Music Theory Quiz',
    badge: 'Knowledge',
    content: (
      <div className="lesson-block">
        <div className="lesson-block-header">
          <div className="lb-icon">📖</div>
          <div className="lb-title">Music Theory Quiz</div>
          <div className="lb-badge">Question 1/8</div>
          <span className="lb-chevron">▾</span>
        </div>
        <div className="lesson-block-body open">
          <div className="lesson-block-body-inner">
            <div className="theory-card">
              <div className="theory-question">What is a "major scale"?</div>
              <div className="theory-options">
                <button className="theory-opt">A. A scale with 7 whole steps</button>
                <button className="theory-opt">B. A scale with the pattern: W W H W W W H</button>
                <button className="theory-opt">C. A scale only for sopranos</button>
                <button className="theory-opt">D. A scale with 5 notes</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  checklist: {
    icon: '✅',
    title: 'Session Checklist',
    badge: 'Goals',
    content: (
      <div className="lesson-block">
        <div className="lesson-block-header">
          <div className="lb-icon">✅</div>
          <div className="lb-title">Session Goals Checklist</div>
          <div className="lb-badge">Track</div>
          <span className="lb-chevron">▾</span>
        </div>
        <div className="lesson-block-body open">
          <div className="lesson-block-body-inner">
            <div className="check-list">
              <div className="check-item">
                <div className="check-box"></div>
                <div className="check-text">I practised diaphragmatic breathing for at least 5 minutes</div>
              </div>
              <div className="check-item">
                <div className="check-box"></div>
                <div className="check-text">I hummed to find my forward mask resonance</div>
              </div>
              <div className="check-item">
                <div className="check-box"></div>
                <div className="check-text">I sang lip trills through my full comfortable range</div>
              </div>
              <div className="check-item">
                <div className="check-box"></div>
                <div className="check-text">I matched pitch with at least one reference note</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
};

export default function SessionPage({ sessions = [], user = {}, onComplete }) {
  const navigate = useNavigate();
  const { sessionId } = useParams({ from: '/session/$sessionId' });
  const [activeTab, setActiveTab] = useState(0);

  const session = sessions.find((s) => s.id === sessionId) || sessions[0] || {};
  const modules = (session.modules || ['warmup', 'breath', 'pitch_check', 'theory', 'checklist']).filter(m => m in LESSON_MODULES);

  const handleComplete = () => {
    alert('Session marked complete! Great work today.');
    if (onComplete) onComplete(session.id);
    navigate({ to: '/dashboard' });
  };

  const handleBack = () => {
    navigate({ to: '/dashboard' });
  };

  return (
    <main className="page active">
      <div className="session-page">
        <button className="session-back" onClick={handleBack}>← Back to dashboard</button>

        <div className="session-hero">
          <div className="session-phase-tag">{session.phase || 'Phase 1 — Foundation'}</div>
          <div className="session-h1">{session.title || 'Loading session...'}</div>
          <div className="session-meta">{session.description || 'Learn the fundamentals of healthy, powerful singing.'}</div>
        </div>

        <div className="lesson-tabs">
          {modules.map((modId, idx) => (
            <button
              key={modId}
              className={`lesson-tab ${idx === activeTab ? 'active' : ''}`}
              onClick={() => setActiveTab(idx)}
            >
              {LESSON_MODULES[modId]?.title?.split(' ')[0] || modId}
            </button>
          ))}
        </div>

        <div id="lesson-panels">
          {modules.map((modId, idx) => (
            <div key={modId} style={{display: idx === activeTab ? 'block' : 'none'}}>
              {LESSON_MODULES[modId]?.content}
            </div>
          ))}
        </div>

        <button className="complete-session-btn" onClick={handleComplete}>
          Mark session complete ✓
        </button>
      </div>
    </main>
  );
}