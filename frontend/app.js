// ==========================
// 🚀 VIDEO CALL APP (PRO)
// ==========================

const socket = io("https://video-call-backend-9o06.onrender.com");

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("room");

document.getElementById("roomId").innerText = roomId;

// --------------------------
// 🎥 VARIABLES
// --------------------------
const peers = {};
let localStream;

const videoContainer = document.getElementById("videoContainer");

// --------------------------
// 🔗 WEBRTC CONFIG
// --------------------------
const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
};

// --------------------------
// 🎥 GET USER MEDIA
// --------------------------
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {

    localStream = stream;

    // show own video
    addVideo(stream, "me");

    // join room
    socket.emit("join-room", roomId);

}).catch(err => {
    alert("Camera/Mic access denied");
});

// --------------------------
// ➕ ADD VIDEO
// --------------------------
function addVideo(stream, id) {
    let video = document.getElementById(id);

    if (!video) {
        video = document.createElement("video");
        video.id = id;
        video.autoplay = true;
        video.playsInline = true;
        videoContainer.appendChild(video);
    }

    video.srcObject = stream;
}

// --------------------------
// 🔗 CREATE PEER
// --------------------------
function createPeer(userId) {

    const peer = new RTCPeerConnection(config);

    peers[userId] = peer;

    // send tracks
    localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
    });

    // receive stream
    peer.ontrack = event => {
        addVideo(event.streams[0], userId);
    };

    // ICE
    peer.onicecandidate = event => {
        if (event.candidate) {
            socket.emit("ice-candidate", {
                target: userId,
                candidate: event.candidate
            });
        }
    };

    return peer;
}

// --------------------------
// 👥 EXISTING USERS
// --------------------------
socket.on("all-users", users => {

    users.forEach(userId => {

        const peer = createPeer(userId);

        peer.createOffer()
            .then(offer => peer.setLocalDescription(offer))
            .then(() => {
                socket.emit("offer", {
                    target: userId,
                    offer: peer.localDescription
                });
            });

    });

});

// --------------------------
// 👤 NEW USER JOINED
// --------------------------
socket.on("user-joined", userId => {
    createPeer(userId);
});

// --------------------------
// 📩 OFFER RECEIVED
// --------------------------
socket.on("offer", async ({ sender, offer }) => {

    const peer = createPeer(sender);

    await peer.setRemoteDescription(offer);

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socket.emit("answer", {
        target: sender,
        answer: peer.localDescription
    });

});

// --------------------------
// 📩 ANSWER RECEIVED
// --------------------------
socket.on("answer", async ({ sender, answer }) => {
    await peers[sender].setRemoteDescription(answer);
});

// --------------------------
// ❄️ ICE CANDIDATE
// --------------------------
socket.on("ice-candidate", async ({ sender, candidate }) => {
    try {
        await peers[sender].addIceCandidate(candidate);
    } catch (e) {
        console.error(e);
    }
});

// --------------------------
// ❌ USER LEFT
// --------------------------
socket.on("user-left", userId => {

    if (peers[userId]) {
        peers[userId].close();
        delete peers[userId];
    }

    const video = document.getElementById(userId);
    if (video) video.remove();
});

// --------------------------
// 🎤 MIC TOGGLE
// --------------------------
function toggleMic() {
    localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
    });
}

// --------------------------
// 📷 CAMERA TOGGLE
// --------------------------
function toggleCam() {
    localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
    });
}

// --------------------------
// 🖥️ SCREEN SHARE
// --------------------------
async function shareScreen() {

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
    });

    const screenTrack = screenStream.getVideoTracks()[0];

    for (let id in peers) {
        const sender = peers[id].getSenders().find(s => s.track.kind === "video");
        sender.replaceTrack(screenTrack);
    }

    screenTrack.onended = () => {
        const videoTrack = localStream.getVideoTracks()[0];

        for (let id in peers) {
            const sender = peers[id].getSenders().find(s => s.track.kind === "video");
            sender.replaceTrack(videoTrack);
        }
    };
}

// --------------------------
// 💬 CHAT
// --------------------------
function sendMsg() {
    const input = document.getElementById("msgInput");
    const msg = input.value;

    if (!msg) return;

    socket.emit("chat-message", msg);
    addMsg("Me: " + msg);

    input.value = "";
}

socket.on("chat-message", ({ sender, message }) => {
    addMsg(sender + ": " + message);
});

function addMsg(text) {
    const div = document.createElement("div");
    div.innerText = text;
    document.getElementById("chatBox").appendChild(div);
}

// --------------------------
// 📋 COPY ROOM
// --------------------------
function copyRoom() {
    navigator.clipboard.writeText(roomId);
    alert("Room copied!");
}

// --------------------------
// ❌ LEAVE CALL
// --------------------------
function leaveCall() {
    window.location.href = "index.html";
          }
