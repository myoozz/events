import React, { useState } from "react";
import TermsCheckbox from "./TermsCheckbox";

/* ─────────────────────────────────────────────
   HOW TO WIRE TermsCheckbox INTO YOUR SIGNUP FORM
   ─────────────────────────────────────────────
   This is a usage example, not a full page.
   Copy the relevant parts into your existing
   RegisterPage.jsx or SignupForm.jsx.
───────────────────────────────────────────── */

const BUTTON_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');

  .reg-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 420px;
    margin: 0 auto;
    padding: 40px 32px;
    background: #fff;
    border: 1px solid #e8e4df;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
  }

  .reg-form h2 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 28px;
    font-weight: 500;
    color: #1a1a1a;
    margin: 0 0 4px;
  }

  .reg-form p {
    font-size: 13.5px;
    color: #888;
    font-weight: 300;
    margin: 0;
    line-height: 1.5;
  }

  .reg-input {
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid #ddd;
    border-radius: 5px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 300;
    color: #1a1a1a;
    background: #FAFAF8;
    outline: none;
    transition: border-color 0.15s ease;
    box-sizing: border-box;
  }
  .reg-input:focus { border-color: #bc1723; }

  .reg-divider {
    border: none;
    border-top: 1px solid #f0ece8;
    margin: 4px 0;
  }

  /* ── Submit button — locked / unlocked states ── */
  .reg-btn {
    width: 100%;
    padding: 13px 20px;
    border-radius: 5px;
    border: none;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.03em;
    cursor: pointer;
    transition: background 0.2s ease, opacity 0.2s ease, transform 0.1s ease;
  }

  /* Active — terms agreed */
  .reg-btn.active {
    background: #bc1723;
    color: #fff;
  }
  .reg-btn.active:hover  { background: #a31420; }
  .reg-btn.active:active { transform: scale(0.985); }

  /* Locked — terms not agreed */
  .reg-btn.locked {
    background: #e8e4df;
    color: #aaa;
    cursor: not-allowed;
  }
`;

export default function RegisterFormExample() {
  const [agreed, setAgreed]         = useState(false);
  const [triedSubmit, setTried]     = useState(false);
  const [email, setEmail]           = useState("");
  const [name, setName]             = useState("");

  const handleSubmit = () => {
    // If not agreed, show error state on the checkbox
    if (!agreed) {
      setTried(true);
      return;
    }
    // ── proceed with your registration logic ──
    console.log("Registering:", { name, email, agreed });
    alert("Proceeding with registration ✓");
  };

  return (
    <>
      <style>{BUTTON_STYLES}</style>

      <div className="reg-form">
        <div>
          <h2>Create your account</h2>
          <p>Start managing events the smarter way.</p>
        </div>

        <input
          className="reg-input"
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="reg-input"
          type="email"
          placeholder="Work email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="reg-input"
          type="password"
          placeholder="Create a password"
        />

        <hr className="reg-divider" />

        {/* ── Drop TermsCheckbox here ── */}
        <TermsCheckbox
          agreed={agreed}
          onChange={(val) => {
            setAgreed(val);
            if (val) setTried(false); // clear error once ticked
          }}
          error={triedSubmit}        // shake + show message if submitted without ticking
        />

        {/* ── Button: locked until agreed ── */}
        <button
          className={`reg-btn ${agreed ? "active" : "locked"}`}
          onClick={handleSubmit}
          aria-disabled={!agreed}
        >
          {agreed ? "Create Account →" : "Please agree to continue"}
        </button>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   INTEGRATION CHECKLIST
   ─────────────────────────────────────────────

   1. Copy TermsCheckbox.jsx → src/components/TermsCheckbox.jsx

   2. In your RegisterPage / SignupForm:
      import TermsCheckbox from '../components/TermsCheckbox';

   3. Add state:
      const [agreed, setAgreed]     = useState(false);
      const [triedSubmit, setTried] = useState(false);

   4. In your submit handler (before API call):
      if (!agreed) { setTried(true); return; }

   5. Place component above your submit button:
      <TermsCheckbox
        agreed={agreed}
        onChange={(val) => { setAgreed(val); if (val) setTried(false); }}
        error={triedSubmit}
      />

   6. Lock your button:
      <button disabled={!agreed} ...>Create Account</button>
      — or use the className toggle pattern shown above
      for a smoother visual transition.

   WHAT HAPPENS:
   ─────────────
   • Unticked  → button shows "Please agree to continue" in grey
   • Ticked    → button turns Myoozz red, says "Create Account →"
   • Submit without ticking → checkbox shakes, red error message appears
   • Links open Privacy Policy + Terms in a new tab (never interrupt flow)

───────────────────────────────────────────── */
