import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db, FieldValue } from "../db";
import { verifyToken } from "../middleware/auth";

const router = Router();

/**
 * REGISTER
 */

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password required",
      });
    }

    // Check if user already exists
    const existingUser = await db
      .collection("users")
      .where("username", "==", username)
      .get();

    if (!existingUser.empty) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into Firestore
    const userRef = await db.collection("users").add({
      username,
      password_hash: hashedPassword,
      last_seen: FieldValue.serverTimestamp(),
      created_at: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message: "User registered successfully",
      userId: userRef.id,
    });
  } catch (error: any) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error?.message || "Unknown error",
    });
  }
});

/**
 * LOGIN
 */

router.post("/login", async (req, res) => {
  console.log("LOGIN BODY:", req.body);
  try {
    const { username, password } = req.body;

    // Find user by username
    const snapshot = await db
      .collection("users")
      .where("username", "==", username)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const userDoc = snapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() } as any;

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1d",
      }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
    
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

/**
 * GET ALL USERS
 */

router.get("/users", verifyToken, async (_req, res) => {
  try {
    const usersSnapshot = await db.collection("users").get();

    const users = usersSnapshot.docs.map((userDoc) => {
      const userData = userDoc.data();
      return {
        id: userDoc.id,
        username: userData.username,
        last_seen: userData.last_seen?.toDate?.() || null,
        last_message: null,
      };
    });

    return res.json({
      success: true,
      users,
    });

  } catch (error) {
    console.error("USERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

/**
 * PROFILE
 */

router.get("/profile", verifyToken, (req, res) => {
  return res.json({
    success: true,
    user: (req as any).user,
  });
});

export default router;