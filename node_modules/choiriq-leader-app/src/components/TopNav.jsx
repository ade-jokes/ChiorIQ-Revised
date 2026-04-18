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
        <Link className={location === '/leader' ? 'active' : ''} to="/leader">Command Center</Link>
      </nav>
      <div className="userPill">
        <span>{user.name}</span>
        <strong>{user.role}</strong>
        <button type="button" onClick={onLogout}>Logout</button>
      </div>
    </header>
  );
}
