# 🚀 Quick Start Guide

## ⚡ Current Status
- ✅ **Server is RUNNING** on http://localhost:5000
- ✅ **Client is RUNNING** on http://localhost:5173
- ⚠️ **Database connection FAILED** - PostgreSQL not installed/running

---

## 🔧 What Was Fixed

1. ✅ Installed client dependencies (`npm install`)
2. ✅ Installed missing `@types/pg` package
3. ✅ Fixed TypeScript type errors
4. ✅ Created `uploads/` folder for file storage
5. ✅ Created `client/.env` file with backend URL
6. ✅ Created database schema file (`server/database-schema.sql`)

---

## ⚠️ What You Need to Do

### 1. Install PostgreSQL

**Quick Install Options:**

**Option A - Using Chocolatey (if installed):**
```powershell
choco install postgresql
```

**Option B - Direct Download:**
1. Go to: https://www.postgresql.org/download/windows/
2. Download and run the installer
3. Use default settings:
   - Port: 5432
   - Username: postgres
   - Password: postgres (or remember your password)

### 2. Create the Database

**After PostgreSQL is installed:**

**Option A - Command Line:**
```bash
# Open Command Prompt or PowerShell
psql -U postgres -c "CREATE DATABASE e2ee;"
psql -U postgres -d e2ee -f server/database-schema.sql
```

**Option B - pgAdmin (GUI):**
1. Open pgAdmin (comes with PostgreSQL)
2. Connect to localhost server
3. Create new database named `e2ee`
4. Open Query Tool
5. Load and run `server/database-schema.sql`

### 3. Restart the Server

The server will automatically reconnect to the database once PostgreSQL is running.

---

## 🎯 Testing the App

Once PostgreSQL is set up:

1. **Open the app**: http://localhost:5173
2. **Register**: Create a test user
3. **Login**: Sign in with your credentials
4. **Test chat**: Open in 2 browsers to test real-time messaging
5. **Test calls**: Try audio/video calling features

---

## 📂 Project Structure

```
e2ee-chat-app-main/
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx     # Login page
│   │   │   └── Chat.tsx      # Main chat interface
│   │   ├── api/
│   │   │   └── axios.ts      # API configuration
│   │   ├── services/
│   │   │   └── socket.ts     # Socket.IO setup
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env                   # ✅ Created
│   └── package.json
│
├── server/                    # Node.js backend
│   ├── src/
│   │   ├── controllers/
│   │   │   └── authController.ts
│   │   ├── middleware/
│   │   │   └── auth.ts       # JWT verification
│   │   ├── routes/
│   │   │   ├── auth.ts       # Auth endpoints
│   │   │   ├── messages.ts   # Message endpoints
│   │   │   └── upload.ts     # File upload
│   │   ├── db.ts             # Database connection
│   │   └── index.ts          # Main server file
│   ├── uploads/               # ✅ Created - File storage
│   ├── .env                   # Database config
│   ├── database-schema.sql    # ✅ Created - DB schema
│   └── package.json
│
└── PROJECT-ANALYSIS.md        # ✅ Created - Full documentation
```

---

## 🔑 Default Credentials (from .env)

```
Database User: postgres
Database Password: postgres
Database Name: e2ee
Database Port: 5432
Server Port: 5000
JWT Secret: supersecretkey
```

**Note**: Change these in production!

---

## 🐛 Troubleshooting

### Database connection fails?
- Check if PostgreSQL service is running
- Verify credentials in `server/.env`
- Test connection: `psql -U postgres -d e2ee`

### Server won't start?
- Check if port 5000 is available
- Look for errors in the console
- Verify all dependencies: `npm install`

### Client won't start?
- Check if port 5173 is available
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check browser console for errors

### Can't send messages?
- Ensure database is set up correctly
- Check if both users are registered
- Verify Socket.IO connection in browser dev tools

---

## 🎉 You're All Set!

Once PostgreSQL is installed and the database is created, you'll have a fully functional end-to-end encrypted chat application with:

- ✨ Real-time messaging
- ✨ Audio/Video calls
- ✨ File sharing
- ✨ Emoji support
- ✨ Read receipts
- ✨ Online status
- ✨ And much more!

---

**Need Help?** Check `PROJECT-ANALYSIS.md` for detailed information.
