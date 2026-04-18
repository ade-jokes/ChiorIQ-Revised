const DEFAULT_BASE_URL = 'http://localhost:3001/api';

export function createApi(options = {}) {
  const storage = options.storage || (typeof window !== 'undefined' ? window.localStorage : null);
  const baseUrl = options.baseUrl || (typeof window !== 'undefined' && window.__API_BASE_URL__) || DEFAULT_BASE_URL;

  function getToken() {
    return storage ? storage.getItem('choiriq_token') : null;
  }

  function setToken(token) {
    if (!storage) return;
    if (!token) {
      storage.removeItem('choiriq_token');
      return;
    }
    storage.setItem('choiriq_token', token);
  }

  async function request(path, config = {}) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(config.headers || {})
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...config,
      headers
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const message = body?.error || `Request failed with status ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return body;
  }

  return {
    getToken,
    setToken,
    clearToken: () => setToken(null),

    register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
    me: () => request('/auth/me'),
    updateMe: (payload) => request('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }),

    getChoir: () => request('/choir'),
    getJoinCode: () => request('/choir/code'),
    refreshJoinCode: () => request('/choir/code/refresh', { method: 'POST' }),
    getMembers: () => request('/choir/members'),
    updateMember: (id, payload) => request(`/choir/member/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    getAnnouncements: () => request('/choir/announcements'),
    createAnnouncement: (payload) => request('/choir/announcements', { method: 'POST', body: JSON.stringify(payload) }),
    createNote: (payload) => request('/choir/notes', { method: 'POST', body: JSON.stringify(payload) }),
    getMyNotes: () => request('/choir/notes/me'),

    listSessions: () => request('/sessions'),
    createSession: (payload) => request('/sessions', { method: 'POST', body: JSON.stringify(payload) }),
    updateSession: (id, payload) => request(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteSession: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),
    attendance: (id) => request(`/sessions/${id}/attendance`),

    logProgress: (payload) => request('/progress', { method: 'POST', body: JSON.stringify(payload) }),
    myProgress: () => request('/progress/me'),
    choirProgress: () => request('/progress/choir'),

    aiChat: (messages) => request('/ai/chat', { method: 'POST', body: JSON.stringify({ messages }) })
  };
}

const api = createApi();

if (typeof window !== 'undefined') {
  window.api = api;
}

export default api;
