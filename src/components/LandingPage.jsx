import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useMotionValueEvent, useInView, useReducedMotion, animate } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { supabase } from "../supabase";
import meMarkSvg from "../assets/brand/me-mark.svg?raw";
import dashboardShot from "../assets/landing/dashboard.png";
import elementsShot from "../assets/landing/elements.png";
import tasksShot from "../assets/landing/tasks.png";
import rateLibraryShot from "../assets/landing/rate-library.png";

/* ════════════════════════════════════════════════════════════════════════
   ME LANDING PAGE — V2  ·  route "/"  ·  editorial-quiet
   Tokens consumed from the REAL src/index.css :root (--brand-* / --app-*).
   Nothing is redeclared here. Typography is self-fenced under .lp-v2 so the
   app's global element defaults (body{font-size:15px}) can't cascade in.
   Motion = framer-motion v12 only. Prerender-safe: all copy is in the DOM and
   visible without JS; reveals only animate transform/opacity after mount;
   sticky scroll-tells are a desktop-only enhancement over a static baseline.
   Build status: §1–§6 done. §7–§9 + §10–§12 follow — temporary close below.
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
      style={{ width: size, height: size }}
      role="img"
      aria-label="Me"
      dangerouslySetInnerHTML={{ __html: meMarkSvg }}
    />
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

/* ── Product screenshot slot — captioned placeholder, swappable later ─────
   Image drops in at the .lp-v2-slot-frame. App Red is the product-layer cue
   (top accent + dot) — the only place red appears on this page. */
/* ── MacBook device frame ─────────────────────────────────────────────────
   Realistic silhouette (lid + bezel + keyboard deck + trackpad), re-skinned to
   neutral device greys. scrollOut → the lid opens + screen scales as it enters
   (hero showpiece only, desktop + motion on). Static bezel everywhere else. */
function MacBookKeyboard() {
  const rows = [13, 13, 13, 12, 11];
  return (
    <div className="lp-v2-mb-keys" aria-hidden="true">
      {rows.map((n, r) => (
        <div className="lp-v2-mb-krow" key={r}>
          {Array.from({ length: n }).map((_, k) => <i key={k} />)}
        </div>
      ))}
      <div className="lp-v2-mb-krow lp-v2-mb-krow--space"><i /><i className="lp-v2-mb-space" /><i /></div>
    </div>
  );
}

function MacBook({ src, alt = "", variant = "slot", fey = null }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const lidRotateIn = useTransform(scrollYProgress, [0.04, 0.42], [14, 0]);
  const shotScaleIn = useTransform(scrollYProgress, [0.04, 0.42], [1.12, 1]);
  const liftY = useTransform(scrollYProgress, [0, 1], [34, -34]);

  const lidStyle = fey
    ? { rotateX: fey.lidRotate, transformOrigin: "50% 100%", transformPerspective: 1800 }
    : { rotateX: lidRotateIn, y: liftY, transformOrigin: "50% 100%", transformPerspective: 1600 };
  const shotStyle = fey ? { scale: fey.screenScale } : { scale: shotScaleIn };

  const lid = (
    <div className="lp-v2-mb-lid">
      <div className="lp-v2-mb-bezel">
        <span className="lp-v2-mb-cam" aria-hidden="true" />
        <div className="lp-v2-mb-screen">
          {fey
            ? <motion.img className="lp-v2-mb-shot" src={src} alt={alt} decoding="async" style={shotStyle} />
            : <img className="lp-v2-mb-shot" src={src} alt={alt} decoding="async" />}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`lp-v2-mb lp-v2-mb--${variant}`} ref={fey ? null : ref}>
      {fey ? (
        <motion.div className="lp-v2-mb-lidwrap" style={lidStyle}>{lid}</motion.div>
      ) : (
        <div className="lp-v2-mb-lidwrap">{lid}</div>
      )}
      <div className="lp-v2-mb-deck" aria-hidden="true">
        <div className="lp-v2-mb-hinge" />
        <MacBookKeyboard />
        <div className="lp-v2-mb-trackpad" />
        <div className="lp-v2-mb-lip" />
      </div>
    </div>
  );
}

/* ── Phone device frame (B4) ──────────────────────────────────────────────
   Ready to receive REAL portrait mobile app screens (Vikram provides them).
   Not wired to any desktop shot — desktop tables look cramped in a phone. */
function PhoneFrame({ src, alt = "", caption }) {
  return (
    <Reveal className="lp-v2-slot lp-v2-slot--phone">
      <div className="lp-v2-phone">
        <div className="lp-v2-phone-body">
          <span className="lp-v2-phone-island" aria-hidden="true" />
          <div className="lp-v2-phone-screen">
            {src
              ? <img src={src} alt={alt} decoding="async" />
              : <span className="lp-v2-phone-label">Mobile app screen — coming</span>}
          </div>
        </div>
      </div>
      {caption && <p className="lp-v2-slot-caption">{caption}</p>}
    </Reveal>
  );
}

function ProductSlot({ src, alt = "", caption, size = "lg", tone = "warm" }) {
  const variant = size === "pin" ? "pin" : (size === "md" ? "md" : "slot");
  return (
    <Reveal className={`lp-v2-slot lp-v2-slot--${size} lp-v2-slot--${tone}`}>
      {src
        ? <MacBook src={src} alt={alt} variant={variant} />
        : <div className="lp-v2-slot-frame"><span className="lp-v2-slot-label">Product preview — screenshot coming</span></div>}
      {caption && <p className="lp-v2-slot-caption">{caption}</p>}
    </Reveal>
  );
}

/* ── §1 hero showpiece — Full Fey scroll-out ──────────────────────────────
   Pinned region: as you scroll, the laptop scales up + the lid opens + the
   screen content scales so it "comes out of the screen" to near-fill the
   viewport while the hero text scrolls away above. Desktop + motion only;
   static MacBook under reduced motion / mobile. */
function HeroMacBook({ enable, src }) {
  const ref = useRef(null);
  // Manual progress from the fey region's own position — reliable, unlike
  // useScroll({target}) which was binding to document scroll here.
  const mbScale = useMotionValue(0.86);
  const lidRotate = useMotionValue(24);
  const screenScale = useMotionValue(1);
  useEffect(() => {
    if (!enable) return;
    const el = ref.current;
    const update = () => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const range = Math.max(1, rect.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -rect.top / range)); // 0 at pin start → 1 at pin release
      mbScale.set(0.86 + 0.46 * p);
      lidRotate.set(24 * (1 - Math.min(1, p / 0.42)));
      screenScale.set(1 + 0.3 * Math.min(1, Math.max(0, (p - 0.08) / 0.6)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [enable]);

  if (!enable) {
    return (
      <div className="lp-v2-hero-static">
        <MacBook variant="hero" src={src} alt="Me — your events dashboard" />
      </div>
    );
  }
  return (
    <div className="lp-v2-hero-fey" ref={ref}>
      <div className="lp-v2-hero-fey-pin">
        <motion.div className="lp-v2-hero-fey-mb" style={{ scale: mbScale }}>
          <MacBook variant="hero" src={src} alt="Me — your events dashboard" fey={{ lidRotate, screenScale }} />
        </motion.div>
      </div>
    </div>
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

  // Reset shortly after close so a re-open is clean.
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

/* ── §4 data ── */
const SVS_ROWS = [
  ["Built for", "The attendee", "The Event Manager"],
  ["Covers", "One slice", "The whole event business"],
  ["Lives", "Beside your work, one more login", "Where the work actually happens"],
  ["Your team", "Stitches it together in Excel + WhatsApp", "Works inside one system"],
  ["On event day", "You’re still reconciling", "You walk in ready — nothing left to figure out"],
  ["When the key person leaves", "The knowledge leaves too", "It stays in the system"],
];

/* A single comparison row whose reveal is driven by the pinned section's
   scroll progress (rows fill in top-to-bottom). */
function CompareRow({ progress, index, total }) {
  const span = 1 / (total + 1);
  const start = index * span;
  const end = start + span * 1.6;
  const opacity = useTransform(progress, [start, end], [0.18, 1]);
  const y = useTransform(progress, [start, end], [10, 0]);
  const [label, before, after] = SVS_ROWS[index];
  return (
    <motion.div className="lp-v2-cmp-row" style={{ opacity, y }}>
      <span className="lp-v2-cmp-label">{label}</span>
      <span className="lp-v2-cmp-before">{before}</span>
      <span className="lp-v2-cmp-after">{after}</span>
    </motion.div>
  );
}

/* ── §4 SOFTWARE vs OPERATING SYSTEM — Tier 2 sticky + product slot #1 ──── */
function SectionSoftwareVsOS({ enableSticky }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const meOpacity = useTransform(scrollYProgress, [0.8, 0.98], [0.25, 1]); // "Me" header settles LAST
  const meY = useTransform(scrollYProgress, [0.8, 0.98], [8, 0]);

  const intro = (
    <>
      <Reveal as="p" className="lp-v2-label">Software vs. operating system</Reveal>
      <Reveal as="h2" className="lp-v2-h2 lp-v2-svs-h2">
        Every event tool is software you add. <em>Me is the system it all runs on.</em>
      </Reveal>
      <Reveal as="p" className="lp-v2-lead">
        You’ve been told you need more tools — one for proposals, one for tasks, one for costs. So you stitched them together with Excel and WhatsApp, and became the integration yourself. Me isn’t another tool in the stack. Me is the stack.
      </Reveal>
    </>
  );

  const closer = (
    <>
      <Reveal as="p" className="lp-v2-svs-closer">
        Other platforms are built for the attendee. Me is built for Event Managers. They manage the audience. Me prepares you to run the show.
      </Reveal>
      <ProductSlot src={elementsShot} alt="Me — event elements with vendor rates and live subtotals" caption="Every element, every city — costed before you quote." />
    </>
  );

  if (!enableSticky) {
    // Static two-column table (mobile / reduced motion) — "Me" already settled.
    return (
      <section className="lp-v2-svs" ref={ref}>
        <div className="lp-v2-inner">
          {intro}
          <div className="lp-v2-cmp">
            <div className="lp-v2-cmp-head">
              <span className="lp-v2-cmp-label" />
              <span className="lp-v2-cmp-h-before">Event software</span>
              <span className="lp-v2-cmp-h-after"><MeMark size={28} tone="teal" /></span>
            </div>
            {SVS_ROWS.map(([label, before, after]) => (
              <div className="lp-v2-cmp-row" key={label}>
                <span className="lp-v2-cmp-label">{label}</span>
                <span className="lp-v2-cmp-before">{before}</span>
                <span className="lp-v2-cmp-after">{after}</span>
              </div>
            ))}
          </div>
          {closer}
        </div>
      </section>
    );
  }

  return (
    <section className="lp-v2-svs">
      <div className="lp-v2-inner">{intro}</div>
      <div className="lp-v2-svs-scroll" ref={ref}>
        <div className="lp-v2-svs-pin">
          <div className="lp-v2-inner">
            <div className="lp-v2-cmp">
              <div className="lp-v2-cmp-head">
                <span className="lp-v2-cmp-label" />
                <span className="lp-v2-cmp-h-before">Event software</span>
                <motion.span className="lp-v2-cmp-h-after" style={{ opacity: meOpacity, y: meY }}>
                  <MeMark size={28} tone="teal" />
                </motion.span>
              </div>
              {SVS_ROWS.map((row, i) => (
                <CompareRow key={row[0]} progress={scrollYProgress} index={i} total={SVS_ROWS.length} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="lp-v2-inner">{closer}</div>
    </section>
  );
}

/* ── §5 EVENT-DAY HONESTY — the quietest section ─────────────────────────── */
function SectionEventDayHonesty() {
  return (
    <section className="lp-v2-honesty">
      <div className="lp-v2-inner lp-v2-honesty-inner">
        <Reveal as="p" className="lp-v2-label">What Me won’t do</Reveal>
        <Reveal as="h2" className="lp-v2-h2 lp-v2-honesty-h2">
          Me won’t run your event. That’s your job — and you’re good at it.
        </Reveal>
        <Reveal className="lp-v2-honesty-body">
          <p>No system replaces what you’ve learned running real events. The instinct on the floor, the call you make when a vendor no-shows, the read on a client’s face — that’s craft. It’s yours. No software earns that, and any that claims to is lying to you.</p>
          <p>Event day isn’t for planning. It’s for execution. We’re not on the console with you — that’s your moment.</p>
          <p>What Me does is everything before that moment. Scope locked, costs tracked, tasks owned, team aligned — so you walk in with nothing left to figure out.</p>
        </Reveal>
        <Reveal as="p" className="lp-v2-honesty-close">
          The more you sweat in the planning, the less you bleed when the show is live.
        </Reveal>
      </div>
    </section>
  );
}

/* ── §6 data ── */
const PHASES = [
  { key: "Win", title: "Win it", steps: [
    ["Brief", "Capture what the client wants, structured from the first conversation."],
    ["Scope & cost", "Build every element, every city — and know the right rate before you quote."],
    ["Propose & win", "Turn it into a document the client says yes to."],
  ] },
  { key: "Build", title: "Build it", steps: [
    ["Build your team", "The right people on the event, by role and by city. Built once, there for the next one."],
    ["Plan & assign", "Everyone knows what they own, and by when."],
    ["Produce", "Branding, build, procurement — tracked to delivery."],
    ["Logistics", "Travel, stay, movement — handled."],
  ] },
  { key: "Run", title: "Run it", steps: [
    ["Coordinate", "The final mile. Confirm every vendor, absorb the last-minute asks, watch the pieces lock into place — until everyone’s on ground."],
    ["Run", "Every cue, every screen, every moment — mapped before the doors open."],
    ["Hand off", "Everything delivered, gathered, done."],
  ] },
  { key: "Repeat", title: "Repeat it", blurb: "Every event makes the next one faster. Last event’s work carries forward — start where you ended. Clone a similar event, keep what fits. Your elements, your team, your rates — already there, already yours." },
];

const UNDERNEATH = [
  "Smart where it helps. Heavy lifting where it saves you time, out of the way where your judgment matters.",
  "You own your data. Secured, private to your workspace, there whenever you need it.",
  "Nothing slips. Every change, every decision, timestamped — and a nudge when something needs you.",
  "Your workspace gets smarter as you work.",
];

function PhaseContent({ phase }) {
  return (
    <div className="lp-v2-phase">
      <span className="lp-v2-phase-kicker">{phase.title}</span>
      {phase.steps ? (
        <ul className="lp-v2-phase-steps">
          {phase.steps.map(([name, body]) => (
            <li key={name}>
              <span className="lp-v2-phase-step-name">{name}</span>
              <span className="lp-v2-phase-step-body">{body}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="lp-v2-phase-blurb">{phase.blurb}</p>
      )}
    </div>
  );
}

const REPEAT_SLOT = "Start where you ended — clone a past event, carry forward elements, team, rates.";

/* ── §6 LIFECYCLE — Tier 2 sticky, vertical-pinned + product slot #2 ─────── */
function SectionLifecycle({ enableSticky }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!enableSticky) return;
    // Map phases into the stuck window (~0–0.82) so the LAST phase (Repeat)
    // gets a real on-screen dwell before the pin releases at progress 1.
    const i = Math.min(PHASES.length - 1, Math.max(0, Math.floor((v / 0.82) * PHASES.length)));
    setActive(i);
  });

  const intro = (
    <>
      <Reveal as="p" className="lp-v2-label">From brief to happy client</Reveal>
      <Reveal as="h2" className="lp-v2-h2 lp-v2-life-h2">
        Your whole event, in one system. From the first brief to the final handover.
      </Reveal>
    </>
  );

  const underneath = (
    <div className="lp-v2-underneath">
      {UNDERNEATH.map((t, i) => (
        <Reveal as="p" className="lp-v2-underneath-line" key={i} delay={i * 0.06}>{t}</Reveal>
      ))}
    </div>
  );

  const payoff = (
    <Reveal as="p" className="lp-v2-life-payoff">
      By event day, there’s nothing left to chase. You walk in fearless. The event runs flawless.
    </Reveal>
  );

  if (!enableSticky) {
    // Static vertical sequence — all phases & steps present.
    return (
      <section className="lp-v2-life" id="features" ref={ref}>
        <div className="lp-v2-inner">
          {intro}
          <div className="lp-v2-life-seq">
            {PHASES.map((p) => (
              <div className="lp-v2-life-seq-item" key={p.key}>
                <PhaseContent phase={p} />
                {p.key === "Build" && (
                  <ProductSlot src={tasksShot} alt="Me — task board across the event team" size="md" />
                )}
              </div>
            ))}
          </div>
          {underneath}
          {payoff}
        </div>
      </section>
    );
  }

  return (
    <section className="lp-v2-life" id="features">
      <div className="lp-v2-inner">{intro}</div>
      <div className="lp-v2-life-scroll" ref={ref}>
        <div className="lp-v2-life-pin">
          <div className="lp-v2-inner lp-v2-life-stage">
            <div className="lp-v2-life-rail" aria-hidden="true">
              {PHASES.map((p, i) => (
                <span key={p.key} className={`lp-v2-life-rail-item${i === active ? " is-active" : ""}`}>{p.title}</span>
              ))}
            </div>
            <div className="lp-v2-life-frame">
              <AnimatePresence mode="wait">
                <motion.div
                  key={PHASES[active].key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  <PhaseContent phase={PHASES[active]} />
                  {(PHASES[active].key === "Build" || PHASES[active].key === "Run") && (
                    <ProductSlot src={tasksShot} alt="Me — task board across the event team" size="pin" />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      <div className="lp-v2-inner">
        {underneath}
        {payoff}
      </div>
    </section>
  );
}

/* ── Count-up — one sanctioned count-up (§8), once, prerender-safe ──────── */
function CountUp({ value, prefix = "", suffix = "", decimals = 0 }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [mounted, setMounted] = useState(false);
  const [display, setDisplay] = useState(value); // final value = no-JS / prerender baseline
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || reduce) { setDisplay(value); return; }
    if (!inView) { setDisplay(0); return; }
    const controls = animate(0, value, {
      duration: 1.1, ease: EASE,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [mounted, inView, value, reduce]);
  return <span ref={ref}>{prefix}{display.toFixed(decimals)}{suffix}</span>;
}

/* ── §7 WHO ME IS FOR — a pause ─────────────────────────────────────────── */
function SectionWhoFor() {
  return (
    <section className="lp-v2-who">
      <div className="lp-v2-inner lp-v2-who-inner">
        <Reveal as="h2" className="lp-v2-h2 lp-v2-who-h2">
          For the people who run the event. Not the ones who attend it.
        </Reveal>
        <Reveal className="lp-v2-who-body" delay={0.08}>
          <p>Me isn’t for selling tickets or scanning badges. If your job is the audience, there are tools for that.</p>
          <p>Me is for the person responsible for everything the audience never sees — the brief, the budget, the build, the final mile. The one who makes it look effortless.</p>
        </Reveal>
      </div>
    </section>
  );
}

/* ── §8 data ── */
const STATS = [
  { kind: "num", value: 32, prefix: "$", suffix: "B", decimals: 0, label: "India’s events market by 2035, growing at 7.6% a year." },
  { kind: "num", value: 17.9, suffix: "%", decimals: 1, label: "the annual growth of India’s event-software market: the fastest-rising in Asia-Pacific." },
  { kind: "text", text: "First", label: "the first operating system built for the Event Manager, not the attendee." },
];

/* ── §8 WHY INDIA. WHY NOW. ─────────────────────────────────────────────── */
function SectionWhyIndia() {
  return (
    <section className="lp-v2-why">
      <div className="lp-v2-inner">
        <Reveal as="p" className="lp-v2-label">Why India. Why now.</Reveal>
        <Reveal as="h2" className="lp-v2-h2 lp-v2-why-h2">
          The fastest-growing event market in the world finally has a system built for the people running it.
        </Reveal>
        <Reveal as="p" className="lp-v2-lead lp-v2-why-lead">
          India runs more events, in more cities, with more moving parts than almost anywhere. And until now, the people running them were doing it on borrowed tools — spreadsheets built for accountants, chat apps built for friends.
        </Reveal>
        <div className="lp-v2-stats">
          {STATS.map((s, i) => (
            <Reveal className="lp-v2-stat" key={i} delay={i * 0.1}>
              <span className="lp-v2-stat-num">
                {s.kind === "num"
                  ? <CountUp value={s.value} prefix={s.prefix || ""} suffix={s.suffix || ""} decimals={s.decimals} />
                  : s.text}
              </span>
              <span className="lp-v2-stat-label">{s.label}</span>
            </Reveal>
          ))}
        </div>
        <Reveal as="p" className="lp-v2-why-category">
          The big platforms manage the audience — tickets, check-in, the guest list. None were built for the people running the show. That’s the system Me is. Born in India, built for the Event Managers of the world.
        </Reveal>
        <ProductSlot src={rateLibraryShot} alt="Me — Rate Intelligence Library: 239 benchmarks across Indian cities" caption="239 rate benchmarks across every major Indian city — the proprietary library behind every quote." tone="dark" />
        <Reveal as="p" className="lp-v2-why-source">
          Market figures — Expert Market Research, Grand View Research, 2025–26.
        </Reveal>
      </div>
    </section>
  );
}

/* ── §9 BACKSTAGE CRESCENDO — Tier 3, deep teal, emotional peak ──────────── */
function SectionCrescendo() {
  return (
    <section className="lp-v2-crescendo">
      <div className="lp-v2-inner lp-v2-crescendo-inner">
        <LineReveal className="lp-v2-crescendo-h2">The best Event Managers are the ones you never notice.</LineReveal>
        <LineReveal className="lp-v2-crescendo-p" delay={0.06}>When it works, no one sees the work. The client doesn’t see the 2am call, the vendor who fell through, the plan you rebuilt twice. They see a flawless event and think it was easy.</LineReveal>
        <LineReveal className="lp-v2-crescendo-p" delay={0.1}>That’s the job. To carry all of it, and make it look like nothing.</LineReveal>
        <LineReveal className="lp-v2-crescendo-p" delay={0.1}>Me carries it with you. Every element, every cost, every task, every change — held in one place, so it’s not all on you and your memory anymore.</LineReveal>
        <div className="lp-v2-crescendo-pivot">
          <LineReveal className="lp-v2-crescendo-pivot-line is-before">Stop being the person everything depends on.</LineReveal>
          <LineReveal className="lp-v2-crescendo-pivot-line is-after" delay={0.1}>Start being the person who built the system everything runs on.</LineReveal>
        </div>
        <LineReveal className="lp-v2-crescendo-final" amount={0.7}>
          You still won’t be the one they applaud. But you’ll be the one who was never afraid.
        </LineReveal>
      </div>
    </section>
  );
}

/* ── §10 EARLY ACCESS — warm, the ask ───────────────────────────────────── */
function SectionEarlyAccess({ openModal }) {
  return (
    <section className="lp-v2-early" id="early-access">
      <div className="lp-v2-inner lp-v2-early-inner">
        <Reveal as="p" className="lp-v2-label">Early access</Reveal>
        <Reveal as="h2" className="lp-v2-h2 lp-v2-early-h2">Me isn’t finished. That’s exactly why you want in now.</Reveal>
        <Reveal as="p" className="lp-v2-early-body">
          We’re letting Event Managers in a few at a time — so we can build this with you, fix fast, and shape Me around how you actually run events. It’s early. Some edges are rough. But the ones who get in now help decide what it becomes — and keep founder benefits for good.
        </Reveal>
        <Reveal as="p" className="lp-v2-early-onramp">
          You don’t start from scratch — unless you want to. Me walks you through your first event step by step, or start from a cost sheet you already have. Either way, you’re only ever filling in what only you know.
        </Reveal>
        <Reveal className="lp-v2-early-action">
          <button className="lp-v2-btn-primary" type="button" onClick={openModal}>Request access →</button>
          <span className="lp-v2-early-spots">We open a limited number of spots each week.</span>
        </Reveal>
        <Reveal as="p" className="lp-v2-early-skip">
          Have a code from someone already inside?{" "}
          <button className="lp-v2-link lp-v2-link-strong" type="button" onClick={openModal}>Skip the line.</button>
        </Reveal>
        <Reveal as="p" className="lp-v2-early-reassure">No card. No commitment. We’ll reach out personally as your spot opens.</Reveal>
      </div>
    </section>
  );
}

/* ── §11 GOING INTERNATIONAL — Horizon hero, third deep-teal anchor ──────── */
function SectionInternational({ openModal, enableParallax }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const driftY = useTransform(scrollYProgress, [0, 1], [44, -44]);
  return (
    <section className="lp-v2-intl" ref={ref}>
      <div className="lp-v2-inner lp-v2-intl-inner">
        <Reveal as="p" className="lp-v2-label lp-v2-intl-label">Built in India. Going global.</Reveal>
        {enableParallax ? (
          <motion.h2 className="lp-v2-h2 lp-v2-intl-h2" style={{ y: driftY }}>Wherever you run events, Me is coming.</motion.h2>
        ) : (
          <h2 className="lp-v2-h2 lp-v2-intl-h2">Wherever you run events, Me is coming.</h2>
        )}
        <Reveal as="p" className="lp-v2-intl-body">
          Me works today, wherever you are. A regional experience — tuned to your market — arrives in Beta 2. Get in now, and you’ll be first when it lands.
        </Reveal>
        <Reveal className="lp-v2-intl-cta">
          <button className="lp-v2-btn-primary lp-v2-btn-on-dark" type="button" onClick={openModal}>Request access →</button>
        </Reveal>
      </div>
    </section>
  );
}

/* ── §12 FOOTER — deep-teal close ────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="lp-v2-footer">
      <div className="lp-v2-inner lp-v2-footer-inner">
        <div className="lp-v2-footer-top">
          <div className="lp-v2-footer-brand">
            <p className="lp-v2-footer-tagline">
              <MeMark size="1.05em" tone="soft" /> My Events. My System. Born in India, built for the Event Managers of the world.
            </p>
            <p className="lp-v2-footer-maker">
              Built by Myoozz Consulting.{" "}
              <a href="https://myoozz.events" target="_blank" rel="noopener noreferrer" className="lp-v2-footer-link">Visit Myoozz →</a>
            </p>
          </div>
          <div className="lp-v2-footer-cols">
            <div className="lp-v2-footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#early-access">Early Access</a>
              <a href={DEMO_URL} target="_blank" rel="noopener noreferrer">Try the Demo</a>
            </div>
            <div className="lp-v2-footer-col">
              <h4>Company</h4>
              <a href="mailto:hello@myoozz.events">Contact</a>
              <a href="mailto:hello@myoozz.events">hello@myoozz.events</a>
            </div>
            <div className="lp-v2-footer-col">
              <h4>Legal</h4>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
            </div>
          </div>
        </div>
        <div className="lp-v2-footer-bottom">
          <span>© 2026 Myoozz Consulting Pvt. Ltd. · myoozz.events</span>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const reduce = useReducedMotion();
  const [modalOpen, setModalOpen] = useState(false);

  // Desktop gate for heavy motion (parallax, sticky scroll-tells).
  // Starts false → static, fully-visible baseline (prerender-safe); enhances after mount.
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
  const enableSticky = isDesktop && !reduce;

  // D2 — header condenses once you scroll past the top of the hero.
  const [condensed, setCondensed] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setCondensed(v > 120));

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
      <header className={`lp-v2-header${condensed ? " is-condensed" : ""}`}>
        <div className="lp-v2-header-inner">
          <a href="/" className="lp-v2-brand" aria-label="Me — home">
            <MeMark size={condensed ? 26 : 36} tone="teal" />
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
          <HeroMacBook enable={enableSticky} src={dashboardShot} />
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

        {/* ── §4 · §5 · §6 ─────────────────────────────────────────────── */}
        <SectionSoftwareVsOS enableSticky={enableSticky} />
        <SectionEventDayHonesty />
        <SectionLifecycle enableSticky={enableSticky} />

        {/* ── §7 · §8 · §9 ─────────────────────────────────────────────── */}
        <SectionWhoFor />
        <SectionWhyIndia />
        <SectionCrescendo />

        {/* ── §10 · §11 ─────────────────────────────────────────────────── */}
        <SectionEarlyAccess openModal={openModal} />
        <SectionInternational openModal={openModal} enableParallax={parallaxOn} />
      </main>

      {/* ── §12 ─────────────────────────────────────────────────────────── */}
      <Footer />
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
.lp-v2 h1, .lp-v2 h2, .lp-v2 h3, .lp-v2 p, .lp-v2 ol, .lp-v2 ul, .lp-v2 li, .lp-v2 span { margin: 0; }
.lp-v2 ol, .lp-v2 ul { list-style: none; padding: 0; }
.lp-v2 ::selection { background: var(--brand-teal-soft); color: var(--brand-teal-deep); }

.lp-v2-inner { width: 100%; max-width: 1080px; margin: 0 auto; padding-left: 24px; padding-right: 24px; }

/* ── Brand mark placeholder ── */
.lp-v2-memark { display: inline-flex; align-items: center; justify-content: center; line-height: 0; vertical-align: -0.14em; }
.lp-v2-memark svg { width: 100%; height: 100%; display: block; }
.lp-v2-memark--teal { color: var(--brand-teal); }
.lp-v2-memark--soft { color: var(--brand-teal-soft); }

/* ── Shared type roles ── */
.lp-v2-eyebrow { font-family: var(--font-body); font-size: 13px; font-weight: 500; letter-spacing: 0.04em; color: var(--app-text-dim); max-width: 30em; }
.lp-v2-label { font-family: var(--font-body); font-size: 11px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--app-text-dim-lg); }
.lp-v2-h2 { font-family: var(--font-heading); font-weight: 500; font-size: clamp(28px, 4.4vw, 46px); line-height: 1.12; letter-spacing: -0.01em; color: var(--app-ink); }
.lp-v2-h2 em { font-style: italic; color: var(--brand-teal); }
.lp-v2-lead { font-family: var(--font-body); font-size: 17px; line-height: 1.6; color: var(--app-text-dim); max-width: 38em; }

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
  background: transparent;
  border-bottom: 0.5px solid transparent;
  transition: background var(--dur-reveal) var(--ease-out), border-color var(--dur-reveal) var(--ease-out);
}
.lp-v2-header.is-condensed {
  background: color-mix(in srgb, var(--app-bg) 86%, transparent);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-bottom-color: var(--app-border);
}
.lp-v2-header-inner { max-width: 1080px; margin: 0 auto; padding: 0 24px; height: 88px; display: flex; align-items: center; justify-content: space-between; transition: height var(--dur-reveal) var(--ease-out); }
.lp-v2-header.is-condensed .lp-v2-header-inner { height: 60px; }
.lp-v2-header .lp-v2-memark { transition: width var(--dur-reveal) var(--ease-out), height var(--dur-reveal) var(--ease-out); }
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
.lp-v2-manifesto-final .lp-v2-memark { font-size: 1.05em; }

/* ── §3 Truth (warm, numbered list) ── */
.lp-v2-truth { padding: clamp(80px, 14vh, 144px) 0; }
.lp-v2-truth .lp-v2-label { margin-bottom: 20px; }
.lp-v2-truth-h2 { max-width: 18em; margin-bottom: clamp(48px, 8vh, 88px); }
.lp-v2-trap-list { display: flex; flex-direction: column; gap: clamp(36px, 6vh, 64px); }
.lp-v2-trap { display: grid; grid-template-columns: minmax(64px, 88px) 1fr; gap: clamp(20px, 4vw, 48px); align-items: start; max-width: 900px; }
.lp-v2-trap-num { font-family: var(--font-mono); font-size: clamp(22px, 3vw, 30px); font-weight: 500; color: var(--brand-teal); line-height: 1; padding-top: 0.18em; }
.lp-v2-trap-name { font-family: var(--font-heading); font-weight: 600; font-size: clamp(22px, 2.8vw, 30px); line-height: 1.15; color: var(--app-ink); margin-bottom: 10px; }
.lp-v2-trap-text { font-family: var(--font-body); font-size: 16px; font-weight: 400; line-height: 1.6; color: var(--app-text-dim); max-width: 34em; }

/* ── §4 Software vs OS ── */
.lp-v2-svs { padding: clamp(80px, 14vh, 144px) 0; }
.lp-v2-svs .lp-v2-label { margin-bottom: 20px; }
.lp-v2-svs-h2 { max-width: 16em; margin-bottom: 28px; }
.lp-v2-svs .lp-v2-lead { margin-bottom: 8px; }
.lp-v2-svs-scroll { height: 200vh; }
.lp-v2-svs-pin { position: sticky; top: 0; min-height: 100vh; display: flex; align-items: center; }
.lp-v2-cmp { width: 100%; max-width: 900px; margin: clamp(40px,7vh,72px) 0 0; border-top: 0.5px solid var(--app-border); }
.lp-v2-cmp-head, .lp-v2-cmp-row { display: grid; grid-template-columns: minmax(110px, 0.9fr) 1fr 1.3fr; gap: clamp(16px, 3vw, 40px); align-items: center; }
.lp-v2-cmp-row { padding: 7px 0; }
.lp-v2-cmp-head { padding: 4px 0 16px; align-items: end; border-bottom: 0.5px solid var(--app-border); margin-bottom: 8px; }
.lp-v2-cmp-h-before { font-family: var(--font-body); font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--app-text-dim-lg); }
.lp-v2-cmp-h-after { font-family: var(--font-body); font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--brand-teal); display: inline-flex; }
.lp-v2-cmp-label { font-family: var(--font-body); font-size: 12px; font-weight: 500; letter-spacing: 0.03em; text-transform: uppercase; color: var(--app-text-dim-lg); }
.lp-v2-cmp-before { font-family: var(--font-body); font-size: 15px; line-height: 1.4; color: var(--app-text-dim-lg); }
.lp-v2-cmp-after { font-family: var(--font-heading); font-size: clamp(17px, 2vw, 23px); font-weight: 500; line-height: 1.22; color: var(--app-ink); background: var(--app-bg); border: 0.5px solid var(--app-border); border-radius: var(--radius-md); box-shadow: var(--elev-2); padding: 13px 18px; transition: transform var(--dur-reveal) var(--ease-out), box-shadow var(--dur-reveal) var(--ease-out); }
.lp-v2-cmp-after:hover { transform: translateY(-3px); box-shadow: var(--elev-3); }
.lp-v2-svs-closer { font-family: var(--font-heading); font-size: clamp(20px, 2.6vw, 30px); font-weight: 400; font-style: italic; line-height: 1.3; color: var(--app-ink); max-width: 24em; margin: clamp(56px, 9vh, 96px) 0 clamp(36px, 6vh, 56px); }

/* ── Product slot ── */
.lp-v2-slot { margin: clamp(28px, 5vh, 48px) auto 0; max-width: 1000px; }
.lp-v2-slot--md { max-width: 640px; margin-left: 0; }
.lp-v2-slot--pin { max-width: 660px; margin-top: 24px; }
.lp-v2-slot-frame { position: relative; width: 100%; min-height: 96px; background: var(--app-surface); border: 1px solid var(--app-border); border-top: 3px solid var(--app-accent); border-radius: var(--radius); overflow: hidden; display: flex; align-items: center; justify-content: center; }
.lp-v2-slot-frame img { display: block; width: 100%; height: auto; }
.lp-v2-slot--pin .lp-v2-slot-frame img { max-height: 290px; object-fit: cover; object-position: left top; }
.lp-v2-slot--dark .lp-v2-slot-frame { background: var(--app-ratecard-dark); border-color: rgba(255,255,255,0.10); border-top-color: var(--app-accent); }
.lp-v2-slot-label { font-family: var(--font-mono); font-size: 12px; color: var(--app-text-dim-lg); letter-spacing: 0.04em; }
.lp-v2-slot-caption { font-family: var(--font-body); font-size: 13px; color: var(--app-text-dim); margin-top: 12px; }

/* ── MacBook device frame ── */
.lp-v2-mb { width: 100%; max-width: 880px; margin: 0 auto; filter: drop-shadow(0 34px 54px rgba(26,16,8,0.20)); }
.lp-v2-mb--hero { max-width: 960px; margin: clamp(40px, 7vh, 80px) auto 0; }
.lp-v2-mb--md { max-width: 600px; margin: 0; }
.lp-v2-mb--pin { max-width: 480px; margin: 0; filter: drop-shadow(0 18px 30px rgba(26,16,8,0.16)); }
.lp-v2-mb-lidwrap { will-change: transform; }
.lp-v2-mb-lid { background: linear-gradient(160deg, #4c4c50, #2e2e31); border-radius: 16px 16px 4px 4px; padding: 8px 8px 0; box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.3); }
.lp-v2-mb-bezel { position: relative; background: #0b0b0d; border-radius: 9px 9px 2px 2px; padding: 14px 14px 16px; }
.lp-v2-mb-cam { position: absolute; top: 5px; left: 50%; transform: translateX(-50%); width: 5px; height: 5px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #3c3c44, #141418); }
.lp-v2-mb-screen { aspect-ratio: 16 / 10; border-radius: 1px; overflow: hidden; background: var(--app-surface); box-shadow: inset 0 0 0 1px rgba(0,0,0,0.6); }
.lp-v2-mb-shot { display: block; width: 100%; height: 100%; object-fit: cover; object-position: left top; }
.lp-v2-mb-deck { position: relative; width: 102%; margin-left: -1%; }
.lp-v2-mb-hinge { height: 10px; background: linear-gradient(#1d1d20, #3a3a3e 50%, #141416); border-radius: 0 0 2px 2px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5); margin: 0 2%; }
.lp-v2-mb-keys { background: linear-gradient(#d4d0c9, #bbb7af); border-radius: 2px 2px 0 0; padding: 16px 5% 8px; display: flex; flex-direction: column; gap: 5px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.55); }
.lp-v2-mb-krow { display: flex; gap: 5px; justify-content: center; }
.lp-v2-mb-krow i { flex: 1; height: 15px; border-radius: 3px; background: linear-gradient(#35353b, #222226); box-shadow: 0 1px 1px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05); }
.lp-v2-mb-space { flex: 6 !important; }
.lp-v2-mb-trackpad { width: 32%; height: 52px; margin: 12px auto 0; background: linear-gradient(#cbc7bf, #d6d2cb); border-radius: 7px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.10), inset 0 3px 6px rgba(0,0,0,0.04); }
.lp-v2-mb-lip { height: 12px; background: linear-gradient(#c6c2ba, #a4a098); border-radius: 0 0 13px 13px; position: relative; box-shadow: inset 0 1px 0 rgba(255,255,255,0.45); }
.lp-v2-mb-lip::after { content: ""; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 12%; height: 6px; background: #959189; border-radius: 0 0 7px 7px; }
.lp-v2-mb--pin .lp-v2-mb-krow i { height: 10px; }
.lp-v2-mb--pin .lp-v2-mb-trackpad { height: 36px; }
.lp-v2-mb--pin .lp-v2-mb-bezel { padding: 9px 9px 10px; }

/* ── §1 hero Fey scroll-out region ── */
.lp-v2-hero-static { margin-top: clamp(40px, 7vh, 80px); }
.lp-v2-hero-fey { height: 200vh; margin-top: clamp(16px, 3vh, 40px); }
.lp-v2-hero-fey-pin { position: sticky; top: 0; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.lp-v2-hero-fey-mb { width: 100%; max-width: 960px; transform-origin: 50% 58%; will-change: transform; }
.lp-v2-hero-fey-mb .lp-v2-mb { margin: 0 auto; }

/* ── Phone device frame (B4 — awaiting real mobile screens) ── */
.lp-v2-phone { width: 100%; max-width: 300px; margin: 0 auto; filter: drop-shadow(0 20px 36px rgba(26,16,8,0.20)); }
.lp-v2-phone-body { position: relative; background: linear-gradient(160deg, #3a3a3d, #222225); border-radius: 40px; padding: 10px; box-shadow: inset 0 0 0 2px rgba(255,255,255,0.06); }
.lp-v2-phone-island { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); width: 32%; height: 22px; background: #050506; border-radius: 14px; z-index: 2; }
.lp-v2-phone-screen { position: relative; aspect-ratio: 9 / 19.5; border-radius: 30px; overflow: hidden; background: var(--app-surface); display: flex; align-items: center; justify-content: center; }
.lp-v2-phone-screen img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
.lp-v2-phone-label { font-family: var(--font-mono); font-size: 11px; color: var(--app-text-dim-lg); text-align: center; padding: 0 16px; }

/* ── §6 static seq item ── */
.lp-v2-life-seq-item { display: flex; flex-direction: column; gap: 24px; }

/* ── §5 Event-day honesty (quietest) ── */
.lp-v2-honesty { background: var(--app-surface); padding: clamp(88px, 16vh, 160px) 0; }
.lp-v2-honesty-inner { max-width: 760px; }
.lp-v2-honesty .lp-v2-label { margin-bottom: 20px; }
.lp-v2-honesty-h2 { margin-bottom: 36px; max-width: 16em; }
.lp-v2-honesty-body p { font-family: var(--font-body); font-size: 17px; line-height: 1.7; color: var(--app-text-dim); margin-bottom: 22px; max-width: 40em; }
.lp-v2-honesty-body p:last-child { margin-bottom: 0; }
.lp-v2-honesty-close { font-family: var(--font-heading); font-size: clamp(22px, 3vw, 32px); font-weight: 400; font-style: italic; line-height: 1.3; color: var(--app-ink); margin-top: clamp(40px, 7vh, 72px); max-width: 20em; }

/* ── §6 Lifecycle ── */
.lp-v2-life { padding: clamp(80px, 14vh, 144px) 0; }
.lp-v2-life .lp-v2-label { margin-bottom: 20px; }
.lp-v2-life-h2 { max-width: 18em; margin-bottom: clamp(40px, 7vh, 72px); }
.lp-v2-life-scroll { height: 360vh; }
.lp-v2-life-pin { position: sticky; top: 0; min-height: 100vh; display: flex; align-items: center; }
.lp-v2-life-stage { display: grid; grid-template-columns: 150px 1fr; gap: clamp(24px, 5vw, 72px); align-items: center; width: 100%; }
.lp-v2-life-rail { display: flex; flex-direction: column; gap: 14px; }
.lp-v2-life-rail-item { font-family: var(--font-body); font-size: 14px; font-weight: 500; color: var(--app-text-dim-lg); opacity: 0.5; transition: opacity var(--dur-reveal) var(--ease-out), color var(--dur-reveal) var(--ease-out); }
.lp-v2-life-rail-item.is-active { opacity: 1; color: var(--brand-teal); }
.lp-v2-life-frame { min-height: 340px; }
.lp-v2-phase-kicker { display: block; font-family: var(--font-heading); font-size: clamp(28px, 4vw, 44px); font-weight: 500; color: var(--app-ink); margin-bottom: 24px; }
.lp-v2-phase-steps { display: flex; flex-direction: column; gap: 18px; }
.lp-v2-phase-steps li { display: flex; flex-direction: column; gap: 4px; max-width: 40em; }
.lp-v2-phase-step-name { font-family: var(--font-heading); font-size: 20px; font-weight: 600; line-height: 1.2; color: var(--app-ink); }
.lp-v2-phase-step-body { font-family: var(--font-body); font-size: 15px; line-height: 1.55; color: var(--app-text-dim); }
.lp-v2-phase-blurb { font-family: var(--font-heading); font-size: clamp(20px, 2.6vw, 28px); font-weight: 400; line-height: 1.4; color: var(--app-ink); max-width: 24em; }
.lp-v2-life-seq { display: flex; flex-direction: column; gap: clamp(40px, 7vh, 72px); margin-bottom: clamp(48px, 8vh, 80px); }
.lp-v2-underneath { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 40px; padding: clamp(40px, 7vh, 72px) 0 0; margin-top: clamp(40px, 6vh, 64px); border-top: 0.5px solid var(--app-border); }
.lp-v2-underneath-line { font-family: var(--font-body); font-size: 14px; line-height: 1.55; color: var(--app-text-dim-lg); max-width: 28em; }
.lp-v2-life-payoff { font-family: var(--font-heading); font-size: clamp(26px, 3.6vw, 40px); font-weight: 500; line-height: 1.2; color: var(--app-ink); max-width: 16em; margin-top: clamp(40px, 6vh, 64px); }

/* ── §7 Who Me is for (a pause) ── */
.lp-v2-who { padding: clamp(72px, 12vh, 128px) 0; }
.lp-v2-who-inner { max-width: 760px; }
.lp-v2-who-h2 { margin-bottom: 28px; max-width: 16em; }
.lp-v2-who-body p { font-family: var(--font-body); font-size: 17px; line-height: 1.7; color: var(--app-text-dim); margin-bottom: 18px; max-width: 38em; }
.lp-v2-who-body p:last-child { margin-bottom: 0; }

/* ── §8 Why India. Why now. ── */
.lp-v2-why { padding: clamp(80px, 14vh, 144px) 0; }
.lp-v2-why .lp-v2-label { margin-bottom: 20px; }
.lp-v2-why-h2 { max-width: 18em; margin-bottom: 28px; }
.lp-v2-why-lead { margin-bottom: clamp(48px, 8vh, 80px); }
.lp-v2-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(28px, 5vw, 56px); padding: clamp(40px, 6vh, 64px) 0; border-top: 0.5px solid var(--app-border); border-bottom: 0.5px solid var(--app-border); }
.lp-v2-stat { display: flex; flex-direction: column; gap: 14px; }
.lp-v2-stat-num { font-family: var(--font-mono); font-size: clamp(40px, 6vw, 72px); font-weight: 500; line-height: 1; color: var(--brand-teal); letter-spacing: -0.02em; }
.lp-v2-stat-label { font-family: var(--font-body); font-size: 14px; line-height: 1.5; color: var(--app-text-dim); max-width: 22em; }
.lp-v2-why-category { font-family: var(--font-heading); font-size: clamp(20px, 2.6vw, 28px); font-weight: 400; line-height: 1.35; color: var(--app-ink); max-width: 30em; margin: clamp(48px, 8vh, 80px) 0 clamp(20px, 3vh, 28px); }
.lp-v2-why-source { font-family: var(--font-body); font-size: 12px; color: var(--app-text-dim-lg); }

/* ── §9 Backstage crescendo (Tier 3, deep teal) ── */
.lp-v2-crescendo { background: var(--brand-teal-deep); padding: clamp(96px, 20vh, 220px) 0; }
.lp-v2-crescendo-inner { max-width: 900px; }
.lp-v2-crescendo-h2 { font-family: var(--font-heading); font-weight: 400; font-size: clamp(30px, 5vw, 60px); line-height: 1.14; letter-spacing: -0.01em; color: var(--brand-teal-soft); margin-bottom: clamp(40px, 7vh, 72px); }
.lp-v2-crescendo-p { font-family: var(--font-heading); font-weight: 400; font-size: clamp(20px, 2.8vw, 30px); line-height: 1.4; color: color-mix(in srgb, var(--brand-teal-soft) 82%, transparent); margin-bottom: clamp(24px, 4vh, 40px); max-width: 30em; }
.lp-v2-crescendo-pivot { margin: clamp(48px, 8vh, 88px) 0; }
.lp-v2-crescendo-pivot-line { font-family: var(--font-heading); font-size: clamp(24px, 3.4vw, 40px); line-height: 1.25; max-width: 22em; }
.lp-v2-crescendo-pivot-line.is-before { color: color-mix(in srgb, var(--brand-teal-soft) 55%, transparent); font-weight: 400; }
.lp-v2-crescendo-pivot-line.is-after { color: var(--brand-teal-soft); font-weight: 500; }
.lp-v2-crescendo-final { font-family: var(--font-heading); font-weight: 400; font-size: clamp(28px, 4.6vw, 56px); line-height: 1.2; color: #FFFFFF; max-width: 18em; margin-top: clamp(80px, 16vh, 200px); }

/* ── On-dark primary button (teal-soft fill for deep-teal surfaces) ── */
.lp-v2-btn-primary.lp-v2-btn-on-dark { background: var(--brand-teal-soft); color: var(--brand-teal-deep); }
.lp-v2-btn-primary.lp-v2-btn-on-dark:hover { background: #FFFFFF; }

/* ── §10 Early access (warm) ── */
.lp-v2-early { padding: clamp(80px, 14vh, 144px) 0; }
.lp-v2-early-inner { max-width: 760px; }
.lp-v2-early .lp-v2-label { margin-bottom: 20px; }
.lp-v2-early-h2 { margin-bottom: 28px; max-width: 16em; }
.lp-v2-early-body { font-family: var(--font-body); font-size: 17px; line-height: 1.7; color: var(--app-text-dim); max-width: 40em; margin-bottom: 24px; }
.lp-v2-early-onramp { font-family: var(--font-body); font-size: 16px; line-height: 1.65; color: var(--app-text-dim); max-width: 40em; margin-bottom: 36px; }
.lp-v2-early-action { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-bottom: 16px; }
.lp-v2-early-spots { font-family: var(--font-body); font-size: 13px; color: var(--app-text-dim-lg); }
.lp-v2-early-skip { font-family: var(--font-body); font-size: 14px; color: var(--app-text-dim); margin-bottom: 28px; }
.lp-v2-early-reassure { font-family: var(--font-body); font-size: 13px; color: var(--app-text-dim-lg); }

/* ── §11 Going international (Horizon — deep-teal-to-dawn) ── */
.lp-v2-intl { position: relative; overflow: hidden; background: var(--brand-teal-deep); padding: clamp(100px, 20vh, 220px) 0; }
.lp-v2-intl::before { content: ""; position: absolute; inset: 0; background: radial-gradient(130% 90% at 50% 128%, rgba(27,154,170,0.50), rgba(0,95,115,0.22) 42%, transparent 66%); pointer-events: none; }
.lp-v2-intl-inner { position: relative; z-index: 1; max-width: 900px; }
.lp-v2-intl-label { color: var(--brand-teal-soft); opacity: 0.72; margin-bottom: 24px; }
.lp-v2-intl-h2 { color: #FFFFFF; font-size: clamp(34px, 6vw, 72px); font-weight: 400; line-height: 1.08; margin-bottom: 28px; max-width: 14em; }
.lp-v2-intl-body { font-family: var(--font-body); font-size: clamp(16px, 1.8vw, 19px); line-height: 1.6; color: var(--brand-teal-soft); max-width: 34em; margin-bottom: 36px; }

/* ── §12 Footer (deep teal) ── */
.lp-v2-footer { background: var(--brand-teal-deep); padding: clamp(56px, 9vh, 88px) 0 clamp(28px, 4vh, 40px); }
.lp-v2-footer-top { display: flex; justify-content: space-between; gap: clamp(40px, 8vw, 96px); flex-wrap: wrap; margin-bottom: clamp(40px, 7vh, 64px); }
.lp-v2-footer-brand { max-width: 30em; }
.lp-v2-footer-tagline { font-family: var(--font-heading); font-size: clamp(18px, 2.2vw, 24px); font-weight: 400; line-height: 1.4; color: var(--brand-teal-soft); margin-bottom: 16px; }
.lp-v2-footer-tagline .lp-v2-memark { margin-right: 0.3em; vertical-align: -0.16em; }
.lp-v2-footer-maker { font-family: var(--font-body); font-size: 14px; color: color-mix(in srgb, var(--brand-teal-soft) 70%, transparent); }
.lp-v2-footer-link { color: var(--brand-aqua); text-decoration: none; }
.lp-v2-footer-link:hover { color: var(--brand-teal-soft); text-decoration: underline; }
.lp-v2-footer-cols { display: flex; gap: clamp(32px, 6vw, 72px); flex-wrap: wrap; }
.lp-v2-footer-col h4 { font-family: var(--font-body); font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: color-mix(in srgb, var(--brand-teal-soft) 55%, transparent); margin-bottom: 14px; }
.lp-v2-footer-col a { display: block; font-family: var(--font-body); font-size: 14px; color: var(--brand-teal-soft); text-decoration: none; margin-bottom: 10px; transition: color var(--dur-quick) var(--ease-out); }
.lp-v2-footer-col a:hover { color: #FFFFFF; }
.lp-v2-footer-bottom { border-top: 0.5px solid rgba(224,242,247,0.15); padding-top: 24px; }
.lp-v2-footer-bottom span { font-family: var(--font-body); font-size: 12px; color: color-mix(in srgb, var(--brand-teal-soft) 50%, transparent); }

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
.lp-v2-modal-done .lp-v2-btn-primary { margin-top: 22px; }
.lp-v2-modal-x { position: absolute; top: 14px; right: 16px; background: none; border: none; font-size: 24px; line-height: 1; color: var(--app-text-dim-lg); cursor: pointer; padding: 4px; }
.lp-v2-modal-x:hover { color: var(--app-ink); }

/* ── Temporary build close (removed when §7–§12 land) ── */
.lp-v2-temp-end { padding: 80px 24px; text-align: center; border-top: 0.5px dashed var(--app-border); }
.lp-v2-temp-end span { font-family: var(--font-mono); font-size: 12px; color: var(--app-text-dim-lg); letter-spacing: 0.04em; }

/* ── Responsive ── */
@media (max-width: 900px) {
  .lp-v2-underneath { grid-template-columns: 1fr; gap: 16px; }
  .lp-v2-stats { grid-template-columns: 1fr; gap: 32px; }
}
@media (max-width: 600px) {
  .lp-v2-hide-phone { display: none; }
  .lp-v2-field-row { flex-direction: column; gap: 0; }
  .lp-v2-trap { grid-template-columns: 1fr; gap: 8px; }
  .lp-v2-trap-num { padding-top: 0; }
  .lp-v2-hero-ctas { gap: 18px; }
  .lp-v2-cmp-head { display: none; }
  .lp-v2-cmp-row { grid-template-columns: 1fr; gap: 10px; padding: 12px 0; }
  .lp-v2-cmp-before { order: 2; }
  .lp-v2-cmp-after { order: 3; }
  .lp-v2-slot--md { margin-left: auto; }
}

/* ── Reduced motion: stop token-driven transitions/animations ── */
@media (prefers-reduced-motion: reduce) {
  .lp-v2 * { transition: none !important; animation: none !important; }
}

/* ── Radix dialog enter (CSS; disabled under reduced motion above) ── */
@keyframes lpv2-overlay-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes lpv2-modal-in { from { opacity: 0; transform: translate(-50%, -48%) scale(0.98); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.lp-v2-modal-overlay[data-state="open"] { animation: lpv2-overlay-in var(--dur-modal-in) var(--ease-out); }
.lp-v2-modal[data-state="open"] { animation: lpv2-modal-in var(--dur-modal-in) var(--ease-out); }
`;
