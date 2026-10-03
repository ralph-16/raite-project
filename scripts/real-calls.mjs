/**
 * Real-call verification for the onboarding AI (Phase 4).
 *
 * Makes exactly THREE route requests against the real
 * OpenRouter provider:
 *   (a) first question,
 *   (b) next question with 3 prior answers,
 *   (c) one profiler call.
 *
 * Signs up a throwaway test user for the session (the
 * route requires one in real provider mode). Env values,
 * tokens and passwords are loaded but never printed.
 * Dev-server logs are metadata-only (operation, provider,
 * model, duration) — safe to scan for retry operations.
 *
 * Run: node scripts/real-calls.mjs   (from the project root)
 */

import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

const ROOT = join(process.cwd());
const NEXT_ENTRY = join(ROOT, "node_modules/next/dist/bin/next");
const PORT = 3141;
const BASE = `http://127.0.0.1:${PORT}`;

/** Loads .env.local into an object. Values are never printed. */
function loadEnvFile(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

const fileEnv = loadEnvFile(join(ROOT, ".env.local"));
const env = { ...process.env, ...fileEnv };

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

for (const required of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "OPENROUTER_API_KEY",
]) {
  if (!env[required]?.trim()) fail(`${required} is not set in .env.local`);
}

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// --- throwaway test user -------------------------------------------------
const email = `ka-lakbay-realtest-${Date.now()}@example.com`;
const password = crypto.randomUUID();
const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
  email,
  password,
});
if (signUpError) fail(`sign-up failed: ${signUpError.message}`);
const session = signUpData.session;
if (!session) {
  fail(
    "sign-up returned no session (email confirmation is likely " +
      "enabled) — the real-call check needs an instant session"
  );
}
const userId = signUpData.user.id;
console.log(`test user: ${email} (id ${userId})`);

const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];

/**
 * Builds the auth cookie the @supabase/ssr server client
 * expects: one cookie named `sb-<ref>-auth-token` (the
 * storage key supabase-js derives from the URL host) whose
 * value is "base64-" + base64url(JSON of the session),
 * split into <=3180-char chunks (base64url is ASCII-safe,
 * so the chunker's URL-encoded sizing equals the raw length).
 */
function authCookieHeader(ref, session) {
  const key = `sb-${ref}-auth-token`;
  const encoded =
    "base64-" +
    Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const MAX_CHUNK_SIZE = 3180;

  const pairs = [];
  if (encoded.length <= MAX_CHUNK_SIZE) {
    pairs.push([key, encoded]);
  } else {
    for (let i = 0; i * MAX_CHUNK_SIZE < encoded.length; i += 1) {
      pairs.push([`${key}.${i}`, encoded.slice(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE)]);
    }
  }
  return pairs.map(([name, value]) => `${name}=${value}`).join("; ");
}

const cookie = authCookieHeader(projectRef, session);

// --- dev server with the real provider ------------------------------------
const proc = spawn(process.execPath, [NEXT_ENTRY, "dev", "-p", String(PORT)], {
  cwd: ROOT,
  env: {
    ...env,
    AI_PROVIDER: "openrouter",
    // Isolate the provider under test: no global model
    // (the provider default qwen/qwen3.8-27b:free applies)
    // and no model fallbacks configured for other providers.
    AI_MODEL: "",
    AI_MODEL_FALLBACKS: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
const serverLog = [];
proc.stdout.on("data", (chunk) => {
  const text = String(chunk);
  serverLog.push(text);
});
proc.stderr.on("data", (chunk) => serverLog.push(String(chunk)));

// Wait for the server to answer /api/health (with a
// deadline so a failed start cannot hang the script).
const startupDeadline = Date.now() + 120_000;
for (;;) {
  try {
    const response = await fetch(`${BASE}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) break;
  } catch {
    // Not up yet.
  }
  if (Date.now() > startupDeadline) {
    console.error("dev server did not become healthy in 120s");
    process.exit(1);
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

async function post(path, body) {
  const startedAt = Date.now();
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  const latency = Date.now() - startedAt;
  const json = await response.json();
  return { status: response.status, latency, json };
}

function report(label, result) {
  console.log(`\n=== ${label} ===`);
  console.log(`http: ${result.status} | latency: ${result.latency}ms`);
  console.log(`provider: ${result.json.provider ?? "(none)"} | model: ${result.json.model ?? "(none)"}`);
  console.log(`source: ${result.json.source ?? "(none)"} | userId: ${result.json.userId ?? "(none)"}`);
  if (result.json.error) {
    console.log(`error: ${result.json.error.code} (retryable: ${result.json.error.retryable})`);
  }
}

try {
  // (a) First question.
  const first = await post("/api/onboarding/next-question", { answers: [] });
  report("(a) first question", first);
  const firstQuestion = first.json.question;
  if (!firstQuestion) fail(`(a) no question returned: ${JSON.stringify(first.json).slice(0, 300)}`);
  console.log(`question: "${firstQuestion.text}"`);
  console.log(`type: ${firstQuestion.type} | topic: ${firstQuestion.topic} | options: ${firstQuestion.options?.length ?? 0}`);

  // (b) Next question with 3 prior answers.
  const option = firstQuestion.options?.[0];
  const answers = [
    { questionId: "seed-year", topic: "year_level", answerLabel: "first_year" },
    { questionId: "seed-program", topic: "program", answerLabel: "Computer Science" },
    {
      questionId: firstQuestion.id,
      topic: firstQuestion.topic,
      answerLabel: option ? option.label : "Building things",
    },
  ];
  const second = await post("/api/onboarding/next-question", {
    answers,
    desiredCareer: "I want to work with data",
    resumeSkills: ["Spreadsheets", "Python"],
  });
  report("(b) with 3 prior answers", second);
  const secondQuestion = second.json.question;
  if (!secondQuestion) fail(`(b) no question returned: ${JSON.stringify(second.json).slice(0, 300)}`);
  console.log(`question: "${secondQuestion.text}"`);
  console.log(`type: ${secondQuestion.type} | topic: ${secondQuestion.topic} | options: ${secondQuestion.options?.length ?? 0}`);

  // (c) Profiler call.
  const profiler = await post("/api/profiler", {
    onboarding: {
      yearLevel: "first_year",
      program: "Computer Science",
      interests: ["Building things", "Numbers and puzzles"],
      skills: [
        { skillSlug: "python", skillName: "Python", familiarity: "used" },
        { skillSlug: "spreadsheets", skillName: "Spreadsheets", familiarity: "used" },
      ],
      experience: { kinds: [], details: "Built a small data dashboard" },
      careerAspiration: {
        direction: "has_idea",
        targetCareer: "data",
        targetIndustry: "",
      },
      learningPreferences: ["1-3h"],
      resume: { status: "none" },
    },
    context: {
      answers: [
        { topic: "year_level", prompt: "Year?", answer: "first_year" },
        { topic: "program", prompt: "Program?", answer: "Computer Science" },
        {
          topic: firstQuestion.topic,
          prompt: firstQuestion.text,
          answer: option ? option.label : "Building things",
        },
      ],
      resumeSummary: undefined,
    },
  });
  report("(c) profiler", profiler);
  const profile = profiler.json.profile;
  if (profile) {
    console.log(`summary: "${String(profile.summary).slice(0, 200)}"`);
    console.log(`strengths: ${profile.strengths?.length ?? 0} | developing: ${profile.developingAreas?.length ?? 0} | unassessed: ${profile.unassessedAreas?.length ?? 0}`);
  }

  // Retry + outcome detection from metadata-only logs.
  // The [ai] logger emits operation, provider, model,
  // duration, error code and status — never prompts or
  // answers (lib/ai/logger.ts). Entries are multi-line,
  // so capture a window after each marker.
  const allLogs = serverLog.join("");
  const aiEntries = [];
  let marker = -1;
  for (;;) {
    const next = allLogs.indexOf("[ai]", marker + 1);
    if (next === -1) break;
    const end = allLogs.indexOf("[ai]", next + 1);
    aiEntries.push(
      allLogs.slice(next, end === -1 ? next + 700 : end).trim()
    );
    marker = next;
  }
  console.log("\n=== [ai] log entries (metadata only) ===");
  for (const entry of aiEntries.slice(-6)) {
    console.log(entry.replace(/\s+/g, " ").slice(0, 300));
  }

  const rateLimited = [first, second, profiler].some(
    (result) => result.json.error?.code === "rate_limit"
  );
  if (rateLimited) {
    console.log(
      "\nNOTE: OpenRouter rate-limited the free tier for this key.\n" +
        "Re-run `node scripts/real-calls.mjs` after the daily reset\n" +
        "to capture the successful-path verification."
    );
  }
} finally {
  try {
    process.kill(-proc.pid, "SIGTERM");
  } catch {
    // Already gone.
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log("\ndev server stopped.");
  process.exit(0);
}
