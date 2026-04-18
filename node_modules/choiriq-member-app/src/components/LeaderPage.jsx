import React from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';

export default function LeaderPage({ members, stats, joinCode, onPostAnnouncement, onAddNote }) {
  const [announcement, setAnnouncement] = React.useState('');
  const [note, setNote] = React.useState({ memberId: '', text: '' });

  const columns = React.useMemo(
    () => [
      { header: 'Member', accessorKey: 'name' },
      { header: 'Voice', accessorKey: 'voicePart' },
      { header: 'Level', accessorKey: 'level' },
      { header: 'Streak', accessorKey: 'streak' },
      {
        header: 'Activity',
        accessorFn: (row) => row.lastActive ? new Date(row.lastActive).toLocaleDateString() : 'No activity'
      }
    ],
    []
  );

  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <main className="pageWrap">
      <section className="heroCard">
        <h2>Leader Command Center</h2>
        <p>Join code: <strong>{joinCode || 'N/A'}</strong></p>
      </section>

      <section className="sectionCard">
        <h3>Member Roster</h3>
        <table className="table">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="sectionCard">
        <h3>Choir Analytics</h3>
        <div className="statsGrid">
          <article><h4>Total Members</h4><strong>{stats?.totalMembers || 0}</strong></article>
          <article><h4>Top Completion</h4><strong>{Math.max(0, ...(stats?.sessionStats || []).map((s) => s.completionRate || 0))}%</strong></article>
          <article><h4>Tracked Sessions</h4><strong>{stats?.sessionStats?.length || 0}</strong></article>
        </div>
      </section>

      <section className="sectionCard grid2">
        <article>
          <h3>Post Announcement</h3>
          <textarea rows={4} value={announcement} onChange={(e) => setAnnouncement(e.target.value)} />
          <button
            className="primary"
            onClick={async () => {
              await onPostAnnouncement({ title: 'Director Update', text: announcement, type: 'info' });
              setAnnouncement('');
            }}
            type="button"
          >
            Send to choir
          </button>
        </article>

        <article>
          <h3>Leader Notes Per Member</h3>
          <select value={note.memberId} onChange={(e) => setNote((prev) => ({ ...prev, memberId: e.target.value }))}>
            <option value="">Select member</option>
            {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
          <textarea rows={4} value={note.text} onChange={(e) => setNote((prev) => ({ ...prev, text: e.target.value }))} />
          <button
            className="primary"
            onClick={async () => {
              await onAddNote({ ...note, type: 'improvement' });
              setNote({ memberId: '', text: '' });
            }}
            type="button"
          >
            Save note
          </button>
        </article>
      </section>
    </main>
  );
}
