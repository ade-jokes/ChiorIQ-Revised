import React from 'react';
import { Link } from '@tanstack/react-router';

export default function DashboardPage({ user, sessions, progressRows, choir, announcements }) {
  const completed = new Set(progressRows.map((row) => row.sessionId));
  const sorted = [...sessions].sort((a, b) => (a.order || 0) - (b.order || 0));
  const unlockedCount = Math.min((progressRows.length || 0) + 1, 8);
  const nextSession = sorted[Math.max(0, unlockedCount - 1)];

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
      </section>

      <section className="sectionCard">
        <h3>8-Session Curriculum</h3>
        <div className="sessionTrack">
          {sorted.map((session, index) => {
            const done = completed.has(session.id);
            const unlocked = index < unlockedCount;
            return (
              <Link
                key={session.id}
                className={`sessionChip ${done ? 'done' : ''} ${!unlocked ? 'locked' : ''}`}
                disabled={!unlocked}
                params={{ sessionId: session.id }}
                to="/session/$sessionId"
              >
                {session.order || index + 1}. {session.title}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="sectionCard">
        <h3>Choir Announcements</h3>
        {announcements.length === 0 && <p>No announcements yet.</p>}
        {announcements.map((item) => (
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
