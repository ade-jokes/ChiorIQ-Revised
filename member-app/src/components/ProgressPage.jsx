import React from 'react';

export default function ProgressPage({ user, progressRows }) {
  const skills = Object.entries(user.skills || {});

  return (
    <main className="pageWrap">
      <section className="heroCard">
        <h2>Progress and Skill Tracking</h2>
        <p>Track growth in technique, rhythm, diction, theory, and consistency.</p>
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
              <strong>{row.sessionId}</strong>
              <p>Theory score: {row.theoryScore} · Duration: {row.durationMin} min</p>
            </div>
            <span>{new Date(row.completedAt || row.createdAt).toLocaleDateString()}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
