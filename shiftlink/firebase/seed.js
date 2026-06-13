// Seeds Firestore with demo employers, jobs, and a worker.
// Run once with: npm run seed
import { db } from "./admin.js";

const employers = [
  {
    id: "e1",
    name: "ABC Logistics",
    phone: "+15105550101",
    address: "500 Industrial Pkwy, Milpitas, CA",
    trustScore: 4.7,
    status: "verified",
    completedJobs: 42,
    fundsHeld: true,
  },
  {
    id: "e2",
    name: "GreenScape Landscaping",
    phone: "+15105550102",
    address: "88 Garden Ave, Milpitas, CA",
    trustScore: 4.3,
    status: "verified",
    completedJobs: 18,
    fundsHeld: true,
  },
  {
    id: "e3",
    name: "QuickMove Movers",
    phone: "+15105550103",
    address: "12 Transit Rd, Milpitas, CA",
    trustScore: 2.1,
    status: "flagged",
    completedJobs: 5,
    fundsHeld: false,
    flagReason: "Unresolved NOPAY reports",
  },
  {
    id: "e4",
    name: "Sunrise Events Co.",
    phone: "+15105550104",
    address: "240 Festival Blvd, Milpitas, CA",
    trustScore: 0,
    status: "pending",
    completedJobs: 0,
    fundsHeld: false,
  },
];

const jobs = [
  {
    id: "j1",
    title: "Warehouse unloading",
    employerId: "e1",
    rate: 18,
    start: "14:00",
    end: "18:00",
    durationHours: 4,
    location: "downtown",
    distanceMin: 10,
    skills: ["lifting", "heavy lifting", "warehouse"],
    status: "open",
  },
  {
    id: "j2",
    title: "Yard cleanup & hauling",
    employerId: "e2",
    rate: 16,
    start: "09:00",
    end: "13:00",
    durationHours: 4,
    location: "midtown",
    distanceMin: 20,
    skills: ["landscaping", "outdoor", "lifting"],
    status: "open",
  },
  {
    id: "j3",
    title: "Event setup crew",
    employerId: "e1",
    rate: 20,
    start: "15:00",
    end: "19:00",
    durationHours: 4,
    location: "downtown",
    distanceMin: 15,
    skills: ["lifting", "events", "setup"],
    status: "open",
  },
  {
    id: "j4",
    title: "Apartment move (4th floor)",
    employerId: "e3",
    rate: 22,
    start: "10:00",
    end: "14:00",
    durationHours: 4,
    location: "downtown",
    distanceMin: 8,
    skills: ["moving", "heavy lifting"],
    status: "open",
  },
];

const workers = [
  {
    id: "w1",
    phone: "+15105559001",
    verified: true,
    verifiedBy: "Downtown Outreach Center",
    streak: 3,
    location: "downtown",
    skills: ["lifting", "heavy lifting", "moving"],
    rating: 4.8,
  },
];

async function clearCollection(name) {
  const snap = await db.collection(name).get();
  const batch = db.batch();
  snap.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function seed() {
  console.log("[ShiftLink] Clearing existing demo data...");
  await Promise.all(
    ["employers", "jobs", "workers", "shifts", "alerts", "paystubs"].map(clearCollection)
  );

  console.log("[ShiftLink] Seeding employers...");
  for (const e of employers) {
    await db.collection("employers").doc(e.id).set(e);
  }

  console.log("[ShiftLink] Seeding jobs...");
  for (const j of jobs) {
    await db.collection("jobs").doc(j.id).set(j);
  }

  console.log("[ShiftLink] Seeding workers...");
  for (const w of workers) {
    await db.collection("workers").doc(w.id).set(w);
  }

  console.log("\n[ShiftLink] Seed complete.");
  console.log(`  ${employers.length} employers (1 flagged, 1 pending)`);
  console.log(`  ${jobs.length} jobs`);
  console.log(`  ${workers.length} worker (demo id: w1)`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("[ShiftLink] Seed failed:", err);
  process.exit(1);
});
