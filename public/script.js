//const socket = io(); // Conexión al servidor Socket.IO
const socket = io('http://localhost:3000');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
let localStream;
let peerConnection;

// Unirse a una sala
function joinRoom() {
  const roomId = document.getElementById('roomId').value;
  if (!roomId) return alert('Ingresa un ID de sala');

  socket.emit('join-room', roomId);
  startVideo(); // Activar cámara local
}

// Activar cámara y micrófono
async function startVideo() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
  } catch (error) {
    console.error('Error al acceder a la cámara:', error);
  }
}

// Configurar WebRTC
/* socket.on('user-connected', (userId) => {
  console.log(`Nuevo usuario conectado: ${userId}`);
  createPeerConnection(userId);
}); */
socket.on('user-connected', async (userId) => {
    console.log(`Nuevo usuario conectado: ${userId}`);
    if (!localStream) {
      console.log('Esperando a que el stream local esté listo antes de crear peerConnection');
      // Podrías usar una promesa o un estado para saber cuándo localStream está listo
      // y luego llamar a createPeerConnection(userId);
      const streamReady = new Promise(resolve => {
        if (localStream) {
          resolve();
        } else {
          const checkInterval = setInterval(() => {
            if (localStream) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100); // Verificar cada 100ms
        }
      });
      await streamReady;
    }
    createPeerConnection(userId);
  });


function createPeerConnection(userId) {
  // Configurar la conexión Peer-to-Peer (WebRTC)
  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Servidor STUN para NAT
  });

  // Enviar stream local al peer remoto
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Recibir stream remoto
  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  // Manejar ICE Candidates (para conexión directa)
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', {
        targetUserId: userId,
        signal: { type: 'candidate', candidate: event.candidate },
      });
    }
  };

  // Crear oferta SDP y enviarla al otro usuario
  peerConnection.createOffer()
    .then(offer => peerConnection.setLocalDescription(offer))
    .then(() => {
      socket.emit('signal', {
        targetUserId: userId,
        signal: { type: 'offer', offer: peerConnection.localDescription },
      });
    });
}

// Manejar señales de WebRTC (Ofertas/Respuestas)
socket.on('signal', (data) => {
  // Asegurarse de que peerConnection esté inicializado antes de usarlo
  if (!peerConnection) {
    console.warn('Recibida señal pero peerConnection no está inicializado:', data);
    return;
  }

  if (data.signal.type === 'offer') {
    handleOffer(data.senderId, data.signal.offer);
  } else if (data.signal.type === 'answer') {
    peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal.answer));
  } else if (data.signal.type === 'candidate') {
    peerConnection.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
  }
});

async function handleOffer(senderId, offer) {
  // Asegurarse de que peerConnection esté inicializado antes de usarlo
  if (!peerConnection) {
    console.warn('Recibida oferta pero peerConnection no está inicializado.');
    return;
  }
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('signal', {
    targetUserId: senderId,
    signal: { type: 'answer', answer },
  });
}

// Usuario desconectado
socket.on('user-disconnected', (userId) => {
  console.log(`Usuario desconectado: ${userId}`);
  if (peerConnection) peerConnection.close();
});