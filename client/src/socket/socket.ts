import { io, Socket } from 'socket.io-client';

// Use environment variable VITE_BACKEND_URL if provided, else fallback to localhost in dev or current origin in prod
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

export const socket: Socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});

export function getSocket(): Socket {
  return socket;
}
