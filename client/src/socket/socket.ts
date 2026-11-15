import { io, Socket } from 'socket.io-client';

// Use environment variable VITE_BACKEND_URL if provided, else fallback to localhost in dev or current origin in prod
let backendUrl =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

// Ensure URL includes protocol if provided by Render Blueprint host property
if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
  backendUrl = `https://${backendUrl}`;
}

export const socket: Socket = io(backendUrl, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});

export function getSocket(): Socket {
  return socket;
}
