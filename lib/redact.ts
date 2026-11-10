// Hide card numbers and one-time codes before anything leaves the browser.
// Idempotent: the placeholders contain no digits.
export function redact(text: string): string {
  return text
    .replace(/\b(?:\d[ -]?){13,19}\b/g, "[card number]")
    .replace(
      /\b(otp|code|pin|cvv|passcode|password)(\W{0,12}(?:is|:|-)?\W{0,6})(\d{4,8})\b/gi,
      "$1$2[code]",
    )
    .replace(/\b\d{4,8}\b(?=[^.\n]{0,25}\b(?:otp|one[- ]time|verification code|passcode)\b)/gi, "[code]");
}
