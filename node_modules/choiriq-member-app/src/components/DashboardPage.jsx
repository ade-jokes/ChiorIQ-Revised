import React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';

export default function DashboardPage({ user, sessions, progressRows, choir, announcements }) {
  const navigate = useNavigate();
  const [sessionView, setSessionView] = React.useState('unlocked');
  const [announcementType, setAnnouncementType] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const completed = new Set(progressRows.map((row) => row.sessionId));
  const sorted = [...sessions].sort((a, b) => (a.order || 0) - (b.order || 0));
  const unlockedCount = Math.min((progressRows.length || 0) + 1, 8);
  const nextSession = sorted[Math.max(0, unlockedCount - 1)];
  const nextSessionTitle = nextSession?.title || 'Upcoming vocal session';
  const nextSessionDescription = nextSession?.description || 'Open the next practice block to continue the lesson sequence.';
  const nowHour = new Date().getHours();
  const greeting = nowHour < 12 ? 'Good morning' : nowHour < 18 ? 'Good afternoon' : 'Good evening';
  const skillEntries = Object.entries(user?.skills || {});
  const focusSkill = skillEntries.length > 0 ? [...skillEntries].sort((a, b) => a[1] - b[1])[0] : null;
  const filteredSessions = sorted.filter((session, index) => {
    if (sessionView === 'all') return true;
    if (sessionView === 'completed') return completed.has(session.id);
    if (sessionView === 'locked') return index >= unlockedCount;
    return index < unlockedCount;
  }).filter((session) => {
    if (!query.trim()) return true;
    return session.title.toLowerCase().includes(query.trim().toLowerCase());
  });

  const filteredAnnouncements = announcements.filter((item) => {
    if (announcementType === 'all') return true;
    return item.type === announcementType;
  });

  return (
    <main className="pageWrap">
      <section className="heroCard">
        <div className="heroTopRow">
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 400, lineHeight: 1.2 }}>
              {greeting}, <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{user.name}</em>
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '6px' }}>
              {choir?.name || 'Your Choir'} · {user.voicePart} · {user.level}
            </p>
          </div>
          <div className="metaPill">🔥 {user.streak || 0} days</div>
        </div>
        <div className="quickActions">
          <button className="ghostButton" onClick={() => navigate({ to: '/progress' })} type="button">View Progress</button>
          <button className="ghostButton" onClick={() => navigate({ to: '/notes' })} type="button">Open Notes</button>
          {nextSession && (
            <Link className="ghostButton" params={{ sessionId: nextSession.id }} to="/session/$sessionId">
              Start Next Session
            </Link>
          )}
        </div>
        <div className="statsGrid">
          <article>
            <h3 style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>Sessions Done</h3>
            <strong style={{ fontSize: '28px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{progressRows.length}</strong>
            <p style={{ fontSize: '12px', color: 'var(--gold)', marginTop: '4px' }}>of 8 total</p>
          </article>
          <article>
            <h3 style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>Current Streak</h3>
            <strong style={{ fontSize: '28px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{user.streak || 0}</strong>
            <p style={{ fontSize: '12px', color: 'var(--gold)', marginTop: '4px' }}>weeks consistent</p>
          </article>
          <article>
            <h3 style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>Skills Unlocked</h3>
            <strong style={{ fontSize: '28px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{Object.keys(user?.skills || {}).length}</strong>
            <p style={{ fontSize: '12px', color: 'var(--gold)', marginTop: '4px' }}>techniques learned</p>
          </article>
        </div>
        {focusSkill && (
          <div className="focusCallout" style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '14px 16px', fontSize: '13px', lineHeight: 1.7, marginBottom: '1rem', borderLeft: '2px solid var(--gold)' }}>
            <strong style={{ color: 'var(--cream)', fontWeight: 500 }}>Today&apos;s focus:</strong> {focusSkill[0]} ({focusSkill[1]}%)
            <p style={{ marginTop: '4px', color: 'var(--muted)' }}>Spend 10-15 minutes on this area before your next full run-through.</p>
          </div>
        )}
        {nextSession ? (
          <div className="highlightPanel" style={{ background: 'var(--surface)', border: '0.5px solid var(--border2)', borderRadius: 'var(--r-xl)', padding: '24px 28px', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '10px' }}>▶ Next Session</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>{nextSessionTitle}</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '16px' }}>{nextSessionDescription}</p>
            <Link className="ghostButton" params={{ sessionId: nextSession.id }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--gold)', color: 'var(--ink)', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }} to="/session/$sessionId">
              Start session →
            </Link>
          </div>
        ) : (
          <div className="highlightPanel" style={{ background: 'var(--surface)', border: '0.5px solid var(--border2)', borderRadius: 'var(--r-xl)', padding: '24px 28px', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: '10px' }}>▶ Next Session</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>No session is available yet</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '16px' }}>Once the schedule loads, the next practice session will appear here.</p>
          </div>
        )}
        <div className="controlBar">
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
              <option value="reminder">Reminder</option>
              <option value="warning">Warning</option>
            </select>
          </label>
        </div>
      </section>

      <section className="sectionCard">
        <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          8-Week Journey
          <span style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
        </h3>
        <div className="sessionTrack">
          {filteredSessions.map((session, index) => {
            const originalIndex = sorted.findIndex((s) => s.id === session.id);
            const done = completed.has(session.id);
            const unlocked = originalIndex < unlockedCount;
            return (
              <Link
                key={session.id}
                className={`sessionChip ${done ? 'done' : ''} ${!unlocked ? 'locked' : ''}`}
                disabled={!unlocked}
                params={{ sessionId: session.id }}
                to="/session/$sessionId"
              >
                <span className="chipTitle">{session.order || originalIndex + 1}. {session.title}</span>
                <span className="chipMeta">{done ? 'Completed' : unlocked ? 'Ready to practice' : 'Locked'}</span>
              </Link>
            );
          })}
          {filteredSessions.length === 0 && <p className="textMuted">No sessions match this view yet.</p>}
        </div>
      </section>

      <section className="sectionCard">
        <h3>Choir Announcements</h3>
        {filteredAnnouncements.length === 0 && <p>No announcements for this filter yet.</p>}
        {filteredAnnouncements.map((item) => (
          <article className="announce" key={item.id}>
            <div>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
              <small className="announceMeta">{new Date(item.createdAt || Date.now()).toLocaleString()}</small>
            </div>
            <span>{item.type}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
