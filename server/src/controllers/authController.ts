import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db, FieldValue } from "../db";

// ======================
// REGISTER USER
// ======================
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // check if user exists by email
    const existingUser = await db
      .collection("users")
      .where("email", "==", email)
      .get();

    if (!existingUser.empty) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // insert user into Firestore
    const userRef = await db.collection("users").add({
      username,
      email,
      password_hash: hashedPassword,
      last_seen: FieldValue.serverTimestamp(),
      created_at: FieldValue.serverTimestamp(),
    });

    // Get the saved user data
    const savedDoc = await userRef.get();
    const savedData = savedDoc.data();

    res.json({
      success: true,
      user: {
        id: userRef.id,
        username: savedData?.username,
        email: savedData?.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

// ======================
// LOGIN USER
// ======================
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // find user by username
    const snapshot = await db
      .collection("users")
      .where("username", "==", username)
      .get();

    if (snapshot.empty) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const userDoc = snapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() } as any;

    // compare password with hashed password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // create token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};