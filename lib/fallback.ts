import type { Verdict } from "./types";

export const FALLBACK_STEPS: Record<Verdict, string[]> = {
  scam: [
    "Do not reply, click any link or call any number in the message.",
    "Never share an OTP, PIN, CVV or password with anyone. Real banks never ask.",
    "Hang up or delete it, then contact the real organisation using the number on its official website or the back of your card.",
    "Report it using the options below and warn the people close to you.",
  ],
  suspicious: [
    "Do not click links or call numbers from this message.",
    "Never share an OTP, PIN or password.",
    "Check with the real organisation using a number you find yourself.",
  ],
  unclear: [
    "We found no common scam patterns, but that is not proof it is safe.",
    "If anything feels off, check with the real organisation using a number you find yourself.",
    "Never share an OTP, PIN or password with anyone who contacts you.",
  ],
  safe: [],
};

export const RULE_LABEL: Record<Verdict, { type: string; summary: string }> = {
  scam: { type: "Likely scam", summary: "This message contains well-known scam warning signs." },
  suspicious: { type: "Suspicious message", summary: "This message has some warning signs that deserve caution." },
  unclear: { type: "No clear warning signs", summary: "Our pattern checks found nothing alarming, but they only catch common tricks." },
  safe: { type: "No clear warning signs", summary: "" },
};
