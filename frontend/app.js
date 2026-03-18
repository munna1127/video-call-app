const socket = io("https://video-call-backend-9o06.onrender.com");

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
  })
  .catch(err => {
    alert("Camera/Mic access denied ❌");
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
  if (candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

socket.on("full", () => {
  alert("Room full ❌");
  window.location.href = "/";
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
  const audioTrack = localStream.getAudioTracks()[0];
  audioTrack.enabled = !audioTrack.enabled;
}

// 📹 Controls
function toggleVideo() {
  const videoTrack = localStream.getVideoTracks()[0];
  videoTrack.enabled = !videoTrack.enabled;
}

// 🔗 Copy link
function copyLink() {
  navigator.clipboard.writeText(window.location.href);
  alert("Link copied 🔥");
  }
