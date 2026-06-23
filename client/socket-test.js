const { io } = require("socket.io-client");

const USER_ID = process.argv[2];

if (!USER_ID) {
  console.log("❌ Usage: node socket-test.js <userId>");
  process.exit(1);
}

console.log("🚀 Client starting for user:", USER_ID);

const socket = io("http://localhost:5000");

// CONNECT
socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);

  socket.emit("user-online", Number(USER_ID));

  // auto send message after 2 sec
  setTimeout(() => {
    const receiverId = Number(USER_ID) === 2 ? 3 : 2;

    socket.emit("send-message", {
      senderId: Number(USER_ID),
      receiverId,
      message: "Hello from user " + USER_ID,
    });

    console.log("📤 Message sent to:", receiverId);
  }, 2000);
});

// RECEIVE MESSAGE
socket.on("receive-message", (data) => {
  console.log("📩 Incoming:", data);

  // 👁 simulate "seen" after 2 seconds
  setTimeout(() => {
    socket.emit("message-seen", data.id);
    console.log("👁 Seen & deleted:", data.id);
  }, 2000);
});

// ERROR HANDLING
socket.on("connect_error", (err) => {
  console.log("❌ Connection error:", err.message);
});