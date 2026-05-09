import React from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';

export default function LeaderPage({
  user,
  members,
  stats,
  joinCode,
  announcements,
  managers,
  onPostAnnouncement,
  onUpdateAnnouncement,
  onAddNote,
  onUpdateMember
}) {
  const [announcementForm, setAnnouncementForm] = React.useState({
    id: null,
    title: 'Choir Update',
    type: 'info',
    text: ''
  });
  const [announcementNotice, setAnnouncementNotice] = React.useState('');
  const [note, setNote] = React.useState({ memberId: '', text: '' });
  const [memberEditId, setMemberEditId] = React.useState('');
  const [memberPatch, setMemberPatch] = React.useState({ name: '', voicePart: '', level: '' });
  const [memberNotice, setMemberNotice] = React.useState('');
  const [voiceFilter, setVoiceFilter] = React.useState('all');
  const [levelFilter, setLevelFilter] = React.useState('all');

  const announcementList = Array.isArray(announcements) ? announcements : [];
  const isAdmin = user?.role === 'admin';
  const filteredMembers = React.useMemo(
    () => members.filter((member) => {
      const voiceMatch = voiceFilter === 'all' || member.voicePart === voiceFilter;
      const levelMatch = levelFilter === 'all' || member.level === levelFilter;
      return voiceMatch && levelMatch;
    }),
    [members, voiceFilter, levelFilter]
  );
  const mostActive = [...filteredMembers].sort((a, b) => (b.streak || 0) - (a.streak || 0))[0];
  const availableVoices = React.useMemo(
    () => Array.from(new Set(members.map((member) => member.voicePart).filter(Boolean))),
    [members]
  );
  const availableLevels = React.useMemo(
    () => Array.from(new Set(members.map((member) => member.level).filter(Boolean))),
    [members]
  );

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
    data: filteredMembers,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  async function submitAnnouncement() {
    setAnnouncementNotice('');
    const payload = {
      title: announcementForm.title,
      type: announcementForm.type,
      text: announcementForm.text
    };

    if (!payload.text || !payload.text.trim()) {
      setAnnouncementNotice('Please enter announcement text.');
      return;
    }

    try {
      if (announcementForm.id) {
        await onUpdateAnnouncement?.(announcementForm.id, payload);
        setAnnouncementNotice('Announcement updated.');
      } else {
        await onPostAnnouncement?.(payload);
        setAnnouncementNotice('Announcement posted to choir.');
      }
      setAnnouncementForm({ id: null, title: 'Choir Update', type: 'info', text: '' });
    } catch (err) {
      setAnnouncementNotice(err?.message || 'Failed to save announcement.');
    }
  }

  function selectAnnouncementForEdit(ann) {
    setAnnouncementNotice('');
    setAnnouncementForm({
      id: ann.id,
      title: ann.title || 'Choir Update',
      type: ann.type || 'info',
      text: ann.text || ''
    });
  }

  function resetAnnouncementForm() {
    setAnnouncementNotice('');
    setAnnouncementForm({ id: null, title: 'Choir Update', type: 'info', text: '' });
  }

  React.useEffect(() => {
    if (!memberEditId) {
      setMemberPatch({ name: '', voicePart: '', level: '' });
      return;
    }
    const selected = members.find((m) => m.id === memberEditId);
    if (!selected) return;
    setMemberPatch({
      name: selected.name || '',
      voicePart: selected.voicePart || 'Unassigned',
      level: selected.level || 'Beginner'
    });
  }, [memberEditId, members]);

  async function saveMemberEdits() {
    setMemberNotice('');
    if (!memberEditId) {
      setMemberNotice('Select a member to edit.');
      return;
    }

    try {
      await onUpdateMember?.(memberEditId, {
        name: memberPatch.name,
        voicePart: memberPatch.voicePart,
        level: memberPatch.level
      });
      setMemberNotice('Member updated.');
    } catch (err) {
      setMemberNotice(err?.message || 'Failed to update member.');
    }
  }

  return (
    <main className="page active">
      <div className="hero">
        <div className="hero-greeting">Leader Command Center</div>
        <p className="hero-sub">Join code: <strong style={{color: 'var(--gold)'}}>{joinCode || 'N/A'}</strong></p>

        <div className="section-title">Choir Analytics</div>
        <div className="dash-top">
          <div className="stat-card">
            <div className="stat-label">Roster Size</div>
            <div className="stat-val">{filteredMembers.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Most Active</div>
            <div className="stat-val" style={{ fontSize: '18px' }}>{mostActive ? mostActive.name : 'N/A'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Live Completion</div>
            <div className="stat-val">{Math.max(0, ...(stats?.sessionStats || []).map((s) => s.completionRate || 0))}%</div>
          </div>
        </div>

        <div className="controlBar" style={{ marginBottom: '1.25rem' }}>
          <label className="controlGroup" htmlFor="leader-roster-voice-filter">
            Voice Part
            <select id="leader-roster-voice-filter" value={voiceFilter} onChange={(e) => setVoiceFilter(e.target.value)}>
              <option value="all">All Voices</option>
              {availableVoices.map((voice) => (
                <option key={voice} value={voice}>{voice}</option>
              ))}
            </select>
          </label>
          <label className="controlGroup" htmlFor="leader-roster-level-filter">
            Level
            <select id="leader-roster-level-filter" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
              <option value="all">All Levels</option>
              {availableLevels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="section-title">Member Roster</div>
        <div style={{background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px', marginBottom: '2rem', overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th key={header.id} style={{textAlign: 'left', padding: '10px', borderBottom: '0.5px solid var(--border)', color: 'var(--gold)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em'}}>
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
                    <td key={cell.id} style={{padding: '10px', borderBottom: '0.5px solid var(--border)', color: 'var(--cream)', fontSize: '13px'}}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-title">Leader Actions</div>
        <div style={{display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '2rem'}}>
          <div style={{background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px'}}>
            <h3 style={{fontSize: '16px', marginBottom: '12px', color: 'var(--cream)'}}>
              {announcementForm.id ? 'Edit Announcement' : 'Post Announcement'}
            </h3>
            <div className="form-row" style={{marginBottom: '12px'}}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  className="form-input"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Rehearsal update"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-select"
                  value={announcementForm.type}
                  onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, type: e.target.value }))}
                >
                  <option value="info">Info</option>
                  <option value="urgent">Urgent</option>
                  <option value="rehearsal">Rehearsal</option>
                  <option value="music">Music</option>
                </select>
              </div>
            </div>
            <textarea 
              className="form-input" 
              rows={4} 
              value={announcementForm.text} 
              onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, text: e.target.value }))}
              placeholder="Share updates with your choir..."
              style={{marginBottom: '12px'}}
            />
            <button
              className="onboard-submit"
              onClick={submitAnnouncement}
              type="button"
            >
              {announcementForm.id ? 'Update announcement' : 'Send to choir'}
            </button>

            {announcementForm.id && (
              <button
                className="timer-btn"
                type="button"
                onClick={resetAnnouncementForm}
                style={{marginTop: '10px', width: '100%'}}
              >
                Cancel edit
              </button>
            )}

            {announcementNotice && (
              <div style={{marginTop: '10px', fontSize: '12px', color: 'var(--muted)'}}>{announcementNotice}</div>
            )}

            {announcementList.length > 0 && (
              <div style={{marginTop: '16px'}}>
                <div style={{fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700, marginBottom: '8px'}}>
                  Recent announcements (click to edit)
                </div>
                {announcementList.slice(0, 5).map((ann) => (
                  <button
                    key={ann.id}
                    type="button"
                    onClick={() => selectAnnouncementForEdit(ann)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'var(--surface2)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--r)',
                      padding: '10px 12px',
                      marginBottom: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{display: 'flex', justifyContent: 'space-between', gap: '10px'}}>
                      <strong style={{color: 'var(--cream)', fontSize: '13px'}}>{ann.title}</strong>
                      <span style={{fontSize: '10px', color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase'}}>{ann.type}</span>
                    </div>
                    <div style={{fontSize: '12px', color: 'var(--muted)', marginTop: '4px'}}>
                      {ann.text}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px'}}>
            <h3 style={{fontSize: '16px', marginBottom: '12px', color: 'var(--cream)'}}>Leader Notes Per Member</h3>
            <select 
              className="form-select" 
              value={note.memberId} 
              onChange={(e) => setNote((prev) => ({ ...prev, memberId: e.target.value }))}
              style={{marginBottom: '12px'}}
            >
              <option value="">Select member</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
            <textarea 
              className="form-input" 
              rows={4} 
              value={note.text} 
              onChange={(e) => setNote((prev) => ({ ...prev, text: e.target.value }))}
              placeholder="Add a note for this member..."
              style={{marginBottom: '12px'}}
            />
            <button
              className="onboard-submit"
              onClick={async () => {
                await onAddNote({ ...note, type: 'improvement' });
                setNote({ memberId: '', text: '' });
              }}
              type="button"
            >
              Save note
            </button>
          </div>
        </div>

        <div className="section-title">Member Quick Edit</div>
        <div style={{background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px', marginBottom: '2rem'}}>
          <div className="form-group">
            <label className="form-label">Select member</label>
            <select
              className="form-select"
              value={memberEditId}
              onChange={(e) => {
                setMemberNotice('');
                setMemberEditId(e.target.value);
              }}
            >
              <option value="">Choose a member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                value={memberPatch.name}
                onChange={(e) => setMemberPatch((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Member name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Voice part</label>
              <select
                className="form-select"
                value={memberPatch.voicePart}
                onChange={(e) => setMemberPatch((prev) => ({ ...prev, voicePart: e.target.value }))}
              >
                <option value="Unassigned">Unassigned</option>
                <option value="Soprano">Soprano</option>
                <option value="Alto">Alto</option>
                <option value="Tenor">Tenor</option>
                <option value="Bass">Bass</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Level</label>
              <select
                className="form-select"
                value={memberPatch.level}
                onChange={(e) => setMemberPatch((prev) => ({ ...prev, level: e.target.value }))}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>
          <button className="onboard-submit" type="button" onClick={saveMemberEdits}>
            Save member changes
          </button>
          {memberNotice && (
            <div style={{marginTop: '10px', fontSize: '12px', color: 'var(--muted)'}}>{memberNotice}</div>
          )}
        </div>

        {isAdmin && (
          <>
            <div className="section-title">Admin Panel — Registered Managers</div>
            <div style={{background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px', marginBottom: '2rem', overflowX: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr>
                    <th style={{textAlign: 'left', padding: '10px', borderBottom: '0.5px solid var(--border)', color: 'var(--gold)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em'}}>Manager</th>
                    <th style={{textAlign: 'left', padding: '10px', borderBottom: '0.5px solid var(--border)', color: 'var(--gold)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em'}}>Email</th>
                    <th style={{textAlign: 'left', padding: '10px', borderBottom: '0.5px solid var(--border)', color: 'var(--gold)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em'}}>Choir</th>
                    <th style={{textAlign: 'left', padding: '10px', borderBottom: '0.5px solid var(--border)', color: 'var(--gold)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em'}}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(managers || []).map((mgr) => (
                    <tr key={mgr.id}>
                      <td style={{padding: '10px', borderBottom: '0.5px solid var(--border)', color: 'var(--cream)', fontSize: '13px'}}>{mgr.name}</td>
                      <td style={{padding: '10px', borderBottom: '0.5px solid var(--border)', color: 'var(--muted)', fontSize: '13px'}}>{mgr.email}</td>
                      <td style={{padding: '10px', borderBottom: '0.5px solid var(--border)', color: 'var(--cream)', fontSize: '13px'}}>{mgr.choir?.name || '—'}</td>
                      <td style={{padding: '10px', borderBottom: '0.5px solid var(--border)', color: 'var(--muted)', fontSize: '13px'}}>{mgr.createdAt ? new Date(mgr.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!managers || managers.length === 0) && (
                <div style={{padding: '10px', color: 'var(--muted)', fontSize: '13px'}}>No managers found.</div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
