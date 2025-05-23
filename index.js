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
  res.send('Socket.IO server is running in UPB App');
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
    users[userId] = socket.id;
    console.log(`🔐 User registered: ${userId}`);
    io.emit('userListUpdate', Object.keys(users));
  });

  socket.on('sendPrivateMessage', ({ to, message, from }) => {
    const toSocketId = users[to];
    if (toSocketId) {
      io.to(toSocketId).emit('receivePrivateMessage', { from, message });
      messages.push({ from, to, message });
      console.log(`📩 Message from ${from} to ${to}: ${message}`);
    } else {
      socket.emit('errorMessage', `User ${to} is not online.`);
    }
  });

  // Step 1: Ask for availability
  socket.on('askAvailability', ({ from, to }) => {
    const toSocketId = users[to];
    if (toSocketId) {
      io.to(toSocketId).emit('receiveAvailabilityRequest', { from });
      console.log(`📨 ${from} asked ${to} for availability`);
    }
  });

  // Step 2: Availability response
  socket.on('availabilityResponse', ({ from, to, response }) => {
    const toSocketId = users[to];
    if (toSocketId) {
      io.to(toSocketId).emit('receiveAvailabilityResponse', { from, response });
      if (response === 'yes') {
        console.log(`✅ ${from} is available for ${to}`);
      } else {
        console.log(`❌ ${from} is not available for ${to}`);
      }
    }
  });

  // Step 3: Ask for payment details
  socket.on('askPaymentDetails', ({ from, to }) => {
    const toSocketId = users[to];
    if (toSocketId) {
      io.to(toSocketId).emit('receiveAskForBankDetails', { from });
      console.log(`💰 ${from} asked ${to} for bank details`);
    }
  });

  // Step 4: Send bank details and trigger 5min timer
  socket.on('sendBankDetails', ({ from, to, bankDetails }) => {
    const toSocketId = users[to];
    if (toSocketId) {
      io.to(toSocketId).emit('receiveBankDetails', { from, bankDetails });

      // Notify user1 to start 5 min timer and show "Send Receipt" after 20s
      io.to(toSocketId).emit('startPaymentTimer', { from, duration: 300 }); // 300 seconds
      io.to(toSocketId).emit('showSendReceiptButton', { delay: 20 });

      console.log(`🏦 ${from} sent bank details to ${to}`);
    }
  });

  // Step 5: Send Receipt
  socket.on('sendReceipt', ({ from, to }) => {
    const toSocketId = users[to];
    if (toSocketId) {
      io.to(toSocketId).emit('receivePaymentReceipt', { from, message: 'Payment done' });
      console.log(`🧾 ${from} sent payment receipt to ${to}`);
    }
  });

  // Step 6: Payment confirmation by receiver
  socket.on('confirmPaymentStatus', ({ from, to, status }) => {
    const toSocketId = users[to];
    if (toSocketId) {
      if (status === 'yes') {
        io.to(toSocketId).emit('paymentConfirmed', {
          from,
          message: 'Payment done and your order is successfully placed',
        });
        console.log(`✅ ${from} confirmed payment from ${to}`);
      } else {
        io.to(toSocketId).emit('paymentConflict', {
          from,
          message: 'Conflict in payment status',
        });
        io.to(users[from]).emit('paymentConflict', {
          from: to,
          message: 'Conflict in payment status',
        });
        console.log(`⚠️ Conflict reported between ${from} and ${to}`);
      }
    }
  });

  socket.on('disconnect', () => {
    const disconnectedUser = Object.keys(users).find((userId) => users[userId] === socket.id);
    if (disconnectedUser) {
      delete users[disconnectedUser];
      console.log(`❌ User disconnected: ${disconnectedUser}`);
      io.emit('userListUpdate', Object.keys(users));
    }
  });
});

const PORT = process.env.PORT || 2001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
