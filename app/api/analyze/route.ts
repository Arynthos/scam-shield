import { FALLBACK_STEPS, RULE_LABEL } from "@/lib/fallback";
import { askGemini, AiError } from "@/lib/gemini";
import { merge } from "@/lib/merge";
import { redact } from "@/lib/redact";
import { runRules } from "@/lib/rules";
import { LANGUAGES, type Analysis, type RuleResult } from "@/lib/types";

export const maxDuration = 30;

const MAX_TEXT = 4000;
const MAX_IMAGE_B64 = 4_000_000; // Vercel rejects request bodies over ~4.5 MB
const MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

// shortcut: per-instance memory, so serverless instances don't share counts; upgrade to Upstash/Vercel KV if abused.
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 8;
}

const err = (error: string, status: number) =>
  Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

function rulesOnly(rules: RuleResult, shownText: string, notice: string): Analysis {
  return {
    verdict: rules.verdict,
    confidence: rules.confidence,
    scamType: RULE_LABEL[rules.verdict].type,
    summary: RULE_LABEL[rules.verdict].summary,
    flags: rules.flags,
    nextSteps: FALLBACK_STEPS[rules.verdict],
    uncertainty: "This quick check only looks for known patterns, so it can miss new scams.",
    shownText,
    source: "rules",
    notice,
  };
}

export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 5_000_000) return err("That file is too large.", 413);

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (limited(ip)) return err("Too many checks in a minute. Please wait a moment and try again.", 429);

  let body: { text?: unknown; image?: { mime?: unknown; data?: unknown }; language?: unknown };
  try {
    body = await req.json();
  } catch {
    return err("Invalid request.", 400);
  }

  const text = redact(typeof body.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : "");
  const language = typeof body.language === "string" && body.language in LANGUAGES ? body.language : "en";

  let image: { mime: string; data: string } | undefined;
  if (body.image) {
    const { mime, data } = body.image;
    if (typeof mime !== "string" || !MIMES.has(mime) || typeof data !== "string" || data.length > MAX_IMAGE_B64 || !/^[A-Za-z0-9+/=]+$/.test(data)) {
      return err("Please upload a JPG, PNG or WebP screenshot under 3 MB.", 400);
    }
    image = { mime, data };
  }
  if (!text && !image) return err("Paste a message or add a screenshot first.", 400);

  const rules = runRules(text);
  try {
    const ai = await askGemini({ text, image, language, signals: rules.flags });
    const shownText = image ? redact(ai.extractedText) || text : text;
    const finalRules = image ? runRules(`${text}\n${shownText}`) : rules;
    return Response.json(merge(ai, finalRules, shownText), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // AiError messages hold only status codes and model names, never message content.
    console.error("analyze fallback:", e instanceof AiError ? e.message : (e as Error).name);
    if (!text) return err("The AI is busy right now, so we couldn't read your screenshot. Please try again in a minute, or paste the text instead.", 503);
    const why = language === "en" ? "" : " (in English only)";
    return Response.json(
      rulesOnly(rules, text, `The AI is unavailable right now, so this is a quick pattern check${why}. Try again in a minute for a full analysis.`),
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
