const socket = io("https://video-call-backend-9o06.onrender.com");

const params = new URLSearchParams(window.location.search);
const roomId = params.get("room");

let localStream;
let peerConnection;

const servers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    document.getElementById("localVideo").srcObject = stream;

    socket.emit("join-room", roomId);
  })
  .catch(() => alert("Camera permission denied"));

socket.on("ready", () => {
  createPeer();

  peerConnection.createOffer()
    .then(o => peerConnection.setLocalDescription(o))
    .then(() => socket.emit("offer", peerConnection.localDescription));
});

socket.on("offer", offer => {
  createPeer();

  peerConnection.setRemoteDescription(offer)
    .then(() => peerConnection.createAnswer())
    .then(a => peerConnection.setLocalDescription(a))
    .then(() => socket.emit("answer", peerConnection.localDescription));
});

socket.on("answer", ans => {
  peerConnection.setRemoteDescription(ans);
});

socket.on("candidate", c => {
  if (c) peerConnection.addIceCandidate(new RTCIceCandidate(c));
});

socket.on("full", () => {
  alert("Room full");
  window.location.href = "/";
});

function createPeer() {
  peerConnection = new RTCPeerConnection(servers);

  localStream.getTracks().forEach(t => {
    peerConnection.addTrack(t, localStream);
  });

  peerConnection.ontrack = e => {
    document.getElementById("remoteVideo").srcObject = e.streams[0];
  };

  peerConnection.onicecandidate = e => {
    if (e.candidate) socket.emit("candidate", e.candidate);
  };
}

function toggleAudio() {
  const t = localStream.getAudioTracks()[0];
  t.enabled = !t.enabled;
}

function toggleVideo() {
  const t = localStream.getVideoTracks()[0];
  t.enabled = !t.enabled;
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href);
  alert("Link copied 🔥");
}
