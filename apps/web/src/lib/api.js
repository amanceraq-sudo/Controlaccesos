const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('ca_token');
}

export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const authToken = token ?? getToken();
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Error en la solicitud');
    error.status = response.status;
    error.details = data.details;
    throw error;
  }

  return data;
}
