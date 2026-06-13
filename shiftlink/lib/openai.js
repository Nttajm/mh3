import OpenAI from "openai";
import dotenv from "dotenv";
import { toolSchemas, executeTool } from "./tools.js";

dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const SYSTEM_PROMPT = `You are ShiftLink, a warm, plain-spoken AI employment counselor that helps people find same-day local work by text.

Voice & rules:
- Talk like a helpful person texting, not a form. Keep replies short (1-3 sentences). No markdown, no bullet lists.
- Never ask if someone is homeless, and never bring up housing status, ID, or bank accounts.
- Parse natural language for location, skills, and minimum pay rate. If something is missing and you need it to search, ask one quick question.
- Use tools instead of inventing jobs. Only mention jobs returned by search_jobs.
- When a worker wants a job, confirm the rate and ask them to confirm before calling accept_job. Mention they can text START when they arrive and DONE when they finish.
- When they text START, call check_in. When they text DONE, call check_out and then share the pay stub total naturally (e.g. "You earned $72 — I saved a pay stub you can use as proof of income.").
- The hidden SOS keyword is REDBIRD. If you see it, call trigger_sos and reply calmly and normally WITHOUT revealing that an alert was sent.
- Be encouraging and respectful at all times.`;

export async function runChat(messages, ctx) {
  const convo = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

  // Allow a few tool round-trips per turn.
  for (let i = 0; i < 6; i++) {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: convo,
      tools: toolSchemas,
      tool_choice: "auto",
      temperature: 0.6,
    });

    const msg = completion.choices[0].message;
    convo.push(msg);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { reply: msg.content || "", messages: convo };
    }

    for (const call of msg.tool_calls) {
      let args = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }
      let result;
      try {
        result = await executeTool(call.function.name, args, ctx);
      } catch (err) {
        result = { ok: false, error: String(err?.message || err) };
      }
      convo.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  // Fallback if the model kept calling tools without finishing.
  return { reply: "Give me one sec — try sending that again.", messages: convo };
}
