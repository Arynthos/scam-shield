"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { redact } from "@/lib/redact";
import { COUNTRIES, guessCountry } from "@/lib/resources";
import { Camera, Info, Lock } from "./Icons";
import { LANGUAGES, type Analysis, type Flag, type Verdict } from "@/lib/types";

const EXAMPLES = [
  {
    label: "Bank call + OTP",
    text: "Caller: This is your bank's security team. Your account will be closed today because your KYC is not updated. You will receive an OTP on your phone. Read it out to me right now to stop the closure. Do not tell anyone about this call.",
  },
  {
    label: "Parcel fee SMS",
    text: "Your parcel is on hold due to an unpaid customs fee of Rs 49. Pay within 24 hours or it will be returned: http://dhl-parcel-track.xyz/pay",
  },
  {
    label: "Prize message",
    text: "Congratulations! You've won a $1000 gift card. Claim your reward within 2 hours: bit.ly/claim-prize-now",
  },
  {
    label: "Normal OTP text",
    text: "482913 is your one-time password to log in to ExampleBank. Do not share this code with anyone. It is valid for 10 minutes.",
  },
];

const HEADLINE: Record<Verdict, string> = {
  scam: "This looks like a scam",
  suspicious: "Be careful: this looks suspicious",
  unclear: "We can't tell, so stay cautious",
  safe: "This looks safe, but stay alert",
};

const STAMP: Record<Verdict, string> = { scam: "Scam", suspicious: "Suspicious", unclear: "Unclear", safe: "Looks OK" };

const STAGES = ["Reading the message…", "Checking links and patterns…", "Weighing the evidence…"];

interface Img {
  mime: string;
  data: string;
  preview: string;
}

async function prepareImage(file: File): Promise<Img> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file (a screenshot).");
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.85);
  return { mime: "image/jpeg", data: url.split(",")[1], preview: url };
}

function segments(text: string, flags: Flag[]) {
  const lower = text.toLowerCase();
  const ranges: { s: number; e: number; sev: Flag["severity"] }[] = [];
  for (const f of flags) {
    if (!f.quote) continue;
    const s = lower.indexOf(f.quote.toLowerCase());
    if (s >= 0) ranges.push({ s, e: s + f.quote.length, sev: f.severity });
  }
  ranges.sort((a, b) => a.s - b.s);
  const out: { t: string; sev?: Flag["severity"] }[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.s < pos) continue; // overlapping highlight, skip
    if (r.s > pos) out.push({ t: text.slice(pos, r.s) });
    out.push({ t: text.slice(r.s, r.e), sev: r.sev });
    pos = r.e;
  }
  if (pos < text.length) out.push({ t: text.slice(pos) });
  return out;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lh;
    } else line = test;
  }
  ctx.fillText(line, x, y);
  return y + lh;
}

function drawShareCard(scamType: string, site: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 1080;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 1080, 1080);
  g.addColorStop(0, "#7f1d1d");
  g.addColorStop(1, "#b42318");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1080, 1080);
  ctx.fillStyle = "#fff";
  ctx.font = "700 46px system-ui, sans-serif";
  ctx.fillText("SCAM ALERT", 80, 140);
  ctx.font = "700 84px Georgia, serif";
  let y = wrap(ctx, scamType, 80, 280, 920, 100);
  ctx.font = "500 44px system-ui, sans-serif";
  y = wrap(ctx, "A message like this is going around. Please don't fall for it.", 80, y + 30, 920, 60);
  ctx.font = "600 42px system-ui, sans-serif";
  for (const tip of [
    "Never share your OTP, PIN or password.",
    "Don't click links or call back numbers in the message.",
    "Call the real company on its official number.",
  ]) {
    ctx.fillText("✓", 80, y + 40);
    y = wrap(ctx, tip, 140, y + 40, 860, 56) + 10;
  }
  ctx.font = "500 36px system-ui, sans-serif";
  ctx.fillText(`Checked with Scam Shield  ·  ${site}`, 80, 1000);
  return c;
}

export default function Checker() {
  const [text, setText] = useState("");
  const [img, setImg] = useState<Img | null>(null);
  const [language, setLanguage] = useState("en");
  const [pickedCountry, setCountry] = useState<string | null>(null);
  const guessed = useSyncExternalStore(() => () => {}, guessCountry, () => "OTHER");
  const country = pickedCountry ?? guessed;
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<Analysis | null>(null);
  const [resultLang, setResultLang] = useState("en");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase !== "loading") return;
    const id = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 1800);
    return () => clearInterval(id);
  }, [phase]);
  useEffect(() => {
    if (phase === "done") resultRef.current?.focus();
  }, [phase]);

  async function addFile(file?: File) {
    if (!file) return;
    setError("");
    try {
      setImg(await prepareImage(file));
    } catch (e) {
      setError((e as Error).message || "Could not read that image.");
    }
  }

  async function analyse() {
    setError("");
    if (!text.trim() && !img) return setError("Paste a message, describe the call, or add a screenshot first.");
    setPhase("loading");
    setStage(0);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, image: img ? { mime: img.mime, data: img.data } : undefined, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
      setResultLang(language);
      setPhase("done");
    } catch (e) {
      setError(e instanceof TypeError ? "Can't reach the server. Check your connection and try again." : (e as Error).message);
      setPhase("idle");
    }
  }

  function reset() {
    setText("");
    setImg(null);
    setResult(null);
    setError("");
    setPhase("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const site = typeof window === "undefined" ? "" : window.location.host;
  const warning = result
    ? `⚠️ Scam warning: a message I just checked looks like "${result.scamType}". Don't click links, never share your OTP, PIN or password, and call the real company on its official number. Check suspicious messages free: ${typeof window === "undefined" ? "" : window.location.origin}`
    : "";

  async function shareText() {
    try {
      if (navigator.share) await navigator.share({ text: warning });
      else {
        await navigator.clipboard.writeText(warning);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* user dismissed the share sheet */
    }
  }

  function downloadCard() {
    drawShareCard(result!.scamType, site).toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = "scam-alert.png";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  const busy = phase === "loading";
  const shownText = result ? redact(result.shownText) : "";

  return (
    <>
      <section className="card" aria-labelledby="check-h">
        <h2 id="check-h" className="sr-only">Check a message</h2>

        <div className="chips" role="group" aria-label="Try an example">
          <span className="chips-label">Try an example:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex.label} type="button" className="chip" onClick={() => { setText(ex.text); setImg(null); setError(""); }}>
              {ex.label}
            </button>
          ))}
        </div>

        <label htmlFor="msg" className="label">Paste the message, or describe what the caller said</label>
        <div
          className={`drop ${dragging ? "drag" : ""} ${busy ? "scanning" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFile(e.dataTransfer.files[0]); }}
        >
          <textarea
            id="msg"
            value={text}
            maxLength={4000}
            rows={6}
            placeholder={"e.g. \"Your account will be closed today. Share the OTP you just received…\"\n\nYou can also paste or drop a screenshot here."}
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => {
              const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith("image/"));
              if (f) { e.preventDefault(); addFile(f); }
            }}
          />
          {img && (
            <div className="thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.preview} alt="Screenshot you added" />
              <button type="button" onClick={() => setImg(null)} aria-label="Remove screenshot">✕</button>
            </div>
          )}
        </div>

        <div className="row">
          <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
            <Camera /> Add a screenshot
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { addFile(e.target.files?.[0]); e.target.value = ""; }} />
          <label className="select">
            <span>Answer in</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {Object.entries(LANGUAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="select">
            <span>I&apos;m in</span>
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              {Object.entries(COUNTRIES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </label>
        </div>

        <p className="hint"><Lock /> <span>Card numbers and one-time codes are hidden in your browser before anything is sent. Nothing is saved.</span></p>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="button" className="btn primary big" onClick={analyse} disabled={busy}>
          {busy ? <><span className="spinner" aria-hidden /> {STAGES[stage]}</> : "Check it now"}
        </button>
        <span className="sr-only" aria-live="polite">{busy ? STAGES[stage] : ""}</span>
      </section>

      {result && phase === "done" && (
        <section ref={resultRef} tabIndex={-1} className={`result v-${result.verdict}`} aria-label="Result" dir={resultLang === "ar" ? "rtl" : "ltr"}>
          <div className="verdict">
            <span className="stamp" aria-hidden="true">{STAMP[result.verdict]}</span>
            <h2>{HEADLINE[result.verdict]}</h2>
            <p className="type">{result.scamType}</p>
          </div>

          <div className="meter" role="img" aria-label={`Confidence ${result.confidence} percent`}>
            <div className="bar"><i style={{ width: `${result.confidence}%` }} /></div>
            <span>{result.confidence}% sure</span>
          </div>

          <p className="summary">{result.summary}</p>
          {result.notice && <p className="notice"><Info /> <span>{result.notice}</span></p>}

          {shownText && result.flags.some((f) => f.quote) && (
            <>
              <h3>What gave it away</h3>
              <p className="msg" dir="auto">
                {segments(shownText, result.flags).map((s, i) => s.sev ? <mark key={i} className={`m-${s.sev}`}>{s.t}</mark> : <span key={i}>{s.t}</span>)}
              </p>
            </>
          )}

          {result.flags.length > 0 && (
            <ul className="flags">
              {result.flags.map((f, i) => (
                <li key={i} className={`f-${f.severity}`}>
                  {f.quote && <q dir="auto">{f.quote}</q>}
                  <span>{f.why}</span>
                </li>
              ))}
            </ul>
          )}

          <h3>What to do now</h3>
          <ol className="steps">{result.nextSteps.map((s, i) => <li key={i}>{s}</li>)}</ol>

          <div className="report" dir="ltr">
            <h3>Report it ({COUNTRIES[country].name})</h3>
            <ul>
              {COUNTRIES[country].items.map((r) => (
                <li key={r.label}>
                  {r.href ? <a href={r.href} target="_blank" rel="noopener noreferrer">{r.label}</a> : <strong>{r.label}</strong>}
                  <span>{r.detail}</span>
                </li>
              ))}
            </ul>
          </div>

          {(result.verdict === "scam" || result.verdict === "suspicious") && (
            <div className="share" dir="ltr">
              <h3>Protect someone you love</h3>
              <p>Send a warning to family and friends. It never includes the message you checked.</p>
              <div className="row">
                <button type="button" className="btn primary" onClick={shareText}>{copied ? "Copied!" : "Share a warning"}</button>
                <button type="button" className="btn ghost" onClick={downloadCard}>Download alert image</button>
              </div>
            </div>
          )}

          <p className="fine">
            {result.uncertainty} {result.source === "ai" ? "Analysed with Google Gemini plus built-in pattern checks. " : ""}
            Scam Shield gives advice, not proof, and can be wrong. If money or accounts are at risk, contact your bank directly.
          </p>
          <button type="button" className="btn ghost" onClick={reset}>Check another message</button>
        </section>
      )}
    </>
  );
}
