import React, { useState } from 'react';

const voiceParts = ['Soprano', 'Alto', 'Tenor', 'Bass'];
const levels = ['Beginner', 'Intermediate', 'Advanced'];

export default function AuthPage({ onLogin, onRegister, loading }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'member',
    voicePart: 'Soprano',
    level: 'Beginner',
    joinCode: '',
    choirName: '',
    adminAccessCode: ''
  });
  const [error, setError] = useState('');

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        await onLogin({ email: form.email, password: form.password });
      } else {
        await onRegister(form);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    }
  }

  return (
    <main id="onboard-page" className="page active">
      <div className="onboard-box">
        <div className="onboard-logo">ChoirIQ</div>
        <p className="onboard-tagline">Your AI-powered vocal coach. Built for choirs that are serious about growth.</p>

        <div className="onboard-switch">
          <button
            className={`nav-btn${mode === 'login' ? ' active' : ''}`}
            onClick={() => setMode('login')}
            type="button"
          >
            Login
          </button>
          <button
            className={`nav-btn${mode === 'register' ? ' active' : ''}`}
            onClick={() => setMode('register')}
            type="button"
          >
            Register
          </button>
        </div>

        <form className="onboard-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Your name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Pastor Ade"
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Your role</label>
                <select className="form-select" value={form.role} onChange={(e) => update('role', e.target.value)}>
                  <option value="member">Choir Member</option>
                  <option value="manager">Choir Manager</option>
                  <option value="admin">Admin (requires access code)</option>
                </select>
              </div>

              {form.role === 'admin' && (
                <div className="form-group">
                  <label className="form-label">Admin access code</label>
                  <input
                    className="form-input"
                    placeholder="Enter admin access code"
                    required
                    value={form.adminAccessCode}
                    onChange={(e) => update('adminAccessCode', e.target.value)}
                  />
                </div>
              )}

              {form.role === 'member' ? (
                <div className="form-group">
                  <label className="form-label">6-character join code</label>
                  <input
                    className="form-input"
                    placeholder="e.g. A1B2C3"
                    required
                    value={form.joinCode}
                    onChange={(e) => update('joinCode', e.target.value.toUpperCase())}
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Choir name</label>
                  <input
                    className="form-input"
                    placeholder="e.g. RCCG Praise Choir"
                    required
                    value={form.choirName}
                    onChange={(e) => update('choirName', e.target.value)}
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Your voice part</label>
                  <select className="form-select" value={form.voicePart} onChange={(e) => update('voicePart', e.target.value)}>
                    {voiceParts.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Experience level</label>
                  <select className="form-select" value={form.level} onChange={(e) => update('level', e.target.value)}>
                    {levels.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="e.g. you@example.com"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Your password"
              required
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button className="onboard-submit" disabled={loading} type="submit">
            {loading ? 'Please wait…' : mode === 'login' ? 'Login →' : 'Create account →'}
          </button>
        </form>
      </div>
    </main>
  );
}
