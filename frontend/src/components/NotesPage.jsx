import React from 'react';

export default function NotesPage({ notes }) {
  return (
    <main className="pageWrap">
      <section className="heroCard">
        <h2>Leader Notes</h2>
        <p>Personalized guidance from your director and section leads.</p>
      </section>

      <section className="sectionCard">
        {notes.length === 0 && <p>No notes shared yet.</p>}
        {notes.map((note) => (
          <article className="announce" key={note.id}>
            <div>
              <strong>{note.type}</strong>
              <p>{note.text}</p>
            </div>
            <span>{new Date(note.createdAt).toLocaleDateString()}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
