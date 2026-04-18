import React from 'react';

export default function NotesPage({ notes }) {
  const [query, setQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const availableTypes = Array.from(new Set(notes.map((note) => note.type).filter(Boolean)));

  const filteredNotes = notes.filter((note) => {
    const matchesType = typeFilter === 'all' || note.type === typeFilter;
    const matchesText = !query.trim() || note.text.toLowerCase().includes(query.trim().toLowerCase());
    return matchesType && matchesText;
  });

  return (
    <main className="pageWrap">
      <section className="heroCard">
        <h2>Leader Notes</h2>
        <p>Personalized guidance from your director and section leads.</p>
        <div className="controlBar">
          <label className="controlGroup" htmlFor="notes-search">
            Search Notes
            <input
              id="notes-search"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by keyword"
              value={query}
            />
          </label>
          <label className="controlGroup" htmlFor="notes-type-filter">
            Note Type
            <select id="notes-type-filter" onChange={(e) => setTypeFilter(e.target.value)} value={typeFilter}>
              <option value="all">All Types</option>
              {availableTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="sectionCard">
        {filteredNotes.length === 0 && <p>No notes match your current filter yet.</p>}
        {filteredNotes.map((note) => (
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
