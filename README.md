# Scam Shield

**Check before you trust.** Paste a suspicious message, describe a suspicious call, or drop in a screenshot. Scam Shield returns a verdict with a confidence level, highlights the exact words that give the scam away, and tells you what to do next and where to report it.

**Live demo: https://scamshield-check.vercel.app**

Built for SLAY HACKS 2026. It started when my mom almost gave a scammer her OTP.

## How it works

1. **Redaction in the browser.** Card numbers and one-time codes are masked before anything is sent (`lib/redact.ts`).
2. **Rule layer** (`lib/rules.ts`). Deterministic checks for requests for codes, remote-access tools, authority threats, odd payment methods, pressure and secrecy, plus link analysis: shorteners, raw IPs, look-alike brand domains, risky TLDs. Works with no API key.
3. **Google Gemini** reads the full text (or screenshot) and returns structured JSON: verdict, confidence, quoted red flags, next steps and what it could not verify, in the user's language. The message is treated as untrusted data to resist prompt injection.
4. **Merge** (`lib/merge.ts`). The rules can only *raise* a verdict, never lower it, so a message cannot talk the AI into calling it safe.
5. If the AI is unavailable or rate-limited, the app falls back to the rule layer and says so.

## Responsible use

- No accounts, no database, nothing stored. Message content is never logged.
- Honest uncertainty: confidence score, "what I could not verify", and a clear "advice, not proof" disclaimer.
- On Gemini's free tier, Google may use API inputs to improve its products. This is disclosed in the footer.
- Per-IP rate limiting protects the free quota.

## Run locally

```bash
npm install
# create .env.local with:
#   GEMINI_API_KEY=your-key-from-aistudio.google.com
#   GEMINI_MODEL=optional-model-override
npm run dev      # http://localhost:3000
npm test         # unit tests for the rules, redaction and merge logic
```

## Deploy

Import the repo in Vercel and set the `GEMINI_API_KEY` environment variable. No other configuration is needed.

## Tech

Next.js 16 (App Router), React 19, TypeScript, Google Gemini API (REST), plain CSS. No UI or AI SDK dependencies.

## Limits

Scam Shield gives advice, not proof, and can be wrong, especially for brand-new scams. Rate limiting is in-memory per server instance. The interface is in English; AI explanations can be requested in 8 languages. Reporting links cover India, the US, the UK, Canada and Australia.
