import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue as AdminFieldValue } from "firebase-admin/firestore";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

// Load service account key
const serviceAccountPath = path.resolve(
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./firebase-service-account.json"
);

let isUsingMock = false;
let serviceAccount: any = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (serviceAccount.project_id === "dummy-chat-app") {
      isUsingMock = true;
    }
  } catch (err) {
    isUsingMock = true;
  }
} else if (fs.existsSync(serviceAccountPath)) {
  try {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
    if (serviceAccount.project_id === "dummy-chat-app") {
      isUsingMock = true;
    }
  } catch (err) {
    isUsingMock = true;
  }
} else {
  isUsingMock = true;
}

// -------------------------------------------------------------
// MOCK FIRESTORE DB IMPLEMENTATION FOR OFFLINE/LOCAL MODE
// -------------------------------------------------------------
const MOCK_DB_PATH = path.resolve(__dirname, "../../mock-db.json");

interface MockDbData {
  users: Record<string, any>;
  messages: Record<string, any>;
  [key: string]: Record<string, any>;
}

function loadMockDb(): MockDbData {
  if (!fs.existsSync(MOCK_DB_PATH)) {
    const defaultDb = { users: {}, messages: {} };
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(defaultDb, null, 2), "utf8");
    return defaultDb;
  }
  try {
    return JSON.parse(fs.readFileSync(MOCK_DB_PATH, "utf8"));
  } catch (err) {
    return { users: {}, messages: {} };
  }
}

function saveMockDb(data: MockDbData) {
  fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

function wrapTimestamps(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  const copy = { ...obj };
  for (const key in copy) {
    const val = copy[key];
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      const date = new Date(val);
      copy[key] = {
        toDate: () => date,
        toString: () => val
      };
    }
  }
  return copy;
}

function convertTimestampFields(data: any): any {
  if (!data) return data;
  const processed = { ...data };
  for (const key in processed) {
    if (processed[key] && processed[key]._mockServerTimestamp) {
      processed[key] = new Date().toISOString();
    }
  }
  return processed;
}

class MockDocSnapshot {
  constructor(public collectionName: string, public id: string, private dataObj: any) {}
  
  data() {
    return wrapTimestamps(this.dataObj);
  }

  get ref() {
    return new MockDocReference(this.collectionName, this.id);
  }
}

class MockQuerySnapshot {
  constructor(public docs: MockDocSnapshot[]) {}
  get empty() {
    return this.docs.length === 0;
  }
}

class MockDocReference {
  constructor(public collectionName: string, public id: string) {}

  async get() {
    const dbData = loadMockDb();
    const col = dbData[this.collectionName] || {};
    const docData = col[this.id];
    return new MockDocSnapshot(this.collectionName, this.id, docData || null);
  }

  async update(newData: any) {
    const dbData = loadMockDb();
    const col = dbData[this.collectionName] || {};
    if (!col[this.id]) col[this.id] = {};
    Object.assign(col[this.id], convertTimestampFields(newData));
    saveMockDb(dbData);
  }

  async set(newData: any) {
    const dbData = loadMockDb();
    if (!dbData[this.collectionName]) {
      dbData[this.collectionName] = {};
    }
    dbData[this.collectionName][this.id] = { id: this.id, ...convertTimestampFields(newData) };
    saveMockDb(dbData);
  }
}

class MockQuery {
  private filters: Array<{ field: string; op: string; value: any }> = [];

  constructor(protected collectionName: string) {}

  where(field: string, op: string, value: any) {
    this.filters.push({ field, op, value });
    return this;
  }

  async get() {
    const dbData = loadMockDb();
    const col = dbData[this.collectionName] || {};
    let docs = Object.values(col);

    for (const filter of this.filters) {
      docs = docs.filter((doc: any) => {
        const val = doc[filter.field];
        if (filter.op === "==") {
          return val === filter.value;
        }
        return true;
      });
    }

    const docSnapshots = docs.map((doc: any) => new MockDocSnapshot(this.collectionName, doc.id, doc));
    return new MockQuerySnapshot(docSnapshots);
  }
}

class MockCollectionReference extends MockQuery {
  constructor(colName: string) {
    super(colName);
  }

  doc(id: string) {
    return new MockDocReference(this.collectionName, id);
  }

  async add(data: any) {
    const dbData = loadMockDb();
    const id = Math.random().toString(36).substring(2, 15);
    if (!dbData[this.collectionName]) {
      dbData[this.collectionName] = {};
    }
    const processedData = {
      id,
      ...convertTimestampFields(data)
    };
    dbData[this.collectionName][id] = processedData;
    saveMockDb(dbData);

    return new MockDocReference(this.collectionName, id);
  }
}

class MockWriteBatch {
  private operations: Array<() => void> = [];

  update(docRef: any, data: any) {
    this.operations.push(() => {
      const dbData = loadMockDb();
      const colName = docRef.collectionName;
      const col = dbData[colName] || {};
      if (col[docRef.id]) {
        Object.assign(col[docRef.id], convertTimestampFields(data));
        saveMockDb(dbData);
      }
    });
  }

  async commit() {
    for (const op of this.operations) {
      op();
    }
  }
}

class MockFirestore {
  collection(name: string) {
    return new MockCollectionReference(name);
  }

  batch() {
    return new MockWriteBatch();
  }
}

// -------------------------------------------------------------
// EXPORTS CONFIGURATION
// -------------------------------------------------------------
export let db: any;
export let FieldValue: any;

if (isUsingMock) {
  console.log("⚠️ USING LOCAL MOCK DATABASE FALLBACK (Offline Mode)");
  db = new MockFirestore();
  FieldValue = {
    serverTimestamp: () => ({ _mockServerTimestamp: true })
  };
  
  // Test Mock connection
  db.collection("_health_check")
    .doc("ping")
    .set({ timestamp: FieldValue.serverTimestamp() })
    .then(() => {
      console.log("DATABASE CONNECTED SUCCESSFULLY ✅ (Offline Local Mock DB)");
    });
} else {
  // Initialize Firebase Admin SDK
  initializeApp({
    credential: cert(serviceAccount),
  });

  db = getFirestore();
  FieldValue = AdminFieldValue;

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
}