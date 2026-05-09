import React from 'react';
import { Link } from '@tanstack/react-router';
import { useNavigate } from '@tanstack/react-router';

export default function DashboardPage({ user, sessions, progressRows, choir, announcements, onAskAi }) {
  const navigate = useNavigate();
  const [sessionView, setSessionView] = React.useState('unlocked');
  const [announcementType, setAnnouncementType] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [aiMessages, setAiMessages] = React.useState([
    {
      role: 'assistant',
      content:
        "Welcome! I'm Maestro, your AI vocal coach trained on professional choral methodology. Ask me anything about breathing, resonance, harmony, agility drills, music theory, or gospel technique. I'm here to help every single member of your choir grow."
    }
  ]);
  const [aiInput, setAiInput] = React.useState('');
  const [aiSending, setAiSending] = React.useState(false);
  const [aiError, setAiError] = React.useState('');
  const aiEndRef = React.useRef(null);

  React.useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [aiMessages.length]);

  async function sendAiMessage() {
    const text = String(aiInput || '').trim();
    if (!text || aiSending) return;
    if (typeof onAskAi !== 'function') return;

    setAiError('');
    setAiSending(true);

    const nextMessages = [...aiMessages, { role: 'user', content: text }];
    setAiMessages(nextMessages);
    setAiInput('');

    try {
      const res = await onAskAi(nextMessages);
      const reply = res?.reply || 'I could not generate a response at the moment.';
      setAiMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setAiError(err?.message || 'AI request failed.');
    } finally {
      setAiSending(false);
    }
  }

  const completed = new Set(progressRows.map((row) => row.sessionId));
  const sorted = [...sessions].sort((a, b) => {
    const aOrder = Number.isFinite(Number(a?.order)) ? Number(a.order) : null;
    const bOrder = Number.isFinite(Number(b?.order)) ? Number(b.order) : null;
    if (aOrder != null && bOrder != null) return aOrder - bOrder;
    if (aOrder != null) return -1;
    if (bOrder != null) return 1;
    return String(a?.id || '').localeCompare(String(b?.id || ''));
  });
  const totalSessions = sorted.length || 8;
  const completedCount = completed.size;
  const nextSession = sorted.find((s) => !completed.has(s.id)) || sorted[0];
  const nextSessionTitle = nextSession?.title || 'Upcoming vocal session';
  const nextSessionDescription = nextSession?.description || 'Open the next practice block to continue the lesson sequence.';
  const currentPhase = nextSession?.phase || sorted[0]?.phase || 'Foundation';
  const filteredSessions = sorted
    .filter((session, index) => {
      if (sessionView === 'all') return true;
      if (sessionView === 'completed') return completed.has(session.id);
      if (sessionView === 'locked') return index >= completedCount + 1;
      return index < completedCount + 1;
    })
    .filter((session) => {
      const q = String(query || '').trim().toLowerCase();
      if (!q) return true;
      return String(session?.title || '').toLowerCase().includes(q);
    });

  const filteredAnnouncements = (announcements || []).filter((ann) => {
    if (announcementType === 'all') return true;
    return ann?.type === announcementType;
  });

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

        <div className="quickActions" style={{ marginBottom: '1rem' }}>
          <button className="ghostButton" onClick={() => navigate({ to: '/progress' })} type="button">View Progress</button>
          <button className="ghostButton" onClick={() => navigate({ to: '/notes' })} type="button">Open Notes</button>
          {nextSession && (
            <Link className="ghostButton" params={{ sessionId: nextSession.id }} to="/session/$sessionId">
              Start Next Session
            </Link>
          )}
        </div>

        {nextSession && (
          <div className="highlightPanel" style={{ background: 'var(--surface)', border: '0.5px solid var(--border2)', borderRadius: 'var(--r-xl)', padding: '24px 28px', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '10px' }}>▶ Next Session</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>{nextSessionTitle}</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '16px' }}>{nextSessionDescription}</p>
            <Link className="ghostButton" params={{ sessionId: nextSession.id }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--gold)', color: 'var(--ink)', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }} to="/session/$sessionId">
              Start session →
            </Link>
          </div>
        )}

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

        <div className="controlBar" style={{ marginBottom: '1rem' }}>
          <label className="controlGroup" htmlFor="session-view-filter">
            Session View
            <select id="session-view-filter" value={sessionView} onChange={(e) => setSessionView(e.target.value)}>
              <option value="unlocked">Unlocked Sessions</option>
              <option value="completed">Completed Sessions</option>
              <option value="locked">Locked Sessions</option>
              <option value="all">All Sessions</option>
            </select>
          </label>
          <label className="controlGroup" htmlFor="session-search-filter">
            Search Sessions
            <input
              id="session-search-filter"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title"
              value={query}
            />
          </label>
          <label className="controlGroup" htmlFor="announcement-type-filter">
            Announcement Type
            <select id="announcement-type-filter" value={announcementType} onChange={(e) => setAnnouncementType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="info">Info</option>
              <option value="urgent">Urgent</option>
              <option value="rehearsal">Rehearsal</option>
              <option value="music">Music</option>
            </select>
          </label>
        </div>

        <div className="section-title">8-week journey</div>
        <div className="session-track">
          {filteredSessions.map((session) => {
            const idx = sorted.findIndex((s) => s.id === session.id);
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
          {filteredSessions.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No sessions match this filter.</p>
          )}
        </div>

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
            {aiMessages.map((msg, idx) => (
              <div key={`${msg.role}-${idx}`} className={`ai-msg ${msg.role === 'user' ? 'user' : 'ai'}`}>
                {msg.content}
              </div>
            ))}
            <div ref={aiEndRef} />
          </div>
          <div className="ai-input-row">
            <input
              className="ai-input"
              placeholder="Ask Maestro anything… e.g. 'How do I improve my head voice?'"
              type="text"
              value={aiInput}
              disabled={aiSending}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  sendAiMessage();
                }
              }}
            />
            <button className="ai-send" onClick={sendAiMessage} disabled={aiSending} type="button">
              {aiSending ? '…' : '📤'}
            </button>
          </div>
          {aiError && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--gold)', fontWeight: 600 }}>
              {aiError}
            </div>
          )}
        </div>

        {filteredAnnouncements.length > 0 && (
          <>
            <div className="section-title">Choir updates</div>
            {filteredAnnouncements.map((ann) => (
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
