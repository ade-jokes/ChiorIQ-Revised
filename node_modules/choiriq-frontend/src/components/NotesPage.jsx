import React from 'react';

export default function NotesPage({ notes }) {
  return (
    <main className="page active">
      <div className="hero">
        <div className="hero-greeting">Leader Notes</div>
        <p className="hero-sub">Personalized guidance from your director and section leads.</p>

        <div className="section-title">Your notes</div>
        {notes.length === 0 && <p style={{color: 'var(--muted)', fontSize: '14px'}}>No notes shared yet.</p>}
        {notes.map((note) => (
          <div key={note.id} style={{display: 'flex', gap: '10px', padding: '14px 16px', background: 'var(--surface)', borderRadius: 'var(--r-lg)', border: '0.5px solid var(--border)', marginBottom: '10px'}}>
            <div style={{flex: 1}}>
              <strong style={{display: 'block', marginBottom: '4px', color: 'var(--cream)'}}>{note.type}</strong>
              <p style={{fontSize: '13px', color: 'var(--muted)', margin: 0}}>{note.text}</p>
            </div>
            <span style={{fontSize: '11px', color: 'var(--gold)', fontWeight: 600, whiteSpace: 'nowrap'}}>{new Date(note.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
