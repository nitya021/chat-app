import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

// Load service account key
const serviceAccountPath = path.resolve(
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./firebase-service-account.json"
);

if (!fs.existsSync(serviceAccountPath)) {
  console.error(
    "❌ Firebase service account key not found at:",
    serviceAccountPath
  );
  console.error(
    "📄 Please download it from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key"
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

// Initialize Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount),
});

// Export Firestore instance
export const db = getFirestore();

console.log("🔥 Firebase Admin SDK initialized");
console.log("📦 Project:", serviceAccount.project_id);

// Test Firestore connection
db.collection("_health_check")
  .doc("ping")
  .set({ timestamp: FieldValue.serverTimestamp() })
  .then(() => {
    console.log("DATABASE CONNECTED SUCCESSFULLY ✅ (Firebase Firestore)");
  })
  .catch((err: Error) => {
    console.error("DATABASE CONNECTION ERROR:", err);
  });

export { FieldValue };