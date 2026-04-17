<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ME — My Events Operating System | myoozz.events</title>
<meta name="description" content="ME is India's first events operating system — built for agency owners and event professionals who want to stop running events from memory and start running an event business.">
<meta property="og:title" content="ME — My Events Operating System">
<meta property="og:description" content="Stop running your events. Start running your business. Born in India · Built for the world.">
<meta property="og:url" content="https://myoozz.events">
<link rel="canonical" href="https://myoozz.events">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&family=Poppins:wght@700&display=swap" rel="stylesheet">
<style>
:root {
  --red: #bc1723;
  --red-dark: #9a1219;
  --bg: #FAFAF8;
  --bg-warm: #F4F2EE;
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

/* ─── ANIMATIONS ─── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ─── HEADER ─── */
header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(250,250,248,0.93);
  backdrop-filter: blur(12px);
  border-bottom: 0.5px solid var(--border);
  padding: 0 5%;
}
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.logo {
  display: flex;
  align-items: baseline;
  gap: 10px;
  text-decoration: none;
}
.logo-mark {
  font-family: var(--font-logo);
  font-weight: 700;
  font-size: 22px;
  color: var(--red);
  letter-spacing: -0.5px;
  line-height: 1;
}
.logo-name {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 300;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
nav { display: flex; align-items: center; gap: 32px; }
nav a {
  font-size: 13.5px;
  font-weight: 400;
  color: var(--text-muted);
  text-decoration: none;
  letter-spacing: 0.01em;
  transition: color 0.2s;
}
nav a:hover { color: var(--text); }
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
.mobile-menu-toggle { display: none; }

/* ─── HERO ─── */
.hero {
  padding: 100px 5% 90px;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
}
.hero-eyebrow {
  font-family: var(--font-body);
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--red);
  margin-bottom: 28px;
  animation: fadeUp 0.8s ease both;
}
.hero h1 {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(42px, 6.5vw, 78px);
  line-height: 1.08;
  letter-spacing: -0.01em;
  color: var(--text);
  max-width: 820px;
  margin-bottom: 28px;
  animation: fadeUp 0.8s 0.1s ease both;
}
.hero h1 em {
  font-style: italic;
  color: var(--red);
}
.hero-sub {
  font-size: 18px;
  font-weight: 300;
  color: var(--text-muted);
  max-width: 560px;
  line-height: 1.7;
  margin-bottom: 44px;
  animation: fadeUp 0.8s 0.2s ease both;
}
.hero-ctas {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  animation: fadeUp 0.8s 0.3s ease both;
}
.hero-tagline {
  margin-top: 72px;
  padding-top: 32px;
  border-top: 0.5px solid var(--border);
  font-size: 11.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-light);
  animation: fadeIn 1s 0.5s ease both;
}
.hero-bg-text {
  position: absolute;
  right: -20px;
  top: 60px;
  font-family: var(--font-display);
  font-size: clamp(120px, 18vw, 220px);
  font-weight: 300;
  color: rgba(188,23,35,0.04);
  line-height: 1;
  pointer-events: none;
  user-select: none;
  letter-spacing: -0.04em;
}

/* ─── DIVIDER ─── */
.section-divider {
  height: 0.5px;
  background: var(--border);
  margin: 0 5%;
}

/* ─── TRUTH SECTION ─── */
.truth {
  padding: 96px 5%;
  background: var(--bg);
}
.truth-inner { max-width: 1200px; margin: 0 auto; }
.section-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-light);
  margin-bottom: 20px;
}
.truth h2 {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(30px, 4vw, 50px);
  line-height: 1.15;
  max-width: 720px;
  margin-bottom: 64px;
}
.truth-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1px;
  background: var(--border);
  border: 0.5px solid var(--border);
}
.truth-card {
  background: var(--bg);
  padding: 40px 36px;
  position: relative;
  transition: background 0.25s;
}
.truth-card:hover { background: var(--bg-warm); }
.truth-number {
  font-family: var(--font-display);
  font-size: 44px;
  font-weight: 300;
  color: rgba(188,23,35,0.18);
  line-height: 1;
  margin-bottom: 20px;
  display: block;
}
.truth-card h3 {
  font-family: var(--font-body);
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

/* ─── SHIFT SECTION ─── */
.shift {
  padding: 96px 5%;
  background: var(--text);
  color: var(--bg);
  overflow: hidden;
  position: relative;
}
.shift-inner {
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
  color: rgba(250,250,248,0.4);
  margin-bottom: 24px;
}
.shift h2 {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(38px, 5vw, 64px);
  line-height: 1.1;
  color: var(--bg);
  margin-bottom: 32px;
}
.shift h2 em {
  font-style: italic;
  color: var(--red);
}
.shift-body p {
  font-size: 16px;
  font-weight: 300;
  line-height: 1.8;
  color: rgba(250,250,248,0.7);
  margin-bottom: 20px;
}
.shift-body p strong {
  color: var(--bg);
  font-weight: 400;
}
.shift-accent {
  position: absolute;
  right: 0;
  bottom: 0;
  font-family: var(--font-display);
  font-size: clamp(80px, 14vw, 180px);
  font-weight: 300;
  color: rgba(250,250,248,0.03);
  line-height: 1;
  pointer-events: none;
}

/* ─── CAPABILITIES ─── */
.capabilities {
  padding: 96px 5%;
  background: var(--bg);
}
.capabilities-inner { max-width: 1200px; margin: 0 auto; }
.capabilities-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-bottom: 72px;
  align-items: end;
}
.capabilities h2 {
  font-family: var(--font-display);
  font-size: clamp(34px, 4.5vw, 56px);
  font-weight: 400;
  line-height: 1.1;
}
.capabilities-intro {
  font-size: 16px;
  font-weight: 300;
  color: var(--text-muted);
  line-height: 1.7;
  padding-bottom: 4px;
}
.capabilities-intro strong {
  color: var(--text);
  font-weight: 500;
}
.cap-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border);
  border: 0.5px solid var(--border);
}
.cap-card {
  background: var(--bg);
  padding: 40px 36px;
  position: relative;
  overflow: hidden;
  transition: background 0.25s;
}
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
  line-height: 1.65;
}

/* ─── FOR YOU SECTION ─── */
.for-you {
  padding: 96px 5%;
  background: var(--bg-warm);
  border-top: 0.5px solid var(--border);
  border-bottom: 0.5px solid var(--border);
}
.for-you-inner {
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
}
.for-you h2 {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(34px, 5vw, 60px);
  line-height: 1.12;
  margin-bottom: 28px;
}
.for-you h2 em { font-style: italic; color: var(--red); }
.for-you-sub {
  font-size: 17px;
  font-weight: 300;
  color: var(--text-muted);
  line-height: 1.75;
  max-width: 680px;
  margin: 0 auto 48px;
}
.for-you-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}
.pill {
  border: 0.5px solid var(--border-strong);
  padding: 8px 18px;
  border-radius: 100px;
  font-size: 13.5px;
  font-weight: 400;
  color: var(--text-muted);
  background: var(--bg);
}

/* ─── CREDIBILITY ─── */
.credibility {
  padding: 96px 5%;
  background: var(--bg);
}
.credibility-inner { max-width: 1200px; margin: 0 auto; }
.credibility-header {
  margin-bottom: 64px;
}
.credibility h2 {
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
  max-width: 560px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1px;
  background: var(--border);
  border: 0.5px solid var(--border);
  margin-bottom: 60px;
}
.stat-block {
  background: var(--bg);
  padding: 36px 32px;
}
.stat-num {
  font-family: var(--font-display);
  font-size: 42px;
  font-weight: 300;
  color: var(--text);
  line-height: 1;
  margin-bottom: 8px;
  display: block;
}
.stat-num span { color: var(--red); }
.stat-label {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-muted);
  line-height: 1.45;
}
.credibility-statement {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 60px;
  padding-top: 60px;
  border-top: 0.5px solid var(--border);
  align-items: center;
}
.credibility-quote {
  font-family: var(--font-display);
  font-size: clamp(22px, 2.8vw, 34px);
  font-weight: 400;
  font-style: italic;
  line-height: 1.3;
  color: var(--text);
}
.credibility-points {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.credibility-point {
  padding-left: 20px;
  border-left: 1.5px solid var(--red);
}
.credibility-point strong {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 4px;
}
.credibility-point span {
  font-size: 13.5px;
  font-weight: 300;
  color: var(--text-muted);
  line-height: 1.6;
}

/* ─── PRICING ─── */
.pricing {
  padding: 96px 5%;
  background: var(--text);
  color: var(--bg);
}
.pricing-inner {
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
.pricing h2 {
  font-family: var(--font-display);
  font-size: clamp(34px, 4.5vw, 56px);
  font-weight: 400;
  line-height: 1.1;
  color: var(--bg);
  margin-bottom: 20px;
}
.pricing h2 em { font-style: italic; color: var(--red); }
.pricing-desc {
  font-size: 16px;
  font-weight: 300;
  color: rgba(250,250,248,0.65);
  line-height: 1.75;
  margin-bottom: 36px;
}
.pricing-model {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.pricing-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 22px;
  border: 0.5px solid rgba(250,250,248,0.12);
  border-radius: 4px;
  transition: border-color 0.2s, background 0.2s;
}
.pricing-item:hover {
  border-color: rgba(250,250,248,0.25);
  background: rgba(250,250,248,0.04);
}
.pricing-item-icon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--red);
  flex-shrink: 0;
}
.pricing-item-text { font-size: 14px; font-weight: 300; color: rgba(250,250,248,0.8); }
.pricing-item-text strong { color: var(--bg); font-weight: 500; }
.pricing-cta {
  background: var(--text);
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 48px;
  border: 0.5px solid rgba(250,250,248,0.12);
  border-radius: 4px;
}
.pricing-cta-eyebrow {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--red);
}
.pricing-cta h3 {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 400;
  color: var(--bg);
  line-height: 1.2;
}
.pricing-cta p {
  font-size: 14px;
  font-weight: 300;
  color: rgba(250,250,248,0.55);
  line-height: 1.65;
}
.btn-red-outline {
  border: 1px solid var(--red);
  color: var(--red);
  background: transparent;
  padding: 12px 24px;
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

/* ─── FOOTER ─── */
footer {
  padding: 48px 5%;
  border-top: 0.5px solid var(--border);
  background: var(--bg);
}
.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
}
.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.footer-logo {
  display: flex;
  align-items: baseline;
  gap: 8px;
  text-decoration: none;
}
.footer-tagline {
  font-size: 11.5px;
  font-weight: 300;
  color: var(--text-light);
  letter-spacing: 0.04em;
}
.footer-links {
  display: flex;
  gap: 28px;
  align-items: center;
}
.footer-links a {
  font-size: 12.5px;
  font-weight: 400;
  color: var(--text-muted);
  text-decoration: none;
  letter-spacing: 0.02em;
  transition: color 0.2s;
}
.footer-links a:hover { color: var(--text); }
.footer-right {
  text-align: right;
}
.footer-domain {
  font-size: 12px;
  color: var(--text-light);
  letter-spacing: 0.04em;
}

/* ─── RESPONSIVE ─── */
@media (max-width: 900px) {
  nav .nav-links { display: none; }
  .shift-inner { grid-template-columns: 1fr; gap: 40px; }
  .capabilities-header { grid-template-columns: 1fr; gap: 24px; }
  .cap-grid { grid-template-columns: repeat(2, 1fr); }
  .pricing-inner { grid-template-columns: 1fr; gap: 48px; }
  .credibility-statement { grid-template-columns: 1fr; gap: 32px; }
  .footer-inner { flex-direction: column; align-items: flex-start; }
  .footer-right { text-align: left; }
}
@media (max-width: 600px) {
  nav { gap: 12px; }
  .hero { padding: 64px 5% 64px; }
  .cap-grid { grid-template-columns: 1fr; }
  .truth-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .hero-bg-text { display: none; }
  .shift-accent { display: none; }
  .pricing-cta { padding: 28px; }
  .for-you-pills { flex-direction: column; align-items: center; }
}
</style>
</head>
<body>

<!-- HEADER -->
<header>
  <div class="header-inner">
    <a href="https://myoozz.events" class="logo">
      <span class="logo-mark">ME</span>
      <span class="logo-name">My Events Operating System</span>
    </a>
    <nav>
      <div class="nav-links" style="display:flex;gap:32px;">
        <a href="#capabilities">Features</a>
        <a href="#credibility">Why ME</a>
        <a href="#pricing">Pricing</a>
      </div>
      <a href="#get-access" class="btn-primary">Get Early Access →</a>
    </nav>
  </div>
</header>

<!-- HERO -->
<section style="position:relative;overflow:hidden;">
  <div class="hero">
    <div class="hero-eyebrow">My Events Operating System</div>
    <h1>Stop running<br>your <em>events.</em><br>Start running<br>your <em>business.</em></h1>
    <p class="hero-sub">ME is your events operating system — so nothing runs on memory, luck, or one person holding it all together.</p>
    <div class="hero-ctas">
      <a href="#get-access" class="btn-primary">Get Early Access →</a>
      <a href="#capabilities" class="btn-ghost">See what ME does ↓</a>
    </div>
    <div class="hero-tagline">Born in India &nbsp;·&nbsp; Built for the world</div>
    <div class="hero-bg-text">ME</div>
  </div>
</section>

<div class="section-divider"></div>

<!-- TRUTH SECTION -->
<section class="truth">
  <div class="truth-inner">
    <div class="section-label reveal">The real cost of running events without a system</div>
    <h2 class="reveal">You didn't lose that margin in a bad decision.<br>You lost it in a Tuesday WhatsApp thread.</h2>
    <div class="truth-grid">
      <div class="truth-card reveal">
        <span class="truth-number">01</span>
        <h3>The Rate Trap</h3>
        <p>The vendor's rate changed. The client cost is closed. That gap is yours now.</p>
      </div>
      <div class="truth-card reveal">
        <span class="truth-number">02</span>
        <h3>The Template Ritual</h3>
        <p>A template gets you through one event. ME gets you through every event after that.</p>
      </div>
      <div class="truth-card reveal">
        <span class="truth-number">03</span>
        <h3>The Ops Dependency</h3>
        <p>Your team can't execute what only lives in your head. And when that person leaves — everything leaves.</p>
      </div>
      <div class="truth-card reveal">
        <span class="truth-number">04</span>
        <h3>The WhatsApp Layer</h3>
        <p>Your event plan is scattered across 14 threads. No one knows what's confirmed, what's changed, and what's been missed.</p>
      </div>
    </div>
  </div>
</section>

<!-- SHIFT SECTION -->
<section class="shift">
  <div class="shift-inner">
    <div>
      <div class="shift-label reveal">The shift</div>
      <h2 class="reveal">ME makes <em>you</em><br>look beautiful.</h2>
    </div>
    <div class="shift-body">
      <p class="reveal"><strong>Big-ticket clients judge you on what you show them, not what you know.</strong> Perception is formed at the proposal, the schedule, the cost sheet. By event day, the decision is already made.</p>
      <p class="reveal">Your process only works when you're in the room. <strong>ME works even when you're not.</strong></p>
      <p class="reveal">Stop being the person everything depends on. Start being the person who built the system everything runs on.</p>
    </div>
  </div>
  <div class="shift-accent">System</div>
</section>

<!-- CAPABILITIES -->
<section class="capabilities" id="capabilities">
  <div class="capabilities-inner">
    <div class="capabilities-header">
      <div>
        <div class="section-label reveal">What ME does</div>
        <h2 class="reveal">Every event tool is built for your attendees.<br>ME is built for <em style="font-style:italic;color:var(--red);">you.</em></h2>
      </div>
      <p class="capabilities-intro reveal">ME — My Events Operating System — is <strong>one system for everything</strong> your event business runs on. No stitching tools together. No switching between Excel and WhatsApp and email. One place. Every event.</p>
    </div>
    <div class="cap-grid">
      <div class="cap-card reveal">
        <span class="cap-number">01</span>
        <h3>Element Builder</h3>
        <p>Every item, every city, every cost — structured, not scattered. Your event scope lives in ME, not in someone's inbox.</p>
      </div>
      <div class="cap-card reveal">
        <span class="cap-number">02</span>
        <h3>Task Engine</h3>
        <p>Assign one-to-one. Real accountability, not a WhatsApp thread. Deadlines, status, and ownership — all visible.</p>
      </div>
      <div class="cap-card reveal">
        <span class="cap-number">03</span>
        <h3>Team Access</h3>
        <p>Your team works in ME. You see everything. Role-based access so each person sees exactly what they need to.</p>
      </div>
      <div class="cap-card reveal">
        <span class="cap-number">04</span>
        <h3>Client Documents</h3>
        <p>Estimates, invoices, timelines, show flows — download and use. Every document your client expects, ready in your format.</p>
      </div>
      <div class="cap-card reveal">
        <span class="cap-number">05</span>
        <h3>Cost Control</h3>
        <p>Your margins stay yours. Internal rates, confirmed costs, actuals — tracked separately from what the client sees.</p>
      </div>
      <div class="cap-card reveal">
        <span class="cap-number">06</span>
        <h3>Activity Log</h3>
        <p>Nothing gets lost in time or in transition. Every change, every decision — timestamped and searchable.</p>
      </div>
    </div>
  </div>
</section>

<!-- FOR YOU -->
<section class="for-you">
  <div class="for-you-inner">
    <div class="section-label reveal">Who ME is for</div>
    <h2 class="reveal">ME is for anyone who runs events<br>and wants to stop running them <em>from memory.</em></h2>
    <p class="for-you-sub reveal">We don't segment by agency size. We segment by operating mode. If you want to move from busy operator to smart operator — ME is yours.</p>
    <div class="for-you-pills">
      <span class="pill reveal">Agency owners</span>
      <span class="pill reveal">Independent planners</span>
      <span class="pill reveal">Ops professionals</span>
      <span class="pill reveal">Production managers</span>
      <span class="pill reveal">Corporate event teams</span>
      <span class="pill reveal">Experiential agencies</span>
    </div>
  </div>
</section>

<!-- CREDIBILITY -->
<section class="credibility" id="credibility">
  <div class="credibility-inner">
    <div class="credibility-header">
      <div class="section-label reveal">Why India · Why now</div>
      <h2 class="reveal">Built for the complexity others couldn't imagine building software for.</h2>
      <p class="credibility-sub reveal">India is the fastest-growing event software market in the world. And until now, there was no operating system built for the people running those events.</p>
    </div>
    <div class="stats-grid">
      <div class="stat-block reveal">
        <span class="stat-num">$32<span>B</span></span>
        <span class="stat-label">India events market by 2035 — growing at 7.6% CAGR</span>
      </div>
      <div class="stat-block reveal">
        <span class="stat-num">17.9<span>%</span></span>
        <span class="stat-label">CAGR — India is the highest-growth event software market globally</span>
      </div>
      <div class="stat-block reveal">
        <span class="stat-num">$1.5<span>B</span></span>
        <span class="stat-label">India event software market by 2033 — from $319M today</span>
      </div>
      <div class="stat-block reveal">
        <span class="stat-num">0</span>
        <span class="stat-label">Direct competitors in the internal event operations category in India</span>
      </div>
    </div>
    <div class="credibility-statement">
      <div class="credibility-quote reveal">"Your business runs. You just can't see it running."</div>
      <div class="credibility-points">
        <div class="credibility-point reveal">
          <strong>Multi-city events. Multi-vendor ops.</strong>
          <span>ME is built for the scale and complexity of Indian events — not adapted from a Western SaaS template.</span>
        </div>
        <div class="credibility-point reveal">
          <strong>Category creation, not competition.</strong>
          <span>Eventbrite, Cvent, Hopin — all attendee management tools. ME is the first system built for the people running the show.</span>
        </div>
        <div class="credibility-point reveal">
          <strong>India-native. Globally ready.</strong>
          <span>Born in Noida. Built for the event professional in Mumbai, Bangalore, Delhi, Dubai, and beyond.</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- PRICING -->
<section class="pricing" id="pricing">
  <div class="pricing-inner">
    <div>
      <div class="pricing-label reveal">Pricing philosophy</div>
      <h2 class="reveal">You're not buying software. You're <em>upgrading your team.</em></h2>
      <p class="pricing-desc reveal">No free tier. No per-seat confusion. Event Credits — buy a pack, use when you need it. Your team grows, your events scale, your rate stays the same.</p>
      <div class="pricing-model">
        <div class="pricing-item reveal">
          <div class="pricing-item-icon"></div>
          <span class="pricing-item-text"><strong>Event Credits model</strong> — buy a pack, use when needed. No monthly ticking clock.</span>
        </div>
        <div class="pricing-item reveal">
          <div class="pricing-item-icon"></div>
          <span class="pricing-item-text"><strong>No per-seat pricing.</strong> Events industry doesn't think in seats — neither does ME.</span>
        </div>
        <div class="pricing-item reveal">
          <div class="pricing-item-icon"></div>
          <span class="pricing-item-text"><strong>Tiers:</strong> 5 / 10 / 20 events · Unlimited active for volume agencies.</span>
        </div>
        <div class="pricing-item reveal">
          <div class="pricing-item-icon"></div>
          <span class="pricing-item-text"><strong>14–30 day trial.</strong> Full access. No credit card required to start.</span>
        </div>
      </div>
    </div>
    <div class="pricing-cta" id="get-access">
      <span class="pricing-cta-eyebrow reveal">Early Adopter Program</span>
      <h3 class="reveal">Lock your rate.<br>Forever.</h3>
      <p class="reveal">Early adopters get real pricing with a meaningful discount — locked in for life. As ME grows, your rate doesn't. Be among the first agencies to run on ME.</p>
      <a href="mailto:hello@myoozz.events?subject=Early Access — ME Events OS" class="btn-red-outline reveal">Request Early Access →</a>
      <p style="font-size:12px;color:rgba(250,250,248,0.3);line-height:1.5;" class="reveal">No commitment. We'll reach out personally within 24 hours.</p>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="footer-inner">
    <div class="footer-brand">
      <a href="https://myoozz.events" class="footer-logo">
        <span class="logo-mark" style="font-size:18px;">ME</span>
        <span class="logo-name">by Myoozz Events</span>
      </a>
      <div class="footer-tagline">My Events. My System. &nbsp;·&nbsp; Born in India · Built for the world</div>
    </div>
    <div class="footer-links">
      <a href="#capabilities">Features</a>
      <a href="#pricing">Pricing</a>
      <a href="mailto:hello@myoozz.events">Contact</a>
      <a href="https://myoozzevents.com">myoozzevents.com</a>
    </div>
    <div class="footer-right">
      <div class="footer-domain">myoozz.events</div>
      <div style="font-size:11.5px;color:var(--text-light);margin-top:4px;">© 2026 Myoozz Consulting Pvt. Ltd.</div>
    </div>
  </div>
</footer>

<script>
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, 60 * (entry.target.dataset.delay || 0));
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach((el, i) => {
  const siblings = Array.from(el.parentElement.querySelectorAll('.reveal'));
  const idx = siblings.indexOf(el);
  el.dataset.delay = idx;
  observer.observe(el);
});

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
</script>
</body>
</html>
