import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, useMotionValueEvent, useInView, useReducedMotion } from "framer-motion";
import { supabase } from "../supabase";
import meMarkSvg from "../assets/brand/me-mark.svg?raw";
import dashboardShot from "../assets/landing/dashboard.png";
import elementsShot from "../assets/landing/elements.png";
import tasksShot from "../assets/landing/tasks.png";
import rateLibraryShot from "../assets/landing/rate-library.png";

/* ════════════════════════════════════════════════════════════════════════
   ME LANDING — V3 "BLACK"  ·  route "/"
   Port of the Claude Design export (design authority: layout/color/type)
   driven by the me-landing-fable-v5 mechanics (motion authority), on the
   repo stack: React 18 + framer-motion v12, no Tailwind, CSS vars bound to
   the real --brand-* and --app-* tokens extended with the V3 black tokens.
   Ratified: D1 black direction (landing only) · D2 Cormorant display ·
   D3 rate library stays, counts stripped (screenshot header CSS-cropped
   until the clean re-export) · D4 no fabricated phone/tablet shots — the
   stylized mark-on-screen placeholder until real mobile screens arrive.
   Prerender-safe: all copy lives in static DOM; hidden/animated states are
   gated behind the .js class (added on mount), so the page reads complete
   with JS off. useReducedMotion collapses every pin to stacked content.
   NOTE: scroll progress is computed manually from getBoundingClientRect
   into framer MotionValues — framer's useScroll({target}) binds to document
   scroll inside this app shell (documented in the V2 build).
   ════════════════════════════════════════════════════════════════════════ */

const YT_ID = ""; /* <-- paste the YouTube demo video ID here when recorded */
const EASE = [0.22, 1, 0.36, 1];

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* ── The Me mark — single swappable point (recolors via currentColor) ── */
function MeMark({ className = "", size }) {
  return (
    <span
      className={`me-mark ${className}`}
      style={size ? { fontSize: size } : undefined}
      role="img"
      aria-label="Me"
      dangerouslySetInnerHTML={{ __html: meMarkSvg }}
    />
  );
}

/* NAMING LAW (Vikram, pass 2, 12 Jun): wordmark ONLY in logo slots (header,
   laptop boot screen, device placeholders, footer). In copy the product is
   "Myoozz Events" in identity/claim lines, "it" thereafter — no inline mark,
   no typed-mark in sentences. (The former MeType inline component is gone.) */

/* ── Hydration gate: pre-JS the page renders complete and visible ── */
function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

/* ── Manual pin progress → MotionValue (0 at pin start, 1 at release) ── */
function usePinProgress(ref, enabled) {
  const p = useMotionValue(0);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      if (total <= 0) return;
      p.set(clamp01(-r.top / total));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled, ref, p]);
  return p;
}

/* ── Tier-1 reveal (.rv grammar): IO adds .in; hidden state is .js-gated ── */
function Rv({ as: Tag = "div", d = 0, className = "", children, ...rest }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const cls = `rv${d ? ` rv-d${d}` : ""}${inView ? " in" : ""}${className ? ` ${className}` : ""}`;
  return <Tag ref={ref} className={cls} {...rest}>{children}</Tag>;
}

/* ── Staggered anchor lines (manifesto + crescendo): 480ms per line ── */
function AnchorLines({ className = "", lines }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  return (
    <section className={`anchor ${className}`} ref={ref}>
      <div className="grain" />
      <div className="wrap">
        {lines.map((l, i) => (
          <p
            key={i}
            className={`line ${l.cls || ""}${inView ? " in" : ""}`}
            style={{ transitionDelay: inView ? `${i * 0.48}s` : undefined }}
          >
            {l.node}
          </p>
        ))}
      </div>
    </section>
  );
}

/* ── D4 placeholder: the stylized mark-on-screen phone (no fabricated UI) ── */
function PhonePlaceholder({ caption = "On ground with you", className = "" }) {
  return (
    <div className={`f-phone f-phone--ph ${className}`}>
      <div className="phone-screen">
        <MeMark className="mark-soft" />
        {caption && <small>{caption}</small>}
      </div>
    </div>
  );
}

/* ── Signature laptop story: logo → dashboard → open at center → closes ── */
function LapStage({ active }) {
  const ref = useRef(null);
  const p = usePinProgress(ref, active);
  const lidTransform = useTransform(p, (v) => {
    const open = clamp01((v - 0.10) / 0.30);
    const close = clamp01((v - 0.62) / 0.33);
    const ang = -68 + open * 68 - close * 84;
    const grow = clamp01((v - 0.25) / 0.3) * 0.05;
    return `rotateX(${ang}deg) scale(${1 + grow})`;
  });
  const logoOpacity = useTransform(p, (v) => 1 - clamp01((v - 0.14) / 0.18));
  const darkOpacity = useTransform(p, (v) => clamp01((clamp01((v - 0.62) / 0.33) - 0.45) / 0.5));
  const [capOn, setCapOn] = useState(false);
  useMotionValueEvent(p, "change", (v) => {
    const open = clamp01((v - 0.10) / 0.30);
    const close = clamp01((v - 0.62) / 0.33);
    setCapOn(open > 0.95 && close < 0.05);
  });

  return (
    <div className="lap-stage" ref={ref}>
      <div className="lap-pin">
        <div className="lap-under" />
        <div className="laptop">
          <motion.div className="lap-lid" style={active ? { transform: lidTransform } : undefined}>
            <span className="lap-screen">
              <img src={dashboardShot} alt="The Myoozz Events dashboard — your events, tasks, budget and team on one screen" />
              <motion.span className="lap-logo" style={active ? { opacity: logoOpacity } : undefined} aria-hidden="true">
                <MeMark className="mark-soft" />
              </motion.span>
            </span>
            <span className="lap-glare" aria-hidden="true" />
          </motion.div>
          <div className="lap-base" aria-hidden="true" />
        </div>
        <p className={`lap-cap${capOn ? " show" : ""}`}>Your whole event business, in one place.</p>
        <motion.div className="lap-dark" style={active ? { opacity: darkOpacity } : undefined} aria-hidden="true" />
      </div>
    </div>
  );
}

/* ── §4 convergence: the tools dock onto the platform ──
   Scatter Y is bounded so tiles never ride over the headline; each tile gets
   its own progress window so the docking visibly SEQUENCES. ── */
const SCATTER = [[-300, -80, -7], [230, -105, 6], [-150, -130, 4], [300, -30, -5], [-40, -55, 2]];
const DOCK = [[-190, 52, 0], [-95, 52, 0], [0, 52, 0], [95, 52, 0], [190, 52, 0]];
const TILES = [
  { k: "chat", label: "Chats", svg: <svg viewBox="0 0 34 34"><path d="M5 7h18a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H12l-7 5V10a3 3 0 0 1 3-3z" /></svg> },
  { k: "sheet", label: "Sheets", svg: <svg viewBox="0 0 34 34"><rect x="5" y="5" width="24" height="24" rx="2" /><path d="M5 13h24M13 5v24" /></svg> },
  { k: "deck", label: "Proposals", svg: <svg viewBox="0 0 34 34"><rect x="5" y="6" width="24" height="16" rx="2" /><path d="M17 22v6M12 28h10" /></svg> },
  { k: "mail", label: "Mail", svg: <svg viewBox="0 0 34 34"><rect x="4" y="8" width="26" height="18" rx="3" /><path d="M4 10l13 9 13-9" /></svg> },
  { k: "login", label: "One more login", svg: <svg viewBox="0 0 34 34"><rect x="7" y="14" width="20" height="14" rx="3" /><path d="M11 14v-4a6 6 0 0 1 12 0v4" /></svg> },
];
const PAIRS = [
  ["Built for the attendee", "Built for Event Managers"],
  ["Still reconciling on event day", "You walk in ready — nothing left to figure out"],
  ["The key person leaves, the knowledge leaves", "It stays in the system"],
];

function Convergence({ active }) {
  const ref = useRef(null);
  const p = usePinProgress(ref, active);
  const tileTransforms = TILES.map((_, i) =>
    /* eslint-disable-next-line react-hooks/rules-of-hooks -- TILES is a module constant; order is stable */
    useTransform(p, (v) => {
      const w0 = i * 0.05, w1 = 0.42 + i * 0.045; // staggered per-tile window
      const c = clamp01((v - w0) / (w1 - w0));
      const e = 1 - Math.pow(1 - c, 3);
      const s = SCATTER[i], d = DOCK[i];
      return `translate(-50%,-50%) translate(${lerp(s[0], d[0], e)}px,${lerp(s[1], d[1], e)}px) rotate(${lerp(s[2], 0, e)}deg) scale(${lerp(1, 0.82, e)})`;
    })
  );
  const [glow, setGlow] = useState(false);
  const [pairsOn, setPairsOn] = useState([false, false, false]);
  const [closerOn, setCloserOn] = useState(false);
  useMotionValueEvent(p, "change", (v) => {
    setGlow(v > 0.42);
    setPairsOn(PAIRS.map((_, i) => v > 0.5 + i * 0.13));
    setCloserOn(v > 0.9);
  });

  return (
    <div className="cmp-stage" ref={ref}>
      <section className="cmp-pin">
        <div className="wrap">
          <p className="label">Software vs. operating system</p>
          <h2>Every event tool is software you add. <em className="accent-i">Myoozz Events is the system it all runs on.</em></h2>
          <div className="os-visual">
            <p className="os-cap" aria-hidden="true">The stack you juggle today.</p>
            {TILES.map((t, i) => (
              <motion.div key={t.k} className={`tile t-${t.k}`} style={active ? { transform: tileTransforms[i] } : undefined}>
                {t.svg}<span>{t.label}</span>
              </motion.div>
            ))}
            <div className={`os-platform${glow ? " glow" : ""}`}>
              <b>One system.</b><small>The whole lifecycle.</small>
            </div>
          </div>
          <div className="pairs">
            {PAIRS.map(([oldT, newT], i) => (
              <div key={i} className={`pair${pairsOn[i] ? " on" : ""}`}>
                <span className="old">{oldT}</span><span className="new">{newT}</span>
              </div>
            ))}
          </div>
          <p className={`cmp-closer${closerOn ? " on" : ""}`}>They manage the audience. <em>It prepares you to run the show.</em></p>
        </div>
      </section>
    </div>
  );
}

/* ── §6 lifecycle: pinned journey with rail + per-phase device shots ── */
const PHASES = [
  {
    title: "Win it",
    steps: [
      ["Brief", "Capture what the client wants, structured from the first conversation."],
      ["Scope & cost", "Build every element, every city — and know the right rate before you quote."],
      ["Propose & win", "Turn it into a document the client says yes to."],
    ],
  },
  {
    title: "Build it",
    steps: [
      ["Build your team", "The right people, by role and by city. Built once, there for the next one."],
      ["Plan & assign", "Everyone knows what they own, and by when."],
      ["Produce", "Branding, build, procurement — tracked to delivery."],
      ["Logistics", "Travel, stay, movement — handled."],
    ],
  },
  {
    title: "Run it",
    steps: [
      ["Coordinate", "The final mile. Confirm every vendor, absorb the last-minute asks — until everyone’s on ground."],
      ["Run", "Every cue, every screen, every moment — mapped before the doors open."],
      ["Hand off", "Everything delivered, gathered, done."],
    ],
  },
  { title: "Repeat it", repeat: true },
];

/* ── ONE persistent spine for the whole section — the app's real pipeline
   vocabulary, verbatim: Brief → Elements → Proposal → Won │ Execution →
   Production │ Show Flow → Delivered ↺. Rendered once, never re-mounted;
   the active phase lights its node group + bracket label. Repeat lights no
   new nodes — it animates the loop arrow (Delivered → Brief) with the whole
   journey lit. Mobile/static: a vertical stepper, all groups shown. ── */
const SPINE_GROUPS = [
  { phase: "Win it", nodes: ["Brief", "Elements", "Proposal", "Won"] },
  { phase: "Build it", nodes: ["Execution", "Production"] },
  { phase: "Run it", nodes: ["Show Flow", "Delivered"] },
];

/* The spine is the section's single structural header (the legacy rail is
   gone): nodes on top, group stroke, group label beneath — the map; the
   ghost numeral + h3 below remain the current location. */
function LifeSpine({ activeIdx, staticAll }) {
  const groupOn = (gi) => staticAll || activeIdx === gi || activeIdx === 3;
  return (
    <div className="spine">
      {SPINE_GROUPS.map((g, gi) => (
        <div key={g.phase} className={`spine-group${groupOn(gi) ? " on" : ""}`}>
          <div className="spine-nodes">
            {g.nodes.map((n) => (
              <span key={n} className="spine-node"><i />{n}</span>
            ))}
          </div>
          <span className="spine-bracket">{g.phase}</span>
        </div>
      ))}
      <div className={`spine-loop${staticAll || activeIdx === 3 ? " on" : ""}`}>
        <svg viewBox="0 0 24 24"><path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" /><path d="M20.5 2.5v4h-4" /></svg>
        <span className="spine-bracket">Repeat it</span>
      </div>
    </div>
  );
}

function Lifecycle({ active }) {
  const ref = useRef(null);
  const p = usePinProgress(ref, active);
  const [idx, setIdx] = useState(0);
  useMotionValueEvent(p, "change", (v) => {
    setIdx(Math.floor(Math.min(0.999, v) * 4));
  });

  const shots = [
    <figure className="f-lap" key="s0"><div className="f-lid"><img src={elementsShot} alt="Scoping and costing every element of an event in Myoozz Events" /></div><div className="f-base" /></figure>,
    <figure className="f-lap" key="s1"><div className="f-lid"><img src={tasksShot} alt="Tasks assigned across the team in Myoozz Events" /></div><div className="f-base" /></figure>,
    <PhonePlaceholder key="s2" />,
    <figure className="f-lap" key="s3"><div className="f-lid"><img src={dashboardShot} alt="All your events on the Myoozz Events dashboard" /></div><div className="f-base" /></figure>,
  ];

  return (
    <div className="life-stage" ref={ref}>
      {/* stable order: rail → spine (persistent, never re-mounted) → phase
          content | device shot. Phase content swaps; spine and layout don't. */}
      <div className="life-pin">
        <LifeSpine activeIdx={idx} staticAll={!active} />
        <div className="life-row">
          <div className="phases">
            {PHASES.map((ph, i) => (
              <div key={ph.title} className={`phase${i === idx ? " on" : ""}`}>
                <span className="ghost" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <h3>{ph.title}</h3>
                {ph.repeat ? (
                  <div className="step step--wide">
                    <span>Every event makes the next one faster. Clone a similar event, keep what fits. Your elements, your team, your rates — already there, already yours. <b>Start where you ended.</b></span>
                  </div>
                ) : (
                  ph.steps.map(([b, s]) => (
                    <div className="step" key={b}><b>{b}</b><span>{s}</span></div>
                  ))
                )}
              </div>
            ))}
          </div>
          <div className="shots" aria-hidden="true">
            {shots.map((node, i) => (
              <div key={i} className={`shot${i === idx ? " on" : ""}`}>{node}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── §11 horizon drift ── */
function GlobalSection({ active, onAccess }) {
  const ref = useRef(null);
  const glowRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current, glow = glowRef.current;
      if (!el || !glow) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        const pr = 1 - (r.top + r.height / 2) / (window.innerHeight + r.height / 2);
        glow.style.transform = `translateX(-50%) translateY(${(1 - pr) * 6}vh) scale(${0.96 + pr * 0.08})`;
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [active]);

  return (
    <section className="global" ref={ref}>
      <div className="g-horizon" ref={glowRef} aria-hidden="true" />
      <div className="wrap grid2">
        <div className="g-copy">
          <Rv as="p" className="label">Built in India. Going global.</Rv>
          <Rv as="h2" d={1}>Your market is next.</Rv>
          <Rv as="p" d={2} className="lead">Tuned for your region — leave your email and you’re first when your market’s edition lands.</Rv>
          <Rv as="div" d={3}><button type="button" className="btn" onClick={onAccess}>Request access →</button></Rv>
        </div>
        <Rv d={2} className="g-phone">
          <PhonePlaceholder caption="Wherever the show takes you" />
        </Rv>
      </div>
    </section>
  );
}

/* ── §10 access card (no <form> tag; never shows success unless the insert
   actually succeeded). States: idle | busy | ok | dup | err. ── */
function AccessCard() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [trap, setTrap] = useState(""); // honeypot — humans never see it
  const [state, setState] = useState("idle");
  const [emailBad, setEmailBad] = useState(false);
  const emailRef = useRef(null);

  async function submit() {
    const e = email.trim();
    if (!e || !/.+@.+\..+/.test(e)) {
      setEmailBad(true);
      emailRef.current?.focus();
      return;
    }
    setEmailBad(false);
    if (trap.trim()) { setState("ok"); return; } // bot filled the honeypot — silent no-op
    setState("busy");
    const { error } = await supabase.from("early_access").insert({
      full_name: name.trim() || null,
      email: e,
      invite_code: code.trim() || null,
      status: "pending",
    });
    if (!error) { setState("ok"); return; }
    if (error.code === "23505") { setState("dup"); return; } // unique lower(email)
    setState("err"); // keep their input; offer retry + mail fallback
  }

  if (state === "ok" || state === "dup") {
    return (
      <div className="ok show">
        <div className="tick">✓</div>
        <p className="ok-hd">{state === "dup" ? "You’re already on the list — we’ve got you." : "You’re on the list."}</p>
        <p className="ok-sub">We’ll reach out personally as your spot opens.</p>
      </div>
    );
  }
  return (
    <div>
      <p className="card-title">Request an invite</p>
      <p className="card-sub">We open a limited number of spots each week.</p>
      <label htmlFor="accName">Name</label>
      <input id="accName" type="text" autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="accEmail">Email *</label>
      <input id="accEmail" ref={emailRef} type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className={emailBad ? "is-err" : ""} />
      <label htmlFor="accCode">Invite code <span className="soft">(have one? you skip the line)</span></label>
      <input id="accCode" type="text" autoComplete="off" maxLength={64} value={code} onChange={(e) => setCode(e.target.value)} />
      <input className="hp-field" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap} onChange={(e) => setTrap(e.target.value)} />
      <button type="button" className="btn" onClick={submit} disabled={state === "busy"}>
        {state === "busy" ? "Sending…" : state === "err" ? "Try again →" : "Request an invite →"}
      </button>
      {emailBad && (
        <p className="fine err-line">That email doesn’t look right — check it and try again.</p>
      )}
      {state === "err" && (
        <p className="fine err-line">Couldn’t submit just now — try again, or write to <a className="err-mail" href="mailto:hello@myoozz.events">hello@myoozz.events</a> and we’ll add you by hand.</p>
      )}
      <p className="fine">No card. No commitment. We’ll reach out personally as your spot opens.</p>
    </div>
  );
}

/* ── demo modal: youtube-nocookie iframe injected only when open ── */
function DemoModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal open" role="dialog" aria-modal="true" aria-label="Watch the demo">
      <div className="veil" onClick={onClose} />
      <div className="box">
        <button type="button" className="x" onClick={onClose} aria-label="Close">×</button>
        {YT_ID ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${YT_ID}?autoplay=1&rel=0`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title="Myoozz Events — demo"
          />
        ) : (
          <div className="ph">The demo lands here — drop the YouTube ID at the top of LandingPage.jsx.</div>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const motionOn = hydrated && !reduceMotion && !isMobile;

  /* landing-only body background so overscroll stays black (app stays warm) */
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = "#04080A";
    return () => { document.body.style.background = prev; };
  }, []);

  /* header: floating pill past 70px */
  const [dense, setDense] = useState(false);
  useEffect(() => {
    const onScroll = () => setDense(window.scrollY > 70);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* demo modal */
  const [demoOpen, setDemoOpen] = useState(false);
  const openDemo = useCallback((e) => { e?.preventDefault?.(); setDemoOpen(true); }, []);
  const closeDemo = useCallback(() => setDemoOpen(false), []);
  const goAccess = useCallback(() => {
    document.getElementById("access")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }, [reduceMotion]);

  /* easter eggs — deterministic */
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const clicks = useRef(0);
  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3400);
  }, []);
  const onMarkClick = useCallback(() => {
    clicks.current += 1;
    if (clicks.current === 5) {
      clicks.current = 0;
      showToast("🎟️ You found the backstage door. Crew only — and you’re crew.");
    }
  }, [showToast]);
  const [lights, setLights] = useState(false);
  useEffect(() => {
    let buf = "";
    let t;
    const onKey = (e) => {
      if (e.key && e.key.length === 1) {
        buf = (buf + e.key.toLowerCase()).slice(-8);
        if (buf === "showtime") {
          buf = "";
          setLights(true);
          t = setTimeout(() => setLights(false), 2600);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, []);

  return (
    <div className={`me-v3${hydrated ? " js" : ""}`}>
      <style>{CSS}</style>

      {/* HEADER — floating pill on scroll */}
      <header className={`hdr${dense ? " dense" : ""}`}>
        <button type="button" className="mark-btn" onClick={onMarkClick} aria-label="Me">
          <MeMark className="mark-soft hdr-mark" />
        </button>
        <nav>
          <a className="hide-m" href="#demo" onClick={openDemo}>Watch the demo</a>
          <a className="hide-m" href="/login">Login</a>
          <a className="btn sm" href="#access" onClick={(e) => { e.preventDefault(); goAccess(); }}>Request access</a>
        </nav>
      </header>

      <main>
        {/* §1 HERO */}
        <section className="hero">
          <div className="hero-glow" aria-hidden="true" />
          <div className="wrap">
            <Rv as="p" className="label center">Event management software, built for Event Managers.</Rv>
            <h1>
              <Rv as="span" d={1} className="l1">It’s your event.</Rv>
              <Rv as="span" d={2} className="l2">Walk in fearless.</Rv>
            </h1>
            <Rv as="p" d={3} className="sub">The operating system for the people running the show.</Rv>
            <Rv as="div" d={4} className="ctas">
              <button type="button" className="btn" onClick={goAccess}>Request access →</button>
              <a className="link-quiet" href="#demo" onClick={openDemo}><span className="play">▶</span>Watch the demo</a>
            </Rv>
            <Rv as="div" d={4} className="hero-meta">
              <span>Laptop at the desk, tablet at the venue, phone on the ground — same workspace, every screen.</span>
            </Rv>
          </div>
        </section>

        {/* SIGNATURE LAPTOP STORY */}
        <LapStage active={motionOn} />

        {/* §2 MANIFESTO — emerges from the closed laptop */}
        <AnchorLines
          className="manif"
          lines={[
            { cls: "l-a", node: "The audience got tools. The client got tools." },
            { cls: "l-b", node: "The one running the whole show was never seen." },
            { cls: "final", node: "Myoozz Events — this one is built for you." },
          ]}
        />

        {/* §3 THE TRUTH — sticky stacked trap cards */}
        <section className="sec">
          <div className="wrap">
            <Rv as="p" className="label">Event by event, nothing adds up</Rv>
            <Rv as="h2" d={1}>You didn’t lose that margin in a bad call. You lost it in a Tuesday WhatsApp thread.</Rv>
            <div className="stack">
              {[
                ["01 — THE RATES", "The rates", "Every rate you negotiated, gone with the thread it lived in.",
                  <svg viewBox="0 0 48 48" key="i"><path d="M8 14h32v18a4 4 0 0 1-4 4H20l-8 6v-6h-1a3 3 0 0 1-3-3z" /><path d="M16 22h16M16 28h10" /></svg>],
                ["02 — THE PEOPLE", "The people", "The crew that delivered at 2am — their names live in someone’s phone.",
                  <svg viewBox="0 0 48 48" key="i"><path d="M10 10h22a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H18l-8 6V14a4 4 0 0 1 4-4h-4z" /><path d="M30 22h8a4 4 0 0 1 4 4v8l-6-4h-6" /></svg>],
                ["03 — THE LEARNINGS", "The learnings", "What went wrong, what saved you — never written down.",
                  <svg viewBox="0 0 48 48" key="i"><path d="M24 8a12 12 0 0 1 12 12c0 5-3 8-3 12H15c0-4-3-7-3-12A12 12 0 0 1 24 8z" /><path d="M19 38h10M21 42h6" /></svg>],
                ["04 — THE STORIES", "The stories", "Every event ends as one slide in a credentials deck.",
                  <svg viewBox="0 0 48 48" key="i"><rect x="8" y="8" width="32" height="32" rx="3" /><path d="M8 18h32M18 8v32M8 28h32" /></svg>],
              ].map(([num, h, body, icon]) => (
                <div className="trap" key={num}>
                  <div className="ic">{icon}</div>
                  <div><span className="num">{num}</span><h3>{h}</h3><p>{body}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* §4 SOFTWARE vs OS — convergence */}
        <Convergence active={motionOn} />

        {/* KNOWLEDGE BASE — first product plate (was rate intelligence;
            D3 crop interim unchanged; predictive-cost card moved here from §8) */}
        <section className="rates">
          <div className="wrap grid2">
            <div>
              <Rv as="p" className="label">Your knowledge base</Rv>
              <Rv as="h2" d={1}>Every element, every city — costed before you quote.</Rv>
              <Rv as="p" d={2} className="lead">Your own knowledge base — rates, elements, people — growing with every event, alongside live benchmarks.</Rv>
              <Rv as="p" d={3} className="kb-punch">Never depend on one person for a rate again.</Rv>
            </div>
            <Rv d={2} className="kb-col">
              {/* header strip CSS-cropped: baked-in counts stay off-page (D3)
                  — drop .crop when the clean re-export lands */}
              <div className="rate-shot">
                <div className="rate-crop">
                  <img src={rateLibraryShot} alt="The Rate Intelligence Library in Myoozz Events — live rate benchmarks by city" />
                </div>
              </div>
              <div className="vignette">
                <p className="v-label"><i />Predictive cost</p>
                <div className="v-row"><b>LED wall · 12ft × 8ft · Mumbai</b><span>₹16,800–₹19,400</span></div>
                <p className="v-quote">It doesn’t just suggest the element. <em>It suggests the cost.</em></p>
              </div>
            </Rv>
          </div>
        </section>

        {/* §5 WHAT ME WON'T DO */}
        <section className="honest">
          <div className="wrap">
            <Rv as="p" className="label">What it won’t do</Rv>
            <Rv as="h2" d={1}>Myoozz Events won’t run your event. That’s your job — and you’re good at it.</Rv>
            <Rv as="p" d={2} className="craft">The instinct on the floor. The call when a vendor no-shows. The read on a client’s face. That’s craft — and <em>no AI replaces it</em>. You’re not the one being automated. You’re the one being armed.</Rv>
            <Rv as="p" d={3} className="plain">It does everything before that moment — scope locked, costs tracked, team aligned — so you walk in with nothing left to figure out.</Rv>
            <Rv as="p" d={4} className="echo">It works for you. It will never be you.</Rv>
          </div>
        </section>

        {/* §6 FROM BRIEF TO HAPPY CLIENT */}
        <section className="sec sec--lifeintro">
          <div className="wrap">
            <Rv as="p" className="label">From the first brief to the final handover</Rv>
            <Rv as="h2" d={1}>Your whole event, in one system.</Rv>
          </div>
        </section>
        <Lifecycle active={motionOn} />

        {/* PAYOFF + running underneath */}
        <section className="payoff">
          <div className="wrap">
            <Rv className="under-strip">
              <div><b>Smart where it helps</b><p>Heavy lifting where it saves time, out of the way where your judgment matters.</p></div>
              <div><b>You own your data</b><p>Secured, private to your workspace, there whenever you need it.</p></div>
              <div><b>Nothing slips</b><p>Every change timestamped — and a nudge when something needs you.</p></div>
              <div><b>It gets smarter</b><p>Your workspace learns the way you work.</p></div>
            </Rv>
            <Rv as="p">By event day, there’s nothing left to chase. <br /><em>You walk in fearless. The event runs flawless.</em></Rv>
          </div>
        </section>

        {/* §7 WHO ME IS FOR */}
        <section className="sec">
          <div className="wrap">
            <Rv as="p" className="label">Who it’s for</Rv>
            <Rv as="h2" d={1}>For the people who run the event. Not the ones who attend it.</Rv>
            <Rv as="p" d={2} className="lead">Myoozz Events is for the person responsible for everything the audience never sees — the brief, the budget, the build, the final mile. <br /><em className="who-em">The one who makes it look effortless.</em></Rv>
            <Rv as="p" d={3} className="who-punch">Built by Event Managers, for Event Managers.</Rv>
          </div>
        </section>

        {/* IT'S A WEB APP — the one light section */}
        <section className="anywhere">
          <div className="wrap">
            <Rv as="p" className="label">It’s a web app</Rv>
            <Rv as="h2" d={1}>Open a browser. You’re in.</Rv>
            <Rv as="p" d={2} className="lead">Myoozz Events lives on the web, not on a device. <b>Nothing to install, nothing to update</b> — and no “it only works on my laptop.” Wherever the show takes you, your workspace is already there.</Rv>
            <Rv as="div" d={3} className="aw-points">
              <div><b>Any device</b><p>Laptop at the desk, tablet at the venue, phone on the ground — same workspace, every screen.</p></div>
              <div><b>Always current</b><p>Every login is the latest version. No updates to chase, no IT to call.</p></div>
              <div><b>Yours, everywhere</b><p>Lock the laptop at 6pm, pick up the phone backstage at 6:05. Your work travels with you.</p></div>
            </Rv>
            <Rv className="aw-devices">
              <figure className="f-lap"><div className="f-lid"><img src={dashboardShot} alt="Myoozz Events on a laptop" /></div><div className="f-base" /></figure>
              <PhonePlaceholder caption="" className="aw-phone" />
            </Rv>
            <Rv as="p" className="aw-cap">One workspace · every device · always in sync</Rv>
          </div>
        </section>

        {/* §8 WHY INDIA. WHY FIRST. */}
        <section className="sec india">
          <div className="wrap">
            <Rv as="p" className="label">Why India. Why first.</Rv>
            <Rv as="h2" d={1}>The fastest-growing event market in the world finally has a system built for the people running it.</Rv>
            <div className="stats">
              {[
                ["$32B", "India’s events market by 2035, growing at 7.6% a year."],
                ["17.9%", "annual growth of India’s event-software market — the fastest-rising in Asia-Pacific."],
                ["First", "the first operating system built for the Event Manager, not the attendee."],
              ].map(([n, body]) => (
                <Stat key={n} n={n} body={body} />
              ))}
            </div>
            <Rv as="p" className="cat">None were built for the people running the show. Myoozz Events is that system.</Rv>
            <Rv as="p" d={1} className="next">India first. The world next.</Rv>
            <Rv as="p" d={2} className="src">Market figures — Expert Market Research, Grand View Research, 2025–26.</Rv>
          </div>
        </section>

        {/* §9 BACKSTAGE CRESCENDO */}
        <AnchorLines
          className="cresc"
          lines={[
            { cls: "ln-hd", node: "The best Event Managers are the ones you never notice." },
            { cls: "ln-md", node: <>The client doesn’t see the 2am call, the vendor who fell through, the plan you rebuilt twice. <br />That’s the job — to carry all of it, and make it look like nothing.</> },
            { cls: "ln-md", node: "Myoozz Events carries it with you — every element, every cost, every change — so it’s not all on you and your memory anymore." },
            { cls: "ln-pv", node: <><span className="dim">Stop being the person everything depends on.</span> <br /><span className="pivot">Start being the person who built the system everything runs on.</span></> },
            { cls: "final", node: <>You still won’t be the one they applaud. <br />But you’ll be the one who was <em>never afraid</em>.</> },
          ]}
        />

        {/* §10 EARLY ACCESS */}
        <section className="access" id="access">
          <div className="wrap grid2">
            <div>
              <Rv as="h2" d={1} className="access-h2">Invite-only. We open a few spots each week.</Rv>
            </div>
            <Rv d={2} className="card">
              <AccessCard />
            </Rv>
          </div>
        </section>

        {/* §11 GOING GLOBAL */}
        <GlobalSection active={motionOn} onAccess={goAccess} />
      </main>

      {/* §12 FOOTER */}
      <footer className="foot">
        <div className="wrap">
          <p className="tag">Myoozz Events. <span className="tag-dim">Born in India, built for the Event Managers of the world.</span></p>
          <div className="cols">
            <div>
              <MeMark className="mark-soft foot-mark" />
              <p className="maker">Built by Myoozz Consulting.<br /><a href="https://myoozz.com" target="_blank" rel="noopener noreferrer" className="maker-link">Visit Myoozz →</a></p>
            </div>
            <div><h4>Product</h4><div className="col-links"><a href="#access" onClick={(e) => { e.preventDefault(); goAccess(); }}>Early Access</a><a href="#demo" onClick={openDemo}>Watch the Demo</a></div></div>
            <div><h4>Company</h4><div className="col-links"><a href="mailto:hello@myoozz.events">hello@myoozz.events</a></div></div>
            <div><h4>Legal</h4><div className="col-links"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></div>
          </div>
          <div className="legal"><span>© 2026 Myoozz Consulting Pvt. Ltd.</span><span>myoozz.events</span></div>
        </div>
      </footer>

      <DemoModal open={demoOpen} onClose={closeDemo} />

      <div className={`toast${toast ? " show" : ""}`}>{toast}</div>
      <div className={`houselights${lights ? " on" : ""}`}><span>House lights down. Walk in fearless.</span></div>
    </div>
  );
}

/* ── §8 stat: blur-in on view ── */
function Stat({ n, body }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  return (
    <div className={`stat${inView ? " on" : ""}`} ref={ref}>
      <div className="n">{n}</div>
      <p>{body}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLES — fenced under .me-v3 · V3 black tokens extend the real
   --brand-* and --app-* tokens from src/index.css (no value re-declared that a
   repo token already covers).
   ════════════════════════════════════════════════════════════════════════ */
const CSS = `
.me-v3{
  /* black layer (60%) — new V3 tokens */
  --v3-black:#04080A; --v3-black-2:#070D10; --v3-surface:#0A1318; --v3-card-a:#0E1B22; --v3-card-b:#091116;
  --v3-line:rgba(140,178,188,.12); --v3-line-strong:rgba(140,178,188,.22);
  /* teal layer (30%) — bound to the real brand tokens */
  --v3-teal:var(--brand-teal); --v3-teal-deep:var(--brand-teal-deep); --v3-teal-mid:var(--brand-teal-mid);
  --v3-aqua:var(--brand-aqua); --v3-soft:var(--brand-teal-soft);
  --v3-anchor:#012531; --v3-foot:#00222C;
  /* white layer (10%) */
  --v3-white:#F4FAFB; --v3-body:#93A9B0; --v3-dim:#62808A;
  /* the one light section — bound to the real app tokens */
  --v3-warm-bg:var(--app-bg); --v3-warm-surface:var(--app-surface); --v3-warm-ink:var(--app-ink);
  --v3-warm-dim:var(--app-text-dim); --v3-warm-border:var(--app-border);
  /* accent (D1: bright on black — raw brand teal sinks) */
  --acc:#35C2D1; --glow-k:.6;
  --fd:var(--font-heading); --fb:var(--font-body); --fm:var(--font-mono);
  --ease:var(--ease-out); --max:1200px;

  font-family:var(--fb); font-size:16px; line-height:1.65;
  color:var(--v3-body); background:var(--v3-black);
  overflow-x:clip; -webkit-font-smoothing:antialiased;
}
.me-v3 *,.me-v3 *::before,.me-v3 *::after{box-sizing:border-box;margin:0;padding:0}
.me-v3 h1,.me-v3 h2,.me-v3 h3{font-family:var(--fd);color:var(--v3-white);font-weight:600;line-height:1.1}
.me-v3 img{user-select:none;max-width:100%}
.me-v3 .wrap{max-width:var(--max);margin:0 auto;padding:0 6vw}
.me-v3 section{position:relative}
.me-v3 ::selection{background:rgba(53,194,209,.35);color:#fff}

/* ── the Me mark (svg logo — logo slots only) ── */
.me-v3 .me-mark{display:inline-flex;line-height:0;vertical-align:-0.12em}
.me-v3 .me-mark svg{height:1em;width:auto}
.me-v3 .mark-soft{color:var(--v3-soft)}
.me-v3 .mark-acc{color:var(--acc)}
.me-v3 .mark-white{color:#fff}
/* ── typed "Me" for inline copy (logo fonts, set as text) ── */
/* (typed inline mark removed — naming law pass 2: no mark in sentences) */

/* ── eyebrow grammar — ONE standard (B4) ── */
.me-v3 .label{font-family:var(--fm);font-size:12px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--v3-dim);font-weight:500;display:flex;align-items:center;gap:12px;margin-bottom:20px}
.me-v3 .label::before{content:"";width:24px;height:1px;background:var(--acc);flex:none}
.me-v3 .label.center{justify-content:center}
.me-v3 .label.center::after{content:"";width:24px;height:1px;background:var(--acc);flex:none}

/* ── buttons + links ── */
.me-v3 .btn{display:inline-flex;align-items:center;gap:8px;background:var(--v3-teal);color:#fff;border:none;cursor:pointer;
  font-family:var(--fb);font-weight:500;font-size:15px;padding:14px 28px;border-radius:999px;text-decoration:none;
  transition:transform .15s var(--ease),box-shadow .2s var(--ease),background .2s}
.me-v3 .btn:hover{background:var(--v3-teal-mid);transform:translateY(-2px);box-shadow:0 14px 34px -12px rgba(27,154,170,.5)}
.me-v3 .btn:active{transform:translateY(0) scale(.98)}
.me-v3 .btn:disabled{opacity:.6;cursor:default;transform:none}
.me-v3 .btn.sm{padding:9px 20px;font-size:14px}
.me-v3 .link-quiet{color:var(--acc);font-weight:500;text-decoration:none;cursor:pointer;
  border-bottom:1px solid rgba(53,194,209,.35);padding-bottom:2px;transition:border-color .15s}
.me-v3 .link-quiet:hover{border-color:var(--acc)}
.me-v3 .play{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;
  background:var(--acc);color:var(--v3-black);font-size:9px;margin-right:9px;padding-left:2px}

/* ── reveal grammar — hidden state only once .js (prerender-safe) ── */
.me-v3.js .rv{opacity:0;transform:translateY(20px);transition:opacity .6s var(--ease),transform .6s var(--ease)}
.me-v3.js .rv.in{opacity:1;transform:none}
.me-v3 .rv-d1{transition-delay:.08s}.me-v3 .rv-d2{transition-delay:.16s}
.me-v3 .rv-d3{transition-delay:.24s}.me-v3 .rv-d4{transition-delay:.32s}

/* ── header ── */
.me-v3 .hdr{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;
  padding:0 5vw;height:84px;background:transparent;transition:all .3s var(--ease)}
.me-v3 .mark-btn{background:none;border:none;cursor:pointer;padding:0;line-height:0}
.me-v3 .hdr-mark{font-size:34px;transition:font-size .3s var(--ease)}
.me-v3 .hdr.dense{top:14px;left:50%;right:auto;transform:translateX(-50%);width:min(92vw,860px);height:58px;
  padding:0 12px 0 22px;border-radius:999px;background:rgba(14,23,28,.88);
  border:1px solid var(--v3-line-strong);
  backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  box-shadow:0 1px 0 rgba(224,242,247,.08) inset,0 18px 50px -16px rgba(0,0,0,.75)}
.me-v3 .hdr.dense .hdr-mark{font-size:26px}
.me-v3 .hdr nav{display:flex;align-items:center;gap:26px;font-size:14.5px;font-weight:500}
.me-v3 .hdr nav a:not(.btn){color:var(--v3-body);text-decoration:none;cursor:pointer;transition:color .15s}
.me-v3 .hdr nav a:not(.btn):hover{color:var(--v3-soft)}

/* ── hero ── */
.me-v3 .hero{padding-top:19vh;text-align:center}
.me-v3 .hero-glow{position:absolute;left:50%;top:-10vh;transform:translateX(-50%);width:120vw;height:80vh;pointer-events:none;
  background:radial-gradient(46% 52% at 50% 30%,rgba(0,95,115,.34),rgba(0,95,115,0) 70%);opacity:var(--glow-k)}
.me-v3 .hero .label{justify-content:center}
.me-v3 .hero h1{font-size:clamp(46px,7.2vw,108px);letter-spacing:-.015em;line-height:1.03;font-weight:600}
.me-v3 .hero h1 .l1,.me-v3 .hero h1 .l2{display:block}
.me-v3 .hero h1 .l2{font-style:italic;font-weight:500;color:var(--acc)}
.me-v3 .hero .sub{font-size:clamp(17px,1.55vw,21px);color:var(--v3-body);margin:26px auto 34px;max-width:620px}
.me-v3 .hero .ctas{display:flex;align-items:center;justify-content:center;gap:28px;flex-wrap:wrap}
.me-v3 .hero-meta{display:flex;align-items:center;justify-content:center;margin:38px auto 0;max-width:780px;
  font-family:var(--fm);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--v3-dim);line-height:1.8;text-align:center}

/* ── signature laptop story ── */
.me-v3 .lap-stage{height:300vh;position:relative}
.me-v3 .lap-pin{position:sticky;top:0;height:100vh;display:flex;align-items:center;justify-content:center;perspective:1600px;overflow:clip}
.me-v3 .lap-under{position:absolute;left:50%;bottom:4vh;transform:translateX(-50%);width:110vw;height:50vh;pointer-events:none;
  background:radial-gradient(50% 60% at 50% 100%,rgba(27,154,170,.22),rgba(27,154,170,0) 70%);opacity:var(--glow-k)}
.me-v3 .laptop{position:relative;width:min(76vw,900px);transform-style:preserve-3d}
.me-v3 .lap-lid{position:relative;transform-origin:50% 100%;border-radius:16px 16px 0 0;
  background:linear-gradient(180deg,#0C0D0F,#181A1D);padding:1.5% 1.5% 1.9%;
  box-shadow:0 -2px 0 rgba(255,255,255,.05) inset,0 40px 100px -28px rgba(0,0,0,.8);will-change:transform}
.me-v3 .lap-lid::before{content:"";position:absolute;top:7px;left:50%;transform:translateX(-50%);
  width:64px;height:9px;background:#0C0D0F;border-radius:0 0 8px 8px;z-index:4}
.me-v3 .lap-screen{display:block;position:relative;width:100%;border-radius:8px;background:#000;overflow:hidden}
.me-v3 .lap-screen img{display:block;width:100%;border-radius:7px}
.me-v3 .lap-logo{position:absolute;inset:0;background:var(--v3-teal-deep);z-index:2;display:none;align-items:center;justify-content:center}
.me-v3.js .lap-logo{display:flex}
.me-v3 .lap-logo .me-mark{font-size:clamp(40px,6vw,80px)}
.me-v3 .lap-glare{position:absolute;inset:0;border-radius:16px 16px 0 0;z-index:3;pointer-events:none;
  background:linear-gradient(115deg,rgba(255,255,255,.09) 0%,rgba(255,255,255,0) 40%)}
.me-v3 .lap-base{position:relative;height:0;padding-bottom:3%;background:linear-gradient(180deg,#26282C,#0E0F11 70%);
  border-radius:0 0 18px 18px;box-shadow:0 1px 0 rgba(255,255,255,.1) inset,0 30px 70px -20px rgba(0,0,0,.85)}
.me-v3 .lap-base::before{content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:13%;height:44%;background:#08090A;border-radius:0 0 10px 10px}
.me-v3 .lap-cap{position:absolute;left:0;right:0;bottom:7vh;text-align:center;font-family:var(--fm);font-size:12px;
  letter-spacing:.16em;text-transform:uppercase;color:var(--v3-dim);opacity:0;transition:opacity .5s var(--ease)}
.me-v3 .lap-cap.show{opacity:1}
.me-v3 .lap-dark{position:absolute;inset:0;background:var(--v3-anchor);opacity:0;pointer-events:none;z-index:5}

/* ── anchors: manifesto + crescendo ── */
.me-v3 .anchor{background:var(--v3-anchor);color:var(--v3-soft);padding:14vh 0;position:relative}
.me-v3 .anchor.manif{padding-top:10vh}
.me-v3 .grain{position:absolute;inset:0;opacity:.05;pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.6'/%3E%3C/svg%3E")}
.me-v3 .anchor .line{font-family:var(--fd);line-height:1.3;font-weight:500;max-width:900px;margin-bottom:3.5vh;position:relative}
.me-v3.js .anchor .line{opacity:0;transform:translateY(22px);transition:opacity 1s var(--ease),transform 1s var(--ease)}
.me-v3.js .anchor .line.in{opacity:1;transform:none}
/* manifesto — type-ramp law: all lines one size; the middle line is the
   single designated big one */
.me-v3 .manif .l-a{font-size:clamp(22px,2.6vw,34px)}
.me-v3 .manif .l-b{font-size:clamp(44px,6vw,84px);font-weight:600;color:#fff;font-style:italic;margin:2vh 0 3vh;line-height:1.05}
.me-v3 .anchor.manif .line.final{font-size:clamp(22px,2.6vw,34px)}
.me-v3 .anchor .line.final{margin-top:5vh;font-size:clamp(30px,3.8vw,52px);font-weight:600;color:#fff}
.me-v3 .anchor .line.final em{color:var(--acc);font-style:italic}
.me-v3 .anchor .me-mark{font-size:.95em}
/* crescendo — statement wall: all lines one size; the FINAL line is the
   single designated big one (it keeps the .anchor .line.final size) */
.me-v3 .ln-hd{font-size:clamp(17px,1.5vw,20px);color:#fff;font-weight:600}
.me-v3 .ln-md{font-size:clamp(17px,1.5vw,20px)}
.me-v3 .ln-pv{font-size:clamp(17px,1.5vw,20px)}
.me-v3 .ln-pv .dim{opacity:.72}
.me-v3 .ln-pv .pivot{color:#fff;font-weight:600}

/* ── section scaffolding ── */
.me-v3 .sec{padding:130px 0;border-top:1px solid var(--v3-line)}
.me-v3 .sec h2{font-size:clamp(32px,4vw,54px);letter-spacing:-.01em;max-width:880px}
.me-v3 .sec .lead,.me-v3 .rates .lead,.me-v3 .access .lead,.me-v3 .global .lead{font-size:clamp(16px,1.35vw,19px);max-width:620px;margin-top:22px}
.me-v3 .sec .lead em,.me-v3 .accent-i{color:var(--acc);font-style:italic}
.me-v3 .who-em{font-size:19px}
/* the practitioner line — ad-weight (same display size as the section h2) */
.me-v3 .who-punch{font-family:var(--fd);font-style:italic;font-weight:600;font-size:clamp(32px,4vw,54px);
  line-height:1.12;color:var(--acc);margin-top:36px;letter-spacing:-.01em}
.me-v3 .grid2{display:grid;grid-template-columns:1.1fr .9fr;gap:6vw;align-items:start}

/* ── traps: sticky stacked cards ── */
.me-v3 .stack{margin-top:64px}
.me-v3 .trap{position:sticky;background:linear-gradient(165deg,var(--v3-card-a) 0%,var(--v3-card-b) 100%);
  border:1px solid rgba(27,154,170,.22);border-radius:16px;padding:46px 50px;margin-bottom:26px;
  display:grid;grid-template-columns:92px 1fr;gap:36px;align-items:center;
  box-shadow:0 0 0 1px rgba(27,154,170,.06),0 0 50px -16px rgba(27,154,170,.18),0 30px 70px -30px rgba(0,0,0,.85)}
.me-v3 .trap:nth-child(1){top:110px}.me-v3 .trap:nth-child(2){top:134px}
.me-v3 .trap:nth-child(3){top:158px}.me-v3 .trap:nth-child(4){top:182px}
.me-v3 .trap .ic{width:92px;height:92px;border-radius:20px;background:rgba(27,154,170,.12);
  border:1px solid rgba(27,154,170,.18);display:flex;align-items:center;justify-content:center}
.me-v3 .trap .ic svg{width:46px;height:46px;stroke:var(--acc);fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.me-v3 .trap .num{font-family:var(--fm);font-size:12.5px;color:var(--v3-dim);letter-spacing:.16em;margin-bottom:8px;display:block}
.me-v3 .trap h3{font-family:var(--fb);font-size:17px;font-weight:600;margin-bottom:8px}
.me-v3 .trap p{max-width:620px}

/* ── convergence ── */
.me-v3 .cmp-stage{height:340vh}
.me-v3 .cmp-pin{position:sticky;top:0;min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:90px 0 30px;overflow:clip}
.me-v3 .cmp-pin h2{font-size:clamp(32px,4vw,54px);letter-spacing:-.01em;max-width:880px}
.me-v3 .os-visual{position:relative;height:46vh;min-height:330px;margin-top:34px}
.me-v3 .tile{position:absolute;left:50%;top:40%;width:94px;padding:15px 10px 11px;border-radius:18px;text-align:center;
  background:linear-gradient(165deg,var(--v3-card-a),var(--v3-card-b));border:1px solid var(--v3-line-strong);
  box-shadow:0 20px 44px -18px rgba(0,0,0,.7);will-change:transform;transform:translate(-50%,-50%)}
.me-v3 .tile svg{width:34px;height:34px;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.me-v3 .tile span{display:block;font-size:10.5px;letter-spacing:.08em;color:var(--v3-dim);margin-top:7px;font-family:var(--fm)}
.me-v3 .t-chat svg{stroke:#34C06B}.me-v3 .t-sheet svg{stroke:#2EA46B}
.me-v3 .t-deck svg{stroke:#E0703A}.me-v3 .t-mail svg{stroke:#5B8DEF}.me-v3 .t-login svg{stroke:var(--acc)}
.me-v3 .os-platform{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:min(560px,86%);
  border-radius:18px;padding:28px 30px;text-align:center;color:var(--v3-soft);
  background:linear-gradient(160deg,#0E4252 0%,#062633 100%);border:1px solid rgba(53,194,209,.3);
  box-shadow:0 0 0 1px rgba(53,194,209,.08),0 0 70px -18px rgba(53,194,209,.25);transition:box-shadow .6s var(--ease)}
.me-v3 .os-platform.glow{box-shadow:0 0 0 1px rgba(53,194,209,.2),0 0 110px -10px rgba(53,194,209,.5)}
.me-v3 .os-platform b{display:block;font-family:var(--fb);font-size:18px;font-weight:600;color:#fff}
.me-v3 .os-platform small{display:block;font-family:var(--fm);font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.65;margin-top:6px}
.me-v3 .os-cap{position:absolute;top:-6px;left:50%;transform:translateX(-50%);font-family:var(--fm);font-size:12px;
  letter-spacing:.16em;text-transform:uppercase;color:var(--v3-dim);white-space:nowrap}
/* tiles never ride over the headline: copy sits above the visual layer */
.me-v3 .cmp-pin .label,.me-v3 .cmp-pin h2{position:relative;z-index:2}
.me-v3 .os-visual{z-index:1}
.me-v3 .pairs{margin-top:36px}
.me-v3 .pair{display:grid;grid-template-columns:1fr 1.3fr;gap:26px;padding:14px 0;border-top:1px solid var(--v3-line)}
.me-v3.js .pair{opacity:.1;transform:translateY(8px);transition:opacity .5s var(--ease),transform .5s var(--ease)}
.me-v3.js .pair.on{opacity:1;transform:none}
.me-v3 .pair .old{color:var(--v3-dim);font-size:15.5px;text-decoration:line-through;text-decoration-color:rgba(98,128,138,.5);padding-top:4px}
.me-v3 .pair .new{font-family:var(--fb);font-size:16px;color:var(--v3-white);font-weight:600}
.me-v3 .cmp-closer{margin-top:36px;font-family:var(--fb);font-size:16.5px;font-weight:500;color:var(--v3-white);max-width:760px}
.me-v3.js .cmp-closer{opacity:0;transform:translateY(14px);transition:all .6s var(--ease)}
.me-v3.js .cmp-closer.on{opacity:1;transform:none}
.me-v3 .cmp-closer em{color:var(--acc);font-style:italic}

/* ── rate intelligence ── */
.me-v3 .rates{padding:140px 0;border-top:1px solid var(--v3-line)}
.me-v3 .rates .grid2{grid-template-columns:.9fr 1.1fr;align-items:center}
.me-v3 .rates h2{font-size:clamp(32px,3.8vw,52px)}
.me-v3 .fine-note{font-family:var(--fm);font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--v3-dim);margin-top:30px}
.me-v3 .fine-note em{color:var(--acc);font-style:normal}
.me-v3 .rate-shot{border-radius:14px;overflow:hidden;border:1px solid rgba(53,194,209,.25);
  box-shadow:0 0 0 1px rgba(53,194,209,.08),0 0 80px -20px rgba(53,194,209,.3),0 40px 90px -30px rgba(0,0,0,.85)}
/* D3 interim: crop the baked-in count header — 150px of the 1272px-wide
   source; margin % resolves against WIDTH, so 150/1272 = 11.8% */
.me-v3 .rate-crop{overflow:hidden}
.me-v3 .rate-crop img{display:block;width:100%;margin-top:-11.8%}

/* ── honesty ── */
.me-v3 .honest{background:var(--v3-surface);padding:140px 0;border-top:1px solid var(--v3-line)}
.me-v3 .honest h2{max-width:780px;font-size:clamp(32px,4vw,54px)}
.me-v3 .honest .craft{font-size:16.5px;color:var(--v3-soft);line-height:1.7;max-width:680px;margin-top:30px}
.me-v3 .honest .craft em{color:var(--acc);font-style:italic}
.me-v3 .honest .plain{font-size:16.5px}
.me-v3 .honest .plain{margin-top:26px;max-width:620px}
.me-v3 .honest .echo{font-style:italic;font-size:16.5px;color:var(--acc);margin-top:40px;font-weight:500}
/* knowledge base */
.me-v3 .kb-punch{font-size:16.5px;font-weight:500;color:var(--acc);margin-top:26px}
.me-v3 .kb-col .vignette{margin-top:24px;max-width:none}

/* ── lifecycle ── */
.me-v3 .sec--lifeintro{padding-bottom:0}
.me-v3 .life-stage{height:500vh}
.me-v3 .life-pin{position:sticky;top:0;min-height:100vh;display:flex;flex-direction:column;justify-content:center;
  padding:90px 6vw 40px;max-width:calc(var(--max) + 12vw);margin:0 auto;overflow:clip}
.me-v3 .life-row{display:grid;grid-template-columns:.9fr 1.1fr;gap:5vw;align-items:start;width:100%}
/* (legacy rail deleted — the spine is the single source of section structure) */
.me-v3 .phase{display:none;position:relative}
.me-v3 .phase.on{display:block;animation:me-v3-ph .6s var(--ease)}
@keyframes me-v3-ph{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
.me-v3 .phase .ghost{position:absolute;top:-64px;right:0;font-family:var(--fm);font-size:clamp(90px,10vw,150px);
  color:rgba(27,154,170,.1);line-height:1;font-weight:500;pointer-events:none}
.me-v3 .phase h3{font-size:clamp(36px,4vw,54px);margin-bottom:26px}
.me-v3 .step{padding:15px 0;border-top:1px solid var(--v3-line);max-width:560px;display:grid;grid-template-columns:165px 1fr;gap:18px}
.me-v3 .step b{font-family:var(--fb);font-weight:600;font-size:15px;color:var(--v3-white)}
/* ── the persistent section spine — the app's real pipeline, one line at
   desktop; active phase lights its group + bracket; Repeat animates the loop ── */
.me-v3 .spine{display:flex;align-items:flex-start;flex-wrap:nowrap;margin:0 0 56px;width:100%}
.me-v3 .spine-group{display:flex;flex-direction:column;gap:7px}
.me-v3 .spine-group+.spine-group,.me-v3 .spine-loop{margin-left:16px;padding-left:16px;border-left:1px solid var(--v3-line)}
.me-v3 .spine-nodes{display:flex;align-items:center}
.me-v3 .spine-node{display:flex;align-items:center;font-family:var(--fm);font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:var(--v3-dim);white-space:nowrap;transition:color .3s}
.me-v3 .spine-node i{width:7px;height:7px;border-radius:50%;background:var(--v3-line-strong);margin-right:5px;font-style:normal;transition:background .3s,box-shadow .3s}
.me-v3 .spine-node+.spine-node::before{content:"";width:14px;height:1px;background:var(--v3-line-strong);margin:0 7px}
/* bracket architecture: nodes on top → group stroke → group label beneath */
.me-v3 .spine-bracket{display:block;width:100%;border-top:1px solid var(--v3-line-strong);padding-top:7px;text-align:center;
  font-family:var(--fm);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--v3-dim);opacity:.7;font-weight:500;
  transition:color .3s,opacity .3s,border-color .3s}
.me-v3 .spine-group.on .spine-node{color:#7DD8A0}
.me-v3 .spine-group.on .spine-node i{background:#34C06B;box-shadow:0 0 8px rgba(52,192,107,.5)}
.me-v3 .spine-group.on .spine-bracket,.me-v3 .spine-loop.on .spine-bracket{color:#7DD8A0;opacity:1;font-weight:600;border-top-color:rgba(52,192,107,.55)}
.me-v3 .spine-loop{display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.me-v3 .spine-loop svg{width:15px;height:15px;fill:none;stroke:var(--v3-line-strong);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:stroke .3s}
.me-v3 .spine-loop.on svg{stroke:#34C06B;animation:me-v3-loop .9s var(--ease)}
@keyframes me-v3-loop{from{transform:rotate(-360deg)}to{transform:rotate(0)}}
.me-v3 .step span{font-size:15px}
.me-v3 .step--wide{grid-template-columns:1fr}
.me-v3 .step--wide span{font-size:16.5px;max-width:560px}
.me-v3 .step--wide b{font-size:16.5px;display:inline}
.me-v3 .shots{position:relative;height:min(52vh,470px)}
.me-v3 .shot{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
.me-v3.js .shot{opacity:0;transform:translateY(16px) scale(.985);transition:opacity .55s var(--ease),transform .55s var(--ease)}
.me-v3.js .shot.on{opacity:1;transform:none}
.me-v3 .f-lap{width:100%;max-width:640px}
.me-v3 .f-lap .f-lid{position:relative;border-radius:12px 12px 0 0;background:linear-gradient(180deg,#0C0D0F,#181A1D);
  padding:1.5% 1.5% 1.9%;box-shadow:0 30px 70px -24px rgba(0,0,0,.8)}
.me-v3 .f-lap .f-lid::before{content:"";position:absolute;top:6px;left:50%;transform:translateX(-50%);
  width:52px;height:8px;background:#0C0D0F;border-radius:0 0 7px 7px;z-index:3}
.me-v3 .f-lap img{display:block;width:100%;border-radius:6px}
.me-v3 .f-lap .f-base{height:0;padding-bottom:2.6%;background:linear-gradient(180deg,#26282C,#0E0F11 70%);
  border-radius:0 0 14px 14px;position:relative}
.me-v3 .f-lap .f-base::before{content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:12%;height:46%;background:#08090A;border-radius:0 0 9px 9px}

/* ── phone frame: D4 stylized placeholder (no fabricated UI) ── */
.me-v3 .f-phone{width:min(250px,56vw);border:9px solid #131416;border-radius:36px;background:var(--v3-teal-deep);
  overflow:hidden;position:relative;aspect-ratio:9/19;
  box-shadow:0 36px 80px -28px rgba(0,0,0,.85),0 0 60px -20px rgba(27,154,170,.3)}
.me-v3 .f-phone::before{content:"";position:absolute;top:10px;left:50%;transform:translateX(-50%);
  width:74px;height:20px;background:#131416;border-radius:12px;z-index:2}
.me-v3 .phone-screen{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--v3-soft)}
.me-v3 .phone-screen .me-mark{font-size:44px}
.me-v3 .phone-screen small{font-family:var(--fm);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;opacity:.7;padding:0 14px;text-align:center}

/* ── payoff ── */
/* payoff closes the lifecycle — anchored, not a floating orphan */
.me-v3 .payoff{padding:36px 0 110px;text-align:center;border-top:0}
.me-v3 .payoff>.wrap>p:last-child,.me-v3 .payoff p.rv:last-child{font-family:var(--fd);font-size:clamp(25px,2.9vw,40px);
  color:var(--v3-white);font-weight:600;max-width:840px;margin:0 auto;line-height:1.25}
.me-v3 .payoff em{color:var(--acc);font-style:italic}
.me-v3 .under-strip{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--v3-line);
  border-bottom:1px solid var(--v3-line);text-align:left;margin:0 0 90px}
.me-v3 .under-strip>div{padding:26px 26px 26px 0;border-right:1px solid var(--v3-line);margin-right:26px}
.me-v3 .under-strip>div:last-child{border-right:0;margin-right:0}
.me-v3 .under-strip b{display:block;color:var(--v3-white);font-size:14px;margin-bottom:5px;font-weight:600}
.me-v3 .under-strip p{font-size:14px;line-height:1.55}

/* ── anywhere: the one light section ── */
.me-v3 .anywhere{background:var(--v3-warm-bg);color:var(--v3-warm-dim);padding:140px 0}
.me-v3 .anywhere .label{color:var(--v3-warm-dim)}
.me-v3 .anywhere h2{color:var(--v3-warm-ink);font-size:clamp(34px,4.4vw,60px);max-width:800px}
.me-v3 .anywhere .lead{color:var(--v3-warm-dim);font-size:clamp(16.5px,1.4vw,19.5px);max-width:640px;margin-top:22px}
.me-v3 .anywhere .lead b{color:var(--v3-warm-ink);font-weight:600}
.me-v3 .aw-points{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid var(--v3-warm-border);
  border-bottom:1px solid var(--v3-warm-border);margin-top:56px}
.me-v3 .aw-points>div{padding:28px 28px 28px 0;border-right:1px solid var(--v3-warm-border);margin-right:28px}
.me-v3 .aw-points>div:last-child{border-right:0;margin-right:0}
.me-v3 .aw-points b{display:block;font-family:var(--fb);font-size:16px;color:var(--v3-warm-ink);font-weight:600;margin-bottom:6px}
.me-v3 .aw-points p{font-size:14.5px;line-height:1.6}
.me-v3 .aw-devices{position:relative;margin-top:80px;padding-bottom:40px}
.me-v3 .aw-devices .f-lap{max-width:760px;margin:0 auto}
.me-v3 .aw-devices .f-lap .f-lid{box-shadow:0 40px 90px -30px rgba(26,16,8,.4)}
.me-v3 .aw-devices .f-lap .f-base{box-shadow:0 30px 60px -20px rgba(26,16,8,.35)}
.me-v3 .aw-phone{position:absolute;right:max(2vw,calc(50% - 480px));bottom:-10px;width:190px;border-width:8px;border-radius:30px;
  transform:rotate(2.5deg);box-shadow:0 36px 70px -24px rgba(26,16,8,.5)}
.me-v3 .aw-phone .phone-screen .me-mark{font-size:34px}
.me-v3 .aw-cap{text-align:center;font-family:var(--fm);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--v3-warm-dim);margin-top:44px}

/* ── india stats + vignette ── */
.me-v3 .india .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:40px;margin:64px 0 54px}
.me-v3 .stat .n{font-family:var(--fm);font-size:clamp(38px,4.6vw,64px);color:var(--acc);font-weight:500}
.me-v3.js .stat .n{filter:blur(14px);opacity:0;transition:filter 1s var(--ease),opacity 1s var(--ease)}
.me-v3.js .stat.on .n{filter:blur(0);opacity:1}
.me-v3 .stat p{margin-top:10px;font-size:14px;max-width:260px}
.me-v3 .india .cat{font-size:17px;color:var(--v3-soft);max-width:720px;line-height:1.65;font-weight:500}
.me-v3 .india .next{font-style:italic;font-size:17px;color:#fff;margin-top:20px;font-weight:500}
.me-v3 .india .src{font-size:12px;color:var(--v3-dim);margin-top:18px}
.me-v3 .vignette{margin-top:56px;max-width:560px;background:linear-gradient(165deg,var(--v3-card-a),var(--v3-card-b));
  border:1px solid rgba(53,194,209,.25);border-radius:16px;padding:26px 30px 24px;
  box-shadow:0 0 60px -18px rgba(53,194,209,.2),0 30px 70px -30px rgba(0,0,0,.8)}
.me-v3 .vignette .v-label{font-family:var(--fm);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--v3-dim);
  margin-bottom:14px;display:flex;align-items:center;gap:8px}
.me-v3 .vignette .v-label i{width:6px;height:6px;border-radius:50%;background:var(--acc);font-style:normal;box-shadow:0 0 8px var(--acc)}
.me-v3 .vignette .v-row{display:flex;justify-content:space-between;gap:20px;align-items:baseline;padding:11px 0;border-top:1px solid var(--v3-line)}
.me-v3 .vignette .v-row b{color:var(--v3-white);font-weight:500;font-size:15.5px}
.me-v3 .vignette .v-row span{font-family:var(--fm);color:var(--acc);font-size:15px}
.me-v3 .vignette .v-quote{margin-top:18px;font-size:15px;color:var(--v3-soft);line-height:1.55}
.me-v3 .vignette .v-quote em{color:var(--acc);font-style:italic}

/* ── access ── */
.me-v3 .access{padding:140px 0;border-top:1px solid var(--v3-line)}
.me-v3 .access-h2{font-size:clamp(30px,3vw,40px)}
.me-v3 .lead--tight{margin-top:14px}
.me-v3 .access .card{background:linear-gradient(165deg,var(--v3-card-a) 0%,var(--v3-card-b) 100%);
  border:1px solid rgba(27,154,170,.25);border-radius:16px;padding:40px;
  box-shadow:0 0 0 1px rgba(27,154,170,.08),0 0 60px -18px rgba(27,154,170,.22),0 40px 90px -40px rgba(0,0,0,.9)}
.me-v3 .card-title{font-family:var(--fb);font-size:17px;color:var(--v3-white);font-weight:600}
.me-v3 .card-sub{font-size:13.5px;margin-top:6px}
.me-v3 .access label{display:block;font-family:var(--fm);font-size:11px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--v3-dim);margin:18px 0 7px;font-weight:500}
.me-v3 .access label .soft{text-transform:none;letter-spacing:0}
.me-v3 .access input{width:100%;padding:13px 15px;border:1px solid var(--v3-line-strong);border-radius:10px;
  font-family:var(--fb);font-size:15.5px;background:#070E12;color:var(--v3-white);outline:none;transition:border .15s,box-shadow .15s}
.me-v3 .access input:focus{border-color:var(--acc);box-shadow:0 0 0 3px rgba(53,194,209,.14)}
.me-v3 .access input.is-err{border-color:var(--state-danger)}
.me-v3 .access .btn{width:100%;justify-content:center;margin-top:26px;border-radius:10px}
.me-v3 .access .fine{font-size:12.5px;color:var(--v3-dim);text-align:center;margin-top:14px}
.me-v3 .access .err-line{color:#E8A0A8}
.me-v3 .access .err-mail{color:#E8A0A8;text-decoration:underline}
/* honeypot: off-screen (not display:none — bots skip hidden fields) */
.me-v3 .access .hp-field{position:absolute;left:-9999px;top:auto;width:1px;height:1px;opacity:0;pointer-events:none}
.me-v3 .access .ok{text-align:center;padding:32px 0}
.me-v3 .access .ok .tick{font-size:40px;color:var(--acc)}
.me-v3 .access .ok .ok-hd{font-family:var(--fd);font-size:22px;color:var(--v3-white);margin-top:10px}
.me-v3 .access .ok .ok-sub{font-size:14.5px;margin-top:6px}

/* ── going global ── */
.me-v3 .global{position:relative;overflow:clip;padding:150px 0 0;border-top:1px solid var(--v3-line);
  background:linear-gradient(180deg,var(--v3-black) 0%,#032530 55%,#0A4456 100%)}
.me-v3 .g-horizon{position:absolute;left:50%;bottom:-12vh;transform:translateX(-50%);width:140vw;height:46vh;pointer-events:none;
  background:radial-gradient(50% 80% at 50% 100%,rgba(122,208,219,.45),rgba(27,154,170,.12) 55%,transparent 78%);
  opacity:var(--glow-k);will-change:transform}
.me-v3 .global .grid2{align-items:end;position:relative}
.me-v3 .global h2{font-size:clamp(34px,4.2vw,58px)}
.me-v3 .global .label{color:rgba(224,242,247,.6)}
.me-v3 .global .lead{color:#BFD9DF}
.me-v3 .g-copy{padding-bottom:130px}
.me-v3 .g-copy .btn{margin-top:30px}
.me-v3 .g-phone{display:flex;justify-content:center;align-items:flex-end}
.me-v3 .g-phone .f-phone{margin-bottom:-64px;box-shadow:0 -20px 90px -30px rgba(122,208,219,.45),0 36px 80px -28px rgba(0,0,0,.8)}

/* ── footer ── */
.me-v3 .foot{background:var(--v3-foot);color:rgba(224,242,247,.75);padding:96px 0 46px}
.me-v3 .foot .tag{font-family:var(--fd);font-size:clamp(23px,2.8vw,36px);color:#fff;max-width:760px;line-height:1.3}
.me-v3 .tag-dim{opacity:.85}
.me-v3 .foot .cols{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-top:64px;font-size:14.5px}
.me-v3 .foot h4{font-family:var(--fm);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(224,242,247,.45);margin-bottom:14px;font-weight:500}
.me-v3 .foot .col-links{display:flex;flex-direction:column;gap:9px;align-items:flex-start}
.me-v3 .foot a{color:rgba(224,242,247,.75);text-decoration:none;transition:color .15s;cursor:pointer}
.me-v3 .foot a:hover{color:#fff}
.me-v3 .foot-mark{font-size:34px}
.me-v3 .foot .maker{margin-top:14px;line-height:1.7}
.me-v3 .maker-link{display:inline}
.me-v3 .foot .legal{margin-top:64px;padding-top:24px;border-top:1px solid rgba(224,242,247,.13);font-size:13px;
  color:rgba(224,242,247,.45);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}

/* ── demo modal ── */
.me-v3 .modal{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:5vw}
.me-v3 .modal .veil{position:absolute;inset:0;background:rgba(1,16,21,.6);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.me-v3 .modal .box{position:relative;width:min(940px,94vw);aspect-ratio:16/9;background:#060A0C;border-radius:14px;overflow:hidden;
  box-shadow:0 60px 140px -30px rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;color:var(--v3-soft)}
.me-v3 .modal .box iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.me-v3 .modal .x{position:absolute;top:-46px;right:0;background:none;border:none;color:#fff;font-size:26px;cursor:pointer;font-family:var(--fb)}
.me-v3 .modal .ph{text-align:center;font-family:var(--fm);font-size:13px;letter-spacing:.1em;opacity:.7;padding:0 30px}

/* ── toast + houselights ── */
.me-v3 .toast{position:fixed;left:50%;bottom:34px;transform:translate(-50%,80px);background:var(--v3-soft);color:var(--v3-teal-deep);
  font-size:14.5px;padding:13px 22px;border-radius:10px;z-index:300;opacity:0;transition:all .45s var(--ease);pointer-events:none;
  box-shadow:0 18px 50px -16px rgba(0,0,0,.6)}
.me-v3 .toast.show{opacity:1;transform:translate(-50%,0)}
.me-v3 .houselights{position:fixed;inset:0;background:#000;z-index:250;opacity:0;pointer-events:none;
  transition:opacity .8s var(--ease);display:flex;align-items:center;justify-content:center}
.me-v3 .houselights.on{opacity:.94;pointer-events:auto}
.me-v3 .houselights span{font-family:var(--fd);font-style:italic;font-size:clamp(24px,3.4vw,44px);color:var(--v3-soft);
  opacity:0;transition:opacity 1.1s .35s var(--ease)}
.me-v3 .houselights.on span{opacity:1}

/* ── responsive ── */
@media(max-width:920px){
  .me-v3 .life-pin{padding-top:80px}
  .me-v3 .life-row{grid-template-columns:1fr;gap:30px}
  .me-v3 .shots{height:42vh;min-height:280px}
  .me-v3 .spine{flex-wrap:wrap;row-gap:14px}
  .me-v3 .rates .grid2,.me-v3 .access .grid2,.me-v3 .global .grid2{grid-template-columns:1fr;gap:44px}
  .me-v3 .foot .cols{grid-template-columns:1fr 1fr}
  .me-v3 .aw-points{grid-template-columns:1fr}
  .me-v3 .aw-points>div{border-right:0;margin-right:0;border-bottom:1px solid var(--v3-warm-border);padding:20px 0}
  .me-v3 .aw-points>div:last-child{border-bottom:0}
  .me-v3 .aw-phone{width:140px;right:2vw}
  .me-v3 .pair{grid-template-columns:1fr;gap:4px}
  .me-v3 .step{grid-template-columns:1fr;gap:4px}
  .me-v3 .under-strip{grid-template-columns:1fr 1fr}
  .me-v3 .under-strip>div{border-bottom:1px solid var(--v3-line);padding:20px 20px 20px 0}
  .me-v3 .g-copy{padding-bottom:40px}
  .me-v3 .g-phone .f-phone{margin-bottom:-50px}
}
@media(max-width:720px){
  .me-v3 .hdr nav a.hide-m{display:none}
  .me-v3 .hdr.dense{width:94vw}
  .me-v3 .sec,.me-v3 .rates,.me-v3 .honest,.me-v3 .access,.me-v3 .anywhere{padding:90px 0}
  .me-v3 .sec--lifeintro{padding-bottom:0}
  .me-v3 .hero{padding-top:24vh}
  .me-v3 .hero-meta{flex-wrap:wrap;gap:8px 14px}
  .me-v3 .india .stats{grid-template-columns:1fr;gap:30px}
  .me-v3 .trap{grid-template-columns:1fr;gap:18px;padding:30px;position:relative;top:0!important}
  .me-v3 .trap .ic{width:64px;height:64px;border-radius:14px}
  .me-v3 .trap .ic svg{width:34px;height:34px}
  .me-v3 .under-strip{grid-template-columns:1fr}
  .me-v3 .lap-stage{height:auto}
  .me-v3 .lap-pin{position:relative;height:auto;padding:50px 0}
  .me-v3 .lap-lid{transform:none!important}
  .me-v3 .lap-logo,.me-v3 .lap-dark,.me-v3 .lap-cap{display:none!important}
  .me-v3 .cmp-stage{height:auto}
  .me-v3 .cmp-pin{position:relative;min-height:0;padding:90px 0 40px}
  .me-v3 .os-visual{height:auto;min-height:0;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding-bottom:150px}
  .me-v3 .tile{position:relative;left:auto;top:auto;transform:none!important;width:auto}
  .me-v3.js .pair,.me-v3.js .cmp-closer{opacity:1;transform:none}
  .me-v3 .os-platform.glow{box-shadow:0 0 0 1px rgba(53,194,209,.2),0 0 70px -14px rgba(53,194,209,.4)}
  .me-v3 .life-stage{height:auto}
  .me-v3 .life-pin{position:relative;min-height:0;padding:60px 6vw 0}
  .me-v3 .shots{display:none}
  /* spine → vertical stepper grouped by the three brackets + loop */
  .me-v3 .spine{flex-direction:column;align-items:stretch;gap:18px;margin-bottom:46px}
  .me-v3 .spine-bracket{border-top:0;padding-top:0;text-align:left;width:auto}
  .me-v3 .spine-group,.me-v3 .spine-loop{flex-direction:column-reverse;border-left:1px solid var(--v3-line);
    margin-left:0;padding-left:14px;gap:10px}
  .me-v3 .spine-nodes{flex-direction:column;align-items:flex-start;gap:9px}
  .me-v3 .spine-node+.spine-node::before{display:none}
  .me-v3 .spine-loop{flex-direction:row;align-items:center;gap:9px}
  .me-v3 .phase{display:block;margin-bottom:60px;animation:none}
  .me-v3 .phase .ghost{top:-50px}
  .me-v3.js .stat .n{filter:none;opacity:1}
}
@media(prefers-reduced-motion:reduce){
  .me-v3.js .rv,.me-v3.js .anchor .line,.me-v3.js .pair,.me-v3.js .cmp-closer,.me-v3.js .stat .n,.me-v3.js .shot{
    opacity:1!important;transform:none!important;filter:none!important;transition:none!important}
  .me-v3 .lap-lid{transform:none!important}
  .me-v3 .lap-logo,.me-v3 .lap-dark{display:none!important}
  .me-v3 .lap-stage,.me-v3 .cmp-stage,.me-v3 .life-stage{height:auto}
  .me-v3 .lap-pin,.me-v3 .cmp-pin,.me-v3 .life-pin{position:relative;height:auto;min-height:0}
  .me-v3 .spine-loop svg{animation:none!important}
  .me-v3 .phase{display:block!important;margin-bottom:54px;animation:none!important}
  .me-v3 .shots{display:none}
  .me-v3 .spine-bracket{border-top:0;padding-top:0;text-align:left;width:auto}
  .me-v3 .tile{transform:none!important;position:relative;left:auto;top:auto;display:inline-block;margin:6px}
  .me-v3 .os-visual{height:auto;padding-bottom:150px}
  .me-v3 .g-horizon{transform:translateX(-50%)!important}
  .me-v3 .lap-cap{display:none}
}
`;
