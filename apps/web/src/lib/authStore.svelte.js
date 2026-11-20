import { api } from './api.js';
import { connectSocket, disconnectSocket } from './socket.js';

function loadInitial() {
  try {
    const token = localStorage.getItem('ca_token');
    const raw = localStorage.getItem('ca_user');
    return {
      token,
      user: raw ? JSON.parse(raw) : null
    };
  } catch {
    return { token: null, user: null };
  }
}

const initial = loadInitial();

export const auth = $state({
  token: initial.token,
  user: initial.user,
  loading: false,
  error: ''
});

export function isAuthenticated() {
  return Boolean(auth.token && auth.user);
}

export async function login(email, password) {
  auth.loading = true;
  auth.error = '';
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    persist(data.token, data.user);
    connectSocket(data.token);
    return data.user;
  } catch (error) {
    auth.error = error.message;
    throw error;
  } finally {
    auth.loading = false;
  }
}

export async function restoreSession() {
  if (!auth.token) return null;
  try {
    const data = await api('/auth/me');
    persist(auth.token, data.user);
    connectSocket(auth.token);
    return data.user;
  } catch {
    logout();
    return null;
  }
}

export function logout() {
  disconnectSocket();
  localStorage.removeItem('ca_token');
  localStorage.removeItem('ca_user');
  auth.token = null;
  auth.user = null;
  auth.error = '';
}

function persist(token, user) {
  localStorage.setItem('ca_token', token);
  localStorage.setItem('ca_user', JSON.stringify(user));
  auth.token = token;
  auth.user = user;
}
