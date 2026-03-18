const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let rooms = {};

io.on("connection", socket => {

  socket.on("join-room", roomId => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);

    if (rooms[roomId].length === 2) {
      io.to(roomId).emit("ready");
    }

    socket.on("offer", offer => {
      socket.to(roomId).emit("offer", offer);
    });

    socket.on("answer", answer => {
      socket.to(roomId).emit("answer", answer);
    });

    socket.on("candidate", candidate => {
      socket.to(roomId).emit("candidate", candidate);
    });

    socket.on("disconnect", () => {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
    });
  });

});

server.listen(3000, () => console.log("Server running"));
