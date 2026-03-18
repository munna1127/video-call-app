const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

// ✅ Render compatible Socket.io
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);

    console.log(`User ${socket.id} joined room ${roomId}`);

    // ✅ Only allow 2 users
    if (rooms[roomId].length === 2) {
      io.to(roomId).emit("ready");
    }

    // ❌ Extra users block
    if (rooms[roomId].length > 2) {
      socket.emit("full");
      return;
    }

    // 🔁 signaling events
    socket.on("offer", (offer) => {
      socket.to(roomId).emit("offer", offer);
    });

    socket.on("answer", (answer) => {
      socket.to(roomId).emit("answer", answer);
    });

    socket.on("candidate", (candidate) => {
      socket.to(roomId).emit("candidate", candidate);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);

        // ✅ Clean empty room
        if (rooms[roomId].length === 0) {
          delete rooms[roomId];
        }
      }
    });
  });
});

// ✅ Health route (Render ke liye helpful)
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// ✅ IMPORTANT: Render dynamic port
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
