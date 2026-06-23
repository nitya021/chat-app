# 🔥 Firebase Setup Guide for E2EE Chat App

This guide will help you connect your chat application to Firebase Firestore (cloud NoSQL database).

---

## ✨ **Why Firebase?**
- ✅ Free NoSQL database in the cloud (Firestore)
- ✅ No local installation needed
- ✅ Automatic scaling
- ✅ Real-time data sync capabilities
- ✅ Easy to use Firebase Console
- ✅ Free tier: 1 GiB storage, 50K reads/day, 20K writes/day

---

## 📋 **Step-by-Step Setup**

### **Step 1: Create Firebase Account & Project**

1. Go to: **https://console.firebase.google.com**
2. Sign in with your **Google account**
3. Click **"Create a project"** (or "Add project")
4. Enter project name: `e2ee-chat-app` (or any name you like)
5. Disable Google Analytics (not needed for this app)
6. Click **"Create project"**

⏳ **Wait 30 seconds** for the project to be created...

---

### **Step 2: Enable Firestore Database**

1. In your Firebase project, click **"Build"** in the left sidebar
2. Click **"Firestore Database"**
3. Click **"Create database"**
4. Choose a location closest to you:
   - `us-east1` - for USA
   - `europe-west1` - for Europe
   - `asia-south1` - for India
5. Select **"Start in test mode"** (for development)
   - ⚠️ Test mode allows read/write access for 30 days
6. Click **"Enable"**

✅ **Firestore database created!**

---

### **Step 3: Generate Service Account Key**

This key allows your server to connect to Firebase securely.

1. In Firebase Console, click **⚙️ Settings** (gear icon) → **"Project settings"**
2. Click the **"Service accounts"** tab
3. Make sure **"Node.js"** is selected
4. Click **"Generate new private key"**
5. Click **"Generate key"** in the confirmation popup
6. A JSON file will be downloaded (e.g., `e2ee-chat-app-firebase-adminsdk-xxxxx.json`)

⚠️ **KEEP THIS FILE SECURE!** It contains your project credentials.

---

### **Step 4: Set Up Server Configuration**

1. **Copy** the downloaded JSON file to the `server/` directory
2. **Rename** it to `firebase-service-account.json`

   ```
   server/
   ├── firebase-service-account.json   ← Place it here
   ├── package.json
   ├── src/
   └── ...
   ```

3. **Verify** your `server/.env` file contains:

   ```env
   PORT=5000

   # === FIREBASE CONFIGURATION ===
   FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

   JWT_SECRET=supersecretkey
   ```

---

### **Step 5: Install Dependencies & Start**

```bash
cd server
npm install
npm run dev
```

---

### **Step 6: Verify Connection**

Check the server logs. You should see:

✅ **Success:**
```
🔥 Firebase Admin SDK initialized
📦 Project: your-project-id
DATABASE CONNECTED SUCCESSFULLY ✅ (Firebase Firestore)
🚀 Server running on port 5000
```

❌ **If you see an error:**
```
❌ Firebase service account key not found at: ...
```

**Check:**
- Is the `firebase-service-account.json` file in the `server/` directory?
- Is the filename correct in `.env`?
- Did you download the correct file from Firebase Console?

---

## 🎉 **You're All Set!**

Your app is now connected to Firebase Firestore!

### **Next Steps:**

1. Open the app: **http://localhost:5173**
2. Register a new user
3. Login
4. Start chatting!

---

## 🔍 **Verify in Firebase Console**

You can see your data in real-time:

1. Go to **Firebase Console** → **Firestore Database**
2. You'll see `users` and `messages` collections
3. After registering users, you'll see them in the `users` collection
4. After sending messages, you'll see them in the `messages` collection

### **Firestore Data Structure:**

```
📁 users (collection)
  📄 {userId} (document)
    ├── username: "john"
    ├── password_hash: "$2b$10$..."
    ├── last_seen: Timestamp
    └── created_at: Timestamp

📁 messages (collection)
  📄 {messageId} (document)
    ├── sender_id: "userId1"
    ├── receiver_id: "userId2"
    ├── encrypted_message: "Hello!"
    ├── is_read: false
    └── created_at: Timestamp
```

---

## 🔒 **Security Notes**

### ⚠️ **Important for Production:**

1. Switch Firestore rules from **test mode** to **production mode**
2. Add security rules to restrict access:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if false; // Server-side only access via Admin SDK
       }
     }
   }
   ```
   Since your app uses Firebase Admin SDK (server-side), these rules won't affect your server — they only block direct client access.

### 🔐 **Protect Your Credentials:**

- ✅ Never commit `firebase-service-account.json` to Git
- ✅ The `.gitignore` should include `firebase-service-account.json`
- ✅ Use environment variables in production
- ✅ Keep your service account key secret

---

## 📊 **Monitor Your Database**

### **Check Database Usage:**
1. Go to Firebase Console
2. Click **"Usage"** tab in Firestore
3. See reads, writes, storage used

### **Free Tier Limits (Spark Plan):**
- Storage: 1 GiB
- Document reads: 50,000/day
- Document writes: 20,000/day
- Document deletes: 20,000/day

This is **more than enough** for development and small apps!

---

## 🛠️ **Troubleshooting**

### **"Service account key not found"?**
- Verify the file path in `.env`
- Make sure the JSON file is in the `server/` directory
- Check filename matches exactly

### **"Permission denied"?**
- Make sure Firestore is in **test mode** for development
- Verify the service account has proper permissions

### **"Cannot connect to Firestore"?**
- Check your internet connection
- Verify the service account key is valid
- Try regenerating the key from Firebase Console

### **Server crashes on start?**
- Run `npm install` to ensure all dependencies are installed
- Check the service account JSON is valid (not corrupted)

---

## ✅ **Checklist**

Before you start:
- [ ] Firebase account created
- [ ] Firebase project created
- [ ] Firestore database enabled
- [ ] Service account key downloaded
- [ ] Key file placed in `server/` as `firebase-service-account.json`
- [ ] `server/.env` file updated
- [ ] Server started with `npm run dev`
- [ ] "DATABASE CONNECTED SUCCESSFULLY" message seen
- [ ] App tested at http://localhost:5173

---

## 🎊 **Success!**

You now have a cloud Firebase Firestore database connected to your chat app!

No local database installation, no SQL setup, just works! ✨

---

**Need Help?**
- Firebase Docs: https://firebase.google.com/docs
- Firestore Docs: https://firebase.google.com/docs/firestore

