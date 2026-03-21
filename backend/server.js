// ==========================
// 🚀 VIDEO CALL SERVER (PRO)
// ==========================

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// --------------------------
// ⚙️ CONFIG
// --------------------------
const PORT = process.env.PORT || 3000;

// --------------------------
// 🚀 INIT APP
// --------------------------
const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --------------------------
// 🧠 DATA STRUCTURE
// --------------------------

// roomId => [socketIds]
const rooms = {};

// socketId => roomId
const socketToRoom = {};

// --------------------------
// 🔌 SOCKET CONNECTION
// --------------------------
io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    // ==========================
    // JOIN ROOM
    // ==========================
    socket.on("join-room", (roomId) => {

        console.log(`User ${socket.id} joining room ${roomId}`);

        // create room if not exists
        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }

        // add user
        rooms[roomId].push(socket.id);
        socketToRoom[socket.id] = roomId;

        socket.join(roomId);

        // send existing users to new user
        const otherUsers = rooms[roomId].filter(id => id !== socket.id);
        socket.emit("all-users", otherUsers);

        // notify others
        socket.to(roomId).emit("user-joined", socket.id);
    });

    // ==========================
    // OFFER
    // ==========================
    socket.on("offer", ({ target, offer }) => {
        io.to(target).emit("offer", {
            sender: socket.id,
            offer
        });
    });

    // ==========================
    // ANSWER
    // ==========================
    socket.on("answer", ({ target, answer }) => {
        io.to(target).emit("answer", {
            sender: socket.id,
            answer
        });
    });

    // ==========================
    // ICE CANDIDATE
    // ==========================
    socket.on("ice-candidate", ({ target, candidate }) => {
        io.to(target).emit("ice-candidate", {
            sender: socket.id,
            candidate
        });
    });

    // ==========================
    // CHAT MESSAGE
    // ==========================
    socket.on("chat-message", (message) => {
        const roomId = socketToRoom[socket.id];
        if (roomId) {
            socket.to(roomId).emit("chat-message", {
                sender: socket.id,
                message
            });
        }
    });

    // ==========================
    // DISCONNECT
    // ==========================
    socket.on("disconnect", () => {

        console.log("User disconnected:", socket.id);

        const roomId = socketToRoom[socket.id];

        if (roomId && rooms[roomId]) {

            // remove user
            rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);

            // notify others
            socket.to(roomId).emit("user-left", socket.id);

            // delete room if empty
            if (rooms[roomId].length === 0) {
                delete rooms[roomId];
            }
        }

        delete socketToRoom[socket.id];
    });

});

// --------------------------
// 🌐 HEALTH ROUTE
// --------------------------
app.get("/", (req, res) => {
    res.send("🚀 Video Call Server Running");
});

// --------------------------
// ▶️ START SERVER
// --------------------------
server.listen(PORT, () => {
    console.log(`🔥 Server running on port ${PORT}`);
});
