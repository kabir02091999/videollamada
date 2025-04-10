//const socket = io(); // Conexión al servidor Socket.IO
/*const socket = io('http://localhost:3000');
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
// socket.on('user-connected', (userId) => {
  console.log(`Nuevo usuario conectado: ${userId}`);
  createPeerConnection(userId);
}); 
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
});*/

const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const roomIdInput = document.getElementById('roomIdInput');

let localStream;
let remoteStream;
let peerConnection;
let roomId;

const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ]
};

async function startVideo() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
    }
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(iceServers);

    peerConnection.onicecandidate = handleIceCandidate;
    peerConnection.ontrack = handleTrackEvent;
    peerConnection.onnegotiationneeded = handleNegotiationNeeded;

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
}

async function handleNegotiationNeeded() {
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('send-signal', { signal: { type: 'offer', sdp: offer.sdp }, target: roomId });
    } catch (error) {
        console.error('Error al crear la oferta:', error);
    }
}

function handleIceCandidate(event) {
    if (event.candidate) {
        socket.emit('send-signal', { signal: { type: 'candidate', candidate: event.candidate }, target: roomId });
    }
}

function handleTrackEvent(event) {
    if (event.streams && event.streams[0] && event.track.kind === 'video') {
        remoteVideo.srcObject = event.streams[0];
    }
}

function createRoom() {
    startVideo();
    socket.emit('create-room');
}

function joinRoom() {
    roomId = roomIdInput.value;
    if (roomId) {
        startVideo();
        socket.emit('join-room', roomId);
    } else {
        alert('Por favor, ingresa el ID de la sala.');
    }
}

socket.on('room-created', (newRoomId) => {
    roomId = newRoomId;
    console.log(`Sala creada con ID: ${roomId}`);
});

socket.on('joined-room', (joinedRoomId) => {
    roomId = joinedRoomId;
    createPeerConnection();
    console.log(`Te uniste a la sala: ${roomId}`);
});

socket.on('room-full', () => {
    alert('La sala está llena.');
});

socket.on('user-connected', async (userId) => {
    console.log('Usuario conectado:', userId);
    createPeerConnection();
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('send-signal', { signal: { type: 'offer', sdp: offer.sdp }, target: roomId });
    } catch (error) {
        console.error('Error al crear la oferta:', error);
    }
});

socket.on('signal', async (data) => {
    if (data.signal.type === 'offer') {
      console.log('Recibida oferta:', data.signal);
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('send-signal', { signal: { type: 'answer', sdp: answer.sdp }, target: data.sender });
      } catch (error) {
        console.error('Error al procesar la oferta:', error);
      }
    } else if (data.signal.type === 'answer') {
      console.log('Recibida respuesta:', data.signal);
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
      } catch (error) {
        console.error('Error al procesar la respuesta:', error);
      }
    } else if (data.signal.type === 'candidate') {
      console.log('Recibido candidato:', data.signal);
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
      } catch (error) {
        console.error('Error al agregar el candidato ICE:', error);
      }
    }
  });

socket.on('user-disconnected', (userId) => {
    console.log('Usuario desconectado:', userId);
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    remoteVideo.srcObject = null;
});

startVideo(); 