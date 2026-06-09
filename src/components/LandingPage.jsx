import { useState, useEffect } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { supabase } from "../supabase";

/* ════════════════════════════════════════════════════════════════════════
   ME LANDING PAGE — V2  ·  route "/"  ·  editorial-quiet
   Tokens consumed from the REAL src/index.css :root (--brand-* / --app-*).
   Nothing is redeclared here. Typography is self-fenced under .lp-v2 so the
   app's global element defaults (body{font-size:15px}) can't cascade in.
   Motion = framer-motion v12 only. Prerender-safe: all copy is in the DOM and
   visible without JS; reveals only animate transform/opacity after mount.
   Build status: §1–§9 in progress. §10–§12 (Early Access / 2nd teal anchor /
   footer) follow in the next pass — temporary close at the bottom for now.
   ════════════════════════════════════════════════════════════════════════ */

const EASE = [0.22, 1, 0.36, 1]; // --ease-out
const DEMO_URL = "https://demo.myoozz.events";

/* ── Brand mark — single swappable placeholder ───────────────────────────
   Poppins Black "M" + Fraunces Black Italic "e". Real SVG drops in HERE only.
   tone="teal" on warm surfaces, tone="soft" on dark surfaces. Never "ME". */
function MeMark({ size = 22, tone = "teal", className = "" }) {
  return (
    <span
      className={`lp-v2-memark lp-v2-memark--${tone} ${className}`}
      style={{ fontSize: size }}
      role="img"
      aria-label="Me"
    >
      <span className="memark-m" aria-hidden="true">M</span>
      <span className="memark-e" aria-hidden="true">e</span>
    </span>
  );
}

/* ── Tier-1 reveal — prerender-safe + reduced-motion ─────────────────────
   Before mount (prerender / no-JS) OR reduced motion → render plain & visible.
   After mount → rise y:16→0 + fade, ~0.4s ease-out. */
function Reveal({ as = "div", children, className = "", style, delay = 0, y = 16, amount = 0.4, once = true }) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || reduce) {
    const Tag = as;
    return <Tag className={className} style={style}>{children}</Tag>;
  }
  const M = motion[as] || motion.div;
  return (
    <M
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.4, ease: EASE, delay }}
    >
      {children}
    </M>
  );
}

/* ── Tier-3 signature line reveal — slowest on the page (§2, §9) ──────────
   Each child line lands as its own beat. Reduced motion → instant. */
function LineReveal({ children, className = "", style, delay = 0, amount = 0.6 }) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || reduce) {
    return <div className={className} style={style}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ── Request-access modal ────────────────────────────────────────────────
   Radix Dialog. No <form> — onClick submit. Inserts into early_access
   (status defaults to 'pending'); the admin triages in EarlyAccess.jsx.
   NOTE: needs an anon INSERT RLS policy on the table to succeed live —
   until then this degrades to an honest error, never a fake success. */
function RequestAccessModal({ open, onOpenChange }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error | done
  const [err, setErr] = useState("");

  // Reset when the dialog closes so a re-open is clean.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setName(""); setEmail(""); setPhone(""); setCompany("");
        setStatus("idle"); setErr("");
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  async function submit() {
    const e = email.trim();
    if (!e || !/.+@.+\..+/.test(e)) { setErr("Please enter a valid email address."); return; }
    setStatus("loading"); setErr("");
    const { error } = await supabase.from("early_access").insert({
      full_name: name.trim() || null,
      email: e,
      phone: phone.trim() || null,
      company: company.trim() || null,
    });
    if (error) {
      setStatus("error");
      setErr("Couldn’t submit just now. Email hello@myoozz.events and we’ll sort it.");
      return;
    }
    setStatus("done");
  }

  const onKey = (ev) => { if (ev.key === "Enter") submit(); };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="lp-v2-modal-overlay" />
        <Dialog.Content className="lp-v2-modal" aria-describedby="ra-desc">
          {status === "done" ? (
            <div className="lp-v2-modal-done">
              <Dialog.Title className="lp-v2-modal-title">You’re on the list.</Dialog.Title>
              <p id="ra-desc" className="lp-v2-modal-sub">
                We’re letting Event Managers in a few at a time. We’ll reach out personally — keep an eye on your inbox.
              </p>
              <Dialog.Close asChild>
                <button className="lp-v2-btn-primary" type="button">Done</button>
              </Dialog.Close>
            </div>
          ) : (
            <>
              <Dialog.Title className="lp-v2-modal-title">Request access</Dialog.Title>
              <p id="ra-desc" className="lp-v2-modal-sub">
                Tell us where to reach you. We onboard a few Event Managers at a time.
              </p>
              <div className="lp-v2-field">
                <label htmlFor="ra-name">Your name</label>
                <input id="ra-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey} autoComplete="name" />
              </div>
              <div className="lp-v2-field">
                <label htmlFor="ra-email">Email <span className="req">*</span></label>
                <input id="ra-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onKey} autoComplete="email" />
              </div>
              <div className="lp-v2-field-row">
                <div className="lp-v2-field">
                  <label htmlFor="ra-phone">Phone</label>
                  <input id="ra-phone" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={onKey} autoComplete="tel" />
                </div>
                <div className="lp-v2-field">
                  <label htmlFor="ra-company">Company</label>
                  <input id="ra-company" value={company} onChange={(e) => setCompany(e.target.value)} onKeyDown={onKey} autoComplete="organization" />
                </div>
              </div>
              {err && <p className="lp-v2-modal-err">{err}</p>}
              <div className="lp-v2-modal-actions">
                <Dialog.Close asChild>
                  <button className="lp-v2-link" type="button">Not now</button>
                </Dialog.Close>
                <button className="lp-v2-btn-primary" type="button" onClick={submit} disabled={status === "loading"}>
                  {status === "loading" ? "Submitting…" : "Request access"}
                </button>
              </div>
            </>
          )}
          <Dialog.Close asChild>
            <button className="lp-v2-modal-x" type="button" aria-label="Close">×</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function LandingPage() {
  const reduce = useReducedMotion();
  const [modalOpen, setModalOpen] = useState(false);

  // Hero H1 micro-parallax — desktop + motion-on only; transform-only (GPU).
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setIsDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const { scrollY } = useScroll();
  const heroDrift = useTransform(scrollY, [0, 400], [0, -18]);
  const parallaxOn = isDesktop && !reduce;

  const openModal = () => setModalOpen(true);

  const traps = [
    ["01", "The rate trap", "The vendor’s rate moved. The client cost is closed. That gap just became yours."],
    ["02", "The template trap", "A template gets you through one event. A system gets you through every one after it."],
    ["03", "The memory trap", "Your team can’t execute what only lives in your head. And the day that person leaves — it all leaves with them."],
    ["04", "The WhatsApp trap", "One event, fourteen threads. Nobody’s sure what’s confirmed, what changed, or what got missed."],
  ];

  return (
    <div className="lp-v2">
      <style>{CSS}</style>

      <RequestAccessModal open={modalOpen} onOpenChange={setModalOpen} />

      {/* ── SLIM HEADER ─────────────────────────────────────────────── */}
      <header className="lp-v2-header">
        <div className="lp-v2-header-inner">
          <a href="/" className="lp-v2-brand" aria-label="Me — home">
            <MeMark size={24} tone="teal" />
          </a>
          <nav className="lp-v2-header-nav">
            <a className="lp-v2-link lp-v2-hide-phone" href={DEMO_URL} target="_blank" rel="noopener noreferrer">Try the demo</a>
            <a className="lp-v2-link lp-v2-hide-phone" href="/login">Login</a>
            <button className="lp-v2-btn-primary lp-v2-btn-sm" type="button" onClick={openModal}>Request access</button>
          </nav>
        </div>
      </header>

      <main>
        {/* ── §1 HERO ───────────────────────────────────────────────── */}
        <section className="lp-v2-hero">
          <div className="lp-v2-inner lp-v2-hero-inner">
            <Reveal as="p" className="lp-v2-eyebrow" delay={0}>
              Event management software, built for Event Managers. Not the attendee.
            </Reveal>

            <h1 className="lp-v2-hero-h1">
              {parallaxOn ? (
                <motion.span className="lp-v2-hero-h1-wrap" style={{ y: heroDrift }}>
                  <Reveal as="span" className="lp-v2-hero-line" delay={0.12}>Sweat in the planning.</Reveal>
                  <Reveal as="span" className="lp-v2-hero-line" delay={0.34}>Don’t bleed on the day.</Reveal>
                </motion.span>
              ) : (
                <span className="lp-v2-hero-h1-wrap">
                  <Reveal as="span" className="lp-v2-hero-line" delay={0.12}>Sweat in the planning.</Reveal>
                  <Reveal as="span" className="lp-v2-hero-line" delay={0.34}>Don’t bleed on the day.</Reveal>
                </span>
              )}
            </h1>

            <Reveal as="p" className="lp-v2-hero-sub" delay={0.5}>
              The operating system for the people running the show.
            </Reveal>

            <Reveal className="lp-v2-hero-ctas" delay={0.62}>
              <button className="lp-v2-btn-primary" type="button" onClick={openModal}>Request access →</button>
              <a className="lp-v2-link lp-v2-link-strong" href={DEMO_URL} target="_blank" rel="noopener noreferrer">Try the demo</a>
            </Reveal>
          </div>
        </section>

        {/* ── §2 MANIFESTO — Tier 3, full-bleed deep teal ───────────────── */}
        <section className="lp-v2-manifesto">
          <div className="lp-v2-inner lp-v2-manifesto-inner">
            <LineReveal className="lp-v2-manifesto-line">The industry built its tools for the audience.</LineReveal>
            <LineReveal className="lp-v2-manifesto-line" delay={0.08}>That era is ending.</LineReveal>
            <LineReveal className="lp-v2-manifesto-line" delay={0.16}>Search changed. Commerce changed. How events get run is next.</LineReveal>
            <LineReveal className="lp-v2-manifesto-line lp-v2-manifesto-final" delay={0.24}>
              <MeMark size="1em" tone="soft" /> is that change.
            </LineReveal>
          </div>
        </section>

        {/* ── §3 THE TRUTH — warm, editorial numbered list ─────────────── */}
        <section className="lp-v2-truth">
          <div className="lp-v2-inner">
            <Reveal as="p" className="lp-v2-label">The real cost of running without a system</Reveal>
            <Reveal as="h2" className="lp-v2-h2 lp-v2-truth-h2">
              You didn’t lose that margin in a bad call. You lost it in a Tuesday WhatsApp thread.
            </Reveal>
            <ol className="lp-v2-trap-list">
              {traps.map(([num, name, body], i) => (
                <Reveal as="li" className="lp-v2-trap" key={num} delay={i * 0.08}>
                  <span className="lp-v2-trap-num">{num}</span>
                  <div className="lp-v2-trap-body">
                    <h3 className="lp-v2-trap-name">{name}</h3>
                    <p className="lp-v2-trap-text">{body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ════ §4–§9 follow in commit 2/3 · §10–§12 next pass ════ */}
        <div className="lp-v2-temp-end">
          <span>§4–§12 in progress — landing V2 build</span>
        </div>
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLES — co-located, all selectors fenced under .lp-v2
   ════════════════════════════════════════════════════════════════════════ */
const CSS = `
/* ── Self-fence: own the type scale so app element defaults don't cascade ── */
.lp-v2 {
  background: var(--app-bg);
  color: var(--app-ink);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.lp-v2 *, .lp-v2 *::before, .lp-v2 *::after { box-sizing: border-box; }
.lp-v2 h1, .lp-v2 h2, .lp-v2 h3, .lp-v2 p, .lp-v2 ol, .lp-v2 li, .lp-v2 span { margin: 0; }
.lp-v2 ol { list-style: none; padding: 0; }
.lp-v2 ::selection { background: var(--brand-teal-soft); color: var(--brand-teal-deep); }

.lp-v2-inner { width: 100%; max-width: 1080px; margin: 0 auto; padding-left: 24px; padding-right: 24px; }

/* ── Brand mark placeholder ── */
.lp-v2-memark { display: inline-flex; align-items: baseline; line-height: 1; letter-spacing: -0.03em; white-space: nowrap; }
.lp-v2-memark .memark-m { font-family: var(--font-brand); font-weight: 900; }
.lp-v2-memark .memark-e { font-family: var(--font-sub); font-weight: 900; font-style: italic; margin-left: -0.02em; }
.lp-v2-memark--teal { color: var(--brand-teal); }
.lp-v2-memark--soft { color: var(--brand-teal-soft); }

/* ── Shared type roles ── */
.lp-v2-eyebrow { font-family: var(--font-body); font-size: 13px; font-weight: 500; letter-spacing: 0.04em; color: var(--app-text-dim); max-width: 30em; }
.lp-v2-label { font-family: var(--font-body); font-size: 11px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--app-text-dim-lg); }
.lp-v2-h2 { font-family: var(--font-heading); font-weight: 500; font-size: clamp(28px, 4.4vw, 46px); line-height: 1.12; letter-spacing: -0.01em; color: var(--app-ink); }

/* ── Buttons / links ── */
.lp-v2-btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.4em;
  background: var(--brand-teal); color: #FFFFFF;
  font-family: var(--font-body); font-size: 15px; font-weight: 500; line-height: 1;
  border: none; border-radius: var(--radius); padding: 13px 22px; cursor: pointer;
  transition: background var(--dur-quick) var(--ease-out), transform var(--dur-quick) var(--ease-out);
}
.lp-v2-btn-primary:hover { background: var(--brand-teal-deep); transform: translateY(-1px); }
.lp-v2-btn-primary:active { transform: translateY(0); }
.lp-v2-btn-primary:disabled { opacity: 0.6; cursor: default; transform: none; }
.lp-v2-btn-sm { padding: 9px 16px; font-size: 14px; }
.lp-v2-link {
  font-family: var(--font-body); font-size: 14px; font-weight: 400; color: var(--app-text-dim);
  background: none; border: none; padding: 0; cursor: pointer; text-decoration: none;
  transition: color var(--dur-quick) var(--ease-out);
}
.lp-v2-link:hover { color: var(--app-ink); text-decoration: underline; text-underline-offset: 3px; }
.lp-v2-link-strong { font-size: 15px; font-weight: 500; color: var(--brand-teal); }

/* ── Header ── */
.lp-v2-header {
  position: sticky; top: 0; z-index: 50;
  background: color-mix(in srgb, var(--app-bg) 88%, transparent);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-bottom: 0.5px solid var(--app-border);
}
.lp-v2-header-inner { max-width: 1080px; margin: 0 auto; padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; }
.lp-v2-brand { display: inline-flex; align-items: center; text-decoration: none; }
.lp-v2-header-nav { display: flex; align-items: center; gap: 22px; }

/* ── §1 Hero ── */
.lp-v2-hero { padding: clamp(72px, 13vh, 168px) 0 clamp(56px, 10vh, 120px); }
.lp-v2-hero-inner { display: flex; flex-direction: column; }
.lp-v2-hero .lp-v2-eyebrow { margin-bottom: clamp(28px, 5vh, 56px); }
.lp-v2-hero-h1 { margin-bottom: clamp(28px, 4vh, 40px); }
.lp-v2-hero-h1-wrap { display: block; }
.lp-v2-hero-line {
  display: block; font-family: var(--font-heading); font-weight: 500;
  font-size: clamp(40px, 8.5vw, 88px); line-height: 1.02; letter-spacing: -0.02em; color: var(--app-ink);
}
.lp-v2-hero-sub { font-family: var(--font-body); font-size: clamp(17px, 2vw, 20px); font-weight: 400; line-height: 1.5; color: var(--app-text-dim); max-width: 30em; margin-bottom: clamp(32px, 5vh, 48px); }
.lp-v2-hero-ctas { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }

/* ── §2 Manifesto (Tier 3, full-bleed deep teal) ── */
.lp-v2-manifesto { background: var(--brand-teal-deep); padding: clamp(96px, 20vh, 220px) 0; }
.lp-v2-manifesto-inner { max-width: 920px; }
.lp-v2-manifesto-line {
  font-family: var(--font-heading); font-weight: 400;
  font-size: clamp(28px, 5vw, 58px); line-height: 1.16; letter-spacing: -0.01em;
  color: var(--brand-teal-soft); margin-bottom: clamp(28px, 5vh, 56px);
}
.lp-v2-manifesto-final { display: flex; align-items: baseline; gap: 0.28em; flex-wrap: wrap; margin-top: clamp(40px, 8vh, 96px); margin-bottom: 0; font-size: clamp(34px, 6.5vw, 76px); }
.lp-v2-manifesto-final .lp-v2-memark { font-size: 1.05em; transform: translateY(0.02em); }

/* ── §3 Truth (warm, numbered list) ── */
.lp-v2-truth { padding: clamp(80px, 14vh, 144px) 0; }
.lp-v2-truth .lp-v2-label { margin-bottom: 20px; }
.lp-v2-truth-h2 { max-width: 18em; margin-bottom: clamp(48px, 8vh, 88px); }
.lp-v2-trap-list { display: flex; flex-direction: column; gap: clamp(36px, 6vh, 64px); }
.lp-v2-trap { display: grid; grid-template-columns: minmax(64px, 88px) 1fr; gap: clamp(20px, 4vw, 48px); align-items: start; max-width: 900px; }
.lp-v2-trap-num { font-family: var(--font-mono); font-size: clamp(22px, 3vw, 30px); font-weight: 500; color: var(--brand-teal); line-height: 1; padding-top: 0.18em; }
.lp-v2-trap-name { font-family: var(--font-heading); font-weight: 600; font-size: clamp(22px, 2.8vw, 30px); line-height: 1.15; color: var(--app-ink); margin-bottom: 10px; }
.lp-v2-trap-text { font-family: var(--font-body); font-size: 16px; font-weight: 400; line-height: 1.6; color: var(--app-text-dim); max-width: 34em; }

/* ── Request-access modal ── */
.lp-v2-modal-overlay { position: fixed; inset: 0; z-index: 100; background: var(--modal-overlay); backdrop-filter: blur(var(--modal-blur)); -webkit-backdrop-filter: blur(var(--modal-blur)); }
.lp-v2-modal {
  position: fixed; z-index: 101; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: calc(100vw - 32px); max-width: 460px; max-height: calc(100vh - 32px); overflow-y: auto;
  background: var(--app-bg); border: 0.5px solid var(--app-border); border-radius: var(--radius-lg);
  box-shadow: var(--elev-3); padding: 32px;
  font-family: var(--font-body); color: var(--app-ink);
}
.lp-v2-modal-title { font-family: var(--font-heading); font-weight: 600; font-size: 28px; line-height: 1.15; color: var(--app-ink); margin-bottom: 8px; }
.lp-v2-modal-sub { font-size: 14px; line-height: 1.55; color: var(--app-text-dim); margin-bottom: 22px; }
.lp-v2-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; flex: 1; }
.lp-v2-field-row { display: flex; gap: 14px; }
.lp-v2-field label { font-size: 12px; font-weight: 500; color: var(--app-text-dim); }
.lp-v2-field label .req { color: var(--brand-teal); }
.lp-v2-field input {
  font-family: var(--font-body); font-size: 15px; color: var(--app-ink);
  background: #FFFFFF; border: 0.5px solid var(--app-border); border-radius: var(--radius-sm);
  padding: 10px 12px; outline: none; transition: border-color var(--dur-quick) var(--ease-out);
}
.lp-v2-field input:focus { border-color: var(--brand-teal); box-shadow: 0 0 0 3px var(--brand-teal-dim); }
.lp-v2-modal-err { font-size: 13px; color: var(--state-danger); margin: 4px 0 12px; line-height: 1.5; }
.lp-v2-modal-actions { display: flex; align-items: center; justify-content: flex-end; gap: 20px; margin-top: 22px; }
.lp-v2-modal-done { text-align: left; }
.lp-v2-modal-done .lp-v2-btn-primary { margin-top: 22px; }
.lp-v2-modal-x { position: absolute; top: 14px; right: 16px; background: none; border: none; font-size: 24px; line-height: 1; color: var(--app-text-dim-lg); cursor: pointer; padding: 4px; }
.lp-v2-modal-x:hover { color: var(--app-ink); }

/* ── Temporary build close (removed when §4–§12 land) ── */
.lp-v2-temp-end { padding: 80px 24px; text-align: center; border-top: 0.5px dashed var(--app-border); }
.lp-v2-temp-end span { font-family: var(--font-mono); font-size: 12px; color: var(--app-text-dim-lg); letter-spacing: 0.04em; }

/* ── Responsive ── */
@media (max-width: 600px) {
  .lp-v2-hide-phone { display: none; }
  .lp-v2-field-row { flex-direction: column; gap: 0; }
  .lp-v2-trap { grid-template-columns: 1fr; gap: 8px; }
  .lp-v2-trap-num { padding-top: 0; }
  .lp-v2-hero-ctas { gap: 18px; }
}

/* ── Reduced motion: stop any token-driven transitions ── */
@media (prefers-reduced-motion: reduce) {
  .lp-v2 * { transition: none !important; animation: none !important; }
  .lp-v2 html { scroll-behavior: auto; }
}

/* ── Radix dialog enter/exit (CSS; disabled under reduced motion above) ── */
@keyframes lpv2-overlay-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes lpv2-modal-in { from { opacity: 0; transform: translate(-50%, -48%) scale(0.98); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.lp-v2-modal-overlay[data-state="open"] { animation: lpv2-overlay-in var(--dur-modal-in) var(--ease-out); }
.lp-v2-modal[data-state="open"] { animation: lpv2-modal-in var(--dur-modal-in) var(--ease-out); }
`;
