import { io } from 'socket.io-client';

const SOCKET_ENABLED = import.meta.env.VITE_ENABLE_SOCKET !== 'false';
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');

let socket;
let connectFailed = false;

export function isSocketEnabled() {
  return SOCKET_ENABLED && Boolean(SOCKET_URL);
}

export function isSocketConnected() {
  return Boolean(socket?.connected);
}

export function didSocketFail() {
  return connectFailed;
}

export function connectSocket(token) {
  if (!isSocketEnabled()) {
    connectFailed = true;
    return null;
  }

  if (socket?.connected) return socket;

  connectFailed = false;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    timeout: 5000,
    reconnectionAttempts: 3
  });

  socket.on('connect', () => {
    connectFailed = false;
    console.log('Socket conectado', socket.id);
  });

  socket.on('connect_error', (err) => {
    connectFailed = true;
    console.warn('Socket no disponible, se usará polling REST:', err.message);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = undefined;
  }
}

export function onSocketEvent(event, handler) {
  if (!socket) return () => {};
  socket.on(event, handler);
  return () => socket.off(event, handler);
}
