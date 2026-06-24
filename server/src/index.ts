import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import { Server, Socket } from "socket.io";
import { db, FieldValue } from "./db";

import authRoutes from "./routes/auth";
import messageRoutes from "./routes/messages";
import uploadRoutes from "./routes/upload";

const app = express();
const server = http.createServer(app);

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// Serve uploaded images
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);

// Upload route
app.use("/upload", uploadRoutes);

// ================= ROUTES =================
app.use("/auth", authRoutes);
app.use("/messages", messageRoutes);

// ================= TEST ROUTE =================
app.get("/", (_req, res) => {
  res.send("Server running 🚀");
});

// ================= SOCKET SERVER =================
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const onlineUsers: Record<string, string> = {};

export { io, onlineUsers };

io.on("connection", (socket: Socket) => {
  console.log("🟢 Connected:", socket.id);

  // USER ONLINE
  socket.on("user-online", async (userId: string) => {
    onlineUsers[userId] = socket.id;

    // Update last_seen in Firestore
    try {
      await db.collection("users").doc(userId).update({
        last_seen: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error("Error updating last_seen:", err);
    }

    io.emit("online-users", Object.keys(onlineUsers));
  });

  // ===================================
  // WEBRTC CALL SIGNALING EVENTS
  // ===================================

  // 1. Caller starts a call
  socket.on("call-user", (data: { userToCall: string; signalData: unknown; from: string; name: string; isVideo: boolean }) => {
    const receiverSocketId = onlineUsers[String(data.userToCall)];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incoming-call", {
        signal: data.signalData,
        from: data.from,
        name: data.name,
        isVideo: data.isVideo
      });
    }
  });

  // 2. Receiver clicks "Accept"
  socket.on("answer-call", (data: { to: string; signal: unknown }) => {
    const targetSocketId = onlineUsers[String(data.to)];
    if (targetSocketId) {
      io.to(targetSocketId).emit("call-accepted", data.signal);
    }
  });

  // 3. Exchange network ICE Candidates
  socket.on("ice-candidate", (data: { to: string; candidate: unknown }) => {
    const targetSocketId = onlineUsers[String(data.to)];
    if (targetSocketId) {
      io.to(targetSocketId).emit("ice-candidate", data.candidate);
    }
  });

  // 4. Either user terminates the channel
  socket.on("end-call", (data: { to: string }) => {
    const targetSocketId = onlineUsers[String(data.to)];
    if (targetSocketId) {
      io.to(targetSocketId).emit("call-ended");
    }
  });



  // TYPING
  socket.on("typing", (data: { receiverId: string; username: string }) => {
    const receiverSocketId = onlineUsers[String(data.receiverId)];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user-typing", data.username);
    }
  });

  // DISCONNECT
  socket.on("disconnect", async () => {
    console.log("🔴 Disconnected:", socket.id);

    for (const id in onlineUsers) {
      if (onlineUsers[id] === socket.id) {
        // Update last_seen in Firestore
        try {
          await db.collection("users").doc(id).update({
            last_seen: FieldValue.serverTimestamp(),
          });
        } catch (err) {
          console.error("Error updating last_seen on disconnect:", err);
        }
        delete onlineUsers[id];
        break;
      }
    }

    io.emit("online-users", Object.keys(onlineUsers));
    console.log("📌 Online Users:", Object.keys(onlineUsers));
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});