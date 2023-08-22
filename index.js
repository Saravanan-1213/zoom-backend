import express from "express";
import * as http from "http";
import { Server } from "socket.io";
import cors from "cors";
import * as path from "path";
import * as dotenv from "dotenv";
// import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import { userRouter } from "./routes/users.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["Get", "post"],
  },
});

const parties = [];

app.use(express.json());
app.use(cors());
dotenv.config({ path: "./.env" });
app.use("/auth", userRouter);

// const client = new MongoClient(MONGO_URL); // dial
// await client.connect(); // calling
// console.log("Mongo is Connected");

const PORT = process.env.PORT;
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

io.on("connection", (socket) => {
  // sending the meeting code
  socket.on("me", (data) => {
    socket.emit("getid", data);
  });

  // on user join the meething room
  socket.on("join", (room, id, name) => {
    socket.join(room);

    if (!parties.includes(id)) {
      parties.push({ id, name });
    }

    // for chacking how many users are there in meeting
    const size = io.sockets.adapter.rooms.get(room).size;
    // console.log(size)

    // sending the user id to other users to make the call
    socket.broadcast.to(room).emit("user-connect", id, size, name);

    // tell the name to other
    socket.on("tellname", (name, id) => {
      socket.broadcast.to(room).emit("addname", name, id);
    });

    // disconnect event
    socket.on("disconnect", () => {
      const index = parties.findIndex((peer) => (peer.id = id));
      if (index > -1) {
        // only splice array when item is found
        parties.splice(index, 1); // 2nd parameter means remove one item only
      }
      socket.broadcast.to(room).emit("user-disconnected", id);
    });
  });

  // user leave the meeting
  socket.on("user-left", (id, room) => {
    socket.leave(room);
    socket.disconnect();
    socket.broadcast.to(room).emit("user-disconnected", id);
  });
});

const __dirname1 = path.resolve();

if (process.env.Node_env === "production") {
  app.use(express.static(path.join(__dirname1)));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname1));
  });
} else {
  app.get("/", (req, res) => {
    res.send("welcome");
  });
}

app.listen(PORT, () => console.log("Server started", PORT));
