import React, { useEffect } from "react";

/* ─────────────────────────────────────────────
   Myoozz Events — Privacy Policy Page
   Brand: #bc1723 red · #FAFAF8 warm white
   Fonts: Cormorant Garamond (headlines) · DM Sans (body)
   Last updated: April 2026
───────────────────────────────────────────── */

const LAST_UPDATED = "April 2026";
const CONTACT_EMAIL = "legal@myoozz.events";
const COMPANY = "Myoozz Consulting Pvt. Ltd.";

const sections = [
  {
    id: "collect",
    icon: "✦",
    title: "The Data You Share Makes You Smarter",
    body: [
      "Every detail you add to Myoozz Events — your vendors, timelines, team structures, budgets, and event notes — is a building block. Not for us. For you.",
      "When you log a vendor in Bengaluru, you'll find them automatically suggested for your next event there. When you record how a cue sheet ran on ground, it becomes the blueprint for the next one. The more your workspace knows, the less you have to think from scratch.",
      "Here is what your system learns from:",
      [
        "Your profile and organisation details",
        "Events you create — names, dates, cities, scale",
        "Vendors, partners, and contacts you add",
        "Team members and their assigned roles",
        "Documents, cue sheets, and travel plans you generate",
        "Usage patterns — what you access and how often",
      ],
      "None of this is collected to watch you. It is collected to work for you.",
    ],
  },
  {
    id: "use",
    icon: "◈",
    title: "How Your Data Works for You",
    body: [
      "Everything you enter stays in service of one goal: making your next event easier than your last.",
      [
        "Your vendor database builds itself city by city, so you're never starting from scratch",
        "Your historical events inform smart defaults for new ones",
        "Your team structure carries forward — roles, responsibilities, and access intact",
        "Your documents remember your preferences — format, layout, language",
      ],
      "We also use aggregated, anonymised data to improve the platform — identifying what planners find most useful, where the system can be smarter, and what features to build next. This data carries no personal identifiers and is never traceable to you.",
    ],
  },
  {
    id: "softdelete",
    icon: "◎",
    title: "We Never Let You Lose Your Work",
    body: [
      "Accidents happen. A vendor deleted by mistake. A team member removed in haste. An event archived too soon.",
      "That is why Myoozz Events uses soft delete — nothing you remove is ever permanently gone. Every deletion is an archive. Admins and Managers can restore any record at any time.",
      "You will never see a confirmation dialog that erases years of vendor relationships with one click. We built it this way on purpose.",
      "Your data has a shelf life only if you decide it does.",
    ],
  },
  {
    id: "nosell",
    icon: "◇",
    title: "Your Data Is Not a Product",
    body: [
      "Myoozz Events will never sell, rent, trade, or license your personal data or your event data to any third party — ever.",
      "Your vendor lists, client names, team structures, and financials are yours alone. They stay within your organisation. No one outside it can see them, and we will never share them.",
      "There is one way your data makes things better for the broader community: anonymised, aggregate usage patterns — like which features planners find most useful or what document formats get generated most — help us improve the platform for everyone. This data carries no identifiers. It cannot be traced back to you, your organisation, or any event you have run.",
      "Your competitive edge — the partnerships you have built, the formats that work for you — stays entirely yours.",
    ],
  },
  {
    id: "security",
    icon: "⬡",
    title: "How We Protect Your Data",
    body: [
      "We take the security of your workspace seriously:",
      [
        "Data is encrypted in transit and at rest",
        "Role-based access ensures team members only see what they need to",
        "Ground staff access via WhatsApp-style public links — no login credentials to lose or misuse",
        "Admin controls let you manage who sees what, always",
      ],
      "We conduct periodic security reviews and follow industry best practices for data protection.",
    ],
  },
  {
    id: "rights",
    icon: "◉",
    title: "Your Rights",
    body: [
      "You are in control of your data at all times:",
      [
        "Access — request a full export of your workspace data",
        "Correction — update any information that is inaccurate",
        "Deletion — request permanent deletion of your account and associated data",
        "Portability — your data can be exported in standard formats on request",
      ],
      "To exercise any of these rights, write to us at " + CONTACT_EMAIL + ". We will respond within 15 working days.",
    ],
  },
  {
    id: "updates",
    icon: "△",
    title: "When This Policy Changes",
    body: [
      "Myoozz Events is growing. As the platform evolves, this policy may be updated to reflect new features or legal requirements.",
      "When we make material changes, we will notify you within the platform and update the date at the top of this page. Continued use of the platform after notification constitutes acceptance of the revised policy.",
    ],
  },
  {
    id: "contact",
    icon: "✉",
    title: "Reach Us",
    body: [
      "Questions about how we handle your data? Concerns? Just want to know more?",
      "We're reachable at " + CONTACT_EMAIL + ". We'll get back to you — not a bot.",
      "Myoozz Consulting Pvt. Ltd. · Registered Office, India",
    ],
  },
];

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500&display=swap');

        :root {
          --red: #bc1723;
          --bg: #FAFAF8;
          --ink: #1a1a1a;
          --muted: #6b6b6b;
          --rule: #e8e4df;
          --card: #ffffff;
        }

        .pp-root * { box-sizing: border-box; margin: 0; padding: 0; }

        .pp-root {
          background: var(--bg);
          color: var(--ink);
          font-family: 'DM Sans', sans-serif;
          font-weight: 300;
          min-height: 100vh;
        }

        /* ── Nav ── */
        .pp-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 36px;
          background: var(--bg);
          border-bottom: 1px solid var(--rule);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .pp-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .pp-logo-me {
          font-family: 'Poppins', 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          background: var(--red);
          width: 34px; height: 34px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 4px;
          letter-spacing: 0.02em;
        }
        .pp-logo-text {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: var(--ink);
          letter-spacing: 0.01em;
        }
        .pp-logo-text em {
          font-style: normal;
          color: var(--red);
          margin-left: 2px;
        }
        .pp-nav-link {
          font-size: 13px;
          font-weight: 400;
          color: var(--muted);
          text-decoration: none;
          letter-spacing: 0.02em;
        }
        .pp-nav-link:hover { color: var(--red); }

        /* ── Hero ── */
        .pp-hero {
          background: var(--bg);
          border-bottom: 1px solid var(--rule);
          padding: 80px 24px 60px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .pp-hero::before {
          content: '';
          position: absolute;
          top: -60px; left: 50%;
          transform: translateX(-50%);
          width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(188,23,35,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .pp-tag {
          display: inline-block;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--red);
          border: 1px solid rgba(188,23,35,0.25);
          border-radius: 2px;
          padding: 5px 14px;
          margin-bottom: 28px;
        }
        .pp-hero h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(40px, 6vw, 68px);
          font-weight: 500;
          line-height: 1.05;
          letter-spacing: -0.01em;
          color: var(--ink);
          max-width: 700px;
          margin: 0 auto 20px;
        }
        .pp-hero h1 em {
          font-style: italic;
          color: var(--red);
        }
        .pp-hero-sub {
          font-size: 15px;
          font-weight: 300;
          color: var(--muted);
          line-height: 1.7;
          max-width: 520px;
          margin: 0 auto 28px;
        }
        .pp-meta {
          font-size: 12px;
          color: var(--muted);
          letter-spacing: 0.04em;
        }

        /* ── Layout ── */
        .pp-layout {
          max-width: 820px;
          margin: 0 auto;
          padding: 72px 24px 100px;
        }

        /* ── Section ── */
        .pp-section {
          display: grid;
          grid-template-columns: 48px 1fr;
          gap: 0 28px;
          padding: 48px 0;
          border-bottom: 1px solid var(--rule);
        }
        .pp-section:last-child { border-bottom: none; }

        .pp-section-icon {
          padding-top: 6px;
          font-size: 18px;
          color: var(--red);
          opacity: 0.7;
          line-height: 1;
        }

        .pp-section h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 500;
          color: var(--ink);
          line-height: 1.2;
          margin-bottom: 20px;
        }

        .pp-section p {
          font-size: 15px;
          font-weight: 300;
          line-height: 1.8;
          color: #333;
          margin-bottom: 14px;
        }
        .pp-section p:last-child { margin-bottom: 0; }

        .pp-section ul {
          list-style: none;
          padding: 0;
          margin: 4px 0 14px;
        }
        .pp-section ul li {
          font-size: 14.5px;
          font-weight: 300;
          line-height: 1.75;
          color: #444;
          padding-left: 20px;
          position: relative;
          margin-bottom: 4px;
        }
        .pp-section ul li::before {
          content: '—';
          position: absolute;
          left: 0;
          color: var(--red);
          font-weight: 400;
        }

        /* ── Footer strip ── */
        .pp-footer-strip {
          background: var(--ink);
          color: rgba(255,255,255,0.5);
          text-align: center;
          padding: 28px 24px;
          font-size: 12.5px;
          font-weight: 300;
          letter-spacing: 0.03em;
          line-height: 1.8;
        }
        .pp-footer-strip a {
          color: rgba(188,23,35,0.8);
          text-decoration: none;
        }
        .pp-footer-strip a:hover { color: var(--red); }

        @media (max-width: 600px) {
          .pp-section {
            grid-template-columns: 1fr;
            gap: 12px 0;
          }
          .pp-section-icon { display: none; }
        }
      `}</style>

      <div className="pp-root">
        {/* ── Logo Nav ── */}
        <nav className="pp-nav">
          <a href="/" className="pp-logo" aria-label="Myoozz Events Home">
            <span className="pp-logo-me">ME</span>
            <span className="pp-logo-text">Myoozz<em>Events</em></span>
          </a>
          <a href="/terms" className="pp-nav-link">Terms of Use</a>
        </nav>
        {/* ── Hero ── */}
        <div className="pp-hero">
          <div className="pp-tag">Myoozz Events · Privacy Policy</div>
          <h1>Your data works<br /><em>for you.</em></h1>
          <p className="pp-hero-sub">
            Everything you share with Myoozz Events works for you — and only you.
            The more your workspace knows about how you plan, the less you start from scratch
            the next time.
          </p>
          <p className="pp-meta">Last updated: {LAST_UPDATED} · {COMPANY}</p>
        </div>

        {/* ── Sections ── */}
        <div className="pp-layout">
          {sections.map((s) => (
            <div className="pp-section" key={s.id} id={s.id}>
              <div className="pp-section-icon">{s.icon}</div>
              <div>
                <h2>{s.title}</h2>
                {s.body.map((block, i) =>
                  Array.isArray(block) ? (
                    <ul key={i}>
                      {block.map((item, j) => (
                        <li key={j}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i}>{block}</p>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Bottom strip ── */}
        <div className="pp-footer-strip">
          © {new Date().getFullYear()} {COMPANY}. All rights reserved.<br />
          Questions? Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          &nbsp;·&nbsp;
          <a href="/terms">Terms of Use</a>
        </div>
      </div>
    </>
  );
}
