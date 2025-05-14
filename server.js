const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('client')); // serves HTML/CSS/JS from client folder

let waitingUser = null;

io.on('connection', socket => {
  console.log('🔌 New user connected:', socket.id);

  if (waitingUser && waitingUser.connected) {
    socket.partner = waitingUser;
    waitingUser.partner = socket;

    socket.emit('match');
    waitingUser.emit('match');

    waitingUser = null;
  } else {
    waitingUser = socket;
    socket.emit('waiting');
  }

  socket.on('signal', data => {
    if (socket.partner && socket.partner.connected) {
      socket.partner.emit('signal', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);

    if (socket.partner) {
      socket.partner.emit('partner-disconnected');
      socket.partner.partner = null;
    }

    if (waitingUser === socket) {
      waitingUser = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
