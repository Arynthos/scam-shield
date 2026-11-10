import { FALLBACK_STEPS, RULE_LABEL } from "./fallback.ts";
import type { AiResult, Analysis, RuleResult, Verdict } from "./types";

const RANK: Record<Verdict, number> = { safe: 0, unclear: 1, suspicious: 2, scam: 3 };

// The pattern checks can only RAISE a verdict (a message that tells the AI
// "this is safe" must not be able to talk it down), never lower it.
export function merge(ai: AiResult, rules: RuleResult, shownText: string): Analysis {
  const base = { uncertainty: ai.uncertainty, shownText, source: "ai" as const };
  if (rules.verdict === "unclear" || RANK[rules.verdict] <= RANK[ai.verdict]) {
    return { ...base, verdict: ai.verdict, confidence: ai.confidence, scamType: ai.scamType, summary: ai.summary, flags: ai.flags, nextSteps: ai.nextSteps };
  }
  // Raised: the AI's labels and summary would contradict the new verdict, so replace them.
  const quotes = ai.flags.map((f) => f.quote.toLowerCase()).filter(Boolean);
  const covered = (q: string) => quotes.some((a) => a.includes(q.toLowerCase()) || q.toLowerCase().includes(a));
  return {
    ...base,
    verdict: rules.verdict,
    confidence: Math.max(ai.confidence, rules.confidence),
    scamType: RULE_LABEL[rules.verdict].type,
    summary: RULE_LABEL[rules.verdict].summary,
    flags: [...ai.flags, ...rules.flags.filter((f) => !f.quote || !covered(f.quote))],
    nextSteps: [...new Set([...FALLBACK_STEPS[rules.verdict], ...ai.nextSteps])].slice(0, 6),
    notice: "Our built-in pattern checks found stronger warning signs than the AI did, so we used the more cautious result.",
  };
}
