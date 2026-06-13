# ShiftLink — Full App Specification

## 1. Overview

ShiftLink is a same-day gig/day-labor matching platform designed for people who lack a smartphone, bank account, or permanent address — barriers that currently exclude many homeless individuals from the existing day-labor job market (construction, warehouse work, events, landscaping, moving, etc.).

The core interaction happens through a conversational AI dispatcher (text-based, modeled on SMS but built as a chat interface), removing the need for apps, resumes, accounts, or smartphones. Employers get access to a pool of available, verified, rated workers without needing to vet each person from scratch.

**Why it's novel:** Most "help the homeless" tech focuses on shelters, food, or document storage. Income/job access — specifically removing the address/smartphone/bank account barrier — is a largely unaddressed gap.

**Core framing for pitch:** "An AI employment counselor that works on any phone — no app, no address, no resume required." This is not a charity app; it's a labor-market efficiency tool that happens to remove the exact barriers this population faces.

---

## 2. The Core Feature: AI Dispatcher

A conversational AI (Claude API, using tool-use/function calling) acts as a personal employment counselor. The worker talks to it like a person, not a form.

**Example flow:**
- Worker: *"hey I'm near downtown, free today, can do heavy lifting, need at least $15/hr"*
- AI parses this, searches available jobs (tool call: `search_jobs(location, skills, min_rate)`), and responds: *"Found one — warehouse unloading, 2pm-6pm, $18/hr, 10 min walk from you. Want me to lock it in?"*
- Worker: *"yes"*
- AI confirms with employer (simulated), sends job details, location, and time.
- During the shift, AI proactively checks in: *"Hey, just checking — you good?"*
- If no response or a distress keyword is sent, AI auto-escalates to the outreach dashboard.
- At shift end, AI logs hours/rate/rating as a digital receipt.

**Why this works as the "wow" feature:** It reframes the whole product from "job board with a chatbot" to "AI counselor in your pocket." It's interactive and demoable live — judges can type into the chat themselves and watch it work. It also removes literacy/formatting barriers since there's no rigid command syntax.

**Build note for demo:** Use a typing indicator ("...") before AI responses — small effort, large perceived-intelligence payoff (same pattern as ChatGPT/Claude's own chat UI).

---

## 3. Safety & Trust Features

### 3.1 Check-in / Check-out system
- Worker texts "START" when arriving at a job, "DONE" when leaving.
- If "DONE" isn't received within a set window after the expected end time, the system auto-alerts a partner outreach organization's dashboard.
- This is simple to build and emotionally powerful in a demo.

### 3.2 Hidden SOS keyword
- A specific keyword silently triggers an alert without tipping off anyone nearby — similar to patterns used in domestic violence safety apps.

### 3.3 Trust score system (for employers)
- Every employer gets a score based on completed jobs, worker ratings, and reports.
- After each gig, the worker sends a 1-5 rating plus an optional keyword: "PAID", "NOPAY", or "UNSAFE".
- Employers with low scores or unresolved "NOPAY" reports get auto-hidden or flagged for manual review by a partner org before their listings go live.
- **Demo idea:** hardcode a few employer profiles with different scores and show a flagged one get filtered out of the job feed in real time — visual and effective.

### 3.4 Digital job receipts
- After a job, both employer and worker receive a timestamped record confirming hours worked and amount agreed/paid.
- Worker must text "ACCEPT [rate]" before starting work, creating a paper trail of the agreed rate up front.
- Prepaid card integration for actual payments can be mentioned as a "future roadmap" item (no need to build).

### 3.5 Identity verification without ID/address
- A partner shelter or outreach worker "vouches" for someone by issuing a one-time verification code tied to the worker's phone number — no name, address, or ID upload required.
- Employers see a "✓ Verified by [Partner Org]" badge, not personal details.
- Protects dignity while giving employers confidence. Also tells a "system integration" story — this connects to a broader support ecosystem rather than existing in isolation.

### 3.6 Liability acknowledgment
- When posting a job, employers must tap/text "AGREE" to a short liability/workers'-comp statement before the post goes live.
- Doesn't solve real legal liability but demonstrates awareness; full insurance partnerships framed as a real-world next step.

### 3.7 Dignity / non-disclosure by design
- The platform never asks "are you homeless" and never shares housing status with employers.
- Marketed simply as: "Same-day local work. No address or bank account needed." — framed as a general low-barrier gig platform that happens to remove the exact barriers this population faces, without singling anyone out.

### 3.8 SMS cost / access (partnership note, not a build item)
- Real-world deployment would integrate with Lifeline-eligible carriers or a toll-free SMS short code so texting the platform is free to the user.

---

## 4. Employer Side: Sign-Up & Anti-Fraud

**Sign-up requires:**
- Business name
- Phone number (OTP-verified — cuts out throwaway fake accounts)
- Business address (cross-checked against Google Places API to confirm a real business exists there)

**Tiered trust model:**
- New employer accounts start in **"Pending Review."** They cannot post jobs directly.
- First 1-2 job postings go through manual approval by a partner org (local workforce nonprofit, day-labor center, etc.).
- After a few successful jobs with good worker ratings, employer graduates to **"✓ Verified Employer"** and can post freely.
- This mirrors real vetting flows used by platforms like Wonolo/Instawork — a defensible answer if judges push on fraud prevention.

**Escrow / pre-fund requirement:**
- Before a job goes live, the employer pre-commits the agreed wage (simulated "funds held" badge in the demo, real Stripe hold in production).
- Solves two problems at once: deters scammers (who won't put real money down) AND guarantees the worker gets paid.

**Demo flow for this (~30 min to build):**
Signup form → "Pending Verification" badge → admin/partner-org view with an "Approve" button → badge changes to "✓ Verified Employer".

---

## 5. "Will Employers Actually Use This?" — Framing

ShiftLink isn't asking employers to do charity. Day-labor employers already hire people without checking housing status — they currently have almost no way to assess reliability for someone they've never met. ShiftLink's trust-score and verification system gives them that signal, making the platform useful on its own merits. The population being served happens to be the one currently excluded from this existing labor market due to logistical barriers (no phone, no address, no references), not lack of willingness to work.

Real-world go-to-market hooks: partnerships with existing day-labor centers/workforce nonprofits, and the Work Opportunity Tax Credit (employer tax incentive for hiring from certain disadvantaged groups).

---

## 6. Additional Two-Sided Features (for extra build time / pitch depth)

### 6.1 Digital pay stub / income history generator — HIGH PRIORITY
- Every completed job auto-generates a simple digital "pay stub" (date, hours, rate, employer name).
- These accumulate into an income history record.
- **Why it matters:** proof of income is often required for housing applications, and day-labor work normally leaves no paper trail. This feature directly connects "get a gig today" to "qualify for an apartment tomorrow" — ties the whole product back to the larger mission. Strong candidate for a "second wow" moment in the pitch since it's not obvious at first glance.

### 6.2 Reliability streaks that unlock better jobs
- Workers who consistently show up, check in/out properly, and get good ratings build a "streak."
- Higher streaks unlock access to higher-paying or specialized jobs first.
- Gives employers a way to find proven-reliable workers; gives workers a visible incentive ladder. Makes the trust-score system feel "alive."

### 6.3 No-show backup pool
- If a worker accepts a job but can't make it, the AI automatically pings a small pool of other nearby available, verified workers to fill the spot.
- Protects the employer's job from falling through; gives other workers last-minute opportunities.
- Good live-demo moment: "watch what happens when our first worker cancels."

### 6.4 Crew / group job matching
- For larger jobs ("need 4 people to unload a truck"), the AI assembles a small crew from verified workers (ideally people who've worked together before).
- Helps employers with bigger one-time needs; gives workers the safety/social benefit of arriving at a job site as a group rather than alone — ties back to safety goals.

### 6.5 Heat/weather safety alerts
- For outdoor jobs, AI proactively messages workers about extreme heat/cold with safety tips (water breaks, etc.) before/during a shift.
- Small build effort (weather API check); shows attention to worker wellbeing and reduces employer liability concerns.

**Build prioritization (given ~7 hours):** Digital pay stub is the best "second wow" — simple to build (just a formatted summary after each job), high narrative impact. Reliability streaks and no-show backup pool are good secondary features since they extend logic already being built (trust scores, job matching) without much extra time.

---

## 7. Design System & UI References

### Two-screen structure
The app has two distinct interfaces that should feel cohesive but visually contrasted:
- **Worker chat (warm, approachable):** rounded shapes, soft colors, friendly copy.
- **Outreach/Employer dashboard ("control room"):** sharper edges, darker background, data-forward.
- This contrast visually tells the story: one side is human and approachable, the other is the safety infrastructure working quietly behind it.

### Worker-facing chat
- Model closely on iMessage/WhatsApp: rounded bubbles, clear left/right sender distinction, muted timestamps, generous spacing.
- Wrap in a subtle phone-frame mockup so it visually communicates "this works on any phone."
- Add a brief "..." typing indicator before AI responses (modeled on ChatGPT/Claude's own chat UI) — cheap to build, big perceived-intelligence payoff.
- Familiar pattern = judges instantly understand the UI without explanation, so all attention goes to the AI's responses (the actual wow factor).

### Outreach/Employer dashboard
- Model on Uber's driver dashboard / Stripe dashboard / Linear issue board: status cards, clear iconography, color-coded states (available/active/completed), feed-like layout with real-time updates.
- Should feel like an "ops center" — a coordinator can glance and immediately understand who's working, who's overdue for check-out, and what jobs are open.
- Lots of whitespace, clear hierarchy, status badges rather than walls of text.

### Signature element: "Active Shift Beacons"
- Each active worker shown as a pulsing indicator with a countdown ring.
- Ring fills as the check-out deadline approaches; color shifts teal → amber → red if overdue, auto-triggering an alert.
- Inspired by Life360-style live status indicators, but simplified — no map needed, just a list of "active shifts" with this visual treatment.
- This is the feature that visualizes the safety net concept and should be a focal point of the dashboard demo.

---

## 8. Tech Stack & Deployment

**Recommendation: build as a PWA (Progressive Web App)** styled to look and feel like an iOS app.

Reasoning:
- A true native iOS app (Swift/SwiftUI, App Store) is not feasible in a hackathon timeframe — requires Xcode/Mac and App Store review (days, not hours).
- A PWA is genuinely deployable right now to a real URL (Vercel/Netlify, free, near-instant). Judges can open it on their own phones, and it can be "Added to Home Screen" to behave like an installed app — full-screen, no browser chrome, home-screen icon.
- This is what most winning hackathon "apps" actually are.

**Styling direction:**
- Worker view: mimic iOS Messages closely — rounded bubbles, iOS blue, system font, status bar mockup at top, feels like texting a contact named "ShiftLink."
- Dashboard: styled as a separate "app" within the same deployment — iOS-style cards, navigation bar, tab bar at bottom.

**Suggested stack:**
- Frontend: React + Tailwind (or vanilla JS/HTML/CSS for simplicity where it doesn't sacrifice polish)
- AI: Claude API with tool-use/function calling (job search, accept job, check-in/check-out, ratings)
- Real-time sync between worker chat and dashboard: Firebase/Supabase, or simple shared state with polling if time-constrained
- Deployment: Vercel or Netlify, connected to a GitHub repo for zero-config deploy

**Screens to build (priority order):**
1. Landing page — the pitch in visual form
2. Worker AI-dispatcher chat (the core "wow")
3. Outreach/Employer dashboard with trust scores + Active Shift Beacons
4. Employer signup flow with verification badge states (Pending → Verified) — can be a lighter "screen 3" if time is short

---

## 9. Live Demo Script

1. **Hook:** "An AI employment counselor that works on any phone — no app, no address, no resume required."
2. **Live interaction:** Type a worker message into the chat ("free today, near downtown, can lift heavy stuff, need $15+/hr") → AI finds and confirms a job conversationally.
3. **Check-in:** Worker texts "START" → dashboard shows a new Active Shift Beacon, pulsing teal.
4. **Safety escalation:** Simulate a missed check-out → beacon turns red → alert appears on the outreach dashboard.
5. **Trust score in action:** Show the system filtering out a flagged/low-trust employer from the job feed.
6. **(If built) Pay stub:** Show the digital pay stub generated after a completed job — tie back to "this builds toward housing eligibility."
7. **Close on impact framing:** Removes real barriers to an existing labor market, has a built-in safety net, and preserves worker dignity through non-disclosure-based verification.

---

## 10. Rubric Alignment Notes (Milpitas Hacks 2)

- **Innovation & Creativity:** Strong — this concept (SMS/chat-based, no-address/no-smartphone job matching for this population) does not appear to exist as a dedicated product.
- **Impact & Practicality:** Strong — addresses a real, documented access barrier; framing as "labor market efficiency tool" (not charity) makes it plausible as a real product.
- **Functionality & Usability:** Build as a polished interactive simulator (chat + dashboard), not literal SMS — live SMS demos are fragile and hard for judges to "play with."
- **Technical Complexity:** Claude API with tool-use, real-time sync between two views, trust-score logic that recalculates dynamically — hits "complicated but efficient stack" without overengineering.
- **Design & Presentation:** Two-screen demo narrative (worker texts in → dashboard lights up live) is visually compelling and easy to follow.
- **Relevance to Track:** Confirm the actual track/theme wording for Milpitas Hacks 2 and mirror its language explicitly in the pitch intro.
