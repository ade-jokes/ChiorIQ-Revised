import React from 'react';
import { Link, useRouterState } from '@tanstack/react-router';

export default function TopNav({ user, onLogout }) {
  const location = useRouterState({ select: (s) => s.location.pathname });

  if (!user) return null;

  return (
    <nav id="main-nav">
      <Link className="logo" to="/dashboard">
        <div className="logo-mark">C</div>
        ChoirIQ
      </Link>

      <div className="nav-links">
        <Link className={`nav-btn${location === '/dashboard' ? ' active' : ''}`} to="/dashboard">Dashboard</Link>
        <Link className={`nav-btn${location.startsWith('/session') ? ' active' : ''}`} to="/session/$sessionId" params={{ sessionId: '1' }}>Lesson</Link>
        <Link className={`nav-btn${location === '/progress' ? ' active' : ''}`} to="/progress">Progress</Link>
        <Link className={`nav-btn${location === '/notes' ? ' active' : ''}`} to="/notes">Notes</Link>
        {(user.role === 'manager' || user.role === 'admin') && (
          <Link className={`nav-btn${location === '/leader' ? ' active' : ''}`} to="/leader">Members</Link>
        )}
        <button className="nav-btn" type="button" onClick={onLogout}>Logout</button>
      </div>

      <div className="nav-right">
        <div className="streak-badge">🔥 {user.streak || 0} days</div>
      </div>
    </nav>
  );
}
