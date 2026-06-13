import {
  db,
  isConfigured,
  collection,
  query,
  where,
  onSnapshot,
} from "/shared/firebase.js";

const WORKER_ID = "w1";
const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");

// Conversation history sent to the AI (text only).
const history = [];
const renderedStubs = new Set();

function scrollDown() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addBubble(text, who) {
  const row = document.createElement("div");
  row.className = `row ${who}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  row.appendChild(bubble);
  messagesEl.appendChild(row);
  scrollDown();
  return row;
}

function showTyping() {
  const row = document.createElement("div");
  row.className = "row them typing";
  row.id = "typing";
  row.innerHTML =
    '<div class="bubble"><span class="dots"><span></span><span></span><span></span></span></div>';
  messagesEl.appendChild(row);
  scrollDown();
}

function hideTyping() {
  document.getElementById("typing")?.remove();
}

function addStubCard(stub) {
  const row = document.createElement("div");
  row.className = "row them";
  const card = document.createElement("div");
  card.className = "stub";
  card.innerHTML = `
    <h4>Digital pay stub</h4>
    <div class="total">$${stub.total}</div>
    <div class="line"><span>${stub.jobTitle}</span><span>${stub.hours} hrs</span></div>
    <div class="line"><span>${stub.employerName}</span><span>$${stub.rate}/hr</span></div>
    <div class="line"><span>${stub.date}</span><span>Proof of income</span></div>
    <a href="/paystub.html?id=${stub.id}" target="_blank">View / share →</a>
  `;
  row.appendChild(card);
  messagesEl.appendChild(row);
  scrollDown();
}

async function send(text) {
  if (!text.trim()) return;
  addBubble(text, "me");
  history.push({ role: "user", content: text });
  inputEl.value = "";
  sendBtn.disabled = true;
  showTyping();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, workerId: WORKER_ID }),
    });
    const data = await res.json();
    hideTyping();
    if (data.reply) {
      addBubble(data.reply, "them");
      history.push({ role: "assistant", content: data.reply });
    } else {
      addBubble("Hmm, I had trouble there. Try again?", "them");
    }
  } catch (err) {
    hideTyping();
    addBubble("I can't reach the dispatcher right now. Check the server is running.", "them");
  } finally {
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

sendBtn.addEventListener("click", () => send(inputEl.value));
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") send(inputEl.value);
});

// Greeting
addBubble(
  "Hey, I'm ShiftLink. Tell me where you are, what kind of work you can do, and the lowest pay that works for you — I'll find you something today.",
  "them"
);
history.push({
  role: "assistant",
  content:
    "Hey, I'm ShiftLink. Tell me where you are, what kind of work you can do, and the lowest pay that works for you — I'll find you something today.",
});

// Render a pay stub bubble live when one is generated (requires Firebase config).
if (isConfigured && db) {
  const start = Date.now();
  const q = query(collection(db, "paystubs"), where("workerId", "==", WORKER_ID));
  onSnapshot(q, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type !== "added") return;
      const stub = { id: change.doc.id, ...change.doc.data() };
      const created = stub.createdAt?.toMillis ? stub.createdAt.toMillis() : Date.now();
      // Only show stubs created during this session, once.
      if (created < start - 3000 || renderedStubs.has(stub.id)) return;
      renderedStubs.add(stub.id);
      addStubCard(stub);
    });
  });
}
