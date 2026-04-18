import React from 'react';

export default function ProgressPage({ user, progressRows, sessions = [] }) {
  const skills = Object.entries(user.skills || {});
  const sessionMap = sessions.reduce((acc, item) => {
    acc[item.id] = item.title;
    return acc;
  }, {});

  return (
    <main className="pageWrap">
      <section className="heroCard">
        <h2>Progress and Skill Tracking</h2>
        <p>Track growth in technique, rhythm, diction, theory, and consistency.</p>
      </section>

      <section className="sectionCard grid2">
        <article className="toolCard">
          <h4>What your progress means</h4>
          <p><strong>Skill %</strong> is your running competency estimate from completed coaching drills.</p>
          <p><strong>Theory score</strong> reflects musical literacy from quiz and interval checks.</p>
          <p><strong>Duration</strong> tracks focused training minutes logged per session.</p>
        </article>
        <article className="toolCard">
          <h4>How to improve faster</h4>
          <p>1. Keep daily checklist completion high.</p>
          <p>2. Repeat low-score theory categories.</p>
          <p>3. Use pitch checker and piano before rehearsal blocks.</p>
        </article>
      </section>

      <section className="sectionCard skillGrid">
        {skills.map(([name, value]) => (
          <article key={name}>
            <h4>{name}</h4>
            <div className="bar"><span style={{ width: `${value}%` }} /></div>
            <p>{value}%</p>
          </article>
        ))}
      </section>

      <section className="sectionCard">
        <h3>Completion History</h3>
        {progressRows.length === 0 && <p>No completed sessions yet.</p>}
        {progressRows.map((row) => (
          <article className="announce" key={row.id}>
            <div>
              <strong>{sessionMap[row.sessionId] || `Session ${row.sessionId}`}</strong>
              <p>Theory score: {row.theoryScore} · Duration: {row.durationMin} min</p>
            </div>
            <span>{new Date(row.completedAt || row.createdAt).toLocaleDateString()}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
