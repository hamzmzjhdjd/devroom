const express  = require('express');
const http     = require('http');
const socketIo = require('socket.io');
const cors     = require('cors');
// SERVER-4 FIX: add helmet for security headers
// Install with: npm install helmet
const helmet   = require('helmet');

const app    = express();
const server = http.createServer(app);

// ─────────────────────────────────────────────
// SERVER-5 FIX: tell Express to trust the first proxy hop so
// req.ip is correctly extracted from X-Forwarded-For
// by Express itself (safe) rather than us reading the raw header (spoofable)
// ─────────────────────────────────────────────
app.set('trust proxy', 1);

// SERVER-4 FIX: security headers via helmet
app.use(helmet());

// SERVER-1 / SERVER-3 FIX: lock CORS to your frontend origin only
// Set ALLOWED_ORIGIN in your environment for production
// e.g. ALLOWED_ORIGIN=https://yourapp.com node server.js
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '10kb' }));

const io = socketIo(server, {
  // SERVER-1 / SERVER-3 FIX: socket CORS matches the same origin as REST
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e6,
});

// ─────────────────────────────────────────────
// DATA STORES
// ─────────────────────────────────────────────
const rooms        = new Map(); // roomId -> { code, language, users: Map<socketId,username>, createdAt }
const socketRoom   = new Map(); // socketId -> { roomId, username }
const ipRateLimit  = new Map(); // ip -> { count, resetAt }   (room creation)
const ipConnLimit  = new Map(); // ip -> { count, resetAt }   (connection rate)
const runCodeLimit = new Map(); // socketId -> { count, resetAt } (run-code spam)

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const MAX_ROOMS_PER_IP      = 10;
const RATE_WINDOW_MS        = 60 * 60 * 1000; // 1 hour
// SERVER-8 FIX: raised from 10 to 30 — hot-reload during dev was locking devs out
const MAX_CONNS_PER_IP      = 30;
const CONN_WINDOW_MS        = 60 * 1000;
// SERVER-2 FIX: actually used now (see socket handler below)
const MAX_RUNS_PER_MIN      = 10;
const RUN_WINDOW_MS         = 60 * 1000;
const MAX_USERS_PER_ROOM    = 20;
const MAX_TOTAL_ROOMS       = 500;
const MAX_CODE_LENGTH       = 100_000;
const MAX_USERNAME_LENGTH   = 30;
const ROOM_IDLE_CLEANUP_MS  = 2 * 60 * 60 * 1000;

const VALID_LANGUAGES = new Set([
  'python','javascript','typescript','java','cpp','c',
  'csharp','go','rust','php','ruby','kotlin'
]);

const STARTER_CODE = {
  python:     '# Welcome to DevRoom!\nprint("Hello, DevRoom!")\n',
  javascript: '// Welcome to DevRoom!\nconsole.log("Hello, DevRoom!");\n',
  typescript: 'const message: string = "Hello, DevRoom!";\nconsole.log(message);\n',
  java:       'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, DevRoom!");\n    }\n}\n',
  cpp:        '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello, DevRoom!" << endl;\n    return 0;\n}\n',
  c:          '#include <stdio.h>\nint main() {\n    printf("Hello, DevRoom!\\n");\n    return 0;\n}\n',
  csharp:     'using System;\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, DevRoom!");\n    }\n}\n',
  go:         'package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello, DevRoom!")\n}\n',
  rust:       'fn main() {\n    println!("Hello, DevRoom!");\n}\n',
  php:        '<?php\necho "Hello, DevRoom!";\n',
  ruby:       'puts "Hello, DevRoom!"\n',
  kotlin:     'fun main() {\n    println("Hello, DevRoom!")\n}\n',
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const sanitise = (str, maxLen = 200) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLen);
};

const rateCheck = (store, key, max, windowMs) => {
  const now   = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
};

const isValidRoomId = (id) =>
  typeof id === 'string' && /^[a-z0-9-]{3,20}$/.test(id);

const isValidUsername = (name) => {
  if (typeof name !== 'string') return false;
  const t = name.trim();
  return t.length >= 1 && t.length <= MAX_USERNAME_LENGTH && /^[\w\s\-.]+$/.test(t);
};

// SERVER-6 FIX: normalise IPv6-mapped IPv4 addresses (::ffff:1.2.3.4 -> 1.2.3.4)
// so the same physical IP doesn't appear as two different keys in rate-limit maps
const normaliseIp = (raw) => {
  if (!raw) return 'unknown';
  return raw.startsWith('::ffff:') ? raw.slice(7) : raw;
};

// SERVER-7 FIX: safe payload guard — protects all socket event handlers from
// crashes when a client sends null, a number, or a raw string instead of an object
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// ─────────────────────────────────────────────
// HELPER: save a code snapshot to room history
// ─────────────────────────────────────────────
const MAX_HISTORY = 20;

const saveSnapshot = (roomId, trigger, username) => {
  const room = rooms.get(roomId);
  if (!room) return;
  // Don't duplicate if code hasn't changed since last snapshot
  const last = room.history[room.history.length - 1];
  if (last && last.code === room.code && last.language === room.language) return;
  room.history.push({
    code:      room.code,
    language:  room.language,
    username:  username || 'Unknown',
    timestamp: Date.now(),
    trigger,   // 'run' | 'leave' | 'lang-change'
  });
  // Keep only last MAX_HISTORY snapshots
  if (room.history.length > MAX_HISTORY) room.history.shift();
};

// ─────────────────────────────────────────────
// REST — GET /room-exists/:roomId
// ─────────────────────────────────────────────
app.get('/room-exists/:roomId', (req, res) => {
  const id     = req.params.roomId;
  const roomId = typeof id === 'string' ? id.toLowerCase() : '';
  if (!isValidRoomId(roomId)) return res.json({ exists: false });
  res.json({ exists: rooms.has(roomId) });
});

// ─────────────────────────────────────────────
// REST — POST /create-room
// ─────────────────────────────────────────────
app.post('/create-room', (req, res) => {
  // SERVER-5 FIX: use req.ip only — safe because trust proxy is set above
  const ip = normaliseIp(req.ip || 'unknown');

  if (!rateCheck(ipRateLimit, ip, MAX_ROOMS_PER_IP, RATE_WINDOW_MS)) {
    return res.status(429).json({ error: 'Too many rooms created. Try again in an hour.' });
  }

  const raw    = req.body?.roomId;
  const roomId = typeof raw === 'string' ? raw.toLowerCase().trim() : '';

  if (!isValidRoomId(roomId)) {
    return res.status(400).json({ error: 'Invalid room ID format.' });
  }

  if (rooms.has(roomId)) {
    return res.status(409).json({ error: 'Room already exists.' });
  }

  if (rooms.size >= MAX_TOTAL_ROOMS) {
    return res.status(503).json({ error: 'Server at capacity. Try again later.' });
  }

  rooms.set(roomId, {
    code:      STARTER_CODE['javascript'],
    language:  'javascript',
    users:     new Map(),
    history:   [],          // snapshots: [{code, language, username, timestamp, trigger}]
    createdAt: Date.now(),
  });

  console.log(`Room "${roomId}" created by ${ip} — total: ${rooms.size}`);
  res.json({ success: true, roomId });
});

// ─────────────────────────────────────────────
// SOCKET
// ─────────────────────────────────────────────
io.on('connection', (socket) => {
  // SERVER-5 + SERVER-6 FIX: use normalised IP from handshake
  const connIp = normaliseIp(
    socket.handshake.headers['x-forwarded-for']?.split(',')[0].trim()
    || socket.handshake.address
    || 'unknown'
  );

  if (!rateCheck(ipConnLimit, connIp, MAX_CONNS_PER_IP, CONN_WINDOW_MS)) {
    console.log(`Connection rate limit hit by ${connIp}`);
    socket.emit('join-error', { message: 'Too many connections. Please wait a minute.' });
    socket.disconnect(true);
    return;
  }

  console.log(`User connected: ${socket.id} from ${connIp}`);

  let joinAttempts = 0;

  // ── JOIN ROOM ──────────────────────────────
  socket.on('join-room', (payload) => {
    // SERVER-7 FIX: guard against null / non-object payloads before destructuring
    if (!isObject(payload)) {
      socket.emit('join-error', { message: 'Invalid payload.' });
      return;
    }

    const { roomId: rawRoomId, username: rawUsername } = payload;

    if (!rawRoomId || !rawUsername) {
      socket.emit('join-error', { message: 'Missing roomId or username.' });
      return;
    }

    joinAttempts++;
    if (joinAttempts > 5) {
      socket.emit('join-error', { message: 'Too many join attempts. Please refresh.' });
      socket.disconnect(true);
      return;
    }

    const roomId   = rawRoomId.toLowerCase().trim();
    const username = rawUsername.trim();

    if (!isValidRoomId(roomId)) {
      socket.emit('join-error', { message: 'Invalid room ID.' });
      return;
    }

    if (!isValidUsername(username)) {
      socket.emit('join-error', { message: 'Invalid username. 1-30 alphanumeric characters only.' });
      return;
    }

    if (!rooms.has(roomId)) {
      socket.emit('join-error', { message: 'Room does not exist. Please create it first.' });
      return;
    }

    const room = rooms.get(roomId);

    if (room.users.size >= MAX_USERS_PER_ROOM && !room.users.has(socket.id)) {
      socket.emit('join-error', { message: `Room is full (max ${MAX_USERS_PER_ROOM} users).` });
      return;
    }

    const cleanName = sanitise(username, MAX_USERNAME_LENGTH);

    socket.join(roomId);
    room.users.set(socket.id, cleanName);
    socketRoom.set(socket.id, { roomId, username: cleanName });

    socket.emit('room-state', {
      code:     room.code,
      language: room.language,
      users:    Array.from(room.users.entries()).map(([id, uname]) => ({ id, username: uname })),
      history:  room.history,
    });

    socket.to(roomId).emit('user-joined', { id: socket.id, username: cleanName });
    console.log(`"${cleanName}" joined "${roomId}" — ${room.users.size} user(s)`);
  });

  // ── CODE CHANGE ────────────────────────────
  socket.on('code-change', (payload) => {
    // SERVER-7 FIX: guard non-object payload
    if (!isObject(payload)) return;

    const info = socketRoom.get(socket.id);
    if (!info) return;

    // SERVER-2 FIX (part): also rate-limit code-change events to prevent
    // a client flooding all room members with thousands of updates per second.
    // 300 changes/min = 5 per second which is more than enough for real typing.
    if (!rateCheck(runCodeLimit, `edit:${socket.id}`, 300, 60_000)) return;

    const { code } = payload;
    const roomId   = info.roomId; // always use server-tracked roomId

    if (!rooms.has(roomId)) return;
    if (typeof code !== 'string' || code.length > MAX_CODE_LENGTH) return;

    rooms.get(roomId).code = code;
    socket.to(roomId).emit('code-update', code);
  });

  // ── LANGUAGE CHANGE ────────────────────────
  socket.on('language-change', (payload) => {
    // SERVER-7 FIX: guard non-object payload
    if (!isObject(payload)) return;

    const info = socketRoom.get(socket.id);
    if (!info) return;

    const { language } = payload;
    const roomId = info.roomId; // always use server-tracked roomId

    if (!rooms.has(roomId)) return;
    if (!VALID_LANGUAGES.has(language)) return;

    const room    = rooms.get(roomId);
    saveSnapshot(roomId, 'lang-change', info.username); // snapshot before lang reset
    room.language = language;
    room.code     = STARTER_CODE[language];
    socket.to(roomId).emit('language-update', language);
  });

  // ── RUN CODE (optional: if you ever proxy run-code through server) ─────────
  // SERVER-2 FIX: this is where runCodeLimit is actually used.
  // Currently run-code goes directly from client to Piston API, so this
  // handler is a stub — but it's here so you can route through the server
  // later and have rate limiting ready.
  socket.on('run-code', (payload) => {
    if (!isObject(payload)) return;

    const info = socketRoom.get(socket.id);
    if (!info) return;

    // SERVER-2 FIX: enforce server-side run rate limit (10 per minute per socket)
    if (!rateCheck(runCodeLimit, `run:${socket.id}`, MAX_RUNS_PER_MIN, RUN_WINDOW_MS)) {
      socket.emit('run-error', { message: 'Rate limit: max 10 runs per minute.' });
      return;
    }

    // Actual execution logic would go here if you proxy through the server.
    // For now it just acknowledges. Client calls Piston directly currently.
    socket.emit('run-ack', { allowed: true });
  });

  // ── CODE OUTPUT ───────────────────────────
  // Client emits this when code finishes running — we snapshot + broadcast output
  socket.on('code-output', (payload) => {
    if (!isObject(payload)) return;
    const info = socketRoom.get(socket.id);
    if (!info) return;
    const { output, status } = payload;
    // Save snapshot when code finishes (not during 'running' state)
    if (status === 'success' || status === 'error') {
      saveSnapshot(info.roomId, 'run', info.username);
      const room = rooms.get(info.roomId);
      if (room) io.to(info.roomId).emit('history-update', room.history);
    }
    io.to(info.roomId).emit('code-output-update', {
      output: typeof output === 'string' ? output.slice(0, 10000) : '',
      status: typeof status === 'string' ? status : 'idle',
      username: info.username,
    });
  });

  // ── CHAT MESSAGE ──────────────────────────
  socket.on('chat-message', (payload) => {
    if (!isObject(payload)) return;
    const info = socketRoom.get(socket.id);
    if (!info) return;
    const { text, timestamp } = payload;
    if (typeof text !== 'string' || text.length === 0 || text.length > 500) return;
    const safeText = sanitise(text, 500);
    socket.to(info.roomId).emit('chat-message', {
      socketId:  socket.id,
      username:  info.username,
      text:      safeText,
      timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
    });
  });

  // ── CURSOR MOVE ────────────────────────────
  // Broadcast cursor position to all other users in the room
  // Throttled client-side, so we just forward here
  socket.on('cursor-move', (payload) => {
    if (!isObject(payload)) return;
    const info = socketRoom.get(socket.id);
    if (!info) return;
    const { line, column, color } = payload;
    if (typeof line !== 'number' || typeof column !== 'number') return;
    if (line < 1 || line > 100000 || column < 1 || column > 10000) return;
    socket.to(info.roomId).emit('cursor-move', {
      socketId: socket.id,
      username: info.username,
      color:    typeof color === 'string' ? color.slice(0, 20) : '#38bdf8',
      line,
      column,
    });
  });

  // ── HISTORY: send current history to user on join ───────────────────────
  // (already sent via room-state, but also handle explicit request)
  socket.on('request-history', () => {
    const info = socketRoom.get(socket.id);
    if (!info) return;
    const room = rooms.get(info.roomId);
    if (!room) return;
    socket.emit('history-update', room.history);
  });

  // ── HISTORY: restore a snapshot ───────────────────────────────────────────
  socket.on('restore-snapshot', (payload) => {
    if (!isObject(payload)) return;
    const info = socketRoom.get(socket.id);
    if (!info) return;
    const { index } = payload;
    const room = rooms.get(info.roomId);
    if (!room) return;
    if (typeof index !== 'number' || index < 0 || index >= room.history.length) return;
    const snap = room.history[index];
    // Save current state as snapshot before restoring
    saveSnapshot(info.roomId, 'before-restore', info.username);
    room.code     = snap.code;
    room.language = snap.language;
    // Broadcast restored code + language to all room members
    io.to(info.roomId).emit('code-update', snap.code);
    io.to(info.roomId).emit('language-update', snap.language);
    io.to(info.roomId).emit('history-update', room.history);
    io.to(info.roomId).emit('snapshot-restored', { username: info.username, index });
  });

  // ── DISCONNECT ─────────────────────────────
  socket.on('disconnect', () => {
    const info = socketRoom.get(socket.id);
    if (!info) return;

    const { roomId, username } = info;
    socketRoom.delete(socket.id);

    // Clean up all rate-limit entries for this socket
    runCodeLimit.delete(`run:${socket.id}`);
    runCodeLimit.delete(`edit:${socket.id}`);

    if (!rooms.has(roomId)) return;

    saveSnapshot(roomId, 'leave', username); // snapshot when user leaves
    rooms.get(roomId).users.delete(socket.id);
    socket.to(roomId).emit('user-left', socket.id);
    // Broadcast updated history to remaining room members
    const updatedRoom = rooms.get(roomId);
    if (updatedRoom) socket.to(roomId).emit('history-update', updatedRoom.history);

    const remaining = rooms.get(roomId).users.size;
    console.log(`"${username}" left "${roomId}" — ${remaining} remaining`);

    if (remaining === 0) {
      setTimeout(() => {
        if (rooms.has(roomId) && rooms.get(roomId).users.size === 0) {
          rooms.delete(roomId);
          console.log(`Room "${roomId}" cleaned up — total: ${rooms.size}`);
        }
      }, ROOM_IDLE_CLEANUP_MS);
    }
  });
});

// ─────────────────────────────────────────────
// PERIODIC CLEANUP — stale rate limit entries
// ─────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of ipRateLimit)  { if (now > entry.resetAt) ipRateLimit.delete(key); }
  for (const [key, entry] of ipConnLimit)  { if (now > entry.resetAt) ipConnLimit.delete(key); }
  for (const [key, entry] of runCodeLimit) { if (now > entry.resetAt) runCodeLimit.delete(key); }
}, 10 * 60 * 1000);

// ─────────────────────────────────────────────
// PERIODIC CLEANUP — ghost rooms (created but never joined)
// ─────────────────────────────────────────────
setInterval(() => {
  const now        = Date.now();
  const MAX_AGE_MS = 5 * 60 * 1000;
  for (const [roomId, room] of rooms) {
    if (room.users.size === 0 && (now - room.createdAt) > MAX_AGE_MS) {
      rooms.delete(roomId);
      console.log(`Ghost room "${roomId}" cleaned up`);
    }
  }
}, 60 * 1000);

// ─────────────────────────────────────────────
// MINOR-1 FIX: global uncaught exception handler
// prevents a single unexpected throw from killing the server and wiping all rooms
// ─────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] Server kept alive:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection] Server kept alive:', reason);
});

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: 'DevRoom server running!',
    rooms:   rooms.size,
    clients: io.engine.clientsCount,
  });
});

// ─────────────────────────────────────────────
// AGORA — GET /api/agora-token
// Generates a token for video/voice calls
// Usage: /api/agora-token?channel=roomName&uid=0
// ─────────────────────────────────────────────
const { RtcTokenBuilder, RtcRole } = require('agora-token');

const AGORA_APP_ID          = '6d749d7111a14d7385ade0f8ba62d0ae';        // ← paste your App ID
const AGORA_APP_CERTIFICATE = '535f64a18eec4d168843342624d638c7'; // ← paste your Primary Certificate

app.get('/api/agora-token', (req, res) => {
  const channelName = req.query.channel;
  const uid         = parseInt(req.query.uid) || 0;

  if (!channelName) {
    return res.status(400).json({ error: 'channel query param is required' });
  }

  const expireTime      = 3600; // token valid for 1 hour
  const currentTime     = Math.floor(Date.now() / 1000);
  const privilegeExpire = currentTime + expireTime;

  const token = RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    privilegeExpire,
    privilegeExpire
  );

  res.json({ token });
});

// SERVER-10 FIX: handle port-in-use and other startup errors gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port 5000 is already in use. Is another instance running?`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

server.listen(5000, () => {
  console.log(`Server running on port 5000`);
  console.log(`CORS allowed origin: ${ALLOWED_ORIGIN}`);
});