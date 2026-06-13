import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve the service account path relative to the project root if it's relative.
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./firebase/serviceAccount.json";
const resolvedPath = path.isAbsolute(credPath)
  ? credPath
  : path.resolve(__dirname, "..", credPath);

if (!fs.existsSync(resolvedPath)) {
  console.error(
    `\n[ShiftLink] Firebase service account not found at: ${resolvedPath}\n` +
      `Download it from Firebase Console > Project Settings > Service accounts > Generate new private key,\n` +
      `save it as firebase/serviceAccount.json, and set GOOGLE_APPLICATION_CREDENTIALS in your .env.\n`
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
export default admin;
