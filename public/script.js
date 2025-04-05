const socket = io(); // Conexión al servidor Socket.IO
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
socket.on('user-connected', (userId) => {
  console.log(`Nuevo usuario conectado: ${userId}`);
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
  if (data.signal.type === 'offer') {
    handleOffer(data.senderId, data.signal.offer);
  } else if (data.signal.type === 'answer') {
    peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal.answer));
  } else if (data.signal.type === 'candidate') {
    peerConnection.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
  }
});

async function handleOffer(senderId, offer) {
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