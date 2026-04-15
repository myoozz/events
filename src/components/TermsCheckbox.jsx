import React, { useState } from "react";

/* ─────────────────────────────────────────────
   Myoozz Events — <TermsCheckbox /> component
   Drop into any registration / signup form.

   USAGE:
   ──────
   import TermsCheckbox from './components/TermsCheckbox';

   const [agreed, setAgreed] = useState(false);

   <TermsCheckbox agreed={agreed} onChange={setAgreed} />
   <button disabled={!agreed}>Create Account</button>

   PROPS:
   ──────
   agreed   : boolean   — controlled checked state
   onChange : function  — called with true/false on toggle
   error    : boolean   — optional, shows validation error state
              (pass true if user tries to submit without ticking)
───────────────────────────────────────────── */

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');

  .tc-wrap {
    display: flex;
    flex-direction: column;
    gap: 0;
    font-family: 'DM Sans', sans-serif;
  }

  /* ── Row: checkbox + label ── */
  .tc-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
    user-select: none;
  }

  /* ── Custom checkbox box ── */
  .tc-box {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    margin-top: 1px;
    border-radius: 4px;
    border: 1.5px solid #d0cbc5;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
    position: relative;
  }

  .tc-box.checked {
    background: #bc1723;
    border-color: #bc1723;
    box-shadow: 0 0 0 3px rgba(188,23,35,0.12);
  }

  .tc-box.error-state {
    border-color: #bc1723;
    box-shadow: 0 0 0 3px rgba(188,23,35,0.10);
    animation: tc-shake 0.35s ease;
  }

  @keyframes tc-shake {
    0%,100% { transform: translateX(0); }
    25%      { transform: translateX(-4px); }
    75%      { transform: translateX(4px); }
  }

  /* ── Tick SVG inside box ── */
  .tc-tick {
    opacity: 0;
    transform: scale(0.4);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .tc-box.checked .tc-tick {
    opacity: 1;
    transform: scale(1);
  }

  /* ── Label text ── */
  .tc-label {
    font-size: 13.5px;
    font-weight: 300;
    color: #444;
    line-height: 1.65;
    padding-top: 1px;
  }

  .tc-label a {
    color: #bc1723;
    text-decoration: none;
    font-weight: 400;
    border-bottom: 1px solid rgba(188,23,35,0.25);
    transition: border-color 0.15s ease;
  }
  .tc-label a:hover {
    border-bottom-color: #bc1723;
  }

  /* ── Error message ── */
  .tc-error {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    margin-left: 32px;
    font-size: 12px;
    font-weight: 400;
    color: #bc1723;
    opacity: 0;
    transform: translateY(-4px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
  }
  .tc-error.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .tc-error-dot {
    width: 4px; height: 4px;
    border-radius: 50%;
    background: #bc1723;
    flex-shrink: 0;
  }

  /* ── Hidden native input (accessibility) ── */
  .tc-native {
    position: absolute;
    opacity: 0;
    width: 0; height: 0;
    pointer-events: none;
  }
`;

export default function TermsCheckbox({ agreed = false, onChange, error = false }) {
  const [focused, setFocused] = useState(false);

  const toggle = () => {
    if (typeof onChange === "function") onChange(!agreed);
  };

  const handleKey = (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <>
      <style>{STYLES}</style>

      <div className="tc-wrap">
        {/* ── Main row ── */}
        <label
          className="tc-row"
          tabIndex={0}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-checked={agreed}
          role="checkbox"
        >
          {/* Custom box */}
          <span
            className={[
              "tc-box",
              agreed ? "checked" : "",
              error && !agreed ? "error-state" : "",
              focused ? "focused" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={toggle}
          >
            {/* Native hidden input for form submission */}
            <input
              type="checkbox"
              className="tc-native"
              checked={agreed}
              onChange={toggle}
              tabIndex={-1}
              aria-hidden="true"
            />
            {/* Tick mark */}
            <svg
              className="tc-tick"
              width="11"
              height="9"
              viewBox="0 0 11 9"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 4L4 7.5L10 1"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          {/* Label */}
          <span className="tc-label" onClick={toggle}>
            I have read and agree to the{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              Terms of Use
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              Privacy Policy
            </a>{" "}
            of Myoozz Events. I understand that all data I enter is provided by
            me, and I will verify it before acting on it.
          </span>
        </label>

        {/* ── Error message ── */}
        <div className={`tc-error${error && !agreed ? " visible" : ""}`} aria-live="polite">
          <span className="tc-error-dot" />
          Please agree to the Terms of Use and Privacy Policy to continue.
        </div>
      </div>
    </>
  );
}
