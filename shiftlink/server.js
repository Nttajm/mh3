import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db, FieldValue } from "./firebase/admin.js";
import { runChat } from "./lib/openai.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

if (!process.env.OPENAI_API_KEY) {
  console.warn("[ShiftLink] WARNING: OPENAI_API_KEY is not set. /api/chat will fail until you add it to .env.");
}

// Conversational AI dispatcher endpoint.
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, workerId } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }
    const ctx = { workerId: workerId || "w1" };
    const { reply } = await runChat(messages, ctx);
    res.json({ reply });
  } catch (err) {
    console.error("[ShiftLink] /api/chat error:", err?.message || err);
    res.status(500).json({ error: "AI dispatcher unavailable", detail: String(err?.message || err) });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Overdue check-out scanner: flips active shifts to overdue and raises an alert.
async function scanOverdueShifts() {
  try {
    const now = Date.now();
    const snap = await db.collection("shifts").where("status", "==", "active").get();
    for (const doc of snap.docs) {
      const s = doc.data();
      const end = s.expectedEnd?.toMillis ? s.expectedEnd.toMillis() : null;
      if (end && end < now) {
        await doc.ref.update({ status: "overdue" });
        await db.collection("alerts").add({
          type: "overdue_checkout",
          workerId: s.workerId,
          jobTitle: s.jobTitle || null,
          severity: "high",
          note: `No check-out received for ${s.jobTitle || "shift"}.`,
          createdAt: FieldValue.serverTimestamp(),
        });
        console.log(`[ShiftLink] Overdue shift flagged: ${doc.id}`);
      }
    }
  } catch (err) {
    console.error("[ShiftLink] overdue scan error:", err?.message || err);
  }
}

setInterval(scanOverdueShifts, 5000);

app.listen(PORT, () => {
  console.log(`\n[ShiftLink] Server running at http://localhost:${PORT}`);
  console.log("  Landing:   /");
  console.log("  Worker:    /worker/");
  console.log("  Dashboard: /dashboard/");
  console.log("  Employer:  /employer/signup.html\n");
});
