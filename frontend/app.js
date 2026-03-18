const socket = io("https://YOUR-BACKEND-URL.onrender.com");

const params = new URLSearchParams(window.location.search);
const roomId = params.get("room");

let localStream;
let peerConnection;

const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    document.getElementById("localVideo").srcObject = stream;

    socket.emit("join-room", roomId);
  });

socket.on("ready", () => {
  createPeer();

  peerConnection.createOffer()
    .then(offer => peerConnection.setLocalDescription(offer))
    .then(() => {
      socket.emit("offer", peerConnection.localDescription);
    });
});

socket.on("offer", offer => {
  createPeer();

  peerConnection.setRemoteDescription(offer)
    .then(() => peerConnection.createAnswer())
    .then(answer => peerConnection.setLocalDescription(answer))
    .then(() => {
      socket.emit("answer", peerConnection.localDescription);
    });
});

socket.on("answer", answer => {
  peerConnection.setRemoteDescription(answer);
});

socket.on("candidate", candidate => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

function createPeer() {
  peerConnection = new RTCPeerConnection(servers);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = event => {
    document.getElementById("remoteVideo").srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("candidate", event.candidate);
    }
  };
}

// 🎤 Controls
function toggleAudio() {
  localStream.getAudioTracks()[0].enabled =
    !localStream.getAudioTracks()[0].enabled;
}

function toggleVideo() {
  localStream.getVideoTracks()[0].enabled =
    !localStream.getVideoTracks()[0].enabled;
}
