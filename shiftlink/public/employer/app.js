import {
  db,
  isConfigured,
  collection,
  addDoc,
  serverTimestamp,
} from "/shared/firebase.js";

const form = document.getElementById("form");
const submitBtn = document.getElementById("submit");
const resultEl = document.getElementById("result");

if (!isConfigured) {
  const note = document.createElement("div");
  note.className = "setup-note";
  note.textContent =
    "Firebase isn't configured — submissions won't be saved. Paste your web config into public/shared/firebase.js.";
  form.parentElement.insertBefore(note, form);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  submitBtn.disabled = true;
  submitBtn.textContent = "Creating…";

  try {
    if (isConfigured && db) {
      await addDoc(collection(db, "employers"), {
        name: data.name,
        phone: data.phone,
        address: data.address,
        trustScore: 0,
        status: "pending",
        completedJobs: 0,
        fundsHeld: false,
        agreedLiability: true,
        createdAt: serverTimestamp(),
      });
    }
    form.hidden = true;
    resultEl.hidden = false;
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create account";
    alert("Could not create account: " + (err?.message || err));
  }
});
