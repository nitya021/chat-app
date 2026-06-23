const { io } = require("socket.io-client");

// pass user id like: node socket-test.js 2
const USER_ID = process.argv[2];

if (!USER_ID) {
  console.log("❌ Usage: node socket-test.js <userId>");
  process.exit(1);
}

console.log("🚀 Client starting for user:", USER_ID);

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);

  // mark user online
  socket.emit("user-online", Number(USER_ID));

  // send test message after connection
  setTimeout(() => {
    const receiverId = Number(USER_ID) === 2 ? 3 : 2;

    socket.emit("send-message", {
      senderId: Number(USER_ID),
      receiverId: receiverId,
      message: `Hello from user ${USER_ID}`
    });

    console.log("📤 Message sent to:", receiverId);
  }, 1500);
});

// receive messages
socket.on("receive-message", (data) => {
  console.log("📩 Incoming message:", data);
});

// error handling
socket.on("connect_error", (err) => {
  console.log("❌ Connection error:", err.message);
});

socket.on("disconnect", () => {
  console.log("🔴 Disconnected from server");
});