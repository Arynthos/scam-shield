import Checker from "./Checker";
import { Check } from "./Icons";

function Logo() {
  return (
    <svg className="logo" width="56" height="56" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 5 8 11v12c0 10 6.5 17 16 20 9.5-3 16-10 16-20V11z" transform="translate(3 3)" fill="var(--pop)" />
      <path d="M24 5 8 11v12c0 10 6.5 17 16 20 9.5-3 16-10 16-20V11z" fill="var(--brand)" stroke="var(--edge)" strokeWidth="3" strokeLinejoin="round" />
      <path d="m16 24 6 6 11-12" fill="none" stroke="var(--brand-ink)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <a href="#main" className="skip">Skip to the checker</a>
      <header className="top">
        <div className="wrap top-in">
          <Logo />
          <span className="brand">Scam <em>Shield</em></span>
        </div>
      </header>

      <main id="main" className="wrap">
        <section className="hero">
          <ul className="trust" aria-label="Key facts">
            <li><Check /> Free</li>
            <li><Check /> No sign-up</li>
            <li><Check /> Nothing saved</li>
          </ul>
          <h1>Got a strange message or call? <em>Check before you trust.</em></h1>
          <p className="lede">
            Paste it, describe it, or drop in a screenshot. In seconds you get a clear verdict, the exact words that
            give it away, and what to do next.
          </p>
          <p className="rule"><strong>Golden rule:</strong> nobody honest will ever ask you for your OTP, PIN or password.</p>
        </section>

        <Checker />

        <section className="how" aria-labelledby="how-h">
          <h2 id="how-h">How it works</h2>
          <ol>
            <li><span className="num" aria-hidden="true">1</span><div><b>Hide the sensitive bits.</b> Card numbers and one-time codes are masked in your browser before anything is sent.</div></li>
            <li><span className="num" aria-hidden="true">2</span><div><b>Two checks, not one.</b> Built-in rules look for known tricks, like fake links, pressure and requests for codes. Google Gemini then reads the whole message. The rules can raise an alert but the AI can never talk them down.</div></li>
            <li><span className="num" aria-hidden="true">3</span><div><b>Honest answers.</b> You see how sure it is, what it could not verify, and where to report the scam in your country.</div></li>
          </ol>
        </section>

        <section className="why" aria-labelledby="why-h">
          <h2 id="why-h">Why I built this</h2>
          <p>
            My mom almost gave a scammer her OTP. A caller said her bank account was about to be closed, an OTP arrived,
            and he pushed hard for it. She panicked. I happened to be in the room, saw it, and asked what was going on.
          </p>
          <p>Not everyone has someone beside them when the phone rings. Scam Shield is meant to be that calm second opinion.</p>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap">
          <p>
            <strong>Privacy:</strong> Scam Shield stores nothing and has no accounts. To analyse a message it is sent to
            Google&apos;s Gemini API, and on the free tier Google may use API inputs to improve its products. So never paste
            passwords, full card numbers or anything you&apos;d be unhappy to share.
          </p>
          <p>
            <strong>Limits:</strong> This is advice, not proof, and it can be wrong, especially for brand-new scams. If
            money or accounts are at risk, contact your bank directly. Built for SLAY HACKS 2026.
          </p>
        </div>
      </footer>
    </>
  );
}
