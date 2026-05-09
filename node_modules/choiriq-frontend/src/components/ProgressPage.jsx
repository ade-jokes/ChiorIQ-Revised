import React from 'react';

export default function ProgressPage({ user, progressRows }) {
  const skills = Object.entries(user.skills || {});

  return (
    <main className="page active">
      <div className="hero">
        <div className="hero-greeting">Learning progress</div>
        <p className="hero-sub">Track skill growth across the lesson path in technique, rhythm, diction, theory, and consistency.</p>

        <div className="section-title">Your skills</div>
        <div className="dash-top" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'}}>
          {skills.map(([name, value]) => (
            <div className="stat-card" key={name}>
              <div className="stat-label">{name}</div>
              <div className="stat-val">{value}%</div>
              <div style={{height: '4px', background: 'var(--surface2)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden'}}>
                <div style={{height: '100%', width: `${value}%`, background: 'var(--gold)', borderRadius: '2px'}} />
              </div>
            </div>
          ))}
        </div>

        <div className="section-title">Completion History</div>
        {progressRows.length === 0 && <p style={{color: 'var(--muted)', fontSize: '14px'}}>No lessons completed yet.</p>}
        {progressRows.map((row) => (
          <div key={row.id} style={{display: 'flex', gap: '10px', padding: '14px 16px', background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '0.5px solid var(--border)', marginBottom: '10px'}}>
            <div style={{flex: 1}}>
              <strong style={{display: 'block', marginBottom: '4px', color: 'var(--cream)'}}>{row.sessionId}</strong>
              <p style={{fontSize: '13px', color: 'var(--muted)', margin: 0}}>Theory score: {row.theoryScore} · Duration: {row.durationMin} min</p>
            </div>
            <span style={{fontSize: '11px', color: 'var(--gold)', fontWeight: 600, whiteSpace: 'nowrap'}}>{new Date(row.completedAt || row.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
