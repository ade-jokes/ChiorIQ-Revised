import React from 'react';
import { Link } from '@tanstack/react-router';

export default function DashboardPage({ user, sessions, progressRows, choir, announcements }) {
  const [sessionView, setSessionView] = React.useState('unlocked');
  const [announcementType, setAnnouncementType] = React.useState('all');
  const completed = new Set(progressRows.map((row) => row.sessionId));
  const sorted = [...sessions].sort((a, b) => (a.order || 0) - (b.order || 0));
  const unlockedCount = Math.min((progressRows.length || 0) + 1, 8);
  const nextSession = sorted[Math.max(0, unlockedCount - 1)];
  const filteredSessions = sorted.filter((session, index) => {
    if (sessionView === 'all') return true;
    if (sessionView === 'completed') return completed.has(session.id);
    if (sessionView === 'locked') return index >= unlockedCount;
    return index < unlockedCount;
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
            <h2>Welcome back, {user.name}</h2>
            <p>
              {choir?.name || 'Your Choir'} · {user.voicePart} · {user.level}
            </p>
          </div>
          <div className="metaPill">Practice Streak: {user.streak || 0} days</div>
        </div>
        <div className="statsGrid">
          <article><h3>Streak</h3><strong>{user.streak || 0} days</strong></article>
          <article><h3>Completed</h3><strong>{progressRows.length} / 8 sessions</strong></article>
          <article><h3>Unlock Status</h3><strong>{unlockedCount} unlocked</strong></article>
        </div>
        {nextSession && (
          <div className="highlightPanel">
            <div>
              <h3>Next Session</h3>
              <p>{nextSession.title}</p>
            </div>
            <Link className="ghostButton" params={{ sessionId: nextSession.id }} to="/session/$sessionId">
              Continue Training
            </Link>
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
        <h3>8-Session Curriculum</h3>
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
                {session.order || originalIndex + 1}. {session.title}
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
