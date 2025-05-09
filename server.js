const WebSocket = require('ws');
const http = require('http');

const connectedUsers = {}; // userId -> websocket

// Create HTTP server
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Server is running ✅' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// When a client connects
wss.on('connection', (ws) => {
  console.log('A client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'register' && data.userId) {
        connectedUsers[data.userId] = ws;
        console.log(`User registered: ${data.userId}`);

        ws.send(JSON.stringify({
          type: 'registered',
          message: `User ${data.userId} registered successfully`
        }));
      }
    } catch (error) {
      console.error('Invalid JSON received:', error);
    }
  });

  ws.on('close', () => {
    for (const userId in connectedUsers) {
      if (connectedUsers[userId] === ws) {
        delete connectedUsers[userId];
        console.log(`User disconnected: ${userId}`);
        break;
      }
    }
  });
});

// Simulate checking an API for payment status every few seconds
async function checkPaymentStatus() {
  try {
    // Simulate a success payment response
    const paymentResponse = {
      success: true,
      requesterUserId: 'user123', // the one who requested the payment
      payerUserId: 'user456',      // the one who paid
      amount: 150,
    };

    if (paymentResponse.success) {
      const requesterSocket = connectedUsers[paymentResponse.requesterUserId];

      if (requesterSocket && requesterSocket.readyState === WebSocket.OPEN) {
        requesterSocket.send(JSON.stringify({
          type: 'payment_success',
          payer: paymentResponse.payerUserId,
          amount: paymentResponse.amount,
          message: `Payment of ₹${paymentResponse.amount} done by ${paymentResponse.payerUserId}`,
        }));

        console.log(`Payment success message sent to ${paymentResponse.requesterUserId}`);
      } else {
        console.log(`Requester ${paymentResponse.requesterUserId} not connected`);
      }
    }
  } catch (error) {
    console.error('Error checking payment status:', error);
  }
}

// Check payment every 5 seconds (simulate)
setInterval(checkPaymentStatus, 5000);

// Start the server
server.listen(8080, () => {
  console.log('Server and WebSocket listening on port 8080');
});
