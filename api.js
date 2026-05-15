const DEFAULT_LOCAL_BASE_URL = 'http://localhost:3001/api';
const DEFAULT_PROD_BASE_URL = 'https://chioriq.onrender.com/api';

function normalizeBaseUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  let normalized = url.trim();
  if (!normalized) {
    return null;
  }

  // Correct common typo/misconfiguration seen in deployment settings.
  normalized = normalized.replace('://choiriq-backend.onrender.com', '://chioriq.onrender.com');
  normalized = normalized.replace('://choiriq.onrender.com', '://chioriq.onrender.com');
  normalized = normalized.replace(/\/+$/, '');

  if (!/\/api$/i.test(normalized)) {
    normalized = `${normalized}/api`;
  }

  return normalized;
}

function getDefaultBaseUrl() {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCAL_BASE_URL;
  }

  const host = window.location?.hostname || '';
  if (host === 'localhost' || host === '127.0.0.1') {
    return DEFAULT_LOCAL_BASE_URL;
  }

  return DEFAULT_PROD_BASE_URL;
}

function isLocalUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api$/i.test(url);
}

export function createApi(options = {}) {
  const storage = options.storage || (typeof window !== 'undefined' ? window.localStorage : null);

  let viteEnvBaseUrl = null;
  try {
    viteEnvBaseUrl = import.meta?.env?.VITE_API_BASE_URL;
  } catch {
    viteEnvBaseUrl = null;
  }

  const configuredBaseUrl = options.baseUrl
    || (typeof window !== 'undefined' && window.__API_BASE_URL__)
    || viteEnvBaseUrl;
  const normalizedConfiguredBaseUrl = normalizeBaseUrl(configuredBaseUrl);
  const defaultBaseUrl = normalizeBaseUrl(getDefaultBaseUrl()) || DEFAULT_LOCAL_BASE_URL;
  const isLocalHostRuntime = typeof window !== 'undefined' && (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1');

  const baseUrl = normalizedConfiguredBaseUrl && (isLocalHostRuntime || !isLocalUrl(normalizedConfiguredBaseUrl))
    ? normalizedConfiguredBaseUrl
    : defaultBaseUrl;

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

    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...config,
        headers
      });
    } catch (networkError) {
      const message = `Network error contacting ${baseUrl}${path}. Ensure backend is running and VITE_API_BASE_URL points to your live API.`;
      const error = new Error(message);
      error.cause = networkError;
      throw error;
    }

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
    updateAnnouncement: (id, payload) => request(`/choir/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
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

    aiChat: (messages) => request('/ai/chat', { method: 'POST', body: JSON.stringify({ messages }) }),

    listManagers: () => request('/admin/managers')
  };
}

const api = createApi();

if (typeof window !== 'undefined') {
  window.api = api;
}

export default api;
