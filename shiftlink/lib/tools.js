// Tool (function-calling) schemas + handlers. Handlers read/write Firestore.
import { db, FieldValue, Timestamp } from "../firebase/admin.js";

// Demo: how long a shift "lasts" before check-out is expected, in minutes.
// Kept short so the missed-checkout escalation is demoable live.
const DEMO_SHIFT_MINUTES = Number(process.env.DEMO_SHIFT_MINUTES || 2);

// ---- OpenAI tool schemas ----
export const toolSchemas = [
  {
    type: "function",
    function: {
      name: "search_jobs",
      description:
        "Find open same-day jobs that match the worker's location, skills, and minimum pay rate. Only returns jobs from employers in good standing.",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "Worker's area, e.g. 'downtown'." },
          skills: {
            type: "array",
            items: { type: "string" },
            description: "Skills/abilities the worker mentioned, e.g. ['lifting'].",
          },
          min_rate: { type: "number", description: "Minimum hourly rate the worker wants." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "accept_job",
      description:
        "Lock in a job for the worker once they confirm. Records the agreed hourly rate (creates the paper trail). Call only after the worker says yes.",
      parameters: {
        type: "object",
        properties: {
          job_id: { type: "string" },
          agreed_rate: { type: "number", description: "The hourly rate the worker agreed to." },
        },
        required: ["job_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_in",
      description: "Mark the worker as arrived/started on their accepted job. Triggered when the worker says START or that they have arrived.",
      parameters: {
        type: "object",
        properties: { job_id: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_out",
      description: "Mark the worker as finished. Triggered when the worker says DONE or that they have left. Generates a digital pay stub.",
      parameters: {
        type: "object",
        properties: { job_id: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_rating",
      description: "Record the worker's rating of the employer after a job, with an optional keyword.",
      parameters: {
        type: "object",
        properties: {
          employer_id: { type: "string" },
          score: { type: "number", description: "1-5 rating." },
          keyword: { type: "string", enum: ["PAID", "NOPAY", "UNSAFE"], description: "Optional status keyword." },
        },
        required: ["score"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trigger_sos",
      description:
        "Silently raise a high-severity safety alert to the outreach dashboard. Use ONLY if the worker sends the hidden SOS keyword 'REDBIRD' or clearly signals danger. Do not announce that an alert was sent.",
      parameters: {
        type: "object",
        properties: {
          note: { type: "string", description: "Optional short context for outreach staff." },
        },
      },
    },
  },
];

// ---- helpers ----
async function getEmployer(id) {
  const doc = await db.collection("employers").doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function findActiveShift(workerId, jobId) {
  let q = db.collection("shifts").where("workerId", "==", workerId);
  if (jobId) q = q.where("jobId", "==", jobId);
  const snap = await q.get();
  // Prefer the most recent non-completed shift.
  const shifts = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => s.status !== "completed");
  return shifts[0] || null;
}

// ---- handlers ----
export async function executeTool(name, args, ctx) {
  const workerId = ctx.workerId;

  switch (name) {
    case "search_jobs": {
      const snap = await db.collection("jobs").where("status", "==", "open").get();
      const results = [];
      for (const doc of snap.docs) {
        const job = { id: doc.id, ...doc.data() };
        const employer = await getEmployer(job.employerId);
        // Trust filter: hide jobs from flagged employers entirely.
        if (!employer || employer.status === "flagged") continue;
        if (args.min_rate && job.rate < args.min_rate) continue;
        if (args.skills && args.skills.length) {
          const wants = args.skills.map((s) => s.toLowerCase());
          const has = (job.skills || []).map((s) => s.toLowerCase());
          const overlap = wants.some((w) => has.some((h) => h.includes(w) || w.includes(h)));
          if (!overlap) continue;
        }
        results.push({
          job_id: job.id,
          title: job.title,
          rate: job.rate,
          start: job.start,
          end: job.end,
          location: job.location,
          distance_min: job.distanceMin,
          employer: employer.name,
          employer_verified: employer.status === "verified",
          funds_held: employer.fundsHeld === true,
        });
      }
      return { count: results.length, jobs: results };
    }

    case "accept_job": {
      const jobRef = db.collection("jobs").doc(args.job_id);
      const jobDoc = await jobRef.get();
      if (!jobDoc.exists) return { ok: false, error: "Job not found." };
      const job = { id: jobDoc.id, ...jobDoc.data() };
      const employer = await getEmployer(job.employerId);
      if (employer?.status === "flagged") {
        return { ok: false, error: "This employer is flagged and unavailable." };
      }
      const agreedRate = args.agreed_rate || job.rate;
      await jobRef.update({ status: "filled", workerId });
      const shiftRef = await db.collection("shifts").add({
        workerId,
        jobId: job.id,
        jobTitle: job.title,
        employerId: job.employerId,
        employerName: employer?.name || "Unknown",
        agreedRate,
        durationHours: job.durationHours,
        status: "accepted",
        createdAt: FieldValue.serverTimestamp(),
      });
      return {
        ok: true,
        shift_id: shiftRef.id,
        job: { title: job.title, start: job.start, end: job.end, location: job.location },
        agreed_rate: agreedRate,
        employer: employer?.name,
        message: "Job locked in. Text START when you arrive.",
      };
    }

    case "check_in": {
      const shift = await findActiveShift(workerId, args.job_id);
      if (!shift) return { ok: false, error: "No accepted job found to check in to." };
      const now = Date.now();
      const expectedEnd = Timestamp.fromMillis(now + DEMO_SHIFT_MINUTES * 60 * 1000);
      await db.collection("shifts").doc(shift.id).update({
        status: "active",
        checkedInAt: FieldValue.serverTimestamp(),
        expectedEnd,
      });
      return {
        ok: true,
        message: "Checked in. Stay safe out there — text DONE when you finish.",
        job_title: shift.jobTitle,
      };
    }

    case "check_out": {
      const shift = await findActiveShift(workerId, args.job_id);
      if (!shift) return { ok: false, error: "No active shift found to check out from." };
      const hours = shift.durationHours || 4;
      const rate = shift.agreedRate || 0;
      await db.collection("shifts").doc(shift.id).update({
        status: "completed",
        checkedOutAt: FieldValue.serverTimestamp(),
      });
      if (shift.jobId) {
        await db.collection("jobs").doc(shift.jobId).update({ status: "completed" });
      }
      // Build the digital pay stub.
      const stubRef = await db.collection("paystubs").add({
        workerId,
        jobId: shift.jobId,
        jobTitle: shift.jobTitle,
        employerName: shift.employerName,
        hours,
        rate,
        total: hours * rate,
        date: new Date().toISOString().slice(0, 10),
        createdAt: FieldValue.serverTimestamp(),
      });
      // Reward reliability streak.
      await db.collection("workers").doc(workerId).set(
        { streak: FieldValue.increment(1) },
        { merge: true }
      );
      return {
        ok: true,
        message: "Checked out and pay stub generated.",
        paystub_id: stubRef.id,
        paystub: {
          job: shift.jobTitle,
          employer: shift.employerName,
          hours,
          rate,
          total: hours * rate,
        },
      };
    }

    case "submit_rating": {
      if (!args.employer_id) return { ok: false, error: "employer_id required." };
      const ref = db.collection("employers").doc(args.employer_id);
      const doc = await ref.get();
      if (!doc.exists) return { ok: false, error: "Employer not found." };
      const e = doc.data();
      const prevCount = e.ratingCount || e.completedJobs || 1;
      const prevScore = e.trustScore || 0;
      const newScore = (prevScore * prevCount + args.score) / (prevCount + 1);
      const update = {
        trustScore: Math.round(newScore * 10) / 10,
        ratingCount: prevCount + 1,
      };
      // NOPAY / UNSAFE or a low average flags the employer for manual review.
      if (args.keyword === "NOPAY" || args.keyword === "UNSAFE" || newScore < 2.5) {
        update.status = "flagged";
        update.flagReason = args.keyword || "Low average rating";
        await db.collection("alerts").add({
          type: "employer_flagged",
          employerId: args.employer_id,
          severity: "medium",
          note: `${e.name} flagged (${update.flagReason})`,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      await ref.update(update);
      return { ok: true, new_trust_score: update.trustScore, flagged: update.status === "flagged" };
    }

    case "trigger_sos": {
      await db.collection("alerts").add({
        type: "sos",
        workerId,
        severity: "high",
        note: args.note || "Hidden SOS keyword received.",
        createdAt: FieldValue.serverTimestamp(),
      });
      // Intentionally vague so nobody nearby is tipped off.
      return { ok: true, silent: true };
    }

    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}
