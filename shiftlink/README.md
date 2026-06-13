# ShiftLink

An AI employment counselor that works on any phone — no app, no address, no resume required.

ShiftLink matches people to same-day local work through a plain-text chat with an AI dispatcher,
and runs a safety net (check-in/out beacons, hidden SOS, employer trust scores, digital pay stubs)
on an outreach/employer dashboard.

## Stack
- Vanilla HTML / CSS / JS frontend (no build step)
- Node + Express server (`server.js`) — serves the site, proxies OpenAI, scans for overdue shifts
- OpenAI API with function calling (the AI dispatcher)
- Firebase Firestore — real-time sync between the worker chat and the dashboard

## Architecture
```
Worker chat ── POST /api/chat ──> Express ── function calling ──> OpenAI
                                     │
                                     └── tool writes (admin SDK) ──> Firestore <── realtime ── Dashboard
```

---

## Setup (do this once)

### 1. Install dependencies
```bash
cd shiftlink
npm install
```

### 2. Add your OpenAI key
1. Create a key at https://platform.openai.com/api-keys
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and set:
   ```
   OPENAI_API_KEY=sk-...your key...
   ```

### 3. Create a Firebase project + Firestore
1. Go to https://console.firebase.google.com → **Add project**.
2. In the project, open **Build → Firestore Database → Create database** (start in **test mode** for the hackathon).

### 4. Add the Firebase **web** config (frontend)
1. Firebase Console → **Project Settings (gear) → General → Your apps → Web app (`</>`)**. Register an app if you haven't.
2. Copy the `firebaseConfig` values into **`public/shared/firebase.js`** (replace the `PASTE_...` placeholders):
   ```js
   export const firebaseConfig = {
     apiKey: "...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "...",
     appId: "...",
   };
   ```
   These values are safe to expose in client code.

### 5. Add the Firebase **service account** (server)
1. Firebase Console → **Project Settings → Service accounts → Generate new private key**.
2. Save the downloaded JSON as **`firebase/serviceAccount.json`**.
3. `.env` already points to it via `GOOGLE_APPLICATION_CREDENTIALS=./firebase/serviceAccount.json`.

   > `serviceAccount.json` and `.env` are gitignored — never commit them.

### 6. Seed demo data (once)
```bash
npm run seed
```
Creates demo employers (including one **flagged** and one **pending**), jobs, and a worker (`w1`).

### 7. Run
```bash
npm start
```
Open the printed URL (default http://localhost:3000):
- Landing: `/`
- Worker chat: `/worker/`
- Outreach dashboard: `/dashboard/`
- Employer signup: `/employer/signup.html`

For the live demo, open the worker chat and the dashboard side by side.

---

## Demo script (5 min)
1. **Hook:** "An AI counselor on any phone — no app, no address, no resume."
2. In the **worker chat**, type: `free today near downtown, can lift heavy stuff, need $15+/hr`
   → the AI finds a job and confirms it.
3. Confirm the job (e.g. `yes`), then text `START` → a **pulsing teal beacon** appears on the dashboard.
4. Wait ~2 minutes (or set `DEMO_SHIFT_MINUTES`) without texting `DONE` → the beacon turns **red** and an **overdue alert** fires.
5. Text `DONE` on another job → a **digital pay stub** is generated in the chat and at `/paystub.html`.
6. Show the **flagged employer** (QuickMove) whose jobs are hidden from the worker feed.
7. (Optional) Submit a new **employer signup** → see it appear as **Pending** on the dashboard → click **Approve** → becomes **✓ Verified**.

### Hidden SOS
Texting the keyword `REDBIRD` silently raises a high-severity alert on the dashboard without acknowledging it in chat.

---

## Configuration notes
- `OPENAI_MODEL` (default `gpt-4o-mini`) — change in `.env` to use a different model.
- `DEMO_SHIFT_MINUTES` (default `2`) — how long until a missed check-out is flagged overdue. Set it in `.env`.
- The overdue scanner runs every 5 seconds in `server.js`.

## What's intentionally simulated (real-world roadmap)
- Real SMS (Twilio short code / Lifeline carriers)
- Stripe escrow / pre-funded wages (shown as a "funds held" badge)
- Google Places business verification
- Phone OTP verification
- Native iOS app (this is a deployable web app instead)
