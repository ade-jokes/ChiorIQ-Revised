import React from 'react';
import { Link } from '@tanstack/react-router';

export default function DashboardPage({ user, sessions, progressRows, choir, announcements }) {
  const completed = new Set(progressRows.map((row) => row.sessionId));
  const sorted = [...sessions].sort((a, b) => (a.order || a.id.localeCompare(b.id)) - (b.order || b.id.localeCompare(a.id)));
  const totalSessions = sorted.length || 8;
  const completedCount = completed.size;
  const nextSession = sorted.find((s) => !completed.has(s.id)) || sorted[0];
  const currentPhase = nextSession?.phase || sorted[0]?.phase || 'Foundation';

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  return (
    <main className="page active">
      <div className="hero">
        <div className="hero-greeting">
          Good {getTimeOfDay()}, <em>{user.name || 'Vocalist'}</em>
        </div>
        <p className="hero-sub">{choir?.name || 'ChoirIQ'} · {user.voicePart || 'Unassigned'} · {user.level || 'Beginner'}</p>

        <div className="dash-top">
          <div className="stat-card">
            <div className="stat-label">Sessions done</div>
            <div className="stat-val">{completedCount}</div>
            <div className="stat-sub">of {totalSessions} total</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Current streak</div>
            <div className="stat-val">{user.streak || 0}</div>
            <div className="stat-sub">weeks consistent</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Skills unlocked</div>
            <div className="stat-val">{Math.min((completedCount || 0) + 1, 24)}</div>
            <div className="stat-sub">of 24 techniques</div>
          </div>
        </div>

        <div className="section-title">8-session journey</div>
        <div className="session-track">
          {sorted.map((session, idx) => {
            const index = idx + 1;
            const isDone = completed.has(session.id);
            const isCurrent = nextSession?.id === session.id;
            const isLocked = index > completedCount + 1;

            if (isLocked) {
              return (
                <button
                  key={session.id}
                  className="session-dot locked"
                  disabled
                  type="button"
                  title={session.title}
                >
                  {index}
                </button>
              );
            }

            return (
              <Link
                key={session.id}
                to="/session/$sessionId"
                params={{ sessionId: session.id }}
                className={`session-dot${isDone ? ' done' : ''}${isCurrent ? ' current' : ''}`}
                title={session.title}
              >
                {index}
              </Link>
            );
          })}
        </div>

        <Link to="/session/$sessionId" params={{ sessionId: nextSession?.id || sorted[0]?.id }} className="today-card">
          <div className="today-tag">▶ Next session</div>
          <div className="today-title">Session {nextSession?.order || 1} · {nextSession?.title || 'Loading...'}</div>
          <div className="today-desc">
            {nextSession?.description || 'Open your next lesson to continue building your vocal skills.'}
          </div>
          <div>
            <span className="phase-pill">{currentPhase}</span>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{nextSession?.durationMin || 75} min · {nextSession?.modules?.length || 6} modules</span>
          </div>
          <button className="start-btn" type="button">Start session →</button>
        </Link>

        <div className="section-title">AI Vocal Coach</div>
        <div className="ai-panel">
          <div className="ai-header">
            <div className="ai-avatar">🎵</div>
            <div>
              <div className="ai-name">Maestro — Your AI Vocal Coach</div>
              <div className="ai-role">Grammy-methodology · Available 24/7</div>
            </div>
          </div>
          <div className="ai-messages">
            <div className="ai-msg ai">
              Welcome! I'm <strong>Maestro</strong>, your AI vocal coach trained on professional choral methodology. Ask me anything about breathing, resonance, harmony, agility drills, music theory, or gospel technique. I'm here to help every single member of your choir grow. 🎶
            </div>
          </div>
          <div className="ai-input-row">
            <input
              className="ai-input"
              placeholder="Ask Maestro anything… e.g. 'How do I improve my head voice?'"
              type="text"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  alert('Coach feature coming soon!');
                }
              }}
            />
            <button className="ai-send" type="button">📤</button>
          </div>
        </div>

        {announcements && announcements.length > 0 && (
          <>
            <div className="section-title">Choir updates</div>
            {announcements.slice(0, 2).map((ann) => (
              <div key={ann.id} style={{ display: 'flex', gap: '10px', padding: '14px 16px', background: 'var(--surface2)', borderRadius: 'var(--r-lg)', border: '0.5px solid var(--border)', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>{ann.title}</strong>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>{ann.text}</p>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{ann.type}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
