import { useState, useEffect, useRef } from "react";

const css = `
:root {
  --red: #bc1723;
  --red-dark: #9a1219;
  --bg: #FAFAF8;
  --bg-warm: #F4F2EE;
  --navy: #13161f;
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
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  font-weight: 400;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes floatA {
  0%, 100% { transform: translateY(0px) rotate(-1.5deg); }
  50%       { transform: translateY(-10px) rotate(-1.5deg); }
}
@keyframes floatB {
  0%, 100% { transform: translateY(0px) rotate(1.8deg); }
  50%       { transform: translateY(-14px) rotate(1.8deg); }
}
@keyframes floatC {
  0%, 100% { transform: translateY(-5px) rotate(-0.8deg); }
  50%       { transform: translateY(6px) rotate(-0.8deg); }
}
@keyframes floatD {
  0%, 100% { transform: translateY(0px) rotate(2.2deg); }
  50%       { transform: translateY(-9px) rotate(2.2deg); }
}
@keyframes countUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.lp-reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.65s ease, transform 0.65s ease;
}
.lp-reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ── BANNER ── */
.lp-banner {
  background: var(--bg);
  border-bottom: 0.5px solid var(--border);
  padding: 10px 5%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  z-index: 98;
  position: relative;
}
.lp-banner-left { display: flex; align-items: center; gap: 12px; }
.lp-banner-badge {
  background: var(--red);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 3px;
  white-space: nowrap;
}
.lp-banner-text { font-size: 13px; color: var(--text-muted); }
.lp-banner-right { display: flex; align-items: center; gap: 10px; }
.lp-banner-cta {
  background: var(--red);
  color: #fff;
  font-size: 12.5px;
  font-weight: 500;
  padding: 7px 16px;
  border-radius: 4px;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s;
}
.lp-banner-cta:hover { background: var(--red-dark); }
.lp-banner-close {
  background: none;
  border: none;
  color: var(--text-light);
  font-size: 20px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  transition: color 0.2s;
}
.lp-banner-close:hover { color: var(--text); }

/* ── HEADER ── */
.lp-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(250,250,248,0.94);
  backdrop-filter: blur(12px);
  border-bottom: 0.5px solid var(--border);
  padding: 0 5%;
}
.lp-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.lp-logo { display: flex; align-items: baseline; gap: 10px; text-decoration: none; }
.lp-logo-mark {
  font-family: var(--font-logo);
  font-weight: 700;
  font-size: 22px;
  color: var(--red);
  letter-spacing: -0.5px;
  line-height: 1;
}
.lp-logo-name {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 300;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.lp-logo-beta {
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 500;
  color: var(--text-light);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border: 0.5px solid var(--border-strong);
  padding: 2px 7px;
  border-radius: 3px;
}
.lp-nav { display: flex; align-items: center; gap: 32px; }
.lp-nav-links { display: flex; gap: 32px; }
.lp-nav a {
  font-size: 13.5px;
  font-weight: 400;
  color: var(--text-muted);
  text-decoration: none;
  letter-spacing: 0.01em;
  transition: color 0.2s;
}
.lp-nav a:hover { color: var(--text); }
.btn-primary {
  background: var(--red);
  color: #fff;
  border: none;
  padding: 9px 20px;
  border-radius: 4px;
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: background 0.2s, transform 0.15s;
  letter-spacing: 0.01em;
}
.btn-primary:hover { background: var(--red-dark); transform: translateY(-1px); }
.btn-ghost {
  background: transparent;
  color: var(--text);
  border: 0.5px solid var(--border-strong);
  padding: 9px 20px;
  border-radius: 4px;
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 400;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: border-color 0.2s, background 0.2s;
}
.btn-ghost:hover { border-color: var(--text); background: var(--bg-warm); }

/* ── HERO ── */
.lp-hero-wrap {
  position: relative;
  overflow: hidden;
  background: var(--bg);
}
.hero-grid-bg {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(26,25,23,0.055) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
}
.lp-hero {
  padding: 90px 5% 72px;
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  position: relative;
  z-index: 1;
}
.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
  border: 0.5px solid var(--border-strong);
  padding: 5px 14px;
  border-radius: 100px;
  margin-bottom: 32px;
  animation: fadeUp 0.8s ease both;
}
.hero-eyebrow-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--red);
  flex-shrink: 0;
}
.lp-hero h1 {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(44px, 5.5vw, 76px);
  line-height: 1.07;
  letter-spacing: -0.01em;
  color: var(--text);
  margin-bottom: 28px;
  animation: fadeUp 0.8s 0.1s ease both;
}
.lp-hero h1 em { font-style: italic; color: var(--red); }
.hero-sub {
  font-size: 17px;
  font-weight: 300;
  color: var(--text-muted);
  line-height: 1.78;
  margin-bottom: 40px;
  max-width: 460px;
  animation: fadeUp 0.8s 0.2s ease both;
}
.hero-ctas {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 52px;
  animation: fadeUp 0.8s 0.3s ease both;
}
.hero-stats-pills {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  animation: fadeIn 1s 0.5s ease both;
}
.hero-stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
  border: 0.5px solid var(--border);
  padding: 5px 12px;
  border-radius: 100px;
  background: rgba(250,250,248,0.7);
}
.hero-stat-pill strong {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 500;
  color: var(--red);
  line-height: 1;
}

/* FLOATING DOC CARDS */
.hero-right {
  position: relative;
  height: 430px;
  animation: fadeIn 1s 0.4s ease both;
}
.doc-card {
  position: absolute;
  background: #fff;
  border: 0.5px solid rgba(26,25,23,0.1);
  border-radius: 8px;
  padding: 18px 22px;
  width: 195px;
  box-shadow: 0 6px 28px rgba(26,25,23,0.1), 0 1px 4px rgba(26,25,23,0.06);
}
.doc-card-bar { height: 3px; border-radius: 2px; margin-bottom: 14px; }
.doc-card-label {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 2px;
}
.doc-card-sub {
  font-size: 11.5px;
  font-weight: 300;
  color: var(--text-light);
  margin-bottom: 14px;
}
.doc-card-lines { display: flex; flex-direction: column; gap: 6px; }
.doc-card-line { height: 5px; border-radius: 3px; background: rgba(26,25,23,0.08); }
.doc-card-line.s { width: 55%; }
.doc-card-line.xs { width: 38%; }

.doc-card.proposal    { top: 28px;  left: 30px;  animation: floatA 5s   ease-in-out infinite; }
.doc-card.elem-master { top: 0px;   right: 14px; animation: floatB 6.2s ease-in-out infinite 0.4s; }
.doc-card.cue-sheet   { bottom: 50px; left: 4px; animation: floatC 5.6s ease-in-out infinite 0.9s; }
.doc-card.task-sheet  { bottom: 64px; right: 32px; animation: floatD 7s  ease-in-out infinite 0.2s; }

/* ── DARK STATS BAR ── */
.lp-stats-bar { background: var(--navy); padding: 60px 5%; }
.lp-stats-bar-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: rgba(255,255,255,0.05);
}
.stats-bar-item {
  background: var(--navy);
  padding: 36px 40px;
  text-align: center;
}
.stats-bar-num {
  font-family: var(--font-display);
  font-size: 58px;
  font-weight: 300;
  color: var(--red);
  line-height: 1;
  display: block;
  margin-bottom: 14px;
}
.stats-bar-label {
  font-size: 12.5px;
  font-weight: 300;
  color: rgba(250,250,248,0.45);
  line-height: 1.5;
  max-width: 160px;
  margin: 0 auto;
}

/* ── TRUTH SECTION ── */
.lp-truth { padding: 96px 5%; background: var(--bg); }
.lp-truth-inner { max-width: 1200px; margin: 0 auto; }
.section-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-light);
  margin-bottom: 20px;
}
.lp-truth h2 {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(30px, 4vw, 50px);
  line-height: 1.15;
  max-width: 720px;
  margin-bottom: 64px;
}
.truth-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border);
  border: 0.5px solid var(--border);
}
.truth-card { background: var(--bg); padding: 40px 36px; transition: background 0.25s; }
.truth-card:hover { background: var(--bg-warm); }
.truth-number {
  font-family: var(--font-display);
  font-size: 44px;
  font-weight: 300;
  color: rgba(188,23,35,0.16);
  line-height: 1;
  margin-bottom: 22px;
  display: block;
}
.truth-card h3 {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--red);
  margin-bottom: 14px;
}
.truth-card p {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--text);
}

/* ── EXCEL / BEFORE-AFTER ── */
.lp-excel { padding: 0 5% 80px; background: var(--bg); }
.lp-excel-inner { max-width: 1200px; margin: 0 auto; }
.excel-card {
  background: var(--navy);
  border-radius: 12px;
  padding: 56px 64px;
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 80px;
  align-items: center;
}
.excel-card h2 {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(26px, 3.2vw, 42px);
  color: #fff;
  line-height: 1.15;
  margin-bottom: 16px;
}
.excel-card h2 em { font-style: italic; color: var(--red); }
.excel-card-sub {
  font-size: 14.5px;
  font-weight: 300;
  color: rgba(250,250,248,0.4);
  line-height: 1.75;
}
.excel-compare { display: flex; flex-direction: column; gap: 13px; }
.excel-row {
  display: grid;
  grid-template-columns: 1fr 24px 1fr;
  align-items: center;
  gap: 10px;
}
.excel-before {
  font-size: 13.5px;
  font-weight: 400;
  color: rgba(250,250,248,0.28);
  text-decoration: line-through;
  text-decoration-color: rgba(250,250,248,0.15);
}
.excel-arr { color: var(--red); font-size: 12px; text-align: center; }
.excel-after {
  font-size: 13.5px;
  font-weight: 400;
  color: #4ade80;
}

/* ── SHIFT SECTION ── */
.lp-shift {
  padding: 96px 5%;
  background: var(--text);
  color: var(--bg);
  overflow: hidden;
  position: relative;
}
.lp-shift-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}
.shift-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(250,250,248,0.35);
  margin-bottom: 24px;
}
.lp-shift h2 {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(38px, 5vw, 64px);
  line-height: 1.1;
  color: var(--bg);
  margin-bottom: 0;
}
.lp-shift h2 em { font-style: italic; color: var(--red); }
.shift-body p {
  font-size: 16px;
  font-weight: 300;
  line-height: 1.85;
  color: rgba(250,250,248,0.65);
  margin-bottom: 22px;
}
.shift-body p:last-child { margin-bottom: 0; }
.shift-body p strong { color: rgba(250,250,248,0.9); font-weight: 400; }
.shift-accent {
  position: absolute;
  right: -10px;
  bottom: -10px;
  font-family: var(--font-display);
  font-size: clamp(80px, 14vw, 180px);
  font-weight: 300;
  color: rgba(250,250,248,0.025);
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

/* ── CAPABILITIES ── */
.lp-capabilities { padding: 96px 5%; background: var(--bg); }
.lp-capabilities-inner { max-width: 1200px; margin: 0 auto; }
.capabilities-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-bottom: 72px;
  align-items: end;
}
.lp-capabilities h2 {
  font-family: var(--font-display);
  font-size: clamp(34px, 4.5vw, 56px);
  font-weight: 400;
  line-height: 1.1;
}
.lp-capabilities h2 em { font-style: italic; color: var(--red); }
.capabilities-intro {
  font-size: 16px;
  font-weight: 300;
  color: var(--text-muted);
  line-height: 1.75;
}
.capabilities-intro strong { color: var(--text); font-weight: 500; }
.cap-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border);
  border: 0.5px solid var(--border);
}
.cap-card { background: var(--bg); padding: 40px 36px; transition: background 0.25s; }
.cap-card:hover { background: var(--bg-warm); }
.cap-number {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 400;
  color: var(--text-light);
  margin-bottom: 28px;
  display: block;
}
.cap-card h3 {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 12px;
  line-height: 1.2;
}
.cap-card p {
  font-size: 14.5px;
  font-weight: 300;
  color: var(--text-muted);
  line-height: 1.68;
}

/* ── DOCUMENTS SECTION ── */
.lp-documents {
  padding: 96px 5%;
  background: var(--bg-warm);
  border-top: 0.5px solid var(--border);
  border-bottom: 0.5px solid var(--border);
}
.lp-documents-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 80px;
  align-items: start;
}
.lp-documents h2 {
  font-family: var(--font-display);
  font-size: clamp(34px, 4.5vw, 56px);
  font-weight: 400;
  line-height: 1.1;
  margin-bottom: 20px;
}
.lp-documents h2 em { font-style: italic; color: var(--red); }
.documents-sub {
  font-size: 15px;
  font-weight: 300;
  color: var(--text-muted);
  line-height: 1.78;
  margin-bottom: 36px;
}
.documents-detail {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-muted);
  line-height: 1.65;
}
.doc-list {
  display: flex;
  flex-direction: column;
  border: 0.5px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg);
}
.doc-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 0.5px solid var(--border);
  transition: background 0.2s;
}
.doc-list-item:last-child { border-bottom: none; }
.doc-list-item:hover { background: var(--bg-warm); }
.doc-list-item.dimmed { opacity: 0.45; }
.doc-list-left { display: flex; align-items: center; gap: 12px; }
.doc-list-icon { font-size: 18px; width: 26px; text-align: center; }
.doc-list-info {}
.doc-list-name { font-size: 13.5px; font-weight: 500; color: var(--text); line-height: 1.3; }
.doc-list-desc { font-size: 11.5px; font-weight: 300; color: var(--text-muted); margin-top: 1px; }
.doc-list-badge {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-light);
  border: 0.5px solid var(--border-strong);
  padding: 2px 7px;
  border-radius: 3px;
}
.doc-list-badge.xlsx { color: var(--text-muted); }
.doc-list-badge.soon-tag {
  border-color: rgba(188,23,35,0.3);
  color: var(--red);
}

/* ── TEAM SECTION ── */
.lp-team { padding: 96px 5%; background: var(--bg); }
.lp-team-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}
.team-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.team-card {
  background: var(--bg);
  border: 0.5px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  transition: box-shadow 0.25s, transform 0.25s;
}
.team-card:hover {
  box-shadow: 0 6px 24px rgba(26,25,23,0.08);
  transform: translateY(-2px);
}
.team-card-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-warm);
  border: 0.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 400;
  color: var(--text-muted);
  margin-bottom: 10px;
}
.team-card-name { font-size: 14px; font-weight: 500; color: var(--text); margin-bottom: 2px; }
.team-card-role { font-size: 11.5px; font-weight: 300; color: var(--text-muted); margin-bottom: 8px; }
.team-card-meta { font-size: 11.5px; font-weight: 400; color: var(--text-muted); margin-bottom: 4px; }
.team-card-status { font-size: 11.5px; font-weight: 500; }
.s-done { color: #22c55e; }
.s-progress { color: #3b82f6; }
.s-site { color: #f59e0b; }
.s-pending { color: var(--text-light); }

.team-copy-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--red);
  margin-bottom: 16px;
}
.lp-team h2 {
  font-family: var(--font-display);
  font-size: clamp(34px, 4.5vw, 54px);
  font-weight: 400;
  line-height: 1.1;
  margin-bottom: 24px;
}
.lp-team h2 em { font-style: italic; color: var(--red); }
.team-body { font-size: 15.5px; font-weight: 300; color: var(--text-muted); line-height: 1.78; margin-bottom: 16px; }
.team-body:last-of-type { margin-bottom: 0; }

/* ── FOR YOU ── */
.lp-for-you {
  padding: 96px 5%;
  background: var(--bg-warm);
  border-top: 0.5px solid var(--border);
  border-bottom: 0.5px solid var(--border);
}
.lp-for-you-inner { max-width: 900px; margin: 0 auto; text-align: center; }
.lp-for-you h2 {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(34px, 5vw, 60px);
  line-height: 1.12;
  margin-bottom: 28px;
}
.lp-for-you h2 em { font-style: italic; color: var(--red); }
.for-you-sub {
  font-size: 17px;
  font-weight: 300;
  color: var(--text-muted);
  line-height: 1.78;
  max-width: 660px;
  margin: 0 auto 48px;
}
.for-you-pills { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.pill {
  border: 0.5px solid var(--border-strong);
  padding: 9px 20px;
  border-radius: 100px;
  font-size: 13.5px;
  font-weight: 400;
  color: var(--text-muted);
  background: var(--bg);
  transition: border-color 0.2s, color 0.2s;
}
.pill:hover { border-color: var(--red); color: var(--text); }

/* ── CREDIBILITY ── */
.lp-credibility { padding: 96px 5%; background: var(--bg); }
.lp-credibility-inner { max-width: 1200px; margin: 0 auto; }
.credibility-header { margin-bottom: 64px; }
.lp-credibility h2 {
  font-family: var(--font-display);
  font-size: clamp(30px, 4vw, 48px);
  font-weight: 400;
  max-width: 680px;
  line-height: 1.15;
  margin-bottom: 16px;
}
.credibility-sub {
  font-size: 15px;
  font-weight: 300;
  color: var(--text-muted);
  max-width: 540px;
  line-height: 1.7;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1px;
  background: var(--border);
  border: 0.5px solid var(--border);
  margin-bottom: 60px;
}
.stat-block { background: var(--bg); padding: 36px 32px; }
.stat-num {
  font-family: var(--font-display);
  font-size: 42px;
  font-weight: 300;
  color: var(--text);
  line-height: 1;
  margin-bottom: 10px;
  display: block;
}
.stat-num span { color: var(--red); }
.stat-label { font-size: 13px; font-weight: 400; color: var(--text-muted); line-height: 1.5; }
.credibility-statement {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 64px;
  padding-top: 60px;
  border-top: 0.5px solid var(--border);
  align-items: center;
}
.credibility-quote {
  font-family: var(--font-display);
  font-size: clamp(22px, 2.8vw, 34px);
  font-weight: 400;
  font-style: italic;
  line-height: 1.35;
  color: var(--text);
}
.credibility-points { display: flex; flex-direction: column; gap: 22px; }
.credibility-point { padding-left: 20px; border-left: 1.5px solid var(--red); }
.credibility-point strong { display: block; font-size: 14px; font-weight: 500; color: var(--text); margin-bottom: 4px; }
.credibility-point span { font-size: 13.5px; font-weight: 300; color: var(--text-muted); line-height: 1.65; }

/* ── PRICING ── */
.lp-pricing { padding: 96px 5%; background: var(--text); color: var(--bg); }
.lp-pricing-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}
.pricing-label {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(250,250,248,0.35);
  margin-bottom: 20px;
}
.lp-pricing h2 {
  font-family: var(--font-display);
  font-size: clamp(34px, 4.5vw, 56px);
  font-weight: 400;
  line-height: 1.1;
  color: var(--bg);
  margin-bottom: 20px;
}
.lp-pricing h2 em { font-style: italic; color: var(--red); }
.pricing-desc {
  font-size: 16px;
  font-weight: 300;
  color: rgba(250,250,248,0.6);
  line-height: 1.78;
  margin-bottom: 36px;
}
.pricing-model { display: flex; flex-direction: column; gap: 14px; }
.pricing-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 22px;
  border: 0.5px solid rgba(250,250,248,0.1);
  border-radius: 4px;
  transition: border-color 0.2s, background 0.2s;
}
.pricing-item:hover { border-color: rgba(250,250,248,0.22); background: rgba(250,250,248,0.03); }
.pricing-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--red); flex-shrink: 0; margin-top: 4px; }
.pricing-item-text { font-size: 14px; font-weight: 300; color: rgba(250,250,248,0.75); line-height: 1.6; }
.pricing-item-text strong { color: var(--bg); font-weight: 500; }
.pricing-cta-box {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 48px;
  border: 0.5px solid rgba(250,250,248,0.1);
  border-radius: 6px;
  background: rgba(250,250,248,0.02);
}
.pricing-cta-eyebrow {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--red);
}
.pricing-cta-box h3 {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 400;
  color: var(--bg);
  line-height: 1.2;
}
.pricing-cta-box p {
  font-size: 14px;
  font-weight: 300;
  color: rgba(250,250,248,0.5);
  line-height: 1.7;
}
.btn-red-outline {
  border: 1px solid var(--red);
  color: var(--red);
  background: transparent;
  padding: 13px 26px;
  border-radius: 4px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: background 0.2s, color 0.2s;
  align-self: flex-start;
}
.btn-red-outline:hover { background: var(--red); color: #fff; }

/* ── FOOTER ── */
.lp-footer {
  padding: 48px 5%;
  border-top: 0.5px solid var(--border);
  background: var(--bg);
}
.lp-footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
}
.footer-brand { display: flex; flex-direction: column; gap: 6px; }
.footer-tagline { font-size: 11.5px; font-weight: 300; color: var(--text-light); letter-spacing: 0.04em; }
.footer-links { display: flex; gap: 28px; }
.footer-links a {
  font-size: 12.5px;
  font-weight: 400;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s;
}
.footer-links a:hover { color: var(--text); }

/* ── RESPONSIVE ── */
@media (max-width: 960px) {
  .lp-nav-links { display: none !important; }
  .lp-hero { grid-template-columns: 1fr; gap: 56px; }
  .lp-shift-inner { grid-template-columns: 1fr; gap: 40px; }
  .capabilities-header { grid-template-columns: 1fr; gap: 24px; }
  .cap-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-pricing-inner { grid-template-columns: 1fr; gap: 48px; }
  .credibility-statement { grid-template-columns: 1fr; gap: 40px; }
  .lp-footer-inner { flex-direction: column; align-items: flex-start; }
  .lp-team-inner { grid-template-columns: 1fr; gap: 48px; }
  .lp-documents-inner { grid-template-columns: 1fr; gap: 48px; }
  .excel-card { grid-template-columns: 1fr; gap: 40px; padding: 40px 36px; }
  .lp-stats-bar-inner { grid-template-columns: repeat(2, 1fr); }
  .truth-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .lp-hero { padding: 56px 5% 56px; }
  .hero-right { display: none; }
  .cap-grid { grid-template-columns: 1fr; }
  .truth-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .shift-accent { display: none; }
  .pricing-cta-box { padding: 28px; }
  .for-you-pills { gap: 8px; }
  .lp-stats-bar-inner { grid-template-columns: repeat(2, 1fr); }
  .team-cards-grid { grid-template-columns: 1fr; }
  .excel-card { padding: 32px 24px; }
}
`;

export default function LandingPage() {
  const [bannerVisible, setBannerVisible] = useState(true);
  const statsBarRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&family=Poppins:wght@700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    // Scroll reveal
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = parseInt(entry.target.dataset.delay || "0", 10);
            setTimeout(() => {
              entry.target.classList.add("visible");
            }, 60 * delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(".lp-reveal").forEach((el) => {
      const siblings = Array.from(
        el.parentElement.querySelectorAll(".lp-reveal")
      );
      const idx = siblings.indexOf(el);
      el.dataset.delay = idx;
      observer.observe(el);
    });

    // Smooth scroll
    const handleAnchorClick = (e) => {
      const href = e.currentTarget.getAttribute("href");
      if (href && href.startsWith("#")) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };
    const anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach((a) => a.addEventListener("click", handleAnchorClick));

    return () => {
      observer.disconnect();
      anchors.forEach((a) =>
        a.removeEventListener("click", handleAnchorClick)
      );
    };
  }, []);

  return (
    <>
      <style>{css}</style>

      {/* FREE BETA BANNER */}
      {bannerVisible && (
        <div className="lp-banner">
          <div className="lp-banner-left">
            <span className="lp-banner-badge">Free Beta</span>
            <span className="lp-banner-text">
              Early adopters get personal onboarding. No billing. No
              commitment.
            </span>
          </div>
          <div className="lp-banner-right">
            <a href="#get-access" className="lp-banner-cta">
              Request early access →
            </a>
            <button
              className="lp-banner-close"
              onClick={() => setBannerVisible(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <a href="https://myoozz.events" className="lp-logo">
            <span className="lp-logo-mark">ME</span>
            <span className="lp-logo-name">Myoozz Events</span>
            <span className="lp-logo-beta">BETA</span>
          </a>
          <nav className="lp-nav">
            <div className="lp-nav-links">
              <a href="#capabilities">Features</a>
              <a href="#documents">Documents</a>
              <a href="#credibility">Why ME</a>
              <a href="#pricing">Pricing</a>
            </div>
            <a href="#get-access" className="btn-primary">
              Get early access
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="lp-hero-wrap">
        <div className="hero-grid-bg" />
        <div className="lp-hero">
          {/* LEFT */}
          <div>
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-dot" />
              Born in India · Built for the world
            </div>
            <h1>
              Stop running
              <br />
              your <em>events.</em>
              <br />
              Start running
              <br />
              your <em>business.</em>
            </h1>
            <p className="hero-sub">
              ME is your events operating system — so nothing runs on memory,
              luck, or one person.
            </p>
            <div className="hero-ctas">
              <a href="#get-access" className="btn-primary">
                Get early access — free →
              </a>
              <a href="#capabilities" className="btn-ghost">
                See what ME does ↓
              </a>
            </div>
            <div className="hero-stats-pills">
              {[
                { num: "100+", label: "years expertise" },
                { num: "21", label: "categories" },
                { num: "8", label: "documents" },
                { num: "0", label: "logins for staff" },
              ].map((s) => (
                <div key={s.label} className="hero-stat-pill">
                  <strong>{s.num}</strong>
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — FLOATING DOCUMENT CARDS */}
          <div className="hero-right">
            <div className="doc-card proposal">
              <div
                className="doc-card-bar"
                style={{ background: "#bc1723" }}
              />
              <div className="doc-card-label">Proposal</div>
              <div className="doc-card-sub">City-wise · Branded</div>
              <div className="doc-card-lines">
                <div className="doc-card-line" />
                <div className="doc-card-line s" />
                <div className="doc-card-line" />
                <div className="doc-card-line xs" />
              </div>
            </div>
            <div className="doc-card elem-master">
              <div
                className="doc-card-bar"
                style={{ background: "#22c55e" }}
              />
              <div className="doc-card-label">Element Master</div>
              <div className="doc-card-sub">All scope · City-wise</div>
              <div className="doc-card-lines">
                <div className="doc-card-line" />
                <div className="doc-card-line s" />
                <div className="doc-card-line" />
              </div>
            </div>
            <div className="doc-card cue-sheet">
              <div
                className="doc-card-bar"
                style={{ background: "#3b82f6" }}
              />
              <div className="doc-card-label">Cue Sheet</div>
              <div className="doc-card-sub">Named screens · Multi-city</div>
              <div className="doc-card-lines">
                <div className="doc-card-line" />
                <div className="doc-card-line s" />
              </div>
            </div>
            <div className="doc-card task-sheet">
              <div
                className="doc-card-bar"
                style={{ background: "#f59e0b" }}
              />
              <div className="doc-card-label">Task Sheet</div>
              <div className="doc-card-sub">Who · What · Deadline</div>
              <div className="doc-card-lines">
                <div className="doc-card-line" />
                <div className="doc-card-line s" />
                <div className="doc-card-line xs" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DARK STATS BAR */}
      <div className="lp-stats-bar" ref={statsBarRef}>
        <div className="lp-stats-bar-inner">
          {[
            {
              num: "100+",
              label: "Years of collective expertise across EM, MICE, brand & digital",
            },
            { num: "21", label: "Standard categories, pre-loaded" },
            { num: "8", label: "Export formats, fully formatted" },
            { num: "0", label: "Logins needed for ground staff" },
          ].map((s) => (
            <div key={s.label} className="stats-bar-item">
              <span className="stats-bar-num">{s.num}</span>
              <span className="stats-bar-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* TRUTH SECTION */}
      <section className="lp-truth">
        <div className="lp-truth-inner">
          <div className="section-label lp-reveal">
            The real cost of running events without a system
          </div>
          <h2 className="lp-reveal">
            You didn't lose that margin in a bad decision.
            <br />
            You lost it in a Tuesday WhatsApp thread.
          </h2>
          <div className="truth-grid">
            <div className="truth-card lp-reveal">
              <span className="truth-number">01</span>
              <h3>The Rate Trap</h3>
              <p>
                The vendor's rate changed. The client cost is closed. That gap
                is yours now.
              </p>
            </div>
            <div className="truth-card lp-reveal">
              <span className="truth-number">02</span>
              <h3>The Template Ritual</h3>
              <p>
                A template gets you through one event. ME gets you through
                every event after that.
              </p>
            </div>
            <div className="truth-card lp-reveal">
              <span className="truth-number">03</span>
              <h3>The Ops Dependency</h3>
              <p>
                Your team can't execute what only lives in your head. And when
                that person leaves — everything leaves.
              </p>
            </div>
            <div className="truth-card lp-reveal">
              <span className="truth-number">04</span>
              <h3>The WhatsApp Layer</h3>
              <p>
                Your event plan is scattered across 14 threads. No one knows
                what's confirmed, what's changed, what's been missed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* EXCEL / BEFORE-AFTER */}
      <section className="lp-excel">
        <div className="lp-excel-inner">
          <div className="excel-card lp-reveal">
            <div>
              <h2>
                Excel was built for accountants.
                <br />
                <em>You've been borrowing it long enough.</em>
              </h2>
              <p className="excel-card-sub">
                The event industry is finally getting its own purpose-built
                system. Professionals who make the switch quote faster, win
                more, and execute cleaner.
              </p>
            </div>
            <div className="excel-compare">
              {[
                ["3 hours to format a proposal", "20 minutes, done"],
                ["Vendor contacts in 12 WhatsApps", "Vendor sheet, one click"],
                ["Tasks living in your head", "Everyone assigned, deadlines set"],
                ["Every cost guessed, never tracked", "Every cost tracked, live"],
                ["Seven files for one event", "Eight documents, one system"],
              ].map(([before, after]) => (
                <div key={before} className="excel-row">
                  <span className="excel-before">{before}</span>
                  <span className="excel-arr">→</span>
                  <span className="excel-after">{after}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SHIFT SECTION */}
      <section className="lp-shift">
        <div className="lp-shift-inner">
          <div>
            <div className="shift-label lp-reveal">The shift</div>
            <h2 className="lp-reveal">
              ME makes <em>you</em>
              <br />
              look beautiful.
            </h2>
          </div>
          <div className="shift-body">
            <p className="lp-reveal">
              <strong>
                Big-ticket clients judge you on what you show them, not what
                you know.
              </strong>{" "}
              Perception is formed at the proposal, the schedule, the cost
              sheet. By event day, the decision is already made.
            </p>
            <p className="lp-reveal">
              Your process only works when you're in the room.{" "}
              <strong>ME works even when you're not.</strong>
            </p>
            <p className="lp-reveal">
              Stop being the person everything depends on. Start being the
              person who built the system everything runs on.
            </p>
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
              <h2 className="lp-reveal">
                Every event tool is built for your attendees.
                <br />
                ME is built for{" "}
                <em>you.</em>
              </h2>
            </div>
            <p className="capabilities-intro lp-reveal">
              ME — My Events Operating System — is{" "}
              <strong>one system for everything</strong> your event business
              runs on. No stitching tools together. No switching between Excel
              and WhatsApp and email. One place. Every event.
            </p>
          </div>
          <div className="cap-grid">
            <div className="cap-card lp-reveal">
              <span className="cap-number">01</span>
              <h3>Element Builder</h3>
              <p>
                Every item, every city, every cost — structured, not scattered.
                Your event scope lives in ME, not in someone's inbox.
              </p>
            </div>
            <div className="cap-card lp-reveal">
              <span className="cap-number">02</span>
              <h3>Task Engine</h3>
              <p>
                Assign one-to-one. Real accountability, not a WhatsApp thread.
                Deadlines, status, and ownership — all visible.
              </p>
            </div>
            <div className="cap-card lp-reveal">
              <span className="cap-number">03</span>
              <h3>Team Access</h3>
              <p>
                Your team works in ME. You see everything. Role-based access so
                each person sees exactly what they need — nothing more.
              </p>
            </div>
            <div className="cap-card lp-reveal">
              <span className="cap-number">04</span>
              <h3>Client Documents</h3>
              <p>
                Estimates, invoices, timelines, show flows — download and use.
                Every document your client expects, ready in your format.
              </p>
            </div>
            <div className="cap-card lp-reveal">
              <span className="cap-number">05</span>
              <h3>Cost Control</h3>
              <p>
                Your margins stay yours. Internal rates, confirmed costs,
                actuals — tracked separately from what the client sees.
              </p>
            </div>
            <div className="cap-card lp-reveal">
              <span className="cap-number">06</span>
              <h3>Activity Log</h3>
              <p>
                Nothing gets lost in time or in transition. Every change, every
                decision — timestamped and searchable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DOCUMENTS */}
      <section className="lp-documents" id="documents">
        <div className="lp-documents-inner">
          <div>
            <div className="section-label lp-reveal">Eight documents</div>
            <h2 className="lp-reveal">
              Every person covered.
              <br />
              <em>From one event.</em>
            </h2>
            <p className="documents-sub lp-reveal">
              All eight documents built from data you've already entered. No
              reformatting. No copy-paste. Fully formatted. Download one or
              take everything at once.
            </p>
            <p className="documents-detail lp-reveal">
              From the first proposal to the final show flow — ME generates
              every document your client, your team, and your vendors need.
              In the format you need.
            </p>
          </div>
          <div className="doc-list lp-reveal">
            {[
              {
                icon: "📄",
                name: "Proposal",
                desc: "City-wise · Agency fee · GST · T&C",
                badge: "xlsx",
              },
              {
                icon: "📋",
                name: "Element master list",
                desc: "Full scope · City-wise · In format you need",
                badge: "xlsx",
              },
              {
                icon: "👥",
                name: "Task assignment sheet",
                desc: "Who · What · Deadline · Status",
                badge: "xlsx",
              },
              {
                icon: "🎨",
                name: "Production & print list",
                desc: "Creative · Fabrication · Print per element",
                badge: "xlsx",
              },
              {
                icon: "📞",
                name: "Vendor contact sheet",
                desc: "All your partners · City-wise · One sheet",
                badge: "xlsx",
              },
              {
                icon: "📅",
                name: "Visual control chart",
                desc: "Your Gantt. Every task on a date.",
                badge: "xlsx",
              },
              {
                icon: "🎬",
                name: "Cue sheet / Show flow",
                desc: "Named screens · Multi-screen · City-wise",
                badge: "xlsx",
              },
              {
                icon: "✈️",
                name: "Travel plan",
                desc: "Team · Artists · Hotel · Flights · City-wise",
                badge: "soon",
                dimmed: true,
              },
            ].map((doc) => (
              <div
                key={doc.name}
                className={`doc-list-item${doc.dimmed ? " dimmed" : ""}`}
              >
                <div className="doc-list-left">
                  <span className="doc-list-icon">{doc.icon}</span>
                  <div className="doc-list-info">
                    <div className="doc-list-name">{doc.name}</div>
                    <div className="doc-list-desc">{doc.desc}</div>
                  </div>
                </div>
                <span
                  className={`doc-list-badge ${
                    doc.badge === "soon" ? "soon-tag" : "xlsx"
                  }`}
                >
                  {doc.badge === "soon" ? "SOON" : "↓ xlsx"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM SECTION */}
      <section className="lp-team">
        <div className="lp-team-inner">
          {/* CARDS */}
          <div className="team-cards-grid lp-reveal">
            <div className="team-card">
              <div className="team-card-avatar">A</div>
              <div className="team-card-name">Abhishek</div>
              <div className="team-card-role">Project Head</div>
              <div className="team-card-meta">12 tasks</div>
              <div className="team-card-status s-done">Done</div>
            </div>
            <div className="team-card">
              <div className="team-card-avatar">N</div>
              <div className="team-card-name">Naveen</div>
              <div className="team-card-role">Production Head</div>
              <div className="team-card-meta">8 tasks</div>
              <div className="team-card-status s-progress">In progress</div>
            </div>
            <div className="team-card">
              <div className="team-card-avatar">J</div>
              <div className="team-card-name">Joseph</div>
              <div className="team-card-role">Ground · Delhi</div>
              <div className="team-card-meta">Public link</div>
              <div className="team-card-status s-site">On site</div>
            </div>
            <div className="team-card">
              <div className="team-card-avatar">B</div>
              <div className="team-card-name">Balwinder</div>
              <div className="team-card-role">Creative team</div>
              <div className="team-card-meta">3 creatives</div>
              <div className="team-card-status s-pending">Pending</div>
            </div>
          </div>

          {/* COPY */}
          <div>
            <div className="team-copy-label lp-reveal">Team + Ground Staff</div>
            <h2 className="lp-reveal">
              Your team. Their tasks.
              <br />
              <em>No login needed.</em>
            </h2>
            <p className="team-body lp-reveal">
              Assign tasks to anyone — registered team member, freelancer, or
              vendor. Share one link on WhatsApp. They open it on their phone,
              see their element, mark it done. You see it instantly.
            </p>
            <p className="team-body lp-reveal">
              No app download. No signup. No friction. Ground staff from any
              city, any event — always available when you need them.
            </p>
          </div>
        </div>
      </section>

      {/* FOR YOU */}
      <section className="lp-for-you">
        <div className="lp-for-you-inner">
          <div className="section-label lp-reveal">Who ME is for</div>
          <h2 className="lp-reveal">
            ME is for anyone who runs events
            <br />
            and wants to stop running them{" "}
            <em>from memory.</em>
          </h2>
          <p className="for-you-sub lp-reveal">
            We don't segment by agency size. We segment by operating mode. If
            you want to move from busy operator to smart operator — ME is yours.
          </p>
          <div className="for-you-pills">
            {[
              "Agency owners",
              "Independent planners",
              "Ops professionals",
              "Production managers",
              "Corporate event teams",
              "Experiential agencies",
            ].map((label) => (
              <span key={label} className="pill lp-reveal">
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CREDIBILITY */}
      <section className="lp-credibility" id="credibility">
        <div className="lp-credibility-inner">
          <div className="credibility-header">
            <div className="section-label lp-reveal">Why India · Why now</div>
            <h2 className="lp-reveal">
              Built for the complexity others couldn't imagine building
              software for.
            </h2>
            <p className="credibility-sub lp-reveal">
              India is the fastest-growing event software market in the world.
              And until now, there was no operating system built for the people
              running those events.
            </p>
          </div>
          <div className="stats-grid">
            <div className="stat-block lp-reveal">
              <span className="stat-num">
                $32<span>B</span>
              </span>
              <span className="stat-label">
                India events market by 2035 — growing at 7.6% CAGR
              </span>
            </div>
            <div className="stat-block lp-reveal">
              <span className="stat-num">
                17.9<span>%</span>
              </span>
              <span className="stat-label">
                CAGR — India is the highest-growth event software market
                globally
              </span>
            </div>
            <div className="stat-block lp-reveal">
              <span className="stat-num">
                $1.5<span>B</span>
              </span>
              <span className="stat-label">
                India event software market by 2033 — from $319M today
              </span>
            </div>
            <div className="stat-block lp-reveal">
              <span className="stat-num">0</span>
              <span className="stat-label">
                Direct competitors in the internal event operations category in
                India
              </span>
            </div>
          </div>
          <div className="credibility-statement">
            <div className="credibility-quote lp-reveal">
              "Your business runs. You just can't see it running."
            </div>
            <div className="credibility-points">
              <div className="credibility-point lp-reveal">
                <strong>Multi-city events. Multi-vendor ops.</strong>
                <span>
                  ME is built for the scale and complexity of Indian events —
                  not adapted from a Western SaaS template.
                </span>
              </div>
              <div className="credibility-point lp-reveal">
                <strong>Category creation, not competition.</strong>
                <span>
                  Eventbrite, Cvent, Hopin — all attendee management tools. ME
                  is the first system built for the people running the show.
                </span>
              </div>
              <div className="credibility-point lp-reveal">
                <strong>India-native. Globally ready.</strong>
                <span>
                  Born in Noida. Built for the event professional in Mumbai,
                  Bangalore, Delhi, Dubai, and beyond.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="lp-pricing" id="pricing">
        <div className="lp-pricing-inner">
          <div>
            <div className="pricing-label lp-reveal">Pricing philosophy</div>
            <h2 className="lp-reveal">
              You're not buying software.
              <br />
              You're <em>upgrading your team.</em>
            </h2>
            <p className="pricing-desc lp-reveal">
              No free tier. No per-seat confusion. Event Credits — buy a pack,
              use when you need it. Your team grows, your events scale, your
              rate stays the same.
            </p>
            <div className="pricing-model">
              <div className="pricing-item lp-reveal">
                <div className="pricing-dot" />
                <span className="pricing-item-text">
                  <strong>Event Credits model</strong> — buy a pack, use when
                  needed. No monthly ticking clock.
                </span>
              </div>
              <div className="pricing-item lp-reveal">
                <div className="pricing-dot" />
                <span className="pricing-item-text">
                  <strong>No per-seat pricing.</strong> Events industry doesn't
                  think in seats — neither does ME.
                </span>
              </div>
              <div className="pricing-item lp-reveal">
                <div className="pricing-dot" />
                <span className="pricing-item-text">
                  <strong>Tiers:</strong> 5 / 10 / 20 events · Unlimited active
                  for volume agencies.
                </span>
              </div>
              <div className="pricing-item lp-reveal">
                <div className="pricing-dot" />
                <span className="pricing-item-text">
                  <strong>14–30 day trial.</strong> Full access. No credit card
                  required to start.
                </span>
              </div>
            </div>
          </div>
          <div className="pricing-cta-box" id="get-access">
            <span className="pricing-cta-eyebrow lp-reveal">
              Early Adopter Program
            </span>
            <h3 className="lp-reveal">
              Lock your rate.
              <br />
              Forever.
            </h3>
            <p className="lp-reveal">
              Early adopters get real pricing with a meaningful discount —
              locked in for life. As ME grows, your rate doesn't. Be among the
              first to run on ME.
            </p>
            <a
              href="mailto:hello@myoozz.events?subject=Early Access — ME Events OS"
              className="btn-red-outline lp-reveal"
            >
              Request Early Access →
            </a>
            <p
              style={{
                fontSize: "12px",
                color: "rgba(250,250,248,0.28)",
                lineHeight: "1.5",
              }}
              className="lp-reveal"
            >
              No commitment. We'll reach out personally within 24 hours.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="footer-brand">
            <a href="https://myoozz.events" className="lp-logo">
              <span className="lp-logo-mark" style={{ fontSize: "18px" }}>
                ME
              </span>
              <span className="lp-logo-name">by Myoozz Events</span>
            </a>
            <div className="footer-tagline">
              My Events. My System. &nbsp;·&nbsp; Born in India · Built for
              the world
            </div>
          </div>
          <div className="footer-links">
            <a href="#capabilities">Features</a>
            <a href="#documents">Documents</a>
            <a href="#pricing">Pricing</a>
            <a href="mailto:hello@myoozz.events">Contact</a>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-light)" }}>
              myoozz.events
            </div>
            <div
              style={{
                fontSize: "11.5px",
                color: "var(--text-light)",
                marginTop: "4px",
              }}
            >
              © 2026 Myoozz Consulting Pvt. Ltd.
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
