const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Servir archivos estáticos (HTML, JS, CSS)
app.use(express.static('../public'));

// Manejar conexiones de Socket.IO
io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  // Unirse a una sala (videollamada específica)
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Usuario ${socket.id} se unió a la sala ${roomId}`);
    
    // Avisar a otros en la sala que un nuevo usuario se conectó
    socket.to(roomId).emit('user-connected', socket.id);
  });

  // Enviar señal de WebRTC a otro usuario específico
  socket.on('signal', (data) => {
    io.to(data.targetUserId).emit('signal', {
      senderId: socket.id,
      signal: data.signal,
    });
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    socket.broadcast.emit('user-disconnected', socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});