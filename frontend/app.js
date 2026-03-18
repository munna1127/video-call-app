// ✅ Backend URL (IMPORTANT)
const socket = io("https://video-call-backend-9o06.onrender.com");

// ✅ Room ID
const params = new URLSearchParams(window.location.search);
const roomId = params.get("room");

let localStream;
let peerConnection;

// ✅ STUN server
const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

// 🎥 Get user media
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    document.getElementById("localVideo").srcObject = stream;

    socket.emit("join-room", roomId);
  })
  .catch(err => {
    alert("Camera/Mic access denied ❌");
    console.error(err);
  });

// 🔥 When both users ready
socket.on("ready", () => {
  createPeer();

  peerConnection.createOffer()
    .then(offer => peerConnection.setLocalDescription(offer))
    .then(() => {
      socket.emit("offer", peerConnection.localDescription);
    });
});

// 📩 Receive offer
socket.on("offer", offer => {
  createPeer();

  peerConnection.setRemoteDescription(offer)
    .then(() => peerConnection.createAnswer())
    .then(answer => peerConnection.setLocalDescription(answer))
    .then(() => {
      socket.emit("answer", peerConnection.localDescription);
    });
});

// 📩 Receive answer
socket.on("answer", answer => {
  peerConnection.setRemoteDescription(answer);
});

// 📩 ICE candidate
socket.on("candidate", candidate => {
  if (candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

// ❌ Room full
socket.on("full", () => {
  alert("Room is full ❌ (only 2 users allowed)");
  window.location.href = "/";
});

// 🔧 Create peer connection
function createPeer() {
  peerConnection = new RTCPeerConnection(servers);

  // Send local tracks
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Receive remote stream
  peerConnection.ontrack = event => {
    document.getElementById("remoteVideo").srcObject = event.streams[0];
  };

  // Send ICE candidates
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("candidate", event.candidate);
    }
  };
}

// 🎤 Toggle audio
function toggleAudio() {
  const audioTrack = localStream.getAudioTracks()[0];
  audioTrack.enabled = !audioTrack.enabled;
}

// 📹 Toggle video
function toggleVideo() {
  const videoTrack = localStream.getVideoTracks()[0];
  videoTrack.enabled = !videoTrack.enabled;
          }
