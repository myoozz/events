import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

// ─── TOKENS ──────────────────────────────────────────────
const C = {
  bg:'#FAFAF8', bg2:'#F4F3F0', bg3:'#EEECEA', white:'#FFFFFF',
  border:'rgba(26,25,21,0.08)', border2:'rgba(26,25,21,0.14)',
  text:'#1A1917', text2:'#5C574F', text3:'#9C9488',
  red:'#bc1723', redDim:'rgba(188,23,35,0.08)', redBr:'#D41F2E',
  navy:'#16203A',
}

const FONTS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600;1,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400&family=Poppins:wght@600;700&display=swap'

// ─── HOOKS ───────────────────────────────────────────────

// Bug fix: useWindowSize — drives all responsive layouts
function useWindowSize() {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200))
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}

function useReveal(opts={}) {
  const { threshold=0.12 } = opts
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

// ─── ANIMATION WRAPPERS ───────────────────────────────────

function WordReveal({ text, delay=0, color, italic }) {
  const words = text.split(' ')
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <span style={{ display:'inline', fontStyle: italic ? 'italic' : 'normal', color: color || 'inherit' }}>
      {words.map((w, i) => (
        <span key={i} style={{ display:'inline-block', overflow:'hidden', verticalAlign:'bottom', marginRight:'0.22em' }}>
          <span style={{ display:'inline-block', transform: show ? 'translateY(0)' : 'translateY(105%)', opacity: show ? 1 : 0, transition:`transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay+i*60}ms, opacity 0.5s ease ${delay+i*60}ms` }}>
            {w}
          </span>
        </span>
      ))}
    </span>
  )
}

function R({ children, delay=0, from='bottom', style={} }) {
  const [ref, visible] = useReveal()
  const t = { bottom:'translateY(32px)', left:'translateX(-24px)', right:'translateX(24px)', none:'none' }
  return (
    <div ref={ref} style={{ opacity: visible?1:0, transform: visible?'none':t[from], transition:`opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`, ...style }}>
      {children}
    </div>
  )
}

function Counter({ target, suffix='' }) {
  const [n, setN] = useState(0)
  const [ref, visible] = useReveal({ threshold:0.5 })
  useEffect(() => {
    if (!visible) return
    let i=0; const step=target/60
    const t = setInterval(() => { i+=step; if (i>=target){setN(target);clearInterval(t)}else setN(Math.floor(i)) }, 16)
    return () => clearInterval(t)
  }, [visible, target])
  return <span ref={ref}>{n}{suffix}</span>
}

// ─── NAV ─────────────────────────────────────────────────
// Bug fix: was hardcoded padding:'0 48px', no hamburger, links overflow on mobile
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [show, setShow]         = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const w = useWindowSize()
  const isMobile = w < 768

  useEffect(() => {
    const t  = setTimeout(() => setShow(true), 200)
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn)
    return () => { clearTimeout(t); window.removeEventListener('scroll', fn) }
  }, [])

  // Close menu on outside scroll
  useEffect(() => {
    if (menuOpen) { document.body.style.overflow = 'hidden' }
    else          { document.body.style.overflow = '' }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const navA = (href, label) => (
    <a href={href} onClick={() => setMenuOpen(false)}
      style={{ fontSize:'14px', color:C.text2, textDecoration:'none', fontFamily:"'DM Sans',sans-serif", fontWeight:400, transition:'color 0.15s', padding:'12px 0', borderBottom:`1px solid ${C.border}` }}
      onMouseOver={e => e.currentTarget.style.color=C.text}
      onMouseOut={e  => e.currentTarget.style.color=C.text2}>
      {label}
    </a>
  )

  return (
    <>
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:200, height:'60px', display:'flex', alignItems:'center', justifyContent:'space-between', padding: isMobile ? '0 20px' : '0 48px', background: (scrolled || menuOpen) ? 'rgba(250,250,248,0.97)' : 'transparent', backdropFilter: scrolled ? 'blur(20px)' : 'none', borderBottom:`1px solid ${(scrolled||menuOpen)?C.border:'transparent'}`, transition:'all 0.4s', opacity:show?1:0, transform:show?'none':'translateY(-8px)' }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'32px', height:'32px', background:C.red, borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'#fff', fontFamily:"'Poppins',sans-serif", letterSpacing:'-0.5px', flexShrink:0 }}>ME</div>
          <span style={{ fontSize:'15px', fontWeight:600, color:C.text, fontFamily:"'DM Sans',sans-serif" }}>Myoozz Events</span>
          <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 6px', background:C.redDim, color:C.red, borderRadius:'3px', letterSpacing:'0.5px' }}>BETA</span>
        </div>

        {/* Desktop links */}
        {!isMobile && (
          <div style={{ display:'flex', gap:'28px', alignItems:'center' }}>
            {[["#forwho","Who it's for"],["#features","Features"],["#documents","Documents"]].map(([href,label]) => (
              <a key={href} href={href} style={{ fontSize:'13px', color:C.text2, textDecoration:'none', fontFamily:"'DM Sans',sans-serif", fontWeight:400, transition:'color 0.15s' }}
                onMouseOver={e=>e.currentTarget.style.color=C.text} onMouseOut={e=>e.currentTarget.style.color=C.text2}>{label}</a>
            ))}
            <a href="/login" style={{ fontSize:'13px', color:C.text, textDecoration:'none', padding:'7px 16px', border:`1px solid ${C.border2}`, borderRadius:'7px', fontFamily:"'DM Sans',sans-serif", transition:'all 0.15s' }}
              onMouseOver={e=>e.currentTarget.style.background=C.bg2} onMouseOut={e=>e.currentTarget.style.background='transparent'}>Sign in</a>
            <a href="#earlyaccess" style={{ fontSize:'13px', color:'#fff', textDecoration:'none', fontFamily:"'DM Sans',sans-serif", fontWeight:600, padding:'8px 18px', background:C.red, borderRadius:'7px', transition:'background 0.15s' }}
              onMouseOver={e=>e.currentTarget.style.background=C.redBr} onMouseOut={e=>e.currentTarget.style.background=C.red}>Get early access</a>
          </div>
        )}

        {/* Hamburger */}
        {isMobile && (
          <button onClick={() => setMenuOpen(v => !v)}
            style={{ background:'none', border:'none', cursor:'pointer', padding:'8px', display:'flex', flexDirection:'column', gap:'5px', marginLeft:'auto' }}
            aria-label="Menu">
            <span style={{ display:'block', width:'22px', height:'2px', background:C.text, borderRadius:'2px', transition:'all 0.3s', transform: menuOpen ? 'rotate(45deg) translate(5px,5px)' : 'none' }}/>
            <span style={{ display:'block', width:'22px', height:'2px', background:C.text, borderRadius:'2px', transition:'all 0.3s', opacity: menuOpen ? 0 : 1 }}/>
            <span style={{ display:'block', width:'22px', height:'2px', background:C.text, borderRadius:'2px', transition:'all 0.3s', transform: menuOpen ? 'rotate(-45deg) translate(5px,-5px)' : 'none' }}/>
          </button>
        )}
      </nav>

      {/* Mobile menu drawer */}
      {isMobile && (
        <div style={{ position:'fixed', top:'60px', left:0, right:0, bottom:0, zIndex:199, background:'rgba(250,250,248,0.98)', backdropFilter:'blur(20px)', display:'flex', flexDirection:'column', padding:'8px 20px 32px', transform: menuOpen ? 'translateX(0)' : 'translateX(100%)', transition:'transform 0.35s cubic-bezier(0.16,1,0.3,1)', overflowY:'auto' }}>
          {navA('#forwho', "Who it's for")}
          {navA('#features', 'Features')}
          {navA('#documents', 'Documents')}
          {navA('/login', 'Sign in')}
          <a href="#earlyaccess" onClick={() => setMenuOpen(false)}
            style={{ marginTop:'20px', padding:'15px', background:C.red, color:'#fff', borderRadius:'10px', fontSize:'15px', fontWeight:600, textDecoration:'none', textAlign:'center', fontFamily:"'DM Sans',sans-serif" }}>
            Get early access — free →
          </a>
        </div>
      )}
    </>
  )
}

// ─── PRODUCT SIMULATOR ───────────────────────────────────
// Bug fix: was gridTemplateColumns:'200px 1fr' — sidebar crushed on mobile
// Fix: on mobile, sidebar becomes horizontal scrollable pill tabs at top
function ProductSim() {
  const [step, setStep] = useState(0)
  const w = useWindowSize()
  const isMobile = w < 640
  const STEPS = ['Brief', 'Elements', 'Team', 'Track', 'Analyse', 'Deliver']
  const DOCS  = ['Proposal', 'Element master', 'Task sheet', 'Cue sheet']

  return (
    <div style={{ border:`1px solid ${C.border2}`, borderRadius:'16px', overflow:'hidden', background:C.white, boxShadow:'0 8px 40px rgba(26,25,21,0.08)' }}>
      {/* Browser bar — hidden on mobile since it implies a desktop */}
      {!isMobile && (
        <div style={{ padding:'14px 20px', background:C.bg, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:'8px' }}>
          {['#F87171','#FBBF24','#34D399'].map((c,i)=><div key={i} style={{ width:'10px', height:'10px', borderRadius:'50%', background:c }}/>)}
          <span style={{ marginLeft:'8px', fontSize:'12px', color:C.text3, fontFamily:"'DM Mono',monospace" }}>myoozz.events · event workspace</span>
        </div>
      )}

      {/* Step navigation */}
      {isMobile ? (
        // Mobile: horizontal scrollable pill tabs
        <div style={{ display:'flex', overflowX:'auto', gap:'8px', padding:'12px 16px', borderBottom:`1px solid ${C.border}`, background:C.bg2, WebkitOverflowScrolling:'touch', scrollbarWidth:'none' }}>
          {STEPS.map((s,i) => (
            <button key={i} onClick={() => setStep(i)}
              style={{ padding:'6px 14px', borderRadius:'20px', fontSize:'12px', fontWeight:i===step?600:400, color:i===step?C.red:C.text3, background:i===step?C.redDim:'transparent', border:`1px solid ${i===step?'rgba(188,23,35,0.2)':C.border}`, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all 0.2s', whiteSpace:'nowrap', flexShrink:0 }}>
              {s}
            </button>
          ))}
        </div>
      ) : (
        // Desktop: vertical sidebar
        <div style={{ display:'grid', gridTemplateColumns:'180px 1fr', minHeight:'340px' }}>
          <div style={{ background:C.bg2, borderRight:`1px solid ${C.border}`, paddingTop:'8px' }}>
            {STEPS.map((s,i) => (
              <div key={i} onClick={() => setStep(i)}
                style={{ padding:'11px 20px', fontSize:'13px', cursor:'pointer', color:i===step?C.red:C.text2, background:i===step?C.redDim:'transparent', fontWeight:i===step?600:400, fontFamily:"'DM Sans',sans-serif", borderLeft:i===step?`3px solid ${C.red}`:'3px solid transparent', transition:'all 0.15s' }}>
                {s}
              </div>
            ))}
          </div>
          <SimContent step={step} DOCS={DOCS} />
        </div>
      )}

      {/* Mobile: content below tabs */}
      {isMobile && (
        <div style={{ padding:'20px 16px', minHeight:'280px' }}>
          <SimContent step={step} DOCS={DOCS} />
        </div>
      )}

      {/* Step progress bar on mobile */}
      {isMobile && (
        <div style={{ display:'flex', gap:'4px', padding:'12px 16px', background:C.bg2, borderTop:`1px solid ${C.border}` }}>
          {STEPS.map((_,i) => (
            <div key={i} style={{ flex:1, height:'3px', borderRadius:'2px', background:i<=step?C.red:C.border }} />
          ))}
        </div>
      )}
    </div>
  )
}

// Extracted sim content so it can be used by both mobile and desktop layouts
function SimContent({ step, DOCS }) {
  return (
    <div style={{ padding:'24px' }}>

      {/* ── BRIEF ── */}
      {step===0 && (
        <div>
          <div style={{ fontSize:'11px', fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'16px' }}>Event brief</div>
          {[
            ['Event name',"Your Client's product launch"],
            ['Client','Your client · Consumer brand'],
            ['Cities','Delhi · Mumbai'],
            ['Date','15 Mar · 22 Mar'],
            ['Agency fee','15%'],
            ['GST','18%'],
          ].map(([l,v],i)=>(
            <div key={i} style={{ display:'flex', gap:'12px', marginBottom:'10px', fontSize:'13px', flexWrap:'wrap', animation:`slideIn 0.35s ease ${i*0.06}s both` }}>
              <span style={{ color:C.text3, width:'96px', flexShrink:0 }}>{l}</span>
              <span style={{ color:C.text, fontWeight:500 }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── ELEMENTS → TASKS ── */}
      {step===1 && (
        <div>
          <div style={{ fontSize:'11px', fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'12px' }}>Elements — Stage & AV · Delhi</div>
          {[
            { el:'Stage 40×20 ft',   assigned:true,  assignee:'Abhishek', delay:0 },
            { el:'LED Wall P3.9 · 24×12 ft', assigned:true, assignee:'Naveen', delay:0.07 },
            { el:'Sound Line Array', assigned:false, assignee:null, delay:0.14 },
            { el:'Registration Backdrop', assigned:false, assignee:null, delay:0.21 },
          ].map((item,i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:'10px',
              padding:'10px 12px',
              background: item.assigned ? 'rgba(188,23,35,0.04)' : C.bg,
              border:`1px solid ${item.assigned ? 'rgba(188,23,35,0.2)' : C.border}`,
              borderRadius:'8px', marginBottom:'8px',
              animation: item.assigned
                ? `slideIn 0.4s ease ${item.delay}s both`
                : `slideIn 0.4s ease ${item.delay}s both, taskPop 2.4s ease ${1.2+i*0.3}s infinite`,
            }}>
              <div style={{ flex:1, fontSize:'12px', color:C.text, fontWeight: item.assigned ? 500 : 400 }}>{item.el}</div>
              {item.assigned ? (
                <>
                  <span style={{ fontSize:'9px', fontWeight:700, color:C.red, background:C.redDim, padding:'2px 8px', borderRadius:'20px', letterSpacing:'0.3px', flexShrink:0 }}>TASK</span>
                  <div style={{ width:'22px', height:'22px', borderRadius:'50%', background:C.bg2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', fontWeight:700, color:C.text2, flexShrink:0 }}>{item.assignee[0]}</div>
                </>
              ) : (
                <span style={{ fontSize:'10px', color:C.text3 }}>+ assign →</span>
              )}
            </div>
          ))}
          <p style={{ fontSize:'11px', color:C.text3, marginTop:'10px' }}>21 categories pre-loaded. Every element becomes a task with one tap.</p>
        </div>
      )}

      {/* ── TEAM ── */}
      {step===2 && (
        <div>
          <div style={{ fontSize:'11px', fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'14px' }}>Team · Roles & Access</div>
          {[
            { role:'Admin',       scope:'Full access',     color:'#bc1723', desc:'Creates events · manages team · sees all' },
            { role:'Manager',     scope:'Assigned events', color:'#2563EB', desc:'Elements · costs · vendors · documents' },
            { role:'Event Lead',  scope:'Ops or Full',     color:'#7C3AED', desc:'Tasks · production · execution' },
            { role:'Team',        scope:'View only',       color:'#374151', desc:'Assigned work · ground execution' },
          ].map((r,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:'8px', marginBottom:'8px', animation:`slideIn 0.4s cubic-bezier(0.16,1,0.3,1) ${i*0.1}s both` }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:r.color, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'12px', fontWeight:600, color:C.text }}>{r.role}</span>
                  <span style={{ fontSize:'9px', color:r.color, background:`${r.color}18`, padding:'2px 8px', borderRadius:'20px', fontWeight:700, letterSpacing:'0.2px' }}>{r.scope}</span>
                </div>
                <div style={{ fontSize:'10px', color:C.text3, marginTop:'2px' }}>{r.desc}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop:'10px', padding:'9px 12px', background:C.redDim, border:`1px solid rgba(188,23,35,0.12)`, borderRadius:'7px' }}>
            <span style={{ fontSize:'11px', color:C.red, fontWeight:600 }}>Ground staff · </span>
            <span style={{ fontSize:'11px', color:C.text2 }}>WhatsApp link only — no login, no app download needed.</span>
          </div>
        </div>
      )}

      {/* ── TRACK ── */}
      {step===3 && (
        <div>
          <div style={{ fontSize:'11px', fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'14px' }}>Live notifications · Task tracking</div>
          {/* Bell */}
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px', padding:'10px 14px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:'8px', animation:'slideIn 0.3s ease both' }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <span style={{ fontSize:'20px', lineHeight:1 }}>🔔</span>
              <div style={{ position:'absolute', top:'-3px', right:'-5px', width:'14px', height:'14px', borderRadius:'50%', background:C.red, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'8px', color:'#fff', fontWeight:700, animation:'pulse 1.8s infinite' }}>3</div>
            </div>
            <span style={{ fontSize:'12px', color:C.text2 }}>3 new · tap to mark read</span>
          </div>
          {/* Notifications */}
          {[
            { icon:'✅', msg:'Stage setup assigned to Abhishek', time:'2m ago', border:'rgba(22,163,74,0.18)', bg:'rgba(22,163,74,0.04)' },
            { icon:'🗂️', msg:'Annual Summit approved — ready to execute', time:'14m ago', border:'rgba(188,23,35,0.18)', bg:'rgba(188,23,35,0.03)' },
            { icon:'🔄', msg:'Naveen marked sound check in-progress', time:'1h ago', border:C.border, bg:C.bg },
          ].map((n,i) => (
            <div key={i} style={{ display:'flex', gap:'10px', padding:'10px 12px', background:n.bg, border:`1px solid ${n.border}`, borderRadius:'8px', marginBottom:'7px', animation:`notifSlide 0.5s cubic-bezier(0.16,1,0.3,1) ${0.1+i*0.13}s both` }}>
              <span style={{ fontSize:'15px', flexShrink:0, lineHeight:'1.4' }}>{n.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'12px', color:C.text, lineHeight:1.4 }}>{n.msg}</div>
                <div style={{ fontSize:'10px', color:C.text3, marginTop:'3px' }}>{n.time}</div>
              </div>
            </div>
          ))}
          {/* WhatsApp link */}
          <div style={{ marginTop:'10px', padding:'9px 12px', background:'rgba(37,99,235,0.04)', border:'1px solid rgba(37,99,235,0.15)', borderRadius:'7px', animation:'slideIn 0.4s ease 0.5s both' }}>
            <div style={{ fontSize:'11px', fontWeight:600, color:'#2563EB', marginBottom:'2px' }}>WhatsApp public link</div>
            <div style={{ fontSize:'11px', color:C.text2 }}>Joseph (Delhi ground) opens link → sees his task → marks done → you see it live.</div>
          </div>
        </div>
      )}

      {/* ── ANALYSE ── */}
      {step===4 && (
        <div>
          <div style={{ fontSize:'11px', fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'14px' }}>Analytics · Admin only</div>
          {/* Event pipeline */}
          <div style={{ marginBottom:'18px' }}>
            <div style={{ fontSize:'12px', fontWeight:600, color:C.text, marginBottom:'9px' }}>Event pipeline</div>
            {[
              { label:'Active',           pct:62, color:C.red },
              { label:'Pending approval', pct:24, color:'#F59E0B' },
              { label:'Delivered',        pct:14, color:'#16A34A' },
            ].map((b,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'7px', animation:`slideIn 0.35s ease ${i*0.08}s both` }}>
                <div style={{ fontSize:'11px', color:C.text2, width:'110px', flexShrink:0 }}>{b.label}</div>
                <div style={{ flex:1, height:'6px', background:C.bg3, borderRadius:'3px', overflow:'hidden' }}>
                  <div style={{ height:'100%', background:b.color, borderRadius:'3px', '--bar-w':`${b.pct}%`, width:`${b.pct}%`, animation:`barGrow 0.9s cubic-bezier(0.16,1,0.3,1) ${0.3+i*0.15}s both` }}/>
                </div>
                <div style={{ fontSize:'10px', color:C.text3, width:'22px', textAlign:'right', flexShrink:0 }}>{b.pct}%</div>
              </div>
            ))}
          </div>
          {/* Team workload */}
          <div>
            <div style={{ fontSize:'12px', fontWeight:600, color:C.text, marginBottom:'9px' }}>Team workload</div>
            {[
              { name:'Abhishek', done:8, total:11 },
              { name:'Naveen',   done:5, total:11 },
              { name:'Joseph',   done:2, total:11 },
            ].map((p,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'9px', marginBottom:'8px', animation:`slideIn 0.35s ease ${0.4+i*0.1}s both` }}>
                <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:C.bg3, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, color:C.text2, flexShrink:0 }}>{p.name[0]}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                    <span style={{ fontSize:'11px', color:C.text }}>{p.name}</span>
                    <span style={{ fontSize:'10px', color:C.text3 }}>{p.done}/{p.total}</span>
                  </div>
                  <div style={{ display:'flex', height:'4px', borderRadius:'2px', overflow:'hidden', background:C.bg3 }}>
                    <div style={{ width:`${(p.done/p.total)*100}%`, background:p.done>6?'#16A34A':p.done>3?'#F59E0B':C.red, transition:'width 0.9s ease' }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:'10px', color:C.text3, marginTop:'12px' }}>Volume and velocity only — no financials shown here.</p>
        </div>
      )}

      {/* ── DELIVER ── */}
      {step===5 && (
        <div>
          <div style={{ textAlign:'center', paddingBottom:'14px', paddingTop:'4px' }}>
            <div style={{ fontSize:'34px', marginBottom:'6px', animation:'float 3s ease-in-out infinite' }}>🎉</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'20px', fontWeight:600, color:C.text }}>Event delivered.</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
            {[
              { icon:'📄', name:'Proposal',             done:true },
              { icon:'📋', name:'Element master',       done:true },
              { icon:'👥', name:'Task sheet',           done:true },
              { icon:'🎨', name:'Production list',      done:true },
              { icon:'📞', name:'Vendor sheet',         done:true },
              { icon:'📅', name:'Visual control chart', done:true },
              { icon:'🎬', name:'Cue sheet',            done:true },
              { icon:'✈️', name:'Travel plan',          done:false, soon:true },
            ].map((doc,i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:'7px', padding:'8px 10px',
                background: doc.soon ? C.bg : 'rgba(22,163,74,0.05)',
                border:`1px solid ${doc.soon ? C.border : 'rgba(22,163,74,0.15)'}`,
                borderRadius:'6px',
                animation: doc.done ? `slideIn 0.4s ease ${i*0.07}s both, dlPulse 1s ease ${0.4+i*0.07}s both` : `slideIn 0.4s ease ${i*0.07}s both`,
              }}>
                <span style={{ fontSize:'13px' }}>{doc.icon}</span>
                <span style={{ fontSize:'11px', color: doc.soon ? C.text3 : C.text, fontWeight: doc.soon ? 300 : 500, flex:1 }}>{doc.name}</span>
                {doc.soon
                  ? <span style={{ fontSize:'8px', color:C.text3, background:C.bg3, padding:'1px 5px', borderRadius:'3px' }}>soon</span>
                  : <span style={{ fontSize:'12px', color:'#16A34A', fontWeight:700 }}>✓</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────
export default function LandingPage() {
  const [email, setEmail]       = useState('')
  const [name, setName]         = useState('')
  const [company, setCompany]   = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [heroIn, setHeroIn]     = useState(false)

  const w        = useWindowSize()
  const isMobile = w < 768   // single column
  const isTablet = w < 1024  // two col instead of three

  useEffect(() => {
    const link = document.createElement('link'); link.href = FONTS; link.rel = 'stylesheet'
    document.head.appendChild(link)
    const t = setTimeout(() => setHeroIn(true), 100)
    return () => { clearTimeout(t); document.head.contains(link) && document.head.removeChild(link) }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault(); if (!email.trim() || !name.trim()) return
    setSubmitting(true)
    try { await supabase.from('access_requests').insert({ email:email.trim(), full_name:name.trim(), company:company.trim(), status:'pending' }); setSubmitted(true) }
    catch(err) { console.error(err) }
    setSubmitting(false)
  }

  const canSubmit = email.trim() && name.trim() && !submitting

  // ── Shared style helpers ──────────────────────────────
  const sp = isMobile ? '64px 20px' : '100px 24px'  // section padding
  const mw = '1060px'                                 // max-width container

  const s = {
    chip: { fontSize:'12px', fontWeight:600, color:C.red, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'14px', display:'block' },
    h2:   { fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(32px,5vw,60px)', fontWeight:600, lineHeight:1.1, letterSpacing:'-0.5px', color:C.text },
    body: { fontSize:'15px', color:C.text2, lineHeight:1.8, fontWeight:300 },
  }

  const FEATURES = [
    { icon:'📋', tag:'Core',        title:'Proposals that close',           body:'21 standard categories, pre-loaded. Import your existing Excel or build from scratch. Track your cost and client cost separately — always know where you stand. Export a branded proposal in minutes.' },
    { icon:'⚡', tag:'Core',        title:'Execution without chaos',         body:'Every element becomes a task. Assign to any team member — registered, freelancer, or ground staff. Real-time notifications on every assignment, status change, and approval. Share one public WhatsApp link for staff who need no login, no app.' },
    { icon:'🎨', tag:'Operations',  title:'Production that never misses',    body:'Three streams tracked: creative, fabrication, print. Creative must be client-approved before print. QC confirmation required before anything is marked done. Nothing goes out wrong.' },
    { icon:'🎬', tag:'Production',  title:'Show flow in minutes',            body:'Name every screen — Main LED, Left Panel, Sound, Light, Followspot. Enter duration, end fills automatically. Multi-city, one sheet per city, exported branded.' },
    { icon:'🧠', tag:'AI',          title:'Rate cards that remember',        body:'Upload vendor rate cards and the system learns your costs from day one. No rate cards yet? System generates intelligent suggestions per element, per category — built from 100+ years of collective expertise.' },
    { icon:'🏋️', tag:'Team',        title:'Train your team how to run an event.',  body:'Add your team — managers, leads, ground staff. Each role sees exactly what they need. Assign tasks with one tap, set deadlines, track execution. Your team learns the workflow by working it. Every event, everyone gets sharper.' },
  ]

  const DOCS = [
    { icon:'📄', name:'Proposal',              sub:'City-wise · Agency fee · GST · T&C' },
    { icon:'📋', name:'Element master list',   sub:'Full scope · City-wise · In format you need' },
    { icon:'👥', name:'Task assignment sheet', sub:'Who · What · Deadline · Status' },
    { icon:'🎨', name:'Production & print list', sub:'Creative · Fabrication · Print per element' },
    { icon:'📞', name:'Vendor contact sheet',  sub:'All your partners · City-wise · One sheet' },
    { icon:'📅', name:'Visual control chart',  sub:'Your Gantt. Every task on a date.' },
    { icon:'🎬', name:'Cue sheet / Show flow', sub:'Named screens · Multi-screen supported · City-wise' },
    { icon:'✈️', name:'Travel plan',           sub:'Team · Artists · Hotel · Flights · City-wise', comingSoon:true },
  ]

  return (
    <div style={{ background:C.bg, color:C.text, fontFamily:"'DM Sans',sans-serif", overflowX:'hidden' }}>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        ::selection{background:rgba(188,23,35,0.12);color:${C.red}}
        html{scroll-behavior:smooth}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:${C.bg}}
        ::-webkit-scrollbar-thumb{background:${C.border2};border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes barGrow{from{width:0}to{width:var(--bar-w,100%)}}
        @keyframes notifSlide{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes taskPop{0%{border-color:rgba(188,23,35,0.15);background:rgba(188,23,35,0.03)}50%{border-color:rgba(188,23,35,0.45);background:rgba(188,23,35,0.09)}100%{border-color:rgba(188,23,35,0.15);background:rgba(188,23,35,0.03)}}
        @keyframes dlPulse{0%,100%{box-shadow:0 0 0 0 rgba(188,23,35,0)}60%{box-shadow:0 0 0 5px rgba(188,23,35,0.12)}}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;transition-duration:0.01ms!important}}
      `}</style>

      <Nav />

      {/* ── HERO ──────────────────────────────────────── */}
      <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding: isMobile ? '120px 20px 72px' : '140px 24px 80px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient(${C.border} 1px,transparent 1px),linear-gradient(90deg,${C.border} 1px,transparent 1px)`, backgroundSize:'48px 48px', opacity:0.6, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translateX(-50%)', width:'500px', height:'200px', background:'radial-gradient(ellipse,rgba(188,23,35,0.05) 0%,transparent 70%)', pointerEvents:'none' }}/>

        {/* Pill */}
        <div style={{ opacity:heroIn?1:0, transform:heroIn?'none':'translateY(12px)', transition:'all 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s', display:'inline-flex', alignItems:'center', gap:'7px', padding:'5px 14px', background:C.white, border:`1px solid ${C.border2}`, borderRadius:'100px', marginBottom:'32px', boxShadow:'0 2px 8px rgba(26,25,21,0.06)' }}>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:C.red, animation:'pulse 2s infinite' }}/>
          <span style={{ fontSize:'12px', color:C.text2, fontWeight:500 }}>Born in India · Built for the world</span>
        </div>

        {/* Heading */}
        <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(48px,8.5vw,108px)', lineHeight:1.0, letterSpacing:'-2px', fontWeight:600, marginBottom:'24px', maxWidth:'900px' }}>
          <WordReveal text="Your events." delay={300}/>
          <br/><WordReveal text="Your team." delay={500}/>
          <br/><WordReveal text="Your reputation." delay={700} color={C.red} italic/>
        </h1>

        {/* Sub */}
        <div style={{ opacity:heroIn?1:0, transform:heroIn?'none':'translateY(16px)', transition:'all 0.8s cubic-bezier(0.16,1,0.3,1) 1.1s', maxWidth:'540px', marginBottom:'36px' }}>
          <p style={{ fontSize:'clamp(15px,2vw,19px)', color:C.text2, lineHeight:1.75, fontWeight:300 }}>
            From first quote to final applause — one system that thinks like a senior event professional and works like a machine.
          </p>
        </div>

        {/* CTAs */}
        <div style={{ opacity:heroIn?1:0, transform:heroIn?'none':'translateY(12px)', transition:'all 0.8s cubic-bezier(0.16,1,0.3,1) 1.3s', display:'flex', gap:'12px', flexWrap:'wrap', justifyContent:'center', marginBottom:'48px' }}>
          <a href="#earlyaccess" style={{ padding:'14px 28px', background:C.red, color:'#fff', borderRadius:'8px', fontSize:'14px', fontWeight:600, textDecoration:'none', transition:'background 0.15s', boxShadow:'0 4px 16px rgba(188,23,35,0.3)' }}
            onMouseOver={e=>e.currentTarget.style.background=C.redBr} onMouseOut={e=>e.currentTarget.style.background=C.red}>
            Get early access — free →
          </a>
          <a href="#demo" style={{ padding:'14px 24px', border:`1px solid ${C.border2}`, color:C.text2, borderRadius:'8px', fontSize:'14px', fontWeight:500, textDecoration:'none', background:C.white, transition:'all 0.15s' }}
            onMouseOver={e=>{e.currentTarget.style.borderColor=C.text2;e.currentTarget.style.color=C.text}}
            onMouseOut={e=>{e.currentTarget.style.borderColor=C.border2;e.currentTarget.style.color=C.text2}}>
            See it in action
          </a>
        </div>

        {/* Quick stat pills */}
        <div style={{ opacity:heroIn?1:0, transition:'opacity 0.8s 1.5s', display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center' }}>
          {[['100+','years of collective expertise'],['21','categories pre-loaded'],['8','documents, one click'],['0','logins for ground staff']].map(([n,l]) => (
            <div key={n} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 14px', background:C.white, border:`1px solid ${C.border}`, borderRadius:'100px', boxShadow:'0 1px 4px rgba(26,25,21,0.04)' }}>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'17px', fontWeight:700, color:C.red }}>{n}</span>
              <span style={{ fontSize:'11px', color:C.text2 }}>{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHO IT'S FOR ──────────────────────────────── */}
      <section id="forwho" style={{ padding:sp, background:C.white, borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:mw, margin:'0 auto' }}>
          <R style={{ textAlign:'center', marginBottom: isMobile ? '36px' : '56px' }}>
            <span style={s.chip}>Built for everyone in events</span>
            <h2 style={{ ...s.h2, textAlign:'center' }}>Whether you've been doing this{isMobile?' ':'\n'}for 20 years — or 20 days.</h2>
          </R>

          {/* Bug fix: was gridTemplateColumns:'1fr 1fr' always — now responsive */}
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'20px', marginBottom:'20px' }}>
            {[
              { icon:'📊', bar:C.red, title:"If Excel is your second language —", body:"You know what you're doing. You've run a hundred events. You also know the formula breaks at 11pm, the vendor quote is in one file, the task list in another, and the client approval is buried in a WhatsApp thread.", quote:'"The spreadsheet was never built for this. Myoozz was."' },
              { icon:'🧭', bar:C.text3, title:"If planning feels overwhelming —", body:"You're not lost — you just haven't had the right guide. Myoozz tells you what needs to be done, in what order, by whom, and what you're missing. Like having a senior event professional in the room with you. Every time.", quote:'"Your mentor. Your checklist. Your control room."' },
            ].map((card,i) => (
              <R key={i} delay={i*0.08} from={isMobile?'bottom':(i===0?'left':'right')}>
                <div style={{ padding: isMobile ? '28px 24px' : '40px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:'16px', height:'100%', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, width:'4px', height:'100%', background:card.bar, borderRadius:'16px 0 0 16px' }}/>
                  <div style={{ fontSize:'36px', marginBottom:'16px' }}>{card.icon}</div>
                  <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize: isMobile ? '22px' : '26px', fontWeight:600, color:C.text, marginBottom:'12px', lineHeight:1.2 }}>{card.title}</h3>
                  <p style={{ fontSize:'14px', color:C.text2, lineHeight:1.8, fontWeight:300, marginBottom:'16px' }}>{card.body}</p>
                  <p style={{ fontSize:'16px', color:C.text, fontStyle:'italic', fontFamily:"'Cormorant Garamond',serif" }}>{card.quote}</p>
                </div>
              </R>
            ))}
          </div>

          {/* Pain comparison — navy box */}
          <R>
            {/* Bug fix: was gridTemplateColumns:'1fr 1fr' always — single col on mobile */}
            <div style={{ padding: isMobile ? '28px 20px' : '36px 40px', background:C.navy, borderRadius:'16px', display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '28px' : '40px', alignItems:'center' }}>
              <div>
                <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(22px,3vw,36px)', fontWeight:600, color:'#fff', lineHeight:1.2, marginBottom:'14px' }}>
                  Excel was built for accountants.<br/><em style={{ color:C.red }}>You've been borrowing it long enough.</em>
                </h3>
                <p style={{ fontSize:'14px', color:'rgba(255,255,255,0.5)', lineHeight:1.8, fontWeight:300 }}>The event industry is finally getting its own purpose-built tool. Professionals who make the switch quote faster, win more, and execute cleaner.</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {[
                  ['3 hours to format a proposal','20 minutes, done'],
                  ['Vendor contacts in 12 WhatsApps','Vendor sheet, one click'],
                  ['Tasks living in your head','Everyone assigned, deadlines set'],
                  ['Every cost guessed, never tracked','Every cost tracked, live'],
                  ['Seven files for one event','Eight documents, one system'],
                ].map(([b,a],i) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 16px 1fr', gap:'8px', fontSize:'12px', alignItems:'center' }}>
                    <span style={{ color:'rgba(255,255,255,0.3)', textDecoration:'line-through' }}>{b}</span>
                    <span style={{ color:'rgba(255,255,255,0.2)', fontSize:'10px', textAlign:'center' }}>→</span>
                    <span style={{ color:'#4ADE80', fontWeight:500 }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </R>
        </div>
      </section>

      {/* ── AI MENTOR ─────────────────────────────────── */}
      <section style={{ padding:sp, borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:mw, margin:'0 auto' }}>
          {/* Bug fix: was gridTemplateColumns:'1fr 1fr' always */}
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '40px' : '64px', alignItems:'center' }}>
            <R from={isMobile?'bottom':'left'}>
              <span style={s.chip}>AI-augmented intelligence</span>
              <h2 style={{ ...s.h2, marginBottom:'20px' }}>Your event mentor.<br/><em style={{ color:C.red }}>Always on. Always ready.</em></h2>
              <p style={{ ...s.body, marginBottom:'24px' }}>You can help the AI, or let the AI help you. Upload your vendor rate cards and the system learns your costs from day one. No rate cards yet? The system generates intelligent suggestions per element, per category — built from 100+ years of collective event expertise across EM, MICE, brand activations and digital marketing.</p>
              {['Start fresh? System generates rate suggestions per element, per category.','Upload rate cards — system learns your costs from day one.','Tells you what\'s missing before it becomes a problem.','21 categories pre-loaded with industry-standard elements.'].map((text,i) => (
                <div key={i} style={{ display:'flex', gap:'10px', alignItems:'flex-start', marginBottom:'10px' }}>
                  <div style={{ width:'18px', height:'18px', borderRadius:'50%', background:C.redDim, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:'2px' }}>
                    <span style={{ fontSize:'9px', color:C.red, fontWeight:700 }}>✓</span>
                  </div>
                  <span style={{ fontSize:'14px', color:C.text2, lineHeight:1.6 }}>{text}</span>
                </div>
              ))}
            </R>
            <R from={isMobile?'bottom':'right'}>
              <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:'14px', overflow:'hidden', boxShadow:'0 4px 24px rgba(26,25,21,0.08)' }}>
                <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:'8px', background:C.bg }}>
                  <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:C.red, animation:'pulse 2s infinite' }}/>
                  <span style={{ fontSize:'12px', color:C.text2, fontFamily:"'DM Mono',monospace" }}>System intelligence · Rate suggestions</span>
                </div>
                <div style={{ padding:'18px' }}>
                  {[
                    { label:'Stage 40×20ft · Delhi NCR', suggestion:'₹3,80,000', events:'3 past events', pct:92 },
                    { label:'LED Wall P3.9 · Mumbai',    suggestion:'₹1,95,000', events:'5 past events', pct:88 },
                    { label:'Sound Line Array · Any city', suggestion:'₹88,000', events:'7 past events', pct:96 },
                    { label:'Registration Backdrop · Any', suggestion:'₹58,000', events:'8 past events', pct:94 },
                  ].map((item,i) => (
                    <R key={i} delay={i*0.08}>
                      <div style={{ padding:'12px 14px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:'8px', marginBottom:'8px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                          <span style={{ fontSize:'12px', fontWeight:500, color:C.text }}>{item.label}</span>
                          <span style={{ fontSize:'10px', fontWeight:600, color:C.red, background:C.redDim, padding:'2px 7px', borderRadius:'4px' }}>AI suggest</span>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontSize:'14px', fontWeight:600, color:'#16A34A', fontFamily:"'Cormorant Garamond',serif" }}>{item.suggestion}</span>
                          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                            <div style={{ width:'64px', height:'3px', background:C.bg3, borderRadius:'2px', overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${item.pct}%`, background:C.red, borderRadius:'2px', transition:'width 1s ease' }}/>
                            </div>
                            <span style={{ fontSize:'9px', color:C.text3, fontFamily:"'DM Mono',monospace" }}>{item.pct}%</span>
                          </div>
                        </div>
                        <div style={{ fontSize:'10px', color:C.text3, marginTop:'4px' }}>{item.events}</div>
                      </div>
                    </R>
                  ))}
                  <p style={{ fontSize:'11px', color:C.text3, textAlign:'center', marginTop:'8px' }}>Updates with each proposal you build</p>
                </div>
              </div>
            </R>
          </div>
        </div>
      </section>

      {/* ── PRODUCT DEMO ──────────────────────────────── */}
      <section id="demo" style={{ padding:sp, background:C.bg2, borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:mw, margin:'0 auto' }}>
          <R style={{ textAlign:'center', marginBottom: isMobile ? '32px' : '52px' }}>
            <span style={s.chip}>Live product</span>
            <h2 style={{ ...s.h2, textAlign:'center', marginBottom:'16px' }}>Your best event, every time.</h2>
            <p style={{ ...s.body, margin:'0 auto', textAlign:'center', maxWidth:'480px' }}>Walk any stage. See how every role fits — from brief to final delivery.</p>
          </R>
          <ProductSim/>
          <R style={{ textAlign:'center', marginTop:'28px' }}>
            <a href="https://demo.myoozz.events" target="_blank" rel="noopener noreferrer"
              style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'11px 22px', border:`1px solid ${C.border2}`, borderRadius:'8px', fontSize:'13px', color:C.text2, textDecoration:'none', background:C.white, transition:'all 0.18s', fontFamily:"'DM Sans',sans-serif" }}
              onMouseOver={e=>{e.currentTarget.style.borderColor=C.red;e.currentTarget.style.color=C.red;e.currentTarget.style.background=C.redDim}}
              onMouseOut={e=>{e.currentTarget.style.borderColor=C.border2;e.currentTarget.style.color=C.text2;e.currentTarget.style.background=C.white}}>
              Ready to go deeper? Try the live demo →
            </a>
          </R>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────── */}
      <section id="features" style={{ padding:sp, borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:mw, margin:'0 auto' }}>
          <R style={{ textAlign:'center', marginBottom: isMobile ? '32px' : '56px' }}>
            <span style={s.chip}>What's inside</span>
            <h2 style={{ ...s.h2, textAlign:'center' }}>Everything. <em style={{ color:C.red }}>Nothing extra.</em></h2>
          </R>
          {/* auto-fill with minmax handles all screen sizes naturally */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' }}>
            {FEATURES.map((f,i) => (
              <R key={f.title} delay={i*0.06}>
                <div style={{ padding: isMobile ? '24px 20px' : '28px', background:C.white, border:`1px solid ${C.border}`, borderRadius:'14px', height:'100%', transition:'all 0.25s cubic-bezier(0.16,1,0.3,1)', cursor:'default' }}
                  onMouseOver={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 8px 32px rgba(26,25,21,0.09)';e.currentTarget.style.borderColor=C.border2}}
                  onMouseOut={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor=C.border}}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
                    <span style={{ fontSize:'28px' }}>{f.icon}</span>
                    <span style={{ fontSize:'9px', fontWeight:700, padding:'3px 8px', background:C.redDim, color:C.red, borderRadius:'4px', letterSpacing:'0.5px', textTransform:'uppercase' }}>{f.tag}</span>
                  </div>
                  <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'20px', fontWeight:600, color:C.text, marginBottom:'10px', lineHeight:1.3 }}>{f.title}</h3>
                  <p style={{ fontSize:'13px', color:C.text2, lineHeight:1.75, fontWeight:300 }}>{f.body}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMING SOON ───────────────────────────────── */}
      <section style={{ padding:sp, background:C.bg2, borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:mw, margin:'0 auto' }}>
          {/* Bug fix: on mobile this was 3 tiny columns */}
          <R style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: isMobile ? '28px' : '36px', flexWrap:'wrap', gap:'16px' }}>
            <div>
              <span style={s.chip}>On the roadmap</span>
              <h2 style={s.h2}>What's coming next.</h2>
            </div>
            <p style={{ ...s.body, maxWidth:'360px', fontSize:'13px' }}>We build in the open. Early adopters get these features first — and get to shape what they look like.</p>
          </R>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? '1fr 1fr 1fr' : 'repeat(3,1fr)', gap:'12px' }}>
            {[
              { icon:'✈️', title:'Travel plan',         desc:'Team, artist & hotel travel per city. Shareable with your travel agent.' },
              { icon:'📧', title:'Email notifications', desc:'Auto-notify team when assigned. Client gets proposal link directly.' },
              { icon:'📑', title:'PDF export',          desc:'Branded PDF proposals for formal client submissions.' },
              { icon:'🏢', title:'Client dashboard',    desc:'Read-only view for clients to see proposal status and approve online.' },
              { icon:'🤝', title:'Vendor portal',       desc:'Share element briefs with vendors. They confirm quantities and rates.' },
              { icon:'📊', title:'Analytics',           desc:'Win rate, pitch-to-close time, cost trends across all your events.' },
            ].map((item,i) => (
              <R key={i} delay={i*0.04}>
                <div style={{ padding: isMobile ? '18px 16px' : '24px', background:C.white, border:`1px solid ${C.border}`, borderRadius:'12px', opacity:0.78, minHeight: isMobile ? '130px' : '150px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                    <span style={{ fontSize: isMobile ? '20px' : '24px' }}>{item.icon}</span>
                    <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 6px', background:C.redDim, color:C.red, borderRadius:'3px', letterSpacing:'0.5px' }}>SOON</span>
                  </div>
                  <div style={{ fontSize: isMobile ? '13px' : '14px', fontWeight:600, color:C.text, marginBottom:'6px' }}>{item.title}</div>
                  <div style={{ fontSize:'12px', color:C.text3, lineHeight:1.65 }}>{item.desc}</div>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* ── DOCUMENTS ─────────────────────────────────── */}
      <section id="documents" style={{ padding:sp, background:C.white, borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:mw, margin:'0 auto' }}>
          {/* Bug fix: was gridTemplateColumns:'1fr 1fr' always */}
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '36px' : '64px', alignItems:'start' }}>
            <R from={isMobile?'bottom':'left'}>
              <span style={s.chip}>Eight documents</span>
              <h2 style={{ ...s.h2, marginBottom:'20px' }}>Every person covered.<br/><em style={{ color:C.red }}>From one event.</em></h2>
              <p style={{ ...s.body, marginBottom:'28px' }}>All eight documents built from data you've already entered. No reformatting. No copy-paste. Fully branded. Download one or take everything at once.</p>
              <a href="#earlyaccess" style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'13px 24px', background:C.red, color:'#fff', borderRadius:'8px', fontSize:'14px', fontWeight:600, textDecoration:'none', transition:'background 0.15s' }}
                onMouseOver={e=>e.currentTarget.style.background=C.redBr} onMouseOut={e=>e.currentTarget.style.background=C.red}>
                Start free →
              </a>
            </R>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {DOCS.map((doc,i) => (
                <R key={doc.name} delay={i*0.04} from={isMobile?'bottom':(i%2===0?'right':'left')}>
                  <div style={{ display:'flex', alignItems:'center', gap:'14px', padding:'13px 16px', background:i%2?C.bg:C.white, border:`1px solid ${C.border}`, borderRadius:'10px', transition:'all 0.2s', cursor:'default', opacity:doc.comingSoon?0.7:1 }}
                    onMouseOver={e=>{if(!doc.comingSoon){e.currentTarget.style.borderColor=C.border2;e.currentTarget.style.background=C.bg2}}}
                    onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=i%2?C.bg:C.white}}>
                    <span style={{ fontSize:'22px', flexShrink:0 }}>{doc.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', fontWeight:600, color:doc.comingSoon?C.text3:C.text, marginBottom:'2px', display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                        {doc.name}
                        {doc.comingSoon && <span style={{ fontSize:'9px', fontWeight:700, padding:'2px 5px', background:C.redDim, color:C.red, borderRadius:'3px' }}>SOON</span>}
                      </div>
                      <div style={{ fontSize:'11px', color:C.text3 }}>{doc.sub}</div>
                    </div>
                    {!doc.comingSoon && <span style={{ fontSize:'10px', color:C.text3, fontFamily:"'DM Mono',monospace", flexShrink:0 }}>↓ xlsx</span>}
                  </div>
                </R>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── GROUND STAFF ──────────────────────────────── */}
      <section style={{ padding:sp, borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:mw, margin:'0 auto' }}>
          {/* Bug fix: was gridTemplateColumns:'1fr 1fr' always */}
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '40px' : '64px', alignItems:'center' }}>
            {/* Team cards — shown first on mobile for visual impact */}
            <R from={isMobile?'bottom':'left'} style={{ order: isMobile ? 2 : 1 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                {[
                  { i:'A', name:'Abhishek', role:'Project Owner',    tasks:'12 tasks', status:'Done',        c:'#16A34A' },
                  { i:'N', name:'Naveen',   role:'Production Head',  tasks:'8 tasks',  status:'In progress', c:'#2563EB' },
                  { i:'J', name:'Joseph',   role:'Ground · Delhi',   tasks:'Public link', status:'On site',  c:'#D97706' },
                  { i:'B', name:'Balwinder',role:'Creative team',    tasks:'3 creatives', status:'Pending',  c:C.text3 },
                ].map((p,i) => (
                  <div key={i} style={{ padding:'20px', background:C.white, border:`1px solid ${C.border}`, borderRadius:'12px', boxShadow:'0 2px 8px rgba(26,25,21,0.04)' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:C.bg2, border:`1px solid ${C.border2}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:700, color:C.text2, marginBottom:'12px', fontFamily:"'Cormorant Garamond',serif" }}>{p.i}</div>
                    <div style={{ fontSize:'13px', fontWeight:600, color:C.text, marginBottom:'2px' }}>{p.name}</div>
                    <div style={{ fontSize:'11px', color:C.text3, marginBottom:'8px' }}>{p.role}</div>
                    <div style={{ fontSize:'10px', color:C.text3, marginBottom:'4px' }}>{p.tasks}</div>
                    <div style={{ fontSize:'11px', fontWeight:600, color:p.c }}>{p.status}</div>
                  </div>
                ))}
              </div>
            </R>
            <R from={isMobile?'bottom':'right'} style={{ order: isMobile ? 1 : 2 }}>
              <span style={s.chip}>Team + ground staff</span>
              <h2 style={{ ...s.h2, marginBottom:'20px' }}>Your team. Their tasks.<br/><em style={{ color:C.red }}>No login needed.</em></h2>
              <p style={{ ...s.body, marginBottom:'16px' }}>Assign tasks to anyone — registered team member, freelancer, or vendor. Share one link on WhatsApp. They open it on their phone, see their element, mark it done. You see it instantly.</p>
              <p style={s.body}>No app download. No signup. No friction. Ground staff from any city, any event — always available when you need them.</p>
            </R>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────── */}
      {/* Bug fix: was repeat(4,1fr) always — 4 tiny columns on mobile */}
      <div style={{ background:C.navy, borderTop:`1px solid ${C.border}`, padding: isMobile ? '40px 20px' : '56px 24px' }}>
        <div style={{ maxWidth:'900px', margin:'0 auto', display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:0, textAlign:'center' }}>
          {[[100,'+','Years of collective expertise across EM, MICE, brand & digital'],[21,'','Standard categories, pre-loaded'],[8,'','Export formats, fully formatted'],[0,'','Logins needed for ground staff']].map(([n,suf,l],i,arr) => (
            <div key={i} style={{ padding: isMobile ? '20px 12px' : '24px 16px', borderRight: isMobile ? (i%2===0?'1px solid rgba(255,255,255,0.08)':'none') : (i<3?'1px solid rgba(255,255,255,0.08)':'none'), borderBottom: isMobile ? (i<2?'1px solid rgba(255,255,255,0.08)':'none') : 'none' }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize: isMobile ? '44px' : '52px', fontWeight:700, color:C.red, lineHeight:1, marginBottom:'10px' }}>
                <Counter target={n} suffix={suf}/>
              </div>
              <div style={{ fontSize: isMobile ? '11px' : '12px', color:'rgba(255,255,255,0.45)', lineHeight:1.6, fontWeight:300 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── EARLY ACCESS FORM ─────────────────────────── */}
      <section id="earlyaccess" style={{ padding: isMobile ? '64px 20px' : '100px 24px', background:C.white, borderTop:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:'480px', margin:'0 auto' }}>
          <R style={{ textAlign:'center', marginBottom:'44px' }}>
            <div style={{ fontSize:'40px', marginBottom:'20px', animation:'float 3s ease-in-out infinite', display:'inline-block' }}>🎪</div>
            <h2 style={{ ...s.h2, textAlign:'center', marginBottom:'16px' }}>Join the first cohort.</h2>
            <p style={{ ...s.body, textAlign:'center' }}>We run this on real events, right now. Join us — we onboard every agency personally.</p>
          </R>
          {submitted ? (
            <R>
              <div style={{ textAlign:'center', padding:'48px 32px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:'14px' }}>
                <div style={{ fontSize:'48px', marginBottom:'16px' }}>🎉</div>
                <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'28px', fontWeight:600, color:C.text, marginBottom:'10px' }}>You're on the list.</h3>
                <p style={{ fontSize:'14px', color:C.text2, lineHeight:1.7, marginBottom:'24px' }}>We'll reach out personally within 48 hours. If someone's already shared access with you — head straight to login.</p>
                <a href="/login" style={{ display:'inline-flex', padding:'12px 24px', background:C.red, color:'#fff', borderRadius:'8px', fontSize:'14px', fontWeight:600, textDecoration:'none' }}>Sign in →</a>
              </div>
            </R>
          ) : (
            <R>
              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                {[
                  { label:'Your name',       value:name,    set:setName,    placeholder:'How should we address you?', req:true },
                  { label:'Work email',      value:email,   set:setEmail,   placeholder:'you@company.com', req:true, type:'email' },
                  { label:'Company / agency',value:company, set:setCompany, placeholder:'Your company name' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:C.text2, marginBottom:'6px' }}>{f.label}{f.req && <span style={{ color:C.red }}> *</span>}</label>
                    <input type={f.type||'text'} value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.placeholder} required={f.req}
                      style={{ width:'100%', padding:'13px 16px', background:C.bg, border:`1px solid ${C.border2}`, borderRadius:'8px', fontSize:'14px', color:C.text, fontFamily:"'DM Sans',sans-serif", outline:'none', transition:'border-color 0.15s' }}
                      onFocus={e=>e.target.style.borderColor=C.red} onBlur={e=>e.target.style.borderColor=C.border2}/>
                  </div>
                ))}
                <button type="submit" disabled={!canSubmit}
                  style={{ marginTop:'6px', padding:'15px', background:canSubmit?C.red:C.bg3, color:canSubmit?'#fff':C.text3, border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:canSubmit?'pointer':'not-allowed', fontFamily:"'DM Sans',sans-serif", transition:'all 0.2s' }}>
                  {submitting ? 'Submitting...' : 'Request early access →'}
                </button>
                <p style={{ fontSize:'11px', color:C.text3, textAlign:'center' }}>No spam. A real person will reach out.</p>
              </form>
            </R>
          )}
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────── */}
      {/* Bug fix: was gridTemplateColumns:'1fr 1fr 1fr' always */}
      <footer style={{ padding: isMobile ? '40px 20px 28px' : '48px', borderTop:`1px solid ${C.border}`, background:C.bg2 }}>
        <div style={{ maxWidth:mw, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr', gap: isMobile ? '32px' : '40px', marginBottom:'40px', paddingBottom:'32px', borderBottom:`1px solid ${C.border}` }}>
            <div>
              <img src="/myoozz-logo-light.png" alt="Myoozz" style={{ height:'36px', objectFit:'contain', marginBottom:'14px', display:'block' }}
                onError={e=>{e.target.style.display='none'; e.target.nextSibling.style.display='flex'}}/>
              <div style={{ display:'none', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
                <div style={{ width:'32px', height:'32px', background:C.red, borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'#fff', fontFamily:"'Poppins',sans-serif", letterSpacing:'-0.5px' }}>ME</div>
                <span style={{ fontSize:'14px', fontWeight:600, color:C.text }}>Myoozz Events</span>
              </div>
              <p style={{ fontSize:'13px', color:C.text2, lineHeight:1.75, marginBottom:'12px' }}>Transforming visions into reality through innovative solutions in event management, digital marketing, and brand development.</p>
              <p style={{ fontSize:'15px', fontWeight:600, color:C.red, fontStyle:'italic', fontFamily:"'Cormorant Garamond',serif" }}>Your success is our mission.</p>
            </div>
            <div>
              <p style={{ fontSize:'11px', fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'12px' }}>Parent company</p>
              <p style={{ fontSize:'14px', fontWeight:600, color:C.text, marginBottom:'6px' }}>Myoozz Consulting Pvt. Ltd.</p>
              <p style={{ fontSize:'13px', color:C.text2, marginBottom:'8px' }}>Noida, India</p>
              <a href="https://www.themyoozz.com" target="_blank" rel="noopener noreferrer" style={{ fontSize:'13px', color:C.red, textDecoration:'none', fontWeight:500 }}>www.themyoozz.com →</a>
            </div>
            <div>
              <p style={{ fontSize:'11px', fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'12px' }}>Quick links</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {[["#forwho","Who it's for"],["#features","Features"],["#documents","Documents"],["#earlyaccess","Get early access"],["/login","Sign in"]].map(([href,label],i) => (
                  <a key={i} href={href} style={{ fontSize:'13px', color:i===3?C.red:C.text2, textDecoration:'none', fontWeight:i===3?500:400 }}>{label}</a>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'8px' }}>
            <span style={{ fontSize:'11px', color:C.text3 }}>© 2026 Myoozz Consulting Pvt. Ltd. · Born in India · Built for the world</span>
            <div style={{ display:'flex', gap:'16px' }}>
              <span style={{ fontSize:'11px', color:C.text3, fontFamily:"'DM Mono',monospace" }}>v0.50.0-beta</span>
              <span style={{ fontSize:'11px', color:C.text3, fontFamily:"'DM Mono',monospace" }}>www.myoozz.events</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
