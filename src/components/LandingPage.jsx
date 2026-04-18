import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase (same client as app) ───────────────────────────────────────────
let supabase = null;
try {
  const { supabaseUrl, supabaseKey } = window.__MYOOZZ_ENV__ || {};
  if (supabaseUrl && supabaseKey) supabase = createClient(supabaseUrl, supabaseKey);
} catch (_) {}

// ─── Logo mark ───────────────────────────────────────────────────────────────
function MeLogo({ size = 36 }) {
  const s = size;
  return (
    <svg width={s * 1.6} height={s} viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* M */}
      <text x="0" y="34" fontFamily="'DM Sans', sans-serif" fontWeight="800" fontSize="38" fill="#bc1723">M</text>
      {/* e circle */}
      <circle cx="52" cy="24" r="12" fill="#d1d5d8"/>
      {/* e letter */}
      <text x="46.5" y="29.5" fontFamily="'DM Sans', sans-serif" fontWeight="700" fontSize="14" fill="#bc1723">e</text>
    </svg>
  );
}

const css = `
:root {
  --red: #bc1723;
  --red-dark: #9a1219;
  --bg: #FAFAF8;
  --bg-warm: #F4F2EE;
  --navy: #111827;
  --text: #1a1917;
  --text-muted: #6b6860;
  --text-light: #9e9b95;
  --border: rgba(26,25,23,0.12);
  --border-strong: rgba(26,25,23,0.22);
  --font-display: 'Cormorant Garamond', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --font-logo: 'Poppins', sans-serif;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; font-size: 16px; }
body { background: var(--bg); color: var(--text); font-family: var(--font-body); font-weight: 400; line-height: 1.65; -webkit-font-smoothing: antialiased; }

@keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes float1 { 0%,100% { transform: translateY(0px) rotate(-2deg); } 50% { transform: translateY(-12px) rotate(-2deg); } }
@keyframes float2 { 0%,100% { transform: translateY(0px) rotate(2.5deg); } 50% { transform: translateY(10px) rotate(2.5deg); } }
@keyframes float3 { 0%,100% { transform: translateY(0px) rotate(-1deg); } 50% { transform: translateY(-8px) rotate(-1deg); } }
@keyframes float4 { 0%,100% { transform: translateY(0px) rotate(1.5deg); } 50% { transform: translateY(9px) rotate(1.5deg); } }
@keyframes scaleIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }

.lp-reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.7s ease, transform 0.7s ease; }
.lp-reveal.visible { opacity: 1; transform: translateY(0); }

/* ── BAR ── */
.lp-bar { background: var(--navy); padding: 0 5%; }
.lp-bar-inner { max-width: 1200px; margin: 0 auto; height: 46px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.lp-bar-left { display: flex; align-items: center; gap: 12px; }
.lp-bar-badge { font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; background: var(--red); color: #fff; padding: 3px 8px; border-radius: 3px; }
.lp-bar-text { font-size: 13px; font-weight: 300; color: rgba(250,250,248,0.7); }
.lp-bar-right { display: flex; align-items: center; gap: 16px; }
.lp-bar-cta { font-size: 12.5px; font-weight: 500; color: #fff; text-decoration: none; background: var(--red); padding: 7px 16px; border-radius: 3px; transition: background 0.2s; display: inline-block; }
.lp-bar-cta:hover { background: var(--red-dark); }
.lp-bar-close { background: none; border: none; color: rgba(250,250,248,0.35); font-size: 20px; line-height: 1; cursor: pointer; padding: 0 4px; transition: color 0.2s; }
.lp-bar-close:hover { color: rgba(250,250,248,0.7); }

/* ── HEADER ── */
.lp-header { position: sticky; top: 0; z-index: 100; background: rgba(250,250,248,0.93); backdrop-filter: blur(12px); border-bottom: 0.5px solid var(--border); padding: 0 5%; }
.lp-header-inner { max-width: 1200px; margin: 0 auto; height: 64px; display: flex; align-items: center; justify-content: space-between; }
.lp-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.lp-logo-events { font-family: var(--font-body); font-size: 12px; font-weight: 500; color: var(--text-muted); letter-spacing: 0.04em; margin-left: 2px; }
.lp-nav { display: flex; align-items: center; gap: 24px; }
.lp-nav a { font-size: 13.5px; font-weight: 400; color: var(--text-muted); text-decoration: none; transition: color 0.2s; }
.lp-nav a:hover { color: var(--text); }
.lp-nav-links { display: flex; gap: 28px; }
.btn-demo { font-size: 13px; font-weight: 400; color: var(--text-muted); text-decoration: none; border: 0.5px solid var(--border-strong); padding: 8px 16px; border-radius: 4px; transition: all 0.2s; }
.btn-demo:hover { border-color: var(--text); color: var(--text); }
.btn-primary { background: var(--red); color: #fff; border: none; padding: 9px 20px; border-radius: 4px; font-family: var(--font-body); font-size: 13.5px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-block; transition: background 0.2s, transform 0.15s; }
.btn-primary:hover { background: var(--red-dark); transform: translateY(-1px); }
.btn-ghost { background: transparent; color: var(--text); border: 0.5px solid var(--border-strong); padding: 9px 20px; border-radius: 4px; font-family: var(--font-body); font-size: 13.5px; font-weight: 400; cursor: pointer; text-decoration: none; display: inline-block; transition: border-color 0.2s, background 0.2s; }
.btn-ghost:hover { border-color: var(--text); background: var(--bg-warm); }

/* ── HERO ── */
.lp-hero-section { position: relative; overflow: hidden; }
.lp-hero-section::before { content: ''; position: absolute; inset: 0; background-image: linear-gradient(rgba(26,25,23,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(26,25,23,0.035) 1px, transparent 1px); background-size: 48px 48px; pointer-events: none; z-index: 0; }
.lp-hero { padding: 90px 5% 72px; max-width: 1200px; margin: 0 auto; position: relative; z-index: 1; }
.hero-grid { display: grid; grid-template-columns: 52% 48%; gap: 48px; align-items: center; margin-bottom: 56px; }
.hero-eyebrow { font-size: 11.5px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: var(--red); margin-bottom: 28px; animation: fadeUp 0.8s ease both; }
.lp-hero h1 { font-family: var(--font-display); font-weight: 400; font-size: clamp(44px, 6.5vw, 80px); line-height: 1.06; letter-spacing: -0.01em; color: var(--text); margin-bottom: 28px; animation: fadeUp 0.8s 0.1s ease both; }
.lp-hero h1 em { font-style: italic; color: var(--red); }
.hero-sub { font-size: 18px; font-weight: 300; color: var(--text-muted); max-width: 520px; line-height: 1.75; margin-bottom: 40px; animation: fadeUp 0.8s 0.2s ease both; }
.hero-ctas { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; animation: fadeUp 0.8s 0.3s ease both; }
.hero-right { position: relative; height: 420px; animation: fadeIn 1s 0.4s ease both; }
.doc-card { position: absolute; background: #fff; border-radius: 10px; padding: 18px 22px; box-shadow: 0 8px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06); min-width: 190px; border: 0.5px solid var(--border); }
.doc-card-bar { height: 4px; border-radius: 2px; margin-bottom: 14px; width: 36px; }
.doc-card-bar--red { background: #bc1723; }
.doc-card-bar--green { background: #22c55e; }
.doc-card-bar--blue { background: #3b82f6; }
.doc-card-bar--amber { background: #f59e0b; }
.doc-card-label { font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text); margin-bottom: 4px; }
.doc-card-sub { font-size: 12px; font-weight: 300; color: var(--text-muted); margin-bottom: 14px; }
.doc-lines { display: flex; flex-direction: column; gap: 6px; }
.doc-lines span { height: 7px; border-radius: 4px; background: var(--bg-warm); display: block; }
.doc-lines span:nth-child(1) { width: 80%; }
.doc-lines span:nth-child(2) { width: 60%; }
.doc-lines span:nth-child(3) { width: 70%; }
.doc-card-1 { top: 16px; left: 8px; animation: float1 4s ease-in-out infinite; }
.doc-card-2 { top: 0; right: 0; animation: float2 4.5s ease-in-out infinite; }
.doc-card-3 { bottom: 90px; left: 40px; animation: float3 4.2s ease-in-out infinite; }
.doc-card-4 { bottom: 60px; right: 20px; animation: float4 3.8s ease-in-out infinite; }
.hero-bottom { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px; padding-top: 32px; border-top: 0.5px solid var(--border); }
.hero-pills { display: flex; align-items: center; }
.hero-pill { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); padding: 0 20px; border-right: 0.5px solid var(--border); white-space: nowrap; animation: fadeIn 1s 0.6s ease both; }
.hero-pill:first-child { padding-left: 0; }
.hero-pill:last-child { border-right: none; }
.hero-pill strong { font-family: var(--font-display); font-size: 18px; font-weight: 400; color: var(--red); }
.hero-tagline { font-size: 11.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-light); animation: fadeIn 1s 0.5s ease both; }
.hero-bg-text { position: absolute; right: -20px; top: 40px; font-family: var(--font-display); font-size: clamp(120px, 18vw, 220px); font-weight: 300; color: rgba(188,23,35,0.04); line-height: 1; pointer-events: none; user-select: none; letter-spacing: -0.04em; z-index: 0; }

/* ── SECTION SHARED ── */
.section-label { font-size: 11px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-light); margin-bottom: 20px; }

/* ── TRUTH ── */
.lp-truth { padding: 96px 5%; background: var(--bg); }
.lp-truth-inner { max-width: 1200px; margin: 0 auto; }
.lp-truth h2 { font-family: var(--font-display); font-weight: 400; font-size: clamp(30px, 4vw, 50px); line-height: 1.15; max-width: 720px; margin-bottom: 64px; }
.truth-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1px; background: var(--border); border: 0.5px solid var(--border); }
.truth-card { background: var(--bg); padding: 40px 36px; transition: background 0.25s; }
.truth-card:hover { background: var(--bg-warm); }
.truth-number { font-family: var(--font-display); font-size: 52px; font-weight: 300; color: rgba(188,23,35,0.15); line-height: 1; margin-bottom: 20px; display: block; }
.truth-card h3 { font-family: var(--font-body); font-size: 18px; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; color: var(--text); margin-bottom: 14px; line-height: 1.2; }
.truth-card p { font-family: var(--font-display); font-size: 17px; font-weight: 400; line-height: 1.55; color: var(--text-muted); }

/* ── COMPARISON ── */
.lp-comparison { padding: 0 5% 0; }
.lp-comparison-inner { max-width: 1200px; margin: 0 auto; background: var(--navy); border-radius: 10px; overflow: hidden; }
.comparison-top { padding: 56px 64px 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: end; border-bottom: 0.5px solid rgba(255,255,255,0.08); }
.comparison-top h2 { font-family: var(--font-display); font-size: clamp(28px, 3.2vw, 42px); font-weight: 400; line-height: 1.15; color: rgba(250,250,248,0.95); }
.comparison-top h2 em { font-style: italic; color: var(--red); display: block; }
.comparison-top p { font-size: 15px; font-weight: 300; color: rgba(250,250,248,0.5); line-height: 1.75; }
.comparison-table { width: 100%; }
.comparison-table-head { display: grid; grid-template-columns: 1fr 32px 1fr; padding: 16px 64px; border-bottom: 0.5px solid rgba(255,255,255,0.08); }
.comparison-table-head span { font-size: 10.5px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }
.col-head-before { color: rgba(250,250,248,0.25); }
.col-head-after { color: #4ade80; }
.comparison-row-item { display: grid; grid-template-columns: 1fr 32px 1fr; padding: 14px 64px; border-bottom: 0.5px solid rgba(255,255,255,0.05); transition: background 0.2s; }
.comparison-row-item:last-child { border-bottom: none; }
.comparison-row-item:hover { background: rgba(255,255,255,0.03); }
.col-before { font-size: 14px; font-weight: 300; color: rgba(250,250,248,0.25); text-decoration: line-through; text-decoration-color: rgba(255,255,255,0.15); padding-right: 16px; display: flex; align-items: center; }
.col-arrow { display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.15); font-size: 13px; }
.col-after { font-size: 14px; font-weight: 500; color: #4ade80; padding-left: 16px; display: flex; align-items: center; }

/* ── SHIFT ── */
.lp-shift { padding: 96px 5%; background: var(--text); color: var(--bg); overflow: hidden; position: relative; }
.lp-shift-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
.shift-label { font-size: 11px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(250,250,248,0.4); margin-bottom: 24px; }
.lp-shift h2 { font-family: var(--font-display); font-weight: 400; font-size: clamp(38px, 5vw, 64px); line-height: 1.1; color: var(--bg); margin-bottom: 32px; }
.lp-shift h2 em { font-style: italic; color: var(--red); }
.shift-body p { font-size: 16px; font-weight: 300; line-height: 1.8; color: rgba(250,250,248,0.7); margin-bottom: 20px; }
.shift-body p strong { color: var(--bg); font-weight: 400; }
.shift-accent { position: absolute; right: 0; bottom: 0; font-family: var(--font-display); font-size: clamp(80px, 14vw, 180px); font-weight: 300; color: rgba(250,250,248,0.03); line-height: 1; pointer-events: none; user-select: none; }

/* ── CAPABILITIES ── */
.lp-capabilities { padding: 96px 5%; background: var(--bg); }
.lp-capabilities-inner { max-width: 1200px; margin: 0 auto; }
.capabilities-header { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 72px; align-items: end; }
.lp-capabilities h2 { font-family: var(--font-display); font-size: clamp(34px, 4.5vw, 56px); font-weight: 400; line-height: 1.1; }
.lp-capabilities h2 em { font-style: italic; color: var(--red); }
.capabilities-intro { font-size: 16px; font-weight: 300; color: var(--text-muted); line-height: 1.7; }
.capabilities-intro strong { color: var(--text); font-weight: 500; }
.cap-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border); border: 0.5px solid var(--border); }
.cap-card { background: var(--bg); padding: 48px 40px 44px; transition: background 0.25s; }
.cap-card:hover { background: var(--bg-warm); }
.cap-number { font-family: var(--font-display); font-size: 72px; font-weight: 300; color: rgba(188,23,35,0.10); line-height: 1; margin-bottom: 12px; display: block; letter-spacing: -0.03em; }
.cap-card h3 { font-family: var(--font-display); font-size: 26px; font-weight: 500; color: var(--text); margin-bottom: 12px; line-height: 1.15; }
.cap-card p { font-size: 14.5px; font-weight: 300; color: var(--text-muted); line-height: 1.65; }

/* ── FOR YOU ── */
.lp-for-you { padding: 96px 5%; background: var(--bg-warm); border-top: 0.5px solid var(--border); border-bottom: 0.5px solid var(--border); }
.lp-for-you-inner { max-width: 900px; margin: 0 auto; text-align: center; }
.lp-for-you h2 { font-family: var(--font-display); font-weight: 400; font-size: clamp(34px, 5vw, 60px); line-height: 1.12; margin-bottom: 28px; }
.lp-for-you h2 em { font-style: italic; color: var(--red); }
.for-you-sub { font-size: 17px; font-weight: 300; color: var(--text-muted); line-height: 1.75; max-width: 680px; margin: 0 auto 48px; }
.for-you-pills { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.pill { border: 0.5px solid var(--border-strong); padding: 8px 18px; border-radius: 100px; font-size: 13.5px; font-weight: 400; color: var(--text-muted); background: var(--bg); }

/* ── CREDIBILITY ── */
.lp-credibility { padding: 96px 5%; background: var(--bg); }
.lp-credibility-inner { max-width: 1200px; margin: 0 auto; }
.credibility-header { margin-bottom: 64px; }
.lp-credibility h2 { font-family: var(--font-display); font-size: clamp(30px, 4vw, 48px); font-weight: 400; max-width: 680px; line-height: 1.15; margin-bottom: 16px; }
.credibility-sub { font-size: 15px; font-weight: 300; color: var(--text-muted); max-width: 560px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1px; background: var(--border); border: 0.5px solid var(--border); margin-bottom: 60px; }
.stat-block { background: var(--bg); padding: 36px 32px; }
.stat-num { font-family: var(--font-display); font-size: 42px; font-weight: 300; color: var(--text); line-height: 1; margin-bottom: 8px; display: block; }
.stat-num span { color: var(--red); }
.stat-label { font-size: 13px; font-weight: 400; color: var(--text-muted); line-height: 1.45; }
.credibility-statement { display: grid; grid-template-columns: 1fr 2fr; gap: 60px; padding-top: 60px; border-top: 0.5px solid var(--border); align-items: center; }
.credibility-quote { font-family: var(--font-display); font-size: clamp(22px, 2.8vw, 34px); font-weight: 400; font-style: italic; line-height: 1.3; color: var(--text); }
.credibility-points { display: flex; flex-direction: column; gap: 20px; }
.credibility-point { padding-left: 20px; border-left: 1.5px solid var(--red); }
.credibility-point strong { display: block; font-size: 14px; font-weight: 500; color: var(--text); margin-bottom: 4px; }
.credibility-point span { font-size: 13.5px; font-weight: 300; color: var(--text-muted); line-height: 1.6; }

/* ── PRICING ── */
.lp-pricing { padding: 96px 5%; background: var(--text); color: var(--bg); }
.lp-pricing-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
.pricing-label { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(250,250,248,0.35); margin-bottom: 20px; }
.lp-pricing h2 { font-family: var(--font-display); font-size: clamp(34px, 4.5vw, 56px); font-weight: 400; line-height: 1.1; color: var(--bg); margin-bottom: 20px; }
.lp-pricing h2 em { font-style: italic; color: var(--red); }
.pricing-desc { font-size: 16px; font-weight: 300; color: rgba(250,250,248,0.65); line-height: 1.75; margin-bottom: 36px; }
.pricing-model { display: flex; flex-direction: column; gap: 16px; }
.pricing-item { display: flex; align-items: flex-start; gap: 14px; padding: 18px 22px; border: 0.5px solid rgba(250,250,248,0.12); border-radius: 4px; transition: border-color 0.2s, background 0.2s; }
.pricing-item:hover { border-color: rgba(250,250,248,0.25); background: rgba(250,250,248,0.04); }
.pricing-item-icon { width: 8px; height: 8px; border-radius: 50%; background: var(--red); flex-shrink: 0; margin-top: 5px; }
.pricing-item-text { font-size: 14px; font-weight: 300; color: rgba(250,250,248,0.8); line-height: 1.6; }
.pricing-item-text strong { color: var(--bg); font-weight: 500; }
.pricing-cta-box { display: flex; flex-direction: column; gap: 24px; padding: 48px; border: 0.5px solid rgba(250,250,248,0.12); border-radius: 4px; background: rgba(250,250,248,0.03); }
.pricing-cta-eyebrow { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--red); }
.pricing-cta-box h3 { font-family: var(--font-display); font-size: 36px; font-weight: 400; color: var(--bg); line-height: 1.2; }
.pricing-cta-box p { font-size: 14px; font-weight: 300; color: rgba(250,250,248,0.55); line-height: 1.65; }
.btn-red-outline { border: 1px solid var(--red); color: var(--red); background: transparent; padding: 12px 24px; border-radius: 4px; font-family: var(--font-body); font-size: 14px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-block; transition: background 0.2s, color 0.2s; align-self: flex-start; }
.btn-red-outline:hover { background: var(--red); color: #fff; }

/* ── MODAL OVERLAY ── */
.modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 24px; animation: fadeIn 0.2s ease; }
.modal-box { background: var(--bg); border-radius: 8px; width: 100%; max-width: 520px; padding: 48px 44px; position: relative; animation: scaleIn 0.25s ease; box-shadow: 0 32px 80px rgba(0,0,0,0.22); }
.modal-close { position: absolute; top: 20px; right: 20px; background: none; border: none; font-size: 24px; color: var(--text-muted); cursor: pointer; line-height: 1; transition: color 0.2s; }
.modal-close:hover { color: var(--text); }
.modal-label { font-size: 10.5px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--red); margin-bottom: 12px; }
.modal-title { font-family: var(--font-display); font-size: 34px; font-weight: 400; line-height: 1.15; margin-bottom: 8px; }
.modal-sub { font-size: 14px; font-weight: 300; color: var(--text-muted); margin-bottom: 32px; line-height: 1.6; }
.modal-fields { display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px; }
.modal-field { display: flex; flex-direction: column; gap: 6px; }
.modal-field label { font-size: 12px; font-weight: 500; color: var(--text-muted); letter-spacing: 0.03em; }
.modal-field input, .modal-field select { border: 0.5px solid var(--border-strong); border-radius: 4px; padding: 11px 14px; font-family: var(--font-body); font-size: 14px; font-weight: 300; color: var(--text); background: #fff; transition: border-color 0.2s; outline: none; }
.modal-field input:focus, .modal-field select:focus { border-color: var(--red); }
.modal-field input::placeholder { color: var(--text-light); }
.modal-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.modal-submit { width: 100%; background: var(--red); color: #fff; border: none; padding: 13px 20px; border-radius: 4px; font-family: var(--font-body); font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
.modal-submit:hover { background: var(--red-dark); }
.modal-submit:disabled { opacity: 0.6; cursor: not-allowed; }
.modal-fine { font-size: 11.5px; color: var(--text-light); text-align: center; margin-top: 12px; line-height: 1.5; }
.modal-success { text-align: center; padding: 20px 0; }
.modal-success-icon { font-size: 40px; margin-bottom: 16px; }
.modal-success h3 { font-family: var(--font-display); font-size: 28px; font-weight: 400; margin-bottom: 10px; }
.modal-success p { font-size: 14px; font-weight: 300; color: var(--text-muted); line-height: 1.65; }

/* ── FOOTER ── */
.lp-footer { padding: 52px 5% 36px; border-top: 0.5px solid var(--border); background: var(--bg); }
.lp-footer-inner { max-width: 1200px; margin: 0 auto; }
.footer-top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 40px; margin-bottom: 48px; }
.footer-brand { display: flex; flex-direction: column; gap: 8px; max-width: 280px; }
.footer-tagline { font-size: 12px; font-weight: 300; color: var(--text-light); line-height: 1.6; margin-top: 4px; }
.footer-cols { display: flex; gap: 64px; }
.footer-col h4 { font-size: 10.5px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 16px; }
.footer-col a { display: block; font-size: 13px; font-weight: 300; color: var(--text-muted); text-decoration: none; margin-bottom: 10px; transition: color 0.2s; }
.footer-col a:hover { color: var(--text); }
.footer-bottom { border-top: 0.5px solid var(--border); padding-top: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.footer-bottom-left { font-size: 12px; color: var(--text-light); }
.footer-bottom-right { display: flex; gap: 24px; }
.footer-bottom-right a { font-size: 12px; color: var(--text-light); text-decoration: none; transition: color 0.2s; }
.footer-bottom-right a:hover { color: var(--text-muted); }

@media (max-width: 900px) {
  .lp-nav-links { display: none !important; }
  .hero-grid { grid-template-columns: 1fr; }
  .hero-right { display: none; }
  .lp-shift-inner { grid-template-columns: 1fr; gap: 40px; }
  .comparison-top { grid-template-columns: 1fr; gap: 24px; padding: 40px 32px 28px; }
  .comparison-table-head { padding: 14px 32px; }
  .comparison-row-item { padding: 14px 32px; }
  .capabilities-header { grid-template-columns: 1fr; gap: 24px; }
  .cap-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-pricing-inner { grid-template-columns: 1fr; gap: 48px; }
  .credibility-statement { grid-template-columns: 1fr; gap: 32px; }
  .footer-top { flex-direction: column; }
  .footer-cols { gap: 40px; }
}
@media (max-width: 600px) {
  .lp-hero { padding: 64px 5% 48px; }
  .cap-grid { grid-template-columns: 1fr; }
  .truth-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .hero-bg-text { display: none; }
  .shift-accent { display: none; }
  .pricing-cta-box { padding: 28px; }
  .for-you-pills { flex-direction: column; align-items: center; }
  .hero-pills { display: none; }
  .lp-bar-text { display: none; }
  .comparison-table-head { display: none; }
  .comparison-row-item { grid-template-columns: 1fr; gap: 4px; padding: 14px 24px; }
  .col-arrow { display: none; }
  .col-before { font-size: 12px; }
  .col-after { padding-left: 0; font-size: 13px; }
  .modal-box { padding: 36px 24px; }
  .modal-row { grid-template-columns: 1fr; }
  .footer-cols { flex-direction: column; gap: 28px; }
  .footer-bottom { flex-direction: column; align-items: flex-start; }
  .btn-demo { display: none; }
}
`;

export default function LandingPage() {
  const [barVisible, setBarVisible] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", city: "" });

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;700&family=Poppins:wght@700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = parseInt(entry.target.dataset.delay || "0", 10);
            setTimeout(() => entry.target.classList.add("visible"), 60 * delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".lp-reveal").forEach((el) => {
      const siblings = Array.from(el.parentElement.querySelectorAll(".lp-reveal"));
      el.dataset.delay = siblings.indexOf(el);
      observer.observe(el);
    });

    const handleAnchorClick = (e) => {
      const href = e.currentTarget.getAttribute("href");
      if (href && href.startsWith("#")) {
        const target = document.querySelector(href);
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: "smooth", block: "start" }); }
      }
    };
    const anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach((a) => a.addEventListener("click", handleAnchorClick));

    return () => {
      observer.disconnect();
      anchors.forEach((a) => a.removeEventListener("click", handleAnchorClick));
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (supabase) {
        await supabase.from("early_access_requests").insert([{
          full_name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          city: form.city,
          created_at: new Date().toISOString(),
        }]);
      }
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  const comparisons = [
    ["3 hours to format a proposal", "20 minutes, done"],
    ["Vendor contacts in 12 WhatsApps", "Vendor sheet, one click"],
    ["Tasks living in your head", "Everyone assigned, deadlines set"],
    ["Every cost guessed, never tracked", "Every cost tracked, live"],
    ["Seven files for one event", "Eight documents, one system"],
  ];

  return (
    <>
      <style>{css}</style>

      {/* MODAL */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            {submitted ? (
              <div className="modal-success">
                <div className="modal-success-icon">✓</div>
                <h3>You're in.</h3>
                <p>We've received your request. Our team will reach out personally within 24 hours to walk you through ME.</p>
              </div>
            ) : (
              <>
                <div className="modal-label">Early Adopter Program</div>
                <div className="modal-title">Request early access</div>
                <div className="modal-sub">We're live on real events right now. Every early adopter gets personal onboarding — no handbooks, no tutorials. Just us, walking you through it.</div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-fields">
                    <div className="modal-row">
                      <div className="modal-field">
                        <label>Your name *</label>
                        <input required placeholder="How should we address you?" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div className="modal-field">
                        <label>Work email *</label>
                        <input required type="email" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                    </div>
                    <div className="modal-row">
                      <div className="modal-field">
                        <label>Phone</label>
                        <input placeholder="+91 98xxx xxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      </div>
                      <div className="modal-field">
                        <label>City</label>
                        <input placeholder="Mumbai, Delhi, Bangalore..." value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                      </div>
                    </div>
                    <div className="modal-field">
                      <label>Company / Agency name</label>
                      <input placeholder="Your agency or company name" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" className="modal-submit" disabled={submitting}>
                    {submitting ? "Sending..." : "Request Early Access →"}
                  </button>
                  <p className="modal-fine">No billing. No commitment. We'll reach out personally within 24 hours.</p>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ANNOUNCEMENT BAR */}
      {barVisible && (
        <div className="lp-bar">
          <div className="lp-bar-inner">
            <div className="lp-bar-left">
              <span className="lp-bar-badge">FREE BETA</span>
              <span className="lp-bar-text">Early adopters get personal onboarding. No billing. No commitment.</span>
            </div>
            <div className="lp-bar-right">
              <button className="lp-bar-cta" style={{ border: "none", cursor: "pointer" }} onClick={() => setModalOpen(true)}>Request early access →</button>
              <button className="lp-bar-close" onClick={() => setBarVisible(false)} aria-label="Dismiss">×</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <a href="https://myoozz.events" className="lp-logo">
            <MeLogo size={32} />
            <span className="lp-logo-events">Events</span>
          </a>
          <nav className="lp-nav">
            <div className="lp-nav-links">
              <a href="#capabilities">Features</a>
              <a href="#credibility">Why ME</a>
              <a href="#pricing">Pricing</a>
            </div>
            <a href="https://demo.myoozz.events" target="_blank" rel="noopener noreferrer" className="btn-demo">Try demo</a>
            <button className="btn-primary" onClick={() => setModalOpen(true)}>Get Early Access →</button>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="lp-hero-section">
        <div className="lp-hero">
          <div className="hero-grid">
            <div className="hero-left">
              <div className="hero-eyebrow">Myoozz Events — Events Operating System</div>
              <h1>
                Stop running<br />
                your <em>events.</em><br />
                Start running<br />
                your <em>business.</em>
              </h1>
              <p className="hero-sub">ME is your events operating system — your process, structured. Your team, accountable. Your business, visible.</p>
              <div className="hero-ctas">
                <button className="btn-primary" onClick={() => setModalOpen(true)}>Get Early Access →</button>
                <a href="https://demo.myoozz.events" target="_blank" rel="noopener noreferrer" className="btn-ghost">Try demo ↗</a>
              </div>
            </div>
            <div className="hero-right">
              <div className="doc-card doc-card-1">
                <div className="doc-card-bar doc-card-bar--red" />
                <div className="doc-card-label">Proposal</div>
                <div className="doc-card-sub">City-wise · Branded</div>
                <div className="doc-lines"><span /><span /><span /></div>
              </div>
              <div className="doc-card doc-card-2">
                <div className="doc-card-bar doc-card-bar--green" />
                <div className="doc-card-label">Element Master</div>
                <div className="doc-card-sub">All scope · City-wise</div>
                <div className="doc-lines"><span /><span /></div>
              </div>
              <div className="doc-card doc-card-3">
                <div className="doc-card-bar doc-card-bar--blue" />
                <div className="doc-card-label">Cue Sheet</div>
                <div className="doc-card-sub">Named screens · Multi-city</div>
                <div className="doc-lines"><span /><span /><span /></div>
              </div>
              <div className="doc-card doc-card-4">
                <div className="doc-card-bar doc-card-bar--amber" />
                <div className="doc-card-label">Task Sheet</div>
                <div className="doc-card-sub">Who · What · Deadline</div>
                <div className="doc-lines"><span /><span /></div>
              </div>
            </div>
          </div>
          <div className="hero-bottom">
            <div className="hero-pills">
              <div className="hero-pill"><strong>100+</strong>&nbsp;years expertise</div>
              <div className="hero-pill"><strong>21</strong>&nbsp;categories</div>
              <div className="hero-pill"><strong>8</strong>&nbsp;documents</div>
              <div className="hero-pill"><strong>0</strong>&nbsp;logins for staff</div>
            </div>
            <div className="hero-tagline">Born in India &nbsp;·&nbsp; Built for the world</div>
          </div>
        </div>
        <div className="hero-bg-text">ME</div>
      </section>

      {/* TRUTH */}
      <section className="lp-truth">
        <div className="lp-truth-inner">
          <div className="section-label lp-reveal">The real cost of running events without a system</div>
          <h2 className="lp-reveal">You didn't lose that margin in a bad decision.<br />You lost it in a Tuesday WhatsApp thread.</h2>
          <div className="truth-grid">
            {[
              ["01","THE RATE TRAP","The vendor's rate changed. The client cost is closed. That gap is yours now."],
              ["02","THE TEMPLATE RITUAL","A template gets you through one event. ME gets you through every event after that."],
              ["03","THE OPS DEPENDENCY","Your team can't execute what only lives in your head. And when that person leaves — everything leaves."],
              ["04","THE WHATSAPP LAYER","Your event plan is scattered across 14 threads. No one knows what's confirmed, what's changed, what's been missed."],
            ].map(([num, title, body]) => (
              <div className="truth-card lp-reveal" key={num}>
                <span className="truth-number">{num}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <div style={{ padding: "0 5% 96px" }}>
        <div className="lp-comparison-inner lp-reveal">
          <div className="comparison-top">
            <div>
              <h2>Excel was built for accountants.<em>You've been borrowing it long enough.</em></h2>
            </div>
            <p>The event industry now has its own purpose-built system. Professionals who make the switch quote faster, win more, and execute cleaner.</p>
          </div>
          <div className="comparison-table">
            <div className="comparison-table-head">
              <span className="col-head-before">Before ME</span>
              <span></span>
              <span className="col-head-after">With ME</span>
            </div>
            {comparisons.map(([before, after]) => (
              <div className="comparison-row-item" key={before}>
                <span className="col-before">{before}</span>
                <span className="col-arrow">→</span>
                <span className="col-after">{after}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SHIFT */}
      <section className="lp-shift">
        <div className="lp-shift-inner">
          <div>
            <div className="shift-label lp-reveal">The shift</div>
            <h2 className="lp-reveal">ME makes <em>you</em><br />look beautiful.</h2>
          </div>
          <div className="shift-body">
            <p className="lp-reveal"><strong>Big-ticket clients judge you on what you show them, not what you know.</strong> Perception is formed at the proposal, the schedule, the cost sheet. By event day, the decision is already made.</p>
            <p className="lp-reveal">Your process only works when you're in the room. <strong>ME works even when you're not.</strong></p>
            <p className="lp-reveal">Stop being the person everything depends on. Start being the person who built the system everything runs on.</p>
          </div>
        </div>
        <div className="shift-accent">System</div>
      </section>

      {/* CAPABILITIES */}
      <section className="lp-capabilities" id="capabilities">
        <div className="lp-capabilities-inner">
          <div className="capabilities-header">
            <div>
              <div className="section-label lp-reveal">What ME does</div>
              <h2 className="lp-reveal">Every event tool is built for your attendees.<br />ME is built for <em>you.</em></h2>
            </div>
            <p className="capabilities-intro lp-reveal">ME — Myoozz Events — is <strong>one system for everything</strong> your event business runs on. No stitching tools together. No switching between Excel and WhatsApp and email. One place. Every event.</p>
          </div>
          <div className="cap-grid">
            {[
              ["01","Element Builder","Every item, every city, every cost — structured, not scattered. Your event scope lives in ME, not in someone's inbox."],
              ["02","Task Engine","Assign one-to-one. Real accountability, not a WhatsApp thread. Deadlines, status, and ownership — all visible."],
              ["03","Team Access","Your team works in ME. You see everything. Role-based access so each person sees exactly what they need to."],
              ["04","Client Documents","Proposals, timelines, show flows — download and use. Every document your client expects, ready in your format."],
              ["05","Cost Control","Your margins stay yours. Internal rates, confirmed costs, actuals — tracked separately from what the client sees."],
              ["06","Activity Log","Nothing gets lost in time or in transition. Every change, every decision — timestamped and searchable."],
            ].map(([num, title, body]) => (
              <div className="cap-card lp-reveal" key={num}>
                <span className="cap-number">{num}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR YOU */}
      <section className="lp-for-you">
        <div className="lp-for-you-inner">
          <div className="section-label lp-reveal">Who ME is for</div>
          <h2 className="lp-reveal">ME is for anyone who runs events<br />and wants to stop running them <em>from memory.</em></h2>
          <p className="for-you-sub lp-reveal">We don't segment by agency size. We segment by operating mode. If you want to move from busy operator to smart operator — ME is yours.</p>
          <div className="for-you-pills">
            {["Agency owners","Independent planners","Ops professionals","Production managers","Corporate event teams","Experiential agencies"].map((label) => (
              <span key={label} className="pill lp-reveal">{label}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CREDIBILITY */}
      <section className="lp-credibility" id="credibility">
        <div className="lp-credibility-inner">
          <div className="credibility-header">
            <div className="section-label lp-reveal">Why India · Why now</div>
            <h2 className="lp-reveal">Built for the complexity others couldn't imagine building software for.</h2>
            <p className="credibility-sub lp-reveal">India is the fastest-growing event software market in the world. And until now, there was no operating system built for the people running those events.</p>
          </div>
          <div className="stats-grid">
            <div className="stat-block lp-reveal"><span className="stat-num">$32<span>B</span></span><span className="stat-label">India events market by 2035 — growing at 7.6% CAGR</span></div>
            <div className="stat-block lp-reveal"><span className="stat-num">17.9<span>%</span></span><span className="stat-label">CAGR — India is the highest-growth event software market globally</span></div>
            <div className="stat-block lp-reveal"><span className="stat-num">$1.5<span>B</span></span><span className="stat-label">India event software market by 2033 — from $319M today</span></div>
            <div className="stat-block lp-reveal"><span className="stat-num">0</span><span className="stat-label">Direct competitors in the internal event operations category in India</span></div>
          </div>
          <div className="credibility-statement">
            <div className="credibility-quote lp-reveal">"Your business runs. You just can't see it running."</div>
            <div className="credibility-points">
              <div className="credibility-point lp-reveal"><strong>Multi-city events. Multi-vendor ops.</strong><span>ME is built for the scale and complexity of Indian events — not adapted from a Western SaaS template.</span></div>
              <div className="credibility-point lp-reveal"><strong>Category creation, not competition.</strong><span>Eventbrite, Cvent, Hopin — all attendee management tools. ME is the first system built for the people running the show.</span></div>
              <div className="credibility-point lp-reveal"><strong>India-native. Globally ready.</strong><span>Born in Noida. Built for the event professional in Mumbai, Bangalore, Delhi, Dubai, and beyond.</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="lp-pricing" id="pricing">
        <div className="lp-pricing-inner">
          <div>
            <div className="pricing-label lp-reveal">How ME is priced</div>
            <h2 className="lp-reveal">Simple credits.<br /><em>No surprises.</em></h2>
            <p className="pricing-desc lp-reveal">No monthly ticking clock. No per-seat confusion. Event Credits — buy a pack, use when you need it. Your team grows, your events scale, your rate never changes.</p>
            <div className="pricing-model">
              <div className="pricing-item lp-reveal"><div className="pricing-item-icon" /><span className="pricing-item-text"><strong>Event Credits model</strong> — buy a pack, use when needed. Credits don't expire.</span></div>
              <div className="pricing-item lp-reveal"><div className="pricing-item-icon" /><span className="pricing-item-text"><strong>No per-seat pricing.</strong> The event industry doesn't think in seats — neither does ME.</span></div>
              <div className="pricing-item lp-reveal"><div className="pricing-item-icon" /><span className="pricing-item-text"><strong>Tiers:</strong> 5 / 10 / 20 events · Unlimited active for volume agencies.</span></div>
              <div className="pricing-item lp-reveal"><div className="pricing-item-icon" /><span className="pricing-item-text"><strong>14–30 day trial.</strong> Full access. No credit card required to start.</span></div>
            </div>
          </div>
          <div className="pricing-cta-box" id="get-access">
            <span className="pricing-cta-eyebrow lp-reveal">Early Adopter Program</span>
            <h3 className="lp-reveal">Lock your rate.<br />Forever.</h3>
            <p className="lp-reveal">Early adopters get real pricing with a meaningful discount — locked in for life. As ME grows, your rate doesn't. Be among the first agencies to run on ME.</p>
            <button className="btn-red-outline lp-reveal" onClick={() => setModalOpen(true)}>Request Early Access →</button>
            <p style={{ fontSize: "12px", color: "rgba(250,250,248,0.3)", lineHeight: "1.5" }} className="lp-reveal">No commitment. We'll reach out personally within 24 hours.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="https://myoozz.events" className="lp-logo">
                <MeLogo size={28} />
                <span className="lp-logo-events">Events</span>
              </a>
              <div className="footer-tagline">My Events. My System.<br />Born in India · Built for the world</div>
            </div>
            <div className="footer-cols">
              <div className="footer-col">
                <h4>Product</h4>
                <a href="#capabilities">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="https://demo.myoozz.events" target="_blank" rel="noopener noreferrer">Try Demo</a>
              </div>
              <div className="footer-col">
                <h4>Company</h4>
                <a href="#credibility">About ME</a>
                <a href="mailto:hello@myoozz.events">Contact</a>
                <a href="https://myoozzevents.com" target="_blank" rel="noopener noreferrer">myoozzevents.com</a>
              </div>
              <div className="footer-col">
                <h4>Early Access</h4>
                <a href="#" onClick={(e) => { e.preventDefault(); setModalOpen(true); }}>Request Access</a>
                <a href="mailto:hello@myoozz.events">hello@myoozz.events</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-bottom-left">© 2026 Myoozz Consulting Pvt. Ltd. &nbsp;·&nbsp; <a href="https://myoozz.events" style={{ color: "inherit", textDecoration: "none" }}>myoozz.events</a></div>
            <div className="footer-bottom-right">
              <a href="/privacy-policy">Privacy Policy</a>
              <a href="/terms">Terms &amp; Conditions</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
