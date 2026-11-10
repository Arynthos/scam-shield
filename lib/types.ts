export type Verdict = "scam" | "suspicious" | "unclear" | "safe";
export type Severity = "high" | "medium" | "low";

export interface Flag {
  quote: string; // exact text from the message ("" when not tied to a phrase)
  why: string;
  severity: Severity;
}

export interface AiResult {
  verdict: Verdict;
  confidence: number;
  scamType: string;
  summary: string;
  flags: Flag[];
  nextSteps: string[];
  uncertainty: string;
  extractedText: string;
}

export interface RuleResult {
  verdict: Verdict;
  confidence: number;
  flags: Flag[];
}

export interface Analysis {
  verdict: Verdict;
  confidence: number;
  scamType: string;
  summary: string;
  flags: Flag[];
  nextSteps: string[];
  uncertainty: string;
  shownText: string; // the text the flags' quotes refer to
  source: "ai" | "rules";
  notice?: string;
}

export const LANGUAGES: Record<string, string> = {
  en: "English",
  hi: "हिन्दी (Hindi)",
  es: "Español",
  fr: "Français",
  pt: "Português",
  ar: "العربية",
  bn: "বাংলা",
  ta: "தமிழ்",
};
