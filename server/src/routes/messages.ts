import { Router } from "express";
import { db, FieldValue } from "../db";
import { verifyToken } from "../middleware/auth";
import { io, onlineUsers } from "../index";

const router = Router();

// ===========================
// SEND MESSAGE
// ===========================
router.post("/send", verifyToken, async (req: any, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, message } = req.body;

    const messageData = {
      sender_id: senderId,
      receiver_id: receiverId,
      encrypted_message: message,
      is_read: false,
      created_at: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("messages").add(messageData);

    // Get the saved document to return with server timestamp
    const savedDoc = await docRef.get();
    const savedData = savedDoc.data();

    const responseMessage = {
      id: docRef.id,
      sender_id: senderId,
      receiver_id: receiverId,
      encrypted_message: message,
      is_read: false,
      created_at: savedData?.created_at?.toDate?.() || new Date(),
    };

    const receiverSocketId = onlineUsers[String(receiverId)];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive-message", responseMessage);
    }

    res.json({
      success: true,
      message: "Message stored",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Failed to store message",
    });
  }
});

// ===========================
// GET CONVERSATION
// ===========================
router.get("/:userId", verifyToken, async (req: any, res) => {
  try {
    const myId = req.user.id;
    const otherUserId = req.params.userId;

    // Mark messages from other user as read
    const unreadMessages = await db
      .collection("messages")
      .where("sender_id", "==", otherUserId)
      .where("receiver_id", "==", myId)
      .where("is_read", "==", false)
      .get();

    const batch = db.batch();
    unreadMessages.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      batch.update(doc.ref, { is_read: true });
    });
    await batch.commit();

    // Get all messages between the two users
    // We need two queries since Firestore doesn't support OR conditions
    const sentMessages = await db
      .collection("messages")
      .where("sender_id", "==", myId)
      .where("receiver_id", "==", otherUserId)
      .get();

    const receivedMessages = await db
      .collection("messages")
      .where("sender_id", "==", otherUserId)
      .where("receiver_id", "==", myId)
      .get();

    // Merge and sort both query results
    const allMessages: any[] = [];

    sentMessages.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      allMessages.push({
        id: doc.id,
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        encrypted_message: data.encrypted_message,
        is_read: data.is_read,
        created_at: data.created_at?.toDate?.() || null,
      });
    });

    receivedMessages.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      allMessages.push({
        id: doc.id,
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        encrypted_message: data.encrypted_message,
        is_read: data.is_read,
        created_at: data.created_at?.toDate?.() || null,
      });
    });

    // Sort by created_at ascending
    allMessages.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });

    res.json({
      success: true,
      messages: allMessages,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      messages: [],
    });
  }
});

// ---------------------------
// MARK MESSAGES AS READ
// ---------------------------
router.put("/read/:userId", verifyToken, async (req: any, res) => {
  try {
    const myId = req.user.id;
    const otherUserId = req.params.userId;

    const unreadMessages = await db
      .collection("messages")
      .where("sender_id", "==", otherUserId)
      .where("receiver_id", "==", myId)
      .where("is_read", "==", false)
      .get();

    const batch = db.batch();
    unreadMessages.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      batch.update(doc.ref, { is_read: true });
    });
    await batch.commit();

    res.json({
      success: true,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
    });
  }
});

// ===========================
// UNREAD COUNTS
// ===========================
router.get("/unread/counts", verifyToken, async (req: any, res) => {
  try {
    const myId = req.user.id;

    const unreadMessages = await db
      .collection("messages")
      .where("receiver_id", "==", myId)
      .where("is_read", "==", false)
      .get();

    // Group by sender_id and count
    const countsMap: Record<string, number> = {};
    unreadMessages.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const senderId = doc.data().sender_id;
      countsMap[senderId] = (countsMap[senderId] || 0) + 1;
    });

    // Convert to array format matching the original PostgreSQL response
    const counts = Object.entries(countsMap).map(([sender_id, unread_count]) => ({
      sender_id,
      unread_count: String(unread_count),
    }));

    res.json({
      success: true,
      counts,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      counts: [],
    });
  }
});

export default router;