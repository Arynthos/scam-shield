import test from "node:test";
import assert from "node:assert/strict";
import { runRules } from "../lib/rules.ts";
import { redact } from "../lib/redact.ts";
import { merge } from "../lib/merge.ts";
import type { AiResult } from "../lib/types.ts";

const verdict = (t: string) => runRules(t).verdict;

test("bank call asking for OTP is a scam", () => {
  const t =
    "This is your bank. Your account will be closed today because KYC is not updated. Read out the OTP you receive right now. Do not tell anyone.";
  const r = runRules(t);
  assert.equal(r.verdict, "scam");
  assert.ok(r.flags.some((f) => /otp/i.test(f.quote)));
});

test("genuine OTP notice is not flagged as a scam", () => {
  const r = runRules("482913 is your one-time password for login. Do not share this code with anyone. Valid for 10 minutes.");
  assert.equal(r.verdict, "unclear");
  assert.equal(r.flags[0].severity, "low");
});

test("look-alike brand link is high severity", () => {
  const r = runRules("Your parcel is held. Pay the fee: http://dhl-parcel-track.xyz/pay");
  assert.equal(r.verdict, "scam");
  assert.ok(r.flags.some((f) => /pretends to be dhl/.test(f.why)));
});

test("real brand domain is not flagged as look-alike", () => {
  assert.ok(!runRules("Track at https://www.dhl.com/track now").flags.some((f) => /pretends/.test(f.why)));
});

test("shortened link + prize is suspicious or worse", () => {
  assert.notEqual(verdict("Congratulations! Claim your reward: bit.ly/abc123"), "unclear");
});

test("ordinary message gets no verdict", () => {
  assert.equal(verdict("Hey, are we still meeting for lunch at 1?"), "unclear");
  assert.equal(runRules("Hey, are we still meeting for lunch at 1?").flags.length, 0);
});

test("redact hides cards and codes, and is idempotent", () => {
  const once = redact("Card 4111 1111 1111 1111. Your OTP is 482913. 771155 is your verification code.");
  assert.ok(!/\d{4}/.test(once));
  assert.equal(redact(once), once);
});

const ai = (v: AiResult["verdict"]): AiResult => ({
  verdict: v, confidence: 50, scamType: "x", summary: "s", flags: [], nextSteps: [], uncertainty: "", extractedText: "",
});

test("rules can raise but never lower the verdict", () => {
  const scam = runRules("Share your OTP now");
  assert.equal(merge(ai("safe"), scam, "").verdict, "scam");
  assert.equal(merge(ai("scam"), runRules("hello"), "").verdict, "scam");
  assert.equal(merge(ai("safe"), runRules("hello"), "").verdict, "safe");
});

test("a raised verdict replaces the AI's contradicting labels", () => {
  const m = merge({ ...ai("safe"), scamType: "Not a scam", summary: "Looks fine." }, runRules("Share your OTP now"), "");
  assert.equal(m.scamType, "Likely scam");
  assert.ok(!/fine/i.test(m.summary));
  assert.ok(m.nextSteps.length >= 4 && m.notice);
});
