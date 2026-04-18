import React from 'react';
import { Link, useRouterState } from '@tanstack/react-router';

export default function TopNav({ user, onLogout }) {
  const location = useRouterState({ select: (s) => s.location.pathname });

  if (!user) return null;

  return (
    <header className="topnav">
      <div className="brand">
        <span className="brandMark">CQ</span>
        <div>
          <h1>ChoirIQ</h1>
          <p>Revised Training Platform</p>
        </div>
      </div>
      <nav>
        <Link className={location === '/dashboard' ? 'active' : ''} to="/dashboard">Dashboard</Link>
        <Link className={location.startsWith('/session') ? 'active' : ''} to="/session/$sessionId" params={{ sessionId: '1' }}>Session</Link>
        <Link className={location === '/progress' ? 'active' : ''} to="/progress">Progress</Link>
        <Link className={location === '/notes' ? 'active' : ''} to="/notes">Notes</Link>
        {(user.role === 'manager' || user.role === 'admin') && (
          <Link className={location === '/leader' ? 'active' : ''} to="/leader">Leader</Link>
        )}
      </nav>
      <div className="userPill">
        <span>{user.name}</span>
        <strong>{user.role}</strong>
        <button type="button" onClick={onLogout}>Logout</button>
      </div>
    </header>
  );
}
