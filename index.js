const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: ['*'], 
    methods: ['GET', 'POST'],
  },
});

const users = {};
const messages = []; 

app.get('/', (req, res) => {
  res.send('Socket.IO server is running in upb App ');
});


app.get('/users', (req, res) => {
  res.json({
    connectedUsers: Object.keys(users),
    messageLog: messages,
  });
});


io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);

  socket.on('register', (userId) => {
    for (const uid in users) {
      if (users[uid] === socket.id) {
        delete users[uid];
      }
    }

    // Map new userId to socket.id
    users[userId] = socket.id;
    console.log(`🔐 User registered: ${userId}`);

    // Notify all clients about the updated user list
    io.emit('userListUpdate', Object.keys(users));
  });

  // Private message handler
  socket.on('sendPrivateMessage', ({ to, message, from }) => {
    const toSocketId = users[to];
    if (toSocketId) {
      io.to(toSocketId).emit('receivePrivateMessage', { from, message });
      messages.push({ from, to, message });
      console.log(`📩 Message from ${from} to ${to}: ${message}`);
    } else {
      console.log(`⚠️ User ${to} not connected`);
      socket.emit('errorMessage', `User ${to} is not online.`);
    }
  });

  // On disconnection
  socket.on('disconnect', () => {
    const disconnectedUser = Object.keys(users).find(
      (userId) => users[userId] === socket.id
    );
    if (disconnectedUser) {
      delete users[disconnectedUser];
      console.log(`❌ User disconnected: ${disconnectedUser}`);
      io.emit('userListUpdate', Object.keys(users));
    }
  });
});

// Start server
const PORT = process.env.PORT || 2001;
server.listen(PORT,  () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
