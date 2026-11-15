import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerRoomHandlers, handlePlayerExit } from './handlers/roomHandler.js';
import { registerGameHandlers } from './handlers/gameHandler.js';
import { registerDrawingHandlers } from './handlers/drawingHandler.js';
import { registerChatHandlers } from './handlers/chatHandler.js';
import { roomService } from './services/roomService.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || '*';

// CORS configuration
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173']
  : ['http://localhost:5173', 'http://127.0.0.1:5173', '*'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || CLIENT_URL === '*' || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for preview/Render environments
    },
    credentials: true,
  })
);

app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Public rooms API endpoint
app.get('/api/rooms/public', (_req, res) => {
  const rooms = roomService.getPublicRooms();
  res.json({ success: true, data: rooms });
});

// Socket.IO configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 10000,
  maxHttpBufferSize: 1e6, // 1MB payload limit
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  // Register modular handlers
  registerRoomHandlers(io, socket);
  registerGameHandlers(io, socket);
  registerDrawingHandlers(io, socket);
  registerChatHandlers(io, socket);

  // Handle disconnection
  socket.on('disconnect', () => {
    handlePlayerExit(io, socket, false);
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Client URL allowed: ${CLIENT_URL}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed gracefully');
    process.exit(0);
  });
});

export { app, server, io };
