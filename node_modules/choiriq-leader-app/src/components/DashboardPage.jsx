import React from 'react';
import { Link } from '@tanstack/react-router';

export default function DashboardPage({ user, sessions, progressRows, choir, announcements }) {
  const [sessionView, setSessionView] = React.useState('all');
  const [announcementType, setAnnouncementType] = React.useState('all');
  const completed = new Set(progressRows.map((row) => row.sessionId));
  const sorted = [...sessions].sort((a, b) => (a.order || 0) - (b.order || 0));
  const unlockedCount = Math.min((progressRows.length || 0) + 1, 8);
  const filteredSessions = sorted.filter((session, index) => {
    if (sessionView === 'completed') return completed.has(session.id);
    if (sessionView === 'locked') return index >= unlockedCount;
    if (sessionView === 'unlocked') return index < unlockedCount;
    return true;
  });

  const filteredAnnouncements = announcements.filter((item) => {
    if (announcementType === 'all') return true;
    return item.type === announcementType;
  });

  return (
    <main className="pageWrap">
      <section className="heroCard">
        <h2>Welcome back, {user.name}</h2>
        <p>
          {choir?.name || 'Your Choir'} · {user.voicePart} · {user.level}
        </p>
        <div className="statsGrid">
          <article><h3>Streak</h3><strong>{user.streak || 0} days</strong></article>
          <article><h3>Completed</h3><strong>{progressRows.length} / 8 sessions</strong></article>
          <article><h3>Unlock Status</h3><strong>{unlockedCount} unlocked</strong></article>
        </div>
        <div className="controlBar">
          <label className="controlGroup" htmlFor="leader-dashboard-session-view">
            Session View
            <select id="leader-dashboard-session-view" value={sessionView} onChange={(e) => setSessionView(e.target.value)}>
              <option value="all">All Sessions</option>
              <option value="unlocked">Unlocked Sessions</option>
              <option value="completed">Completed Sessions</option>
              <option value="locked">Locked Sessions</option>
            </select>
          </label>
          <label className="controlGroup" htmlFor="leader-dashboard-announcement-filter">
            Announcement Filter
            <select id="leader-dashboard-announcement-filter" value={announcementType} onChange={(e) => setAnnouncementType(e.target.value)}>
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
            </div>
            <span>{item.type}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
