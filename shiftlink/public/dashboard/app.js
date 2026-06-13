import {
  db,
  isConfigured,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "/shared/firebase.js";

const beaconsEl = document.getElementById("beacons");
const beaconCountEl = document.getElementById("beacon-count");
const alertsEl = document.getElementById("alerts");
const alertCountEl = document.getElementById("alert-count");
const jobsEl = document.getElementById("jobs");
const employersEl = document.getElementById("employers");

if (!isConfigured) {
  document.getElementById("setup-banner").hidden = false;
}

const state = {
  shifts: [],
  employers: {},
  jobs: [],
};

function toMillis(ts) {
  return ts?.toMillis ? ts.toMillis() : null;
}

function fmtRemaining(ms) {
  if (ms <= 0) return "OVERDUE";
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function renderBeacons() {
  const active = state.shifts.filter((s) => s.status === "active" || s.status === "overdue");
  beaconCountEl.textContent = `${active.length} active`;
  if (!active.length) {
    beaconsEl.innerHTML = '<p class="empty">No active shifts. Have a worker text START.</p>';
    return;
  }
  const now = Date.now();
  beaconsEl.innerHTML = active
    .map((s) => {
      const start = toMillis(s.checkedInAt) || now;
      const end = toMillis(s.expectedEnd) || now;
      const total = Math.max(end - start, 1);
      const elapsed = now - start;
      const frac = Math.min(Math.max(elapsed / total, 0), 1);
      const percent = Math.round(frac * 100);
      const remaining = end - now;
      const overdue = s.status === "overdue" || remaining <= 0;

      let color = "var(--teal)";
      if (overdue) color = "var(--red)";
      else if (frac > 0.85) color = "var(--red)";
      else if (frac > 0.5) color = "var(--amber)";

      return `
        <div class="beacon ${overdue ? "overdue" : ""}">
          <div class="ring" style="--p:${overdue ? 100 : percent}; --c:${color}">
            <span class="pulse" style="background:${color}; animation:${overdue ? "none" : "pulse 1.6s infinite"}"></span>
          </div>
          <div class="info">
            <div class="who">Worker ${s.workerId}</div>
            <div class="meta">${s.jobTitle || "Shift"} · ${s.employerName || ""}</div>
          </div>
          <div class="countdown" style="color:${color}">${overdue ? "OVERDUE" : fmtRemaining(remaining)}</div>
        </div>`;
    })
    .join("");
}

function renderJobs() {
  if (!state.jobs.length) {
    jobsEl.innerHTML = '<p class="empty">No jobs.</p>';
    return;
  }
  jobsEl.innerHTML = state.jobs
    .map((j) => {
      const emp = state.employers[j.employerId];
      const flagged = emp && emp.status === "flagged";
      let pill = j.status;
      let pillLabel = j.status;
      if (flagged && j.status === "open") {
        pill = "hidden";
        pillLabel = "hidden (flagged)";
      }
      return `
        <div class="job">
          <div>
            <div class="title">${j.title}</div>
            <div class="sub">${emp ? emp.name : "?"} · $${j.rate}/hr · ${j.start}-${j.end} · ${j.location}</div>
          </div>
          <span class="pill ${pill}">${pillLabel}</span>
        </div>`;
    })
    .join("");
}

function renderEmployers() {
  const list = Object.values(state.employers).sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0));
  employersEl.innerHTML = list
    .map((e) => {
      const stars = e.status === "pending" ? "Not yet rated" : `Trust ${e.trustScore?.toFixed(1) ?? "—"} / 5`;
      const action =
        e.status === "pending"
          ? `<button class="approve-btn" data-id="${e.id}">Approve</button>`
          : `<span class="badge-state ${e.status}">${
              e.status === "verified" ? "✓ Verified" : e.status === "flagged" ? "⚑ Flagged" : e.status
            }</span>`;
      return `
        <div class="employer ${e.status === "flagged" ? "flagged" : ""}">
          <div>
            <div class="name">${e.name}</div>
            <div class="score">${stars}${e.flagReason ? " · " + e.flagReason : ""}</div>
          </div>
          ${action}
        </div>`;
    })
    .join("");

  employersEl.querySelectorAll(".approve-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "…";
      await updateDoc(doc(db, "employers", btn.dataset.id), {
        status: "verified",
        trustScore: 4.0,
      });
    });
  });
}

function renderAlerts(alerts) {
  alertCountEl.textContent = alerts.length;
  if (!alerts.length) {
    alertsEl.innerHTML = '<p class="empty">All clear.</p>';
    return;
  }
  alertsEl.innerHTML = alerts
    .map(
      (a) => `
      <div class="alert ${a.severity === "high" ? "high" : ""}">
        <div class="type">${(a.type || "").replace(/_/g, " ")} · ${a.severity || ""}</div>
        <div class="note">${a.note || ""}</div>
      </div>`
    )
    .join("");
}

if (isConfigured && db) {
  // Beacons (active + overdue shifts)
  onSnapshot(
    query(collection(db, "shifts"), where("status", "in", ["active", "overdue", "accepted"])),
    (snap) => {
      state.shifts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderBeacons();
    }
  );

  // Alerts
  onSnapshot(collection(db, "alerts"), (snap) => {
    const alerts = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (toMillis(b.createdAt) || 0) - (toMillis(a.createdAt) || 0));
    renderAlerts(alerts);
  });

  // Employers
  onSnapshot(collection(db, "employers"), (snap) => {
    state.employers = {};
    snap.docs.forEach((d) => (state.employers[d.id] = { id: d.id, ...d.data() }));
    renderEmployers();
    renderJobs();
  });

  // Jobs
  onSnapshot(collection(db, "jobs"), (snap) => {
    state.jobs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderJobs();
  });

  // Tick the countdown rings every second.
  setInterval(renderBeacons, 1000);
}
