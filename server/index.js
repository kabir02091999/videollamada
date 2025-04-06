/* const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');


const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Servir archivos estáticos (HTML, JS, CSS)
app.use(cors());  
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

const PORT = process.env.PORT || 3000; // Usa el puerto de Render o 3000 en local
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor en http://localhost:${PORT}`);
}); */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: '*', // Considera restringir esto en producción
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.static('../public'));

const rooms = {};

io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    socket.on('create-room', () => {
        const roomId = generateRoomId();
        rooms[roomId] = { users: [socket.id] };
        socket.join(roomId);
        socket.emit('room-created', roomId);
        console.log(`Sala creada: ${roomId} por ${socket.id}`);
    });

    socket.on('join-room', (roomId) => {
        if (rooms[roomId] && rooms[roomId].users.length < 2) {
            rooms[roomId].users.push(socket.id);
            socket.join(roomId);
            socket.emit('joined-room', roomId);
            socket.to(roomId).emit('user-connected', socket.id);
            console.log(`Usuario ${socket.id} se unió a la sala ${roomId}`);
        } else {
            socket.emit('room-full');
        }
    });

    socket.on('send-signal', data => {
        socket.to(data.target).emit('receive-signal', {
            sender: socket.id,
            signal: data.signal
        });
    });

    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.id}`);
        for (const roomId in rooms) {
            if (rooms[roomId].users.includes(socket.id)) {
                rooms[roomId].users = rooms[roomId].users.filter(id => id !== socket.id);
                socket.to(roomId).emit('user-disconnected', socket.id);
                if (rooms[roomId].users.length === 0) {
                    delete rooms[roomId];
                    console.log(`Sala ${roomId} vaciada y eliminada.`);
                }
                break;
            }
        }
    });
});

function generateRoomId() {
    return Math.random().toString(36).substring(2, 15);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});