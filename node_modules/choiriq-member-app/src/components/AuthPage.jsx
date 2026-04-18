import React, { useState } from 'react';

const voiceParts = ['Soprano', 'Alto', 'Tenor', 'Bass'];
const levels = ['Beginner', 'Intermediate', 'Advanced'];

export default function AuthPage({ onLogin, onRegister, loading }) {
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'member',
    voicePart: 'Soprano',
    level: 'Beginner',
    joinCode: '',
    choirName: ''
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
    <main className="authWrap">
      <section className="authCard">
        <h2>ChoirIQ Revised</h2>
        <p>Readable, role-based vocal training for members, managers, and admins.</p>
        <div className="onboardingHints">
          <span>Guided sessions</span>
          <span>Live pitch tools</span>
          <span>Progress tracking</span>
        </div>

        <div className="switcher">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">Login</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">Register</button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <label>
                Name
                <input required value={form.name} onChange={(e) => update('name', e.target.value)} />
              </label>
              <label>
                Role
                <select value={form.role} onChange={(e) => update('role', e.target.value)}>
                  <option value="member">Choir Member</option>
                  <option value="manager">Choir Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              {form.role === 'member' ? (
                <label>
                  6-character join code
                  <input required value={form.joinCode} onChange={(e) => update('joinCode', e.target.value.toUpperCase())} />
                </label>
              ) : (
                <label>
                  Choir name
                  <input required value={form.choirName} onChange={(e) => update('choirName', e.target.value)} />
                </label>
              )}
              <div className="split">
                <label>
                  Voice part
                  <select value={form.voicePart} onChange={(e) => update('voicePart', e.target.value)}>
                    {voiceParts.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  Skill level
                  <select value={form.level} onChange={(e) => update('level', e.target.value)}>
                    {levels.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </div>
            </>
          )}

          <label>
            Email
            <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
          </label>
          <label>
            Password
            <div className="inputWithButton">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
              />
              <button onClick={() => setShowPassword((prev) => !prev)} type="button">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {mode === 'register' && <small className="fieldHint">Use at least 8 characters for stronger account security.</small>}
          </label>

          {error && <div className="errorMsg">{error}</div>}
          <button className="primary" disabled={loading} type="submit">
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
      </section>
    </main>
  );
}
