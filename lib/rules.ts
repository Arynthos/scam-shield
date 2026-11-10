import type { Flag, RuleResult, Severity } from "./types";

// Deterministic first line of defence. Runs with no API key, feeds hints to
// the AI, and can raise (never lower) the final verdict.

interface Rule {
  re: RegExp;
  severity: Severity;
  why: string;
  /** skip a match when the text just before it negates it ("do not share") */
  negatable?: boolean;
}

const NEGATION = /(?:do not|don't|dont|never|not)\s*$/i;

const RULES: Rule[] = [
  {
    re: /\b(?:share|send|tell|read(?: out)?|give|forward|provide|confirm)\b[^.\n]{0,40}\b(?:otp|one[- ]?time (?:password|passcode|code)|verification code|security code|pin|cvv|password)\b/i,
    severity: "high",
    negatable: true,
    why: "Asks you to hand over a code or password. Real banks and companies never ask for this.",
  },
  {
    re: /\b(?:anydesk|teamviewer|quick ?support|ammyy|rustdesk|screen[- ]?shar(?:e|ing)|remote access)\b/i,
    severity: "high",
    why: "Asks for remote access to your device. Scammers use this to empty accounts.",
  },
  {
    re: /\b(?:police|cbi|ncb|customs|income tax|rbi|irs|fbi|interpol|court|cyber ?crime)\b[^.\n]{0,60}\b(?:arrest\w*|warrant|drugs?|narcotics|legal action|money laundering)\b|\bdigital arrest\b/i,
    severity: "high",
    why: "Threatens arrest or legal action. Real authorities do not do this by phone or text.",
  },
  {
    re: /\b(?:pay|transfer|send|deposit|remit)\b[^.\n]{0,40}\b(?:gift ?cards?|bitcoin|btc|crypto|usdt|western union|wire transfer|processing fee|registration fee|clearance fee|customs fee|security deposit)\b/i,
    severity: "high",
    why: "Asks for payment in a hard-to-reverse way or for an unexpected fee.",
  },
  {
    re: /\b(?:account|card|kyc|sim|wallet|upi|service)\b[^.\n]{0,50}\b(?:block(?:ed)?|clos(?:ed|ure|ing)|suspend(?:ed)?|deactivat\w+|freez\w+|terminat\w+|expire[sd]?|restrict\w+)\b/i,
    severity: "medium",
    why: "Threatens to close or block something to scare you into acting.",
  },
  {
    re: /\b(?:immediately|right now|urgent(?:ly)?|asap|within \d+\s*(?:hours?|hrs?|minutes?|mins?|days?)|last (?:warning|chance|notice)|final notice|act now|today only|do not delay)\b/i,
    severity: "medium",
    why: "Creates time pressure. Scammers rush you so you cannot think.",
  },
  {
    re: /\b(?:update|verify|complete|re-?verify)\b[^.\n]{0,25}\b(?:kyc|pan|aadhaar|aadhar|ssn|bank details|card details|account details|login|password)\b/i,
    severity: "medium",
    why: "Asks you to verify personal or bank details through a message or call.",
  },
  {
    re: /\b(?:you(?:'ve| have)? (?:won|been selected)|lottery|lucky draw|congratulations|claim your (?:reward|gift|prize)|cashback|free gift)\b/i,
    severity: "medium",
    why: "Promises a prize or reward you did not ask for.",
  },
  {
    re: /\b(?:do not|don't|dont|never)\s+(?:tell|inform|disclose to)\s+(?:anyone|anybody|your (?:family|bank|friends))|keep (?:this|it) (?:secret|confidential)\b/i,
    severity: "medium",
    why: "Tells you to keep this secret. Scammers isolate you from people who could help.",
  },
  {
    re: /\b(?:guaranteed (?:returns?|profits?)|double your money|\d+% (?:daily|weekly) returns?|work from home)\b/i,
    severity: "medium",
    why: "Promises easy money or guaranteed returns.",
  },
];

// --- links -----------------------------------------------------------------

const URL_RE =
  /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+|\b(?:bit\.ly|tinyurl\.com|t\.co|cutt\.ly|is\.gd|rb\.gy|goo\.gl|shorturl\.at|t\.ly|ow\.ly)\/\S+|\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:xyz|top|click|live|icu|buzz|vip|cfd|sbs|link|cc|tk|ml|ga|cf|gq|site|online|monster|rest)(?:\/\S*)?/gi;

const SHORTENERS = new Set(["bit.ly", "tinyurl.com", "t.co", "cutt.ly", "is.gd", "rb.gy", "goo.gl", "shorturl.at", "t.ly", "ow.ly"]);
const BAD_TLDS = new Set(["xyz", "top", "click", "live", "icu", "buzz", "vip", "cfd", "sbs", "link", "cc", "tk", "ml", "ga", "cf", "gq", "site", "online", "monster", "rest"]);
const TWO_PART_SUFFIX = new Set(["co.uk", "co.in", "com.au", "com.br", "org.uk", "net.in", "gov.in", "gov.uk", "co.za", "com.mx"]);

const BRANDS = [
  "paypal", "amazon", "google", "apple", "microsoft", "netflix", "facebook", "instagram", "whatsapp",
  "paytm", "phonepe", "flipkart", "hdfc", "icici", "sbi", "axis", "kotak", "fedex", "dhl", "usps",
  "ups", "irs", "hmrc", "aadhaar", "uidai", "incometax",
];
const LEGIT = new Set([
  "paypal.com", "paypal.me", "amazon.com", "amazon.in", "amazon.co.uk", "amazon.de", "google.com",
  "apple.com", "microsoft.com", "netflix.com", "facebook.com", "instagram.com", "whatsapp.com",
  "paytm.com", "phonepe.com", "flipkart.com", "hdfcbank.com", "icicibank.com", "sbi.co.in",
  "onlinesbi.sbi", "axisbank.com", "kotak.com", "fedex.com", "dhl.com", "usps.com", "ups.com",
  "irs.gov", "hmrc.gov.uk", "uidai.gov.in", "incometax.gov.in",
]);

function hostOf(raw: string): { host: string; hasUserinfo: boolean } {
  const noScheme = raw.replace(/^https?:\/\//i, "");
  const authority = noScheme.split(/[/?#]/)[0];
  const hasUserinfo = authority.includes("@");
  const host = authority.split("@").pop()!.split(":")[0].toLowerCase().replace(/[.,;!]+$/, "");
  return { host, hasUserinfo };
}

function registrable(host: string): string {
  const labels = host.split(".");
  const last2 = labels.slice(-2).join(".");
  return TWO_PART_SUFFIX.has(last2) ? labels.slice(-3).join(".") : last2;
}

function linkFlags(text: string): Flag[] {
  const flags: Flag[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(URL_RE)) {
    const raw = m[0].replace(/[.,;!]+$/, "");
    const { host, hasUserinfo } = hostOf(raw);
    if (!host || !host.includes(".")) continue;
    const reg = registrable(host);
    const add = (severity: Severity, why: string) => {
      const key = raw + why;
      if (!seen.has(key)) {
        seen.add(key);
        flags.push({ quote: raw, why, severity });
      }
    };
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) add("high", "This link uses a raw number address instead of a real website name.");
    if (host.includes("xn--")) add("high", "This link uses disguised look-alike characters.");
    if (hasUserinfo) add("high", "This link hides its real destination behind an @ sign.");
    if (SHORTENERS.has(host)) add("medium", "A shortened link hides where it really goes.");
    else if (BAD_TLDS.has(host.split(".").pop()!)) add("medium", "This link ends in a cheap domain type that scammers favour.");
    const tokens = host.split(/[.-]/);
    const brand = BRANDS.find((b) => tokens.includes(b));
    if (brand && !LEGIT.has(reg)) add("high", `This link pretends to be ${brand} but goes to ${reg}, which is not theirs.`);
    else if ((host.match(/-/g) ?? []).length >= 3) add("medium", "This web address has many hyphens, a common sign of a fake site.");
  }
  return flags;
}

// --- main ------------------------------------------------------------------

export function runRules(text: string): RuleResult {
  const flags: Flag[] = [];
  for (const rule of RULES) {
    const m = rule.re.exec(text);
    if (!m) continue;
    if (rule.negatable && NEGATION.test(text.slice(Math.max(0, m.index - 15), m.index))) continue;
    flags.push({ quote: m[0], why: rule.why, severity: rule.severity });
  }
  flags.push(...linkFlags(text));

  if (
    flags.length === 0 &&
    /\b(?:otp|one[- ]?time|verification code)\b/i.test(text) &&
    /\b(?:do not|don't|never)\s+share\b/i.test(text)
  ) {
    flags.push({
      quote: "",
      why: "This looks like a normal one-time-code notice. It is only fine if YOU just asked for it. If you did not, someone may be trying to get into your account.",
      severity: "low",
    });
  }

  const high = flags.filter((f) => f.severity === "high").length;
  const medium = flags.filter((f) => f.severity === "medium").length;
  if (high >= 1 || medium >= 3) return { verdict: "scam", confidence: 85, flags };
  if (medium >= 1) return { verdict: "suspicious", confidence: 60, flags };
  return { verdict: "unclear", confidence: 40, flags };
}
