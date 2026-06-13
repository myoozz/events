import { useState, useRef } from "react";
import meMarkSvg from "../assets/brand/me-mark.svg?raw";
import { supabase } from "../supabase";

/* Gate page — single-screen invitation gate (public root "/").
   Dark surface (#0d0d0d / #FAF8F5): ratified exception to the warm-surface law,
   this page only. Naming law: "Me" in the logo slot; "Myoozz Events" in the
   identity line; "it" thereafter. Honesty: no product imagery on this page. */

const GATE_CSS = `
.gate{--gb:#0d0d0d;--gf:#FAF8F5;--gd:rgba(250,248,245,.60);--gfa:rgba(250,248,245,.40);
  --gl:rgba(250,248,245,.14);--gfield:rgba(250,248,245,.05);--gacc:#35C2D1;
  min-height:100svh;background:var(--gb);color:var(--gf);display:flex;flex-direction:column;
  font-family:var(--font-body,system-ui,sans-serif);padding:clamp(20px,4vw,40px);-webkit-font-smoothing:antialiased;}
.gate-top{display:flex;align-items:center;justify-content:space-between;gap:16px;}
.gate-logo{display:inline-flex;align-items:center;color:var(--gf);}
.gate-logo svg{height:26px;width:auto;display:block;}
.gate-ident{font-family:var(--font-mono,ui-monospace,monospace);font-size:12px;letter-spacing:.04em;color:var(--gd);}
.gate-main{flex:1;display:flex;flex-direction:column;justify-content:center;max-width:640px;margin:0 auto;width:100%;padding:48px 0;}
.gate-eyebrow{font-family:var(--font-mono,ui-monospace,monospace);font-size:11px;line-height:1.5;text-transform:uppercase;letter-spacing:.18em;color:var(--gfa);margin:0 0 20px;}
.gate-title{font-family:var(--font-heading,Georgia,serif);font-weight:600;font-size:clamp(30px,5.2vw,52px);line-height:1.08;letter-spacing:-.01em;margin:0 0 22px;color:var(--gf);max-width:15ch;}
.gate-sub{font-size:clamp(15px,1.8vw,17px);line-height:1.6;color:var(--gd);max-width:48ch;margin:0 0 36px;}
.gate-form{display:flex;flex-direction:column;gap:12px;max-width:460px;}
.gate-row{display:flex;gap:10px;flex-wrap:wrap;}
.gate-input{flex:1 1 220px;min-width:0;background:var(--gfield);border:1px solid var(--gl);border-radius:10px;color:var(--gf);font-size:15px;font-family:inherit;padding:13px 15px;transition:border-color .18s ease;}
.gate-input::placeholder{color:var(--gfa);}
.gate-input:focus{outline:none;border-color:var(--gacc);}
.gate-input.is-err{border-color:#E2603F;}
.gate-btn{background:var(--gf);color:#0d0d0d;border:0;border-radius:10px;font-family:inherit;font-size:15px;font-weight:600;padding:13px 22px;cursor:pointer;white-space:nowrap;transition:opacity .18s ease;}
.gate-btn:hover{opacity:.88;}
.gate-btn:disabled{opacity:.5;cursor:default;}
.gate-skip{background:none;border:0;padding:6px 0 0;font-family:var(--font-mono,ui-monospace,monospace);font-size:12px;letter-spacing:.03em;color:var(--gd);cursor:pointer;align-self:flex-start;transition:color .18s ease;}
.gate-skip:hover{color:var(--gf);}
.gate-code-wrap{display:grid;grid-template-rows:0fr;transition:grid-template-rows .28s ease;}
.gate-code-wrap.open{grid-template-rows:1fr;}
.gate-code-inner{overflow:hidden;}
.gate-code-inner .gate-input{width:100%;margin-top:2px;}
.gate-note{font-size:13px;line-height:1.5;color:var(--gd);margin:4px 0 0;}
.gate-note.err{color:#E2603F;}
.gate-note a{color:inherit;text-decoration:underline;}
.gate-ok-hd{font-family:var(--font-heading,Georgia,serif);font-size:26px;margin:0 0 8px;color:var(--gf);}
.gate-ok-sub{font-size:15px;color:var(--gd);margin:0;max-width:42ch;}
.gate-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:16px 24px;flex-wrap:wrap;font-family:var(--font-mono,ui-monospace,monospace);font-size:11px;letter-spacing:.03em;color:var(--gfa);padding-top:20px;border-top:1px solid var(--gl);}
.gate-foot a{color:var(--gfa);text-decoration:none;}
.gate-foot a:hover{color:var(--gd);}
.gate-foot-mid{width:100%;order:3;display:flex;justify-content:center;gap:14px;padding-top:12px;}
@keyframes gateRise{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
.gate-anim>*{opacity:0;animation:gateRise .7s cubic-bezier(0.22,1,0.36,1) forwards;}
.gate-anim>*:nth-child(1){animation-delay:.05s;}
.gate-anim>*:nth-child(2){animation-delay:.13s;}
.gate-anim>*:nth-child(3){animation-delay:.21s;}
.gate-anim>*:nth-child(4){animation-delay:.29s;}
@media (prefers-reduced-motion:reduce){.gate-anim>*{opacity:1;animation:none;}.gate-code-wrap{transition:none;}}
@media (max-width:560px){.gate-btn{flex:1 1 100%;}}
`;

export default function GatePage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [state, setState] = useState("idle"); // idle | busy | ok | dup | err
  const emailRef = useRef(null);
  const codeRef = useRef(null);

  async function submit() {
    const e = email.trim();
    if (!e || !/.+@.+\..+/.test(e)) {
      setState("err");
      emailRef.current?.focus();
      return;
    }
    setState("busy");
    const c = code.trim();
    const { error } = await supabase.from("early_access").insert({
      full_name: null,
      email: e,
      invite_code: c || null,
      company: c ? `[invite:${c}]` : null, // tech debt: mirror for current triage; retire when admin reads invite_code
      status: "pending",
    });
    if (error) {
      setState(error.code === "23505" ? "dup" : "err");
      return;
    }
    setState("ok");
  }

  function revealCode() {
    setShowCode(true);
    requestAnimationFrame(() => codeRef.current?.focus());
  }

  const done = state === "ok" || state === "dup";

  return (
    <>
      <style>{GATE_CSS}</style>
      <div className="gate">
        <header className="gate-top">
          <span className="gate-logo" role="img" aria-label="Me" dangerouslySetInnerHTML={{ __html: meMarkSvg }} />
          <span className="gate-ident">Myoozz Events</span>
        </header>

        <main className="gate-main">
          {done ? (
            <div className="gate-anim">
              <p className="gate-ok-hd">{state === "dup" ? "You're already on the list." : "You're on the list."}</p>
              <p className="gate-ok-sub">We'll reach out personally as your spot opens.</p>
            </div>
          ) : (
            <div className="gate-anim">
              <p className="gate-eyebrow">An operating system for Event Managers</p>
              <h1 className="gate-title">The operating system for the people running the show.</h1>
              <p className="gate-sub">
                Every platform was built for the people who attend. None were built for the people who run it.
                We're building that one — quietly, for now.
              </p>
              <div className="gate-form">
                <div className="gate-row">
                  <input
                    ref={emailRef}
                    className={"gate-input" + (state === "err" ? " is-err" : "")}
                    type="email" inputMode="email" autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(ev) => { setEmail(ev.target.value); if (state === "err") setState("idle"); }}
                    onKeyDown={(ev) => ev.key === "Enter" && submit()}
                    aria-label="Email address"
                  />
                  <button type="button" className="gate-btn" onClick={submit} disabled={state === "busy"}>
                    {state === "busy" ? "Sending…" : "Request access"}
                  </button>
                </div>

                {!showCode && (
                  <button type="button" className="gate-skip" onClick={revealCode}>
                    Have an invite code? Skip the line →
                  </button>
                )}
                <div className={"gate-code-wrap" + (showCode ? " open" : "")}>
                  <div className="gate-code-inner">
                    <input
                      ref={codeRef}
                      className="gate-input" type="text" autoComplete="off"
                      placeholder="Invite code"
                      value={code}
                      onChange={(ev) => setCode(ev.target.value)}
                      onKeyDown={(ev) => ev.key === "Enter" && submit()}
                      aria-label="Invite code"
                    />
                  </div>
                </div>

                {state === "err" && (
                  <p className="gate-note err">
                    Enter a valid email, or write to <a href="mailto:hello@myoozz.events">hello@myoozz.events</a>.
                  </p>
                )}
                <p className="gate-note">No card. No commitment. We reach out personally as spots open.</p>
              </div>
            </div>
          )}
        </main>

        <footer className="gate-foot">
          <span>Myoozz Consulting Pvt. Ltd. · India</span>
          <span>Built for Event Managers</span>
          <span className="gate-foot-mid">
            <span>By invitation · 2026</span>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </span>
        </footer>
      </div>
    </>
  );
}
