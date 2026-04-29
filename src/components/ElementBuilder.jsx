import { useState, useEffect, useRef, useCallback } from 'react'
import ImportModal from './ImportModal'
import { CATEGORY_SUGGESTIONS } from './CategoryLibrary'
import CategoryPicker from './CategoryPicker'
import { supabase } from '../supabase'
import { createRateCardRequestNotification } from '../utils/notificationService'
import * as XLSX from 'xlsx'
import { logElementCreated, logElementDeleted, logCategoryAdded, logCategoryDeleted } from '../utils/activityLogger'

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const SIZE_UNITS = ['ft','sqft','mtr','sqmtr','nos','per pax']
const STATUS_OPTIONS = ['Estimated','Confirmed','Actuals','Client scope']
const STATUS_STYLES = {
  'Estimated':    { bg:'#FEF3C7', color:'#92400E' },
  'Confirmed':    { bg:'#D1FAE5', color:'#065F46' },
  'Actuals':      { bg:'#F3F4F6', color:'#6B7280' },
  'Client scope': { bg:'#DBEAFE', color:'#1E40AF' },
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function fmt(n){ return (!n||n===0)?null:'₹'+Math.round(n).toLocaleString('en-IN') }
function calcClient(el){ return el.lump_sum?(+(el.amount)||0):(+(el.rate)||0)*(+(el.qty)||1)*(+(el.days)||1) }
function calcInternal(el){ return el.internal_lump?(+(el.internal_amount)||0):(+(el.internal_rate)||0)*(+(el.qty)||1)*(+(el.days)||1) }



function useWindowSize(){
  const [w,setW]=useState(()=>typeof window!=='undefined'?window.innerWidth:1200)
  useEffect(()=>{
    const fn=()=>setW(window.innerWidth)
    window.addEventListener('resize',fn)
    return ()=>window.removeEventListener('resize',fn)
  },[])
  return w
}

// Build grid-template-columns string, consistent between headers and rows
function getColTemplate(isAdmin,fv,viewMode){
  const delCol=viewMode==='grid'?'44px':'44px'
  if(isAdmin){
    return [
      '2.6fr',
      (fv.size||fv.days)?'108px':null,
      '1.3fr',
      '1.3fr',
      fv.source?'1.1fr':null,
      fv.status?'88px':null,
      delCol,
    ].filter(Boolean).join(' ')
  }
  return [
    '2.6fr',
    (fv.size||fv.days)?'108px':null,
    '1.6fr',
    fv.status?'88px':null,
    delCol,
  ].filter(Boolean).join(' ')
}

function downloadTemplate(){
  const wb=XLSX.utils.book_new()
  const ws=XLSX.utils.aoa_to_sheet([
    ['Category','Element','Size','Unit','Finish/Specs','Qty','Days','Internal Rate','Client Rate','Source'],
    ['Production','Stage 20x12ft','20x12','ft','Wooden platform, carpet top',1,2,85000,115000,'Sharma Fab'],
    ['Production','Arch Gate','9x16','ft','MS frame, flex facia',1,1,'','',''],
    ['Sound','Sound System','','nos','Line array, 250 pax',1,1,70000,125000,'ABC AV'],
    ['Manpower','Female Volunteers','','nos','Formals attire',4,1,2500,3500,''],
  ])
  ws['!cols']=[{wch:18},{wch:26},{wch:10},{wch:8},{wch:30},{wch:6},{wch:6},{wch:14},{wch:14},{wch:18}]
  XLSX.utils.book_append_sheet(wb,ws,'Elements')
  XLSX.writeFile(wb,'Myoozz_Template.xlsx')
}

function parseExcel(file,cb){
  const r=new FileReader()
  r.onload=e=>{
    const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'})
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''})
    const cats={},col={};let cat='General',hdr=false
    rows.forEach(row=>{
      const v=row.map(x=>String(x).trim())
      if(!v.some(x=>x)) return
      if(!hdr){
        const l=v.map(x=>x.toLowerCase())
        if(l.some(x=>x.includes('element')||x.includes('item')||x.includes('particular'))){
          hdr=true
          l.forEach((x,i)=>{
            if(x.includes('element')||x.includes('item')||x.includes('particular')) col.name=i
            if(x.includes('size')) col.size=i
            if(x.includes('finish')||x.includes('spec')||x.includes('remark')) col.finish=i
            if(x.includes('qty')||x.includes('quantity')||x.includes('nos')) col.qty=i
            if(x.includes('day')) col.days=i
            if(x.includes('amount')||x.includes('rate')||x.includes('cost')||x.includes('price')){
              if(col.rate===undefined) col.rate=i; else if(col.internal===undefined) col.internal=i
            }
            if(x.includes('source')||x.includes('vendor')) col.source=i
          }); return
        }
      }
      const first=v[0]||''
      if(first&&v.slice(1).every(x=>!x)&&first.length<60){cat=first;return}
      const name=col.name!==undefined?v[col.name]:(v[1]||v[0])
      if(!name) return
      if(!cats[cat]) cats[cat]=[]
      cats[cat].push({
        element_name:name,
        size:col.size!==undefined?String(v[col.size]||'').trim():'',size_unit:'ft',
        finish:col.finish!==undefined?v[col.finish]:'',
        qty:col.qty!==undefined?(parseFloat(v[col.qty])||1):1,
        days:col.days!==undefined?(parseFloat(v[col.days])||1):1,
        rate:col.rate!==undefined?(parseFloat(String(v[col.rate]).replace(/[^0-9.]/g,''))||0):0,
        internal_rate:col.internal!==undefined?(parseFloat(String(v[col.internal]).replace(/[^0-9.]/g,''))||0):0,
        source:col.source!==undefined?v[col.source]:'',
        lump_sum:false,internal_lump:false,amount:0,internal_amount:0,
        cost_status:'Estimated',bundled:false,is_option:false,option_group:null,
      })
    })
    cb(Object.entries(cats).filter(([,i])=>i.length>0)
      .map(([name,items])=>({name,bundled:false,bundle_amt:0,original_amt:0,
        items:items.map((el,i)=>({...el,id:'new-'+Date.now()+i}))})))
  }
  r.readAsArrayBuffer(file)
}

function parsePaste(text){
  const lines=text.trim().split('\n').filter(l=>l.trim())
  const cats={};let cat='General'
  lines.forEach(line=>{
    const cols=line.split('\t').map(c=>c.trim())
    if(cols.filter(c=>c).length===1&&cols[0]&&cols[0].length<60&&isNaN(parseFloat(cols[0]))){cat=cols[0];return}
    const name=cols[0]||''; if(!name) return
    if(!cats[cat]) cats[cat]=[]
    const nums=cols.slice(1).map(c=>parseFloat(c.replace(/[^0-9.]/g,''))).filter(n=>!isNaN(n)&&n>0)
    const textCols=cols.slice(1).filter(c=>c&&isNaN(parseFloat(c.replace(/[^0-9.]/g,''))))
    cats[cat].push({
      element_name:name,size:textCols[0]||'',size_unit:'ft',finish:textCols[1]||'',qty:1,days:1,
      rate:nums.find(n=>n>=1000)||0,internal_rate:0,source:'',
      lump_sum:false,internal_lump:false,amount:0,internal_amount:0,
      cost_status:'Estimated',bundled:false,is_option:false,option_group:null,
    })
  })
  return Object.entries(cats).filter(([,i])=>i.length>0)
    .map(([name,items])=>({name,bundled:false,bundle_amt:0,original_amt:0,
      items:items.map((el,i)=>({...el,id:'new-'+Date.now()+'-'+i}))}))
}

// ─────────────────────────────────────────────
// LUMP TOGGLE — Phase F refactor (replaces modeToggle fn)
// Props: isLump, onUnit, onLump, muted
// muted=true → gray active state (used for internal cost)
// ─────────────────────────────────────────────
function LumpToggle({ isLump, onUnit, onLump, muted }){
  const activeBg   = muted ? '#D1D5DB' : 'white'
  const activeClr  = muted ? '#374151' : 'var(--text)'
  const inactiveClr= muted ? '#9CA3AF' : '#9CA3AF'
  return(
    <div style={{display:'flex',gap:'0',marginTop:'2px',background:'#F3F4F6',borderRadius:'4px',padding:'2px',width:'fit-content'}}>
      <button onClick={onUnit} style={{
        padding:'1px 7px',fontSize:'10px',fontFamily:'var(--font-body)',
        background:!isLump?activeBg:'none',
        color:!isLump?activeClr:inactiveClr,
        border:'none',borderRadius:'3px',cursor:'pointer',
        boxShadow:!isLump?'0 1px 2px rgba(0,0,0,0.08)':'none',
        fontWeight:!isLump?500:400,transition:'all 0.1s',
      }}>Unit</button>
      <button onClick={onLump} style={{
        padding:'1px 7px',fontSize:'10px',fontFamily:'var(--font-body)',
        background:isLump?activeBg:'none',
        color:isLump?activeClr:inactiveClr,
        border:'none',borderRadius:'3px',cursor:'pointer',
        boxShadow:isLump?'0 1px 2px rgba(0,0,0,0.08)':'none',
        fontWeight:isLump?500:400,transition:'all 0.1s',
      }}>Lump</button>
    </div>
  )
}

// ─────────────────────────────────────────────
// CARD MODE SUB-LABEL
// ─────────────────────────────────────────────
const subLabel=(text)=>(
  <div style={{fontSize:'10px',color:'var(--text-tertiary)',marginBottom:'2px',letterSpacing:'0.3px'}}>{text}</div>
)

// Card mode input style (unchanged from before)
const inp=(amber,locked)=>({
  width:'100%',fontSize:'13px',padding:'6px 8px',
  border:'0.5px solid '+(amber?'#F59E0B':'var(--border)'),
  borderRadius:'4px',
  background:locked?'var(--bg-secondary)':amber?'#FFFBEB':'var(--bg)',
  color:amber?'#92400E':'var(--text)',
  fontFamily:'var(--font-body)',outline:'none',
  boxSizing:'border-box',minWidth:0,
})

// Grid mode input style
const ginp=(isInternal)=>({
  width:'100%',fontSize:'13px',padding:'5px 8px',
  border:'none',borderRadius:0,
  background:'transparent',
  color:isInternal?'#6B7280':'var(--text)',
  fontFamily:'var(--font-body)',outline:'none',
  boxSizing:'border-box',minWidth:0,height:'100%',
})

// ─────────────────────────────────────────────
// ELEMENT ROW — supports card + grid mode via viewMode prop
// ─────────────────────────────────────────────
function ElementRow({ el, isAdmin, locked, onUpdate, onSave, onDelete, onCycleStatus, otherCategories, onMove, fieldVis, viewMode, onMarkAsOption, rowIndex, rateCards, city }){
  const fv=fieldVis||{days:true,source:true,status:true,size:true,finish:true}
  const w=useWindowSize()
  const isMobile=w<768
  const sc=STATUS_STYLES[el.cost_status]||STATUS_STYLES['Estimated']
  const clientAmt=calcClient(el)
  const internalAmt=calcInternal(el)
  const margin=clientAmt-internalAmt
  const isSaved=el.id&&!el.id.startsWith('new-')
  const isGrid=viewMode==='grid'

  const [rateSuggestion,setRateSuggestion]=useState(null)
  const getRateSuggestion=useCallback(async(elementName,category,eventCity)=>{
    if(!elementName||!category) return null
    const cityToUse=eventCity||'Pan-India'
    let{data}=await supabase.from('rate_cards').select('rate_min,rate_max').eq('category',category).ilike('city',cityToUse).ilike('element_name',`%${elementName}%`)
    if(!data||data.length===0){
      ({data}=await supabase.from('rate_cards').select('rate_min,rate_max').eq('category',category).ilike('location_scope','pan-india').ilike('element_name',`%${elementName}%`))
    }
    if(!data||data.length===0) return null
    const sources=data.length
    const marketFloor=Math.min(...data.map(r=>r.rate_min).filter(v=>v!=null))
    const marketCeiling=Math.max(...data.map(r=>r.rate_max).filter(v=>v!=null))
    if(!isFinite(marketFloor)||!isFinite(marketCeiling)) return null
    return{marketFloor,marketCeiling,sources}
  },[])
  useEffect(()=>{
    if(!el.internal_lump){getRateSuggestion(el.element_name,el.category,city).then(setRateSuggestion)}
    else{setRateSuggestion(null)}
  },[el.element_name,el.category,city,el.internal_lump,getRateSuggestion])

  // ── GRID MODE ──
  if(isGrid&&!isMobile){
    const cols=getColTemplate(isAdmin,fv,'grid')
    const zebra=rowIndex%2===0?'white':'#FAFAFA'
    // Cell style: borderRight between cells
    const cell=(hasLeftBorder,isLast,extraStyle={})=>({
      borderRight:isLast?'none':'0.5px solid var(--border)',
      borderLeft:hasLeftBorder?'2px solid #E5E7EB':'none',
      display:'flex',alignItems:'center',
      padding:'0',overflow:'hidden',
      ...extraStyle,
    })
    return(
      <div style={{display:'grid',gridTemplateColumns:cols,alignItems:'stretch',borderBottom:'1px solid var(--border)',background:zebra,minHeight:'44px'}}>
        {/* Element name + Finish/Specs — merged, wraps naturally */}
        <div style={{...cell(false,false),flexDirection:'column',alignItems:'stretch',padding:'5px 0',gap:'2px'}}>
          <input style={{...ginp(false),fontWeight:500,whiteSpace:'normal',wordBreak:'break-word',height:'auto',minHeight:'22px',lineHeight:'1.3'}}
            placeholder="Element name" value={el.element_name}
            disabled={locked}
            onChange={e=>onUpdate('element_name',e.target.value)} onBlur={onSave}
          />
          <input style={{...ginp(false),whiteSpace:'normal',wordBreak:'break-word',height:'auto',minHeight:'18px',fontSize:'11px',color:'var(--text-secondary)',lineHeight:'1.3'}} placeholder="Finish / specs…" value={el.finish}
            disabled={locked}
            onChange={e=>onUpdate('finish',e.target.value)} onBlur={onSave}
          />
        </div>

        {/* Size · Qty · Days — stacked with labels */}
        {(fv.size||fv.days)&&(
          <div style={{...cell(false,false),padding:'5px 6px',gap:'4px',flexDirection:'column',alignItems:'stretch',justifyContent:'center'}}>
            {fv.size&&(
              <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                <span style={{fontSize:'10px',color:'var(--text-tertiary)',width:'28px',flexShrink:0,fontWeight:500,letterSpacing:'0.2px'}}>SIZE</span>
                <input style={{...ginp(false),width:'36px',fontSize:'12px',flex:'0 0 auto'}}
                  placeholder="—" value={el.size} disabled={locked}
                  onChange={e=>onUpdate('size',e.target.value)} onBlur={onSave}
                />
                <select value={el.size_unit||'ft'} disabled={locked}
                  onChange={e=>{onUpdate('size_unit',e.target.value);onSave()}}
                  style={{fontSize:'10px',padding:'2px 2px',border:'0.5px solid var(--border)',borderRadius:'3px',background:'var(--bg)',color:'var(--text-secondary)',fontFamily:'var(--font-body)',flex:'1 1 auto',minWidth:0,cursor:'pointer'}}
                >
                  {SIZE_UNITS.map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
            )}
            <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
              <span style={{fontSize:'10px',color:'var(--text-tertiary)',width:'28px',flexShrink:0,fontWeight:500,letterSpacing:'0.2px'}}>QTY</span>
              <input style={{...ginp(false),width:'40px',fontSize:'12px',textAlign:'center',flex:'0 0 auto'}}
                type="number" min="1" value={el.qty} disabled={locked}
                onChange={e=>onUpdate('qty',+e.target.value)} onBlur={onSave}
              />
            </div>
            {fv.days&&(
              <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                <span style={{fontSize:'10px',color:'var(--text-tertiary)',width:'28px',flexShrink:0,fontWeight:500,letterSpacing:'0.2px'}}>DAYS</span>
                <input style={{...ginp(false),width:'40px',fontSize:'12px',textAlign:'center',flex:'0 0 auto'}}
                  type="number" min="1" value={el.days} disabled={locked}
                  onChange={e=>onUpdate('days',+e.target.value)} onBlur={onSave}
                />
              </div>
            )}
          </div>
        )}

        {/* Client cost */}
        <div style={{...cell(false,false),flexDirection:'column',alignItems:'stretch',padding:'5px 8px',gap:'2px',justifyContent:'center'}}>
          <input style={{...ginp(false),fontWeight:500,fontSize:'13px'}}
            type="number" min="0"
            placeholder={locked?'Actuals':el.lump_sum?'Total':'Rate'}
            value={locked?'':(el.lump_sum?(el.amount||''):(el.rate||''))}
            disabled={locked}
            onChange={e=>onUpdate(el.lump_sum?'amount':'rate',+e.target.value)} onBlur={onSave}
          />
          {!locked&&(
            <LumpToggle isLump={el.lump_sum}
              onUnit={()=>{onUpdate('lump_sum',false);onSave()}}
              onLump={()=>{onUpdate('lump_sum',true);onSave()}}
              muted={false}
            />
          )}
          {!locked&&clientAmt>0&&(
            <div style={{fontSize:'11px',color:'var(--text-secondary)',fontWeight:500,marginTop:'1px'}}>= {fmt(clientAmt)}</div>
          )}
          {locked&&<div style={{fontSize:'10px',color:'#1E40AF'}}>On actuals</div>}
        </div>

        {/* Internal cost — admin only */}
        {isAdmin&&(
          <div style={{...cell(true,!fv.source&&!fv.status,{flexDirection:'column',alignItems:'stretch',padding:'5px 8px',gap:'2px',justifyContent:'center'})}}>
            <input style={ginp(true)}
              type="number" min="0"
              placeholder={el.internal_lump?'Total':'Rate'}
              value={el.internal_lump?(el.internal_amount||''):(el.internal_rate||'')}
              onChange={e=>onUpdate(el.internal_lump?'internal_amount':'internal_rate',+e.target.value)} onBlur={onSave}
            />
            <LumpToggle isLump={el.internal_lump}
              onUnit={()=>{onUpdate('internal_lump',false);onSave()}}
              onLump={()=>{onUpdate('internal_lump',true);onSave()}}
              muted={true}
            />
            {rateSuggestion&&(<span style={{display:'inline-block',fontSize:'9px',fontWeight:600,padding:'2px 7px',borderRadius:'3px',marginTop:'3px',background:rateSuggestion.sources>=3?'#e6f4ec':'#e8e4dc',color:rateSuggestion.sources>=3?'#1a6b3a':'#7a7060',letterSpacing:'0.3px'}}>Market range ₹{rateSuggestion.marketFloor.toLocaleString('en-IN')} – ₹{rateSuggestion.marketCeiling.toLocaleString('en-IN')} · {rateSuggestion.sources} source{rateSuggestion.sources!==1?'s':''}</span>)}
            {!rateSuggestion&&!isAdmin&&!el.internal_lump&&<span onClick={async()=>{const{data:{user}}=await supabase.auth.getUser();if(user){const{data:u}=await supabase.from('users').select('id,full_name').eq('id',user.id).single();if(u)createRateCardRequestNotification({requestingUser:u,elementName:el.element_name,category:el.category,eventId:el.event_id})}}} style={{fontSize:'9px',marginTop:'2px',color:'#9ca3af',cursor:'pointer',display:'block'}}>Ask for rates</span>}
            {internalAmt>0&&(
              <div style={{fontSize:'11px',color:'#6B7280',fontWeight:500,marginTop:'1px'}}>= {fmt(internalAmt)}</div>
            )}
            {clientAmt>0&&internalAmt>0&&(
              <div style={{
                display:'inline-flex',alignItems:'center',marginTop:'3px',
                fontSize:'10px',fontWeight:600,padding:'2px 7px',borderRadius:'20px',width:'fit-content',
                background:margin>0?'#D1FAE5':margin===0?'#FEF3C7':'#FECACA',
                color:margin>0?'#065F46':margin===0?'#92400E':'#A32D2D',
              }}>
                {Math.round((margin/clientAmt)*100)}% margin
              </div>
            )}
          </div>
        )}

        {/* Source — admin only */}
        {isAdmin&&fv.source&&(
          <div style={cell(true,!fv.status,{flexDirection:'column',alignItems:'stretch',padding:'5px 8px',justifyContent:'center'})}>
            <input style={ginp(true)} placeholder="Vendor" value={el.source||''}
              onChange={e=>onUpdate('source',e.target.value)} onBlur={onSave}
            />
          </div>
        )}

        {/* Status */}
        {fv.status&&(
          <div style={{...cell(false,false),padding:'4px',justifyContent:'center'}}>
            <button onClick={onCycleStatus}
              style={{width:'100%',padding:'5px 3px',fontSize:'10px',fontWeight:500,background:sc.bg,color:sc.color,border:'none',borderRadius:'4px',cursor:'pointer',fontFamily:'var(--font-body)',textAlign:'center'}}
            >{el.cost_status}</button>
          </div>
        )}

        {/* Delete + alt */}
        <div style={{...cell(false,true,{flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'2px',padding:'4px 0'})}}>
          <button onClick={onDelete}
            style={{background:'none',border:'1px solid #bc1723',borderRadius:'3px',cursor:'pointer',fontSize:'11px',color:'#bc1723',padding:'2px 4px',lineHeight:1}}
          >✕</button>
          {isSaved&&(
            <button onClick={onMarkAsOption} title="Move to alternates — not in budget"
              style={{background:'none',border:'none',cursor:'pointer',fontSize:'9px',color:'var(--text-tertiary)',padding:'1px 3px',lineHeight:1,fontFamily:'var(--font-body)'}}
              onMouseOver={e=>e.currentTarget.style.color='#bc1723'}
              onMouseOut={e=>e.currentTarget.style.color='var(--text-tertiary)'}
            >alt</button>
          )}
        </div>
      </div>
    )
  }

  // ── CARD MODE (original layout) ──
  const cols=isMobile?'1fr 1fr':isAdmin
    ?'2fr 1.6fr 1.2fr 1.2fr 1.2fr 1.2fr 72px 44px'
    :'2fr 1.6fr 1.2fr 1.6fr 72px 44px'

  return(
    <div style={{
      display:'grid',gridTemplateColumns:cols,
      gap:'6px',alignItems:'start',
      padding:'8px 14px',borderBottom:'0.5px solid var(--border)',
    }}
    onMouseOver={e=>e.currentTarget.style.background='var(--bg-secondary)'}
    onMouseOut={e=>e.currentTarget.style.background='none'}
    >
      {/* Element name */}
      <div>
        {subLabel('Element')}
        <input style={{...inp(false,locked),fontWeight:500}}
          placeholder="Element name" value={el.element_name}
          title="Name of this element" disabled={locked}
          onChange={e=>onUpdate('element_name',e.target.value)} onBlur={onSave}
        />
      </div>

      {/* Finish */}
      <div>
        {subLabel('Finish / specs')}
        <input style={inp(false,locked)}
          placeholder="Material, specs, details…" value={el.finish}
          disabled={locked}
          onChange={e=>onUpdate('finish',e.target.value)} onBlur={onSave}
        />
      </div>

      {/* Size · Qty · Days */}
      <div>
        {subLabel('Size · Qty · Days')}
        <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
          <input style={{...inp(false,locked),width:'54px',fontSize:'12px',padding:'6px 5px'}}
            placeholder="Size" value={el.size} disabled={locked}
            onChange={e=>onUpdate('size',e.target.value)} onBlur={onSave}
          />

          <input style={{...inp(false,locked),width:'38px',fontSize:'12px',padding:'6px 4px',textAlign:'center'}}
            type="number" min="1" value={el.qty} disabled={locked}
            onChange={e=>onUpdate('qty',+e.target.value)} onBlur={onSave}
          />
          <input style={{...inp(false,locked),width:'38px',fontSize:'12px',padding:'6px 4px',textAlign:'center'}}
            type="number" min="1" value={el.days} disabled={locked}
            onChange={e=>onUpdate('days',+e.target.value)} onBlur={onSave}
          />
        </div>
      </div>

      {/* Client cost */}
      <div>
        {subLabel('Client cost')}
        <input style={{...inp(false,locked),fontWeight:500}}
          type="number" min="0"
          placeholder={locked?'On actuals':el.lump_sum?'Total (₹)':'Rate (₹)'}
          value={locked?'':(el.lump_sum?(el.amount||''):(el.rate||''))}
          disabled={locked}
          onChange={e=>onUpdate(el.lump_sum?'amount':'rate',+e.target.value)} onBlur={onSave}
        />
        {!locked&&(
          <LumpToggle isLump={el.lump_sum}
            onUnit={()=>{onUpdate('lump_sum',false);onSave()}}
            onLump={()=>{onUpdate('lump_sum',true);onSave()}}
            muted={false}
          />
        )}
        {!locked&&!el.lump_sum&&clientAmt>0&&(
          <div style={{fontSize:'11px',color:'var(--text-secondary)',marginTop:'2px',fontWeight:500}}>{fmt(clientAmt)}</div>
        )}
        {locked&&<div style={{fontSize:'11px',color:'#1E40AF',marginTop:'2px'}}>On actuals</div>}
      </div>

      {/* Internal cost — admin only */}
      {isAdmin&&(
        <div>
          {subLabel('Internal cost')}
          <input style={inp(true,false)}
            type="number" min="0"
            placeholder={el.internal_lump?'Total (₹)':'Rate (₹)'}
            value={el.internal_lump?(el.internal_amount||''):(el.internal_rate||'')}
            title="What you pay the vendor — never shown to client"
            onChange={e=>onUpdate(el.internal_lump?'internal_amount':'internal_rate',+e.target.value)} onBlur={onSave}
          />
          <LumpToggle isLump={el.internal_lump}
            onUnit={()=>{onUpdate('internal_lump',false);onSave()}}
            onLump={()=>{onUpdate('internal_lump',true);onSave()}}
            muted={true}
          />
          {rateSuggestion&&(<span style={{display:'inline-block',fontSize:'9px',fontWeight:600,padding:'2px 7px',borderRadius:'3px',marginTop:'3px',background:rateSuggestion.sources>=3?'#e6f4ec':'#e8e4dc',color:rateSuggestion.sources>=3?'#1a6b3a':'#7a7060',letterSpacing:'0.3px'}}>Market range ₹{rateSuggestion.marketFloor.toLocaleString('en-IN')} – ₹{rateSuggestion.marketCeiling.toLocaleString('en-IN')} · {rateSuggestion.sources} source{rateSuggestion.sources!==1?'s':''}</span>)}
          {!rateSuggestion&&!isAdmin&&!el.internal_lump&&<span onClick={async()=>{const{data:{user}}=await supabase.auth.getUser();if(user){const{data:u}=await supabase.from('users').select('id,full_name').eq('id',user.id).single();if(u)createRateCardRequestNotification({requestingUser:u,elementName:el.element_name,category:el.category,eventId:el.event_id})}}} style={{fontSize:'9px',marginTop:'2px',color:'#9ca3af',cursor:'pointer',display:'block'}}>Ask for rates</span>}
          {!el.internal_lump&&internalAmt>0&&(
            <div style={{fontSize:'11px',color:'#92400E',marginTop:'2px',fontWeight:500}}>{fmt(internalAmt)}</div>
          )}
        </div>
      )}

      {/* Source — admin only */}
      {isAdmin&&fv.source&&(
        <div>
          {subLabel('Source / vendor')}
          <input style={inp(true,false)}
            placeholder="Vendor name" value={el.source||''}
            onChange={e=>onUpdate('source',e.target.value)} onBlur={onSave}
          />
          {isAdmin&&clientAmt>0&&(+(el.internal_rate)||+(el.internal_amount))>0&&(
            <div style={{fontSize:'11px',marginTop:'2px',fontWeight:500,color:margin>0?'#065F46':margin===0?'#92400E':'#A32D2D'}}>
              Margin: {fmt(margin)} ({Math.round((margin/clientAmt)*100)}%)
            </div>
          )}
          {isAdmin&&clientAmt>0&&!((+(el.internal_rate)||+(el.internal_amount))>0)&&(
            <div style={{fontSize:'11px',marginTop:'2px',color:'#92400E',fontWeight:500}}>Margin: ₹0 — add internal cost</div>
          )}
        </div>
      )}

      {/* Status */}
      {fv.status&&(
        <div>
          {subLabel('Status')}
          <button onClick={onCycleStatus}
            style={{width:'100%',padding:'6px 4px',fontSize:'11px',fontWeight:500,background:sc.bg,color:sc.color,border:'none',borderRadius:'4px',cursor:'pointer',fontFamily:'var(--font-body)',textAlign:'center'}}
          >{el.cost_status}</button>
          {otherCategories&&otherCategories.length>0&&(
            <select value="" onChange={e=>{if(e.target.value&&onMove)onMove(e.target.value)}}
              title="Move to another category"
              style={{width:'100%',fontSize:'10px',padding:'2px 4px',marginTop:'3px',border:'0.5px solid var(--border)',borderRadius:'3px',background:'none',color:'var(--text-tertiary)',fontFamily:'var(--font-body)',cursor:'pointer'}}
            >
              <option value="">Move to →</option>
              {otherCategories.map(oc=><option key={oc.name} value={oc.name}>{oc.name}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Delete + alt */}
      <div style={{paddingTop:'18px',display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
        <button onClick={onDelete}
          style={{background:'none',border:'1px solid #bc1723',borderRadius:'3px',cursor:'pointer',fontSize:'11px',color:'#bc1723',padding:'3px 5px',lineHeight:1}}
        >✕</button>
        {isSaved&&(
          <button onClick={onMarkAsOption} title="Move to alternates — not in budget"
            style={{background:'none',border:'none',cursor:'pointer',fontSize:'9px',color:'var(--text-tertiary)',padding:'1px 3px',lineHeight:1,fontFamily:'var(--font-body)'}}
            onMouseOver={e=>e.currentTarget.style.color='#bc1723'}
            onMouseOut={e=>e.currentTarget.style.color='var(--text-tertiary)'}
          >alt</button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// OPTION ROW — read-only row in Alternates section
// ─────────────────────────────────────────────
function OptionRow({ el, onBack, onConfirm, onDelete }){
  const clientAmt=calcClient(el)
  return(
    <div style={{
      display:'flex',alignItems:'center',gap:'10px',
      padding:'7px 14px',
      background:'#FAFAFA',
      borderBottom:'0.5px solid var(--border)',
      flexWrap:'wrap',
    }}>
      <span style={{flex:'2',fontSize:'12px',color:'var(--text-secondary)',fontStyle:'italic',minWidth:'120px'}}>
        {el.element_name||'—'}
      </span>
      <span style={{flex:'1.4',fontSize:'12px',color:'var(--text-tertiary)',minWidth:'80px'}}>{el.finish||''}</span>
      <span style={{fontSize:'12px',color:'var(--text-tertiary)',flexShrink:0,whiteSpace:'nowrap'}}>
        {el.qty&&el.qty>1?`${el.qty}×`:''}{el.days&&el.days>1?` ${el.days}d`:''}
      </span>
      <span style={{fontSize:'12px',color:'var(--text-secondary)',flexShrink:0,fontWeight:500}}>
        {clientAmt>0?fmt(clientAmt):'—'}
      </span>
      <div style={{display:'flex',gap:'6px',flexShrink:0,marginLeft:'auto'}}>
        <button onClick={()=>onBack(el.id)}
          style={{fontSize:'11px',padding:'3px 10px',background:'none',border:'0.5px solid var(--border-strong)',borderRadius:'3px',cursor:'pointer',color:'var(--text)',fontFamily:'var(--font-body)'}}
        >← Back</button>
        <button onClick={()=>onConfirm(el.id,el.option_group)}
          style={{fontSize:'11px',padding:'3px 10px',background:'var(--text)',color:'var(--bg)',border:'none',borderRadius:'3px',cursor:'pointer',fontFamily:'var(--font-body)',fontWeight:500}}
        >✓ Confirm</button>
        <button onClick={()=>onDelete(el.id,el.element_name)}
          style={{background:'none',border:'none',cursor:'pointer',fontSize:'13px',color:'var(--text-tertiary)',padding:'2px 4px'}}
          onMouseOver={e=>e.currentTarget.style.color='#A32D2D'}
          onMouseOut={e=>e.currentTarget.style.color='var(--text-tertiary)'}
        >✕</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// CATEGORY DEFAULTS BAND — Phase F
// Appears between header and column headers when expanded
// ─────────────────────────────────────────────
function CategoryDefaultsBand({ catName, defaults, onChangeDefault }){
  const d=defaults||{}
  return(
    <div style={{background:'var(--bg-secondary)',borderBottom:'0.5px solid var(--border)',padding:'6px 14px',display:'flex',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
      <span style={{fontSize:'10px',color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.4px',fontWeight:500,flexShrink:0}}>
        Defaults for new rows
      </span>
      <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
        <span style={{fontSize:'11px',color:'var(--text-tertiary)'}}>Unit</span>
        <select
          value={d.size_unit||'ft'}
          onChange={e=>onChangeDefault(catName,'size_unit',e.target.value)}
          style={{fontSize:'12px',padding:'2px 6px',border:'0.5px solid var(--border)',borderRadius:'4px',background:'var(--bg)',color:'var(--text)',fontFamily:'var(--font-body)',cursor:'pointer',outline:'none'}}
        >
          {SIZE_UNITS.map(u=><option key={u}>{u}</option>)}
        </select>
        <span style={{fontSize:'11px',color:'var(--text-tertiary)'}}>Qty</span>
        <input type="number" min="1" value={d.qty||1}
          onChange={e=>onChangeDefault(catName,'qty',Math.max(1,+e.target.value))}
          style={{width:'44px',fontSize:'12px',padding:'2px 6px',border:'0.5px solid var(--border)',borderRadius:'4px',background:'var(--bg)',color:'var(--text)',fontFamily:'var(--font-body)',textAlign:'center',outline:'none'}}
        />
        <span style={{fontSize:'11px',color:'var(--text-tertiary)'}}>Days</span>
        <input type="number" min="1" value={d.days||1}
          onChange={e=>onChangeDefault(catName,'days',Math.max(1,+e.target.value))}
          style={{width:'44px',fontSize:'12px',padding:'2px 6px',border:'0.5px solid var(--border)',borderRadius:'4px',background:'var(--bg)',color:'var(--text)',fontFamily:'var(--font-body)',textAlign:'center',outline:'none'}}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// CATEGORY BLOCK — Phase F: reorder buttons, defaults band, alternates section
// ─────────────────────────────────────────────
function CategoryBlock({
  cat, isAdmin, onUpdateCat, onAddElement, onUpdateEl, onSaveEl, onDeleteEl,
  onCycleStatus, onDelete, onMerge, onRename, otherCategories, onMoveElement,
  fieldVis, teamUsers, viewMode,
  isFirst, isLast, onMoveUp, onMoveDown,
  catDefaults, onCatDefaultChange,
  onMarkAsOption, onOptionBack, onOptionConfirm,
  rateCards,
  city,
}){
  const [open,setOpen]=useState(false)
  const [showMerge,setShowMerge]=useState(false)
  const [editingName,setEditingName]=useState(false)
  const [nameVal,setNameVal]=useState(cat.name)
  const nameRef=useRef(null)

  useEffect(()=>{ setNameVal(cat.name) },[cat.name])

  const fv=fieldVis||{days:true,source:true,status:true,size:true,finish:true}
  const isGrid=viewMode==='grid'

  // Split items: main list vs alternates
  const mainItems=cat.items.filter(el=>!el.is_option)
  const optionItems=cat.items.filter(el=>el.is_option)

  const catClientTotal=cat.bundled
    ?(cat.bundle_amt||0)
    :mainItems.reduce((s,el)=>s+calcClient(el),0)
  const catInternalTotal=mainItems.reduce((s,el)=>s+calcInternal(el),0)
  const autoSum=mainItems.reduce((s,el)=>s+calcClient(el),0)

  // Column header labels (shared between card and grid, styled differently)
  const headerLabels=[
    'Element · Finish / Specs',
    (fv.size||fv.days)?'Size · Qty · Days':null,
    'Client cost',
    isAdmin?'Internal cost':null,
    isAdmin&&fv.source?'Source / vendor':null,
    fv.status?'Status':null,
    '',
  ].filter(Boolean)

  const colsForHeaders=getColTemplate(isAdmin,fv,viewMode)

  return(
    <div style={{
      border:isGrid?'1px solid var(--border)':'0.5px solid var(--border)',
      borderRadius:isGrid?'4px':'var(--radius-sm)',
      marginBottom:'8px',overflow:'hidden',
    }}>

      {/* ── CATEGORY HEADER ── */}
      <div style={{
        display:'flex',alignItems:'center',gap:'8px',
        padding:'10px 14px',
        background:open?'var(--bg-secondary)':'var(--bg)',
        cursor:'pointer',
        borderBottom:open?'0.5px solid var(--border)':'none',
      }}>
        {/* Collapse toggle */}
        <button onClick={()=>setOpen(!open)}
          style={{width:'26px',height:'26px',display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'1px solid #d8d2c8',borderRadius:'4px',cursor:'pointer',fontSize:'11px',color:'var(--text-tertiary)',padding:0,flexShrink:0}}
        >{open?'▾':'▸'}</button>

        {/* Reorder — Phase F */}
        <div style={{display:'flex',gap:'2px',flexShrink:0}} onClick={e=>e.stopPropagation()}>
          <button onClick={onMoveUp} disabled={isFirst} title="Move category up"
            style={{width:'22px',height:'22px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',background:'none',border:'0.5px solid '+(isFirst?'var(--border)':'var(--border-strong)'),borderRadius:'3px',cursor:isFirst?'default':'pointer',color:isFirst?'var(--text-tertiary)':'var(--text)',padding:0,opacity:isFirst?0.4:1}}
          >↑</button>
          <button onClick={onMoveDown} disabled={isLast} title="Move category down"
            style={{width:'22px',height:'22px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',background:'none',border:'0.5px solid '+(isLast?'var(--border)':'var(--border-strong)'),borderRadius:'3px',cursor:isLast?'default':'pointer',color:isLast?'var(--text-tertiary)':'var(--text)',padding:0,opacity:isLast?0.4:1}}
          >↓</button>
        </div>

        {/* Editable category name */}
        {editingName?(
          <input
            ref={nameRef} value={nameVal} placeholder="Category name" autoFocus
            onClick={e=>e.stopPropagation()}
            onChange={e=>setNameVal(e.target.value)}
            onBlur={e=>{e.stopPropagation();onRename&&onRename(cat.name,nameVal);setEditingName(false)}}
            onKeyDown={e=>{
              if(e.key==='Enter'){onRename&&onRename(cat.name,nameVal);setEditingName(false)}
              if(e.key==='Escape') setEditingName(false)
            }}
            style={{flex:1,fontSize:'14px',fontWeight:500,background:'none',border:'none',outline:'none',color:'var(--text)',fontFamily:'var(--font-body)',borderBottom:'1px solid var(--text)'}}
          />
        ):(
          <span
            onClick={e=>{e.stopPropagation();setEditingName(true)}}
            title="Click to rename"
            style={{flex:1,fontSize:'14px',fontWeight:500,color:'var(--text)',cursor:'text',padding:'0 2px',borderBottom:'1px solid transparent'}}
          >{cat.name}</span>
        )}

        {/* Item count */}
        <span style={{fontSize:'12px',color:'var(--text-tertiary)',flexShrink:0}}>
          {mainItems.length} {mainItems.length===1?'item':'items'}
          {optionItems.length>0&&<span style={{color:'#bc1723',marginLeft:'4px'}}>+{optionItems.length} alt</span>}
        </span>

        {/* Category total */}
        {catClientTotal>0&&(
          <span style={{fontSize:'14px',fontWeight:500,color:'var(--text)',fontFamily:'var(--font-display)',flexShrink:0}}>
            {fmt(catClientTotal)}
          </span>
        )}
        {!open&&isAdmin&&catInternalTotal>0&&(
          <span style={{fontSize:'12px',color:'var(--text-tertiary)',flexShrink:0}}>
            int: {fmt(catInternalTotal)}
          </span>
        )}

        {/* Merge */}
        {otherCategories&&otherCategories.length>0&&(
          <div style={{position:'relative',flexShrink:0}} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setShowMerge(!showMerge)}
              title="Move all elements from this category into another. This category will be removed."
              style={{fontSize:'11px',padding:'3px 8px',background:'none',border:'1px solid #d8d2c8',borderRadius:'3px',cursor:'pointer',color:'#2c2518',fontFamily:'var(--font-body)'}}
            >Merge into →</button>
            {showMerge&&(
              <div style={{position:'absolute',right:0,top:'100%',marginTop:'4px',background:'var(--bg)',border:'0.5px solid var(--border-strong)',borderRadius:'var(--radius-sm)',padding:'8px',zIndex:50,minWidth:'200px',boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}>
                <p style={{fontSize:'11px',color:'var(--text-tertiary)',marginBottom:'6px',fontWeight:500,lineHeight:1.4}}>Move all elements from <em>{cat.name}</em> into:</p>
                {otherCategories.map(oc=>(
                  <button key={oc.name} onClick={()=>{onMerge&&onMerge(cat.name,oc.name);setShowMerge(false)}}
                    style={{display:'block',width:'100%',textAlign:'left',padding:'6px 8px',fontSize:'12px',background:'none',border:'none',cursor:'pointer',color:'var(--text)',fontFamily:'var(--font-body)',borderRadius:'3px'}}
                    onMouseOver={e=>e.currentTarget.style.background='var(--bg-secondary)'}
                    onMouseOut={e=>e.currentTarget.style.background='none'}
                  >{oc.name}</button>
                ))}
                <button onClick={()=>setShowMerge(false)} style={{display:'block',width:'100%',textAlign:'left',padding:'4px 8px',fontSize:'11px',background:'none',border:'none',cursor:'pointer',color:'var(--text-tertiary)',fontFamily:'var(--font-body)',marginTop:'4px',borderTop:'0.5px solid var(--border)'}}>Cancel</button>
              </div>
            )}
          </div>
        )}

        {/* Bundle checkbox */}
        <label onClick={e=>e.stopPropagation()} title="Replaces individual line items with a single total in client documents. Set a custom amount to override the auto-sum." style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'12px',color:'var(--text-tertiary)',cursor:'pointer',flexShrink:0}}>
          <input type="checkbox" checked={cat.bundled}
            onChange={e=>{
              const bundling=e.target.checked
              onUpdateCat('bundled',bundling)
              if(bundling) onUpdateCat('bundle_amt',autoSum)
            }}
          />Bundle
        </label>

        {/* Delete category */}
        <button onClick={e=>{e.stopPropagation();onDelete()}} title="Remove category"
          style={{background:'none',border:'1px solid #bc1723',borderRadius:'3px',cursor:'pointer',fontSize:'11px',color:'#bc1723',padding:'2px 5px',lineHeight:1,flexShrink:0}}
        >✕</button>
      </div>

      {/* ── EXPANDED CONTENT ── */}
      {open&&(
        <>
          {/* Bundle override */}
          {cat.bundled&&(
            <div style={{padding:'8px 14px',background:'#FFFBEB',borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
              <span style={{fontSize:'12px',fontWeight:500,color:'#92400E'}}>Client sees one total:</span>
              <input type="number"
                style={{width:'160px',fontSize:'13px',padding:'5px 10px',border:'0.5px solid #F59E0B',borderRadius:'4px',background:'white',color:'#92400E',fontFamily:'var(--font-body)',outline:'none'}}
                value={cat.bundle_amt||''}
                placeholder={`Auto: ${fmt(autoSum)||'₹0'}`}
                onChange={e=>onUpdateCat('bundle_amt',+e.target.value)}
              />
              <span style={{fontSize:'11px',color:'#92400E',opacity:0.7}}>Auto-sum: {fmt(autoSum)||'₹0'} · Edit to override</span>
            </div>
          )}

          {/* Category Defaults Band — Phase F */}
          <CategoryDefaultsBand
            catName={cat.name}
            defaults={catDefaults}
            onChangeDefault={onCatDefaultChange}
          />

          {/* Column headers */}
          <div style={{
            display:'grid',gridTemplateColumns:colsForHeaders,gap:'6px',
            padding:'4px 14px',
            background:isGrid?'#F3F4F6':'var(--bg-secondary)',
            borderBottom:'0.5px solid var(--border)',
          }}>
            {headerLabels.map((h,i)=>(
              <div key={i} style={{
                fontSize:'10px',
                color:isGrid?'#6B7280':'var(--text-tertiary)',
                fontWeight:isGrid?600:500,
                textTransform:'uppercase',letterSpacing:'0.4px',
                padding:'3px 0',
              }}>{h}</div>
            ))}
          </div>

          {/* Empty state */}
          {mainItems.length===0&&(
            <div style={{padding:'20px 14px',textAlign:'center',color:'var(--text-tertiary)',fontSize:'13px'}}>
              No elements yet — click "+ Add element" below.
            </div>
          )}

          {/* Main element rows */}
          {mainItems.map((el,idx)=>(
            <ElementRow
              key={el.id} el={el} isAdmin={isAdmin}
              locked={el.cost_status==='Client scope'}
              otherCategories={otherCategories}
              teamUsers={teamUsers}
              fieldVis={fv}
              viewMode={viewMode}
              rowIndex={idx}
              rateCards={rateCards}
              city={city}
              onUpdate={(field,val)=>onUpdateEl(el.id,field,val)}
              onSave={()=>onSaveEl(el)}
              onDelete={()=>onDeleteEl(el.id,el.element_name)}
              onCycleStatus={()=>onCycleStatus(el.id)}
              onMove={toCat=>onMoveElement&&onMoveElement(el.id,toCat)}
              onMarkAsOption={()=>onMarkAsOption(el.id)}
            />
          ))}

          {/* Add element */}
          <div style={{padding:'8px 14px',borderTop:'0.5px solid var(--border)'}}>
            <button onClick={onAddElement}
              style={{fontSize:'12px',color:'#2c2518',background:'none',border:'1px solid #d8d2c8',borderRadius:'var(--radius-sm)',cursor:'pointer',fontFamily:'var(--font-body)',padding:'5px 12px'}}
            >+ Add element</button>
          </div>

          {/* ── ALTERNATES SECTION — Phase F ── */}
          {optionItems.length>0&&(
            <div style={{borderTop:'1px dashed var(--border)'}}>
              <div style={{padding:'6px 14px 4px',display:'flex',alignItems:'center',gap:'8px'}}>
                <span style={{fontSize:'11px',color:'var(--text-tertiary)',fontStyle:'italic'}}>
                  Alternates — {optionItems.length} option{optionItems.length!==1?'s':''} · not in budget
                </span>
              </div>
              {optionItems.map(el=>(
                <OptionRow
                  key={el.id} el={el}
                  onBack={()=>onOptionBack(el.id)}
                  onConfirm={()=>onOptionConfirm(el.id,el.option_group)}
                  onDelete={()=>onDeleteEl(el.id,el.element_name)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// CITY ELEMENTS — main per-city component
// Phase F: viewMode state, category_config, all new handlers
// ─────────────────────────────────────────────
function CityElements({ event, city, userRole, teamUsers }){
  const [categories,setCategories]=useState([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [catDefaults,setCatDefaults]=useState({})   // { catName: { size_unit, qty, days } }
  const [rateCards,setRateCards]=useState([])       // for internal rate suggestion pill
  const fileRef=useRef(null)
  const [showPaste,setShowPaste]=useState(false)
  const [pasteText,setPasteText]=useState('')
  const [pastePreview,setPastePreview]=useState([])
  const [deleteConfirm,setDeleteConfirm]=useState(null)
  const [categoryDeleteConfirm,setCategoryDeleteConfirm]=useState(null)
  const [showImport,setShowImport]=useState(false)
  const [showCategoryPicker,setShowCategoryPicker]=useState(false)
  const [showSheetSettings,setShowSheetSettings]=useState(false)
  const [activePill,setActivePill]=useState('__all__')
  const [highlightedCat,setHighlightedCat]=useState(null)
  const [fieldVis,setFieldVis]=useState(
    event?.field_visibility||{days:true,source:true,status:true,size:true,finish:true}
  )
  // Phase F: view mode — grid (default) or cards
  const [viewMode,setViewMode]=useState(()=>{
    try{ return localStorage.getItem('myoozz_element_view')||'grid' }catch{ return 'grid' }
  })

  const w=useWindowSize()
  const isAdmin=userRole==='admin'
  const eventCities=event.cities?.length>0?event.cities:['General']
  const isMultiCity=eventCities.length>1

  function toggleViewMode(){
    const next=viewMode==='grid'?'cards':'grid'
    setViewMode(next)
    try{ localStorage.setItem('myoozz_element_view',next) }catch{}
  }

  useEffect(()=>{ loadElements() },[event.id,city])
  useEffect(()=>{
    supabase.from('rate_cards').select('element_name,category,city,rate_min,rate_max,vendor_name,source,rate_type,location_scope').then(({data})=>{ if(data) setRateCards(data) })
  },[])

  // ── LOAD — reads bundle_config + category_config + applies saved order ──
  async function loadElements(){
    setLoading(true)
    const [{ data },{ data:evData }]=await Promise.all([
      supabase.from(isAdmin?'elements':'v_elements_safe').select('*').eq('event_id',event.id).eq('city',city).order('sort_order'),
      supabase.from('events').select('bundle_config,category_config').eq('id',event.id).single(),
    ])
    const bundleConfig=evData?.bundle_config||{}
    const cityBundle=bundleConfig[city]||{}
    const categoryConfig=evData?.category_config||{}
    const cityConfig=categoryConfig[city]||{}
    const savedOrder=cityConfig.order||[]
    const savedDefaults=cityConfig.defaults||{}
    setCatDefaults(savedDefaults)

    if(data&&data.length>0){
      const cats={}
      data.forEach(el=>{
        if(!cats[el.category]){
          const cb=cityBundle[el.category]||{}
          cats[el.category]={
            id:'cat-'+el.category,
            name:el.category,
            bundled:cb.bundled||false,
            bundle_amt:cb.bundle_amt||0,
            original_amt:0,
            items:[],
          }
        }
        cats[el.category].items.push(el)
      })
      let catArray=Object.values(cats)
      // Apply saved category order
      if(savedOrder.length>0){
        const ordered=[]
        savedOrder.forEach(n=>{ const f=catArray.find(c=>c.name===n); if(f) ordered.push(f) })
        catArray.forEach(c=>{ if(!savedOrder.includes(c.name)) ordered.push(c) })
        catArray=ordered
      }
      setCategories(catArray)
    } else {
      setCategories([])
    }
    setLoading(false)
  }

  // ── SAVE category_config (order + defaults) ──
  async function saveCategoryConfig(updater){
    const {data:ev}=await supabase.from('events').select('category_config').eq('id',event.id).single()
    const cc=ev?.category_config||{}
    if(!cc[city]) cc[city]={}
    updater(cc[city])
    await supabase.from('events').update({category_config:cc}).eq('id',event.id)
  }

  async function saveCategoryOrder(orderedNames){
    await saveCategoryConfig(cfg=>{ cfg.order=orderedNames })
  }

  async function saveCatDefault(catName,field,val){
    await saveCategoryConfig(cfg=>{
      if(!cfg.defaults) cfg.defaults={}
      if(!cfg.defaults[catName]) cfg.defaults[catName]={}
      cfg.defaults[catName][field]=val
    })
    setCatDefaults(prev=>({...prev,[catName]:{...(prev[catName]||{}),[field]:val}}))
  }

  function getCatDefaults(catName){
    const PAX_CATS = ['Group Travel', 'Team Travel']
    const d=catDefaults[catName]||{}
    if(PAX_CATS.includes(catName)){
      return{
        size_unit: d.size_unit || 'per pax',
        qty: d.qty !== undefined ? d.qty : '',
        days: d.days !== undefined ? d.days : 1
      }
    }
    return{ size_unit:d.size_unit||'ft', qty:d.qty||1, days:d.days||1 }
  }

  // ── SAVE ELEMENT ──
  async function saveEl(el){
    setSaving(true)
    const ca=calcClient(el),ia=calcInternal(el)
    const payload={
      event_id:event.id,city,category:el.category,
      element_name:el.element_name||'',size:el.size||'',size_unit:el.size_unit||'ft',
      finish:el.finish||'',qty:el.qty||1,days:el.days||1,
      rate:el.rate||0,lump_sum:el.lump_sum||false,amount:el.lump_sum?(el.amount||0):ca,
      internal_rate:el.internal_rate||0,internal_lump:el.internal_lump||false,
      internal_amount:el.internal_lump?(el.internal_amount||0):ia,
      source:el.source||'',cost_status:el.cost_status||'Estimated',
      bundled:el.bundled||false,sort_order:el.sort_order||0,
      is_option:el.is_option||false,option_group:el.option_group||null,
    }
    if(el.id&&!el.id.startsWith('new-')){
      await supabase.from('elements').update(payload).eq('id',el.id)
    } else {
      const {data}=await supabase.from('elements').insert(payload).select().single()
      if(data){
        setCategories(prev=>prev.map(cat=>cat.name!==el.category?cat:{
          ...cat,items:cat.items.map(e=>e.id===el.id?{...e,id:data.id}:e)
        }))
        try{ await logElementCreated(event.id,data.id,data.element_name) }catch{}
      }
    }
    setSaving(false)
  }

  function updateEl(catName,elId,field,val){
    setCategories(prev=>prev.map(cat=>cat.name!==catName?cat:{
      ...cat,items:cat.items.map(el=>el.id!==elId?el:{...el,[field]:val})
    }))
  }

  function cycleStatus(catName,elId){
    setCategories(prev=>prev.map(cat=>cat.name!==catName?cat:{
      ...cat,items:cat.items.map(el=>{
        if(el.id!==elId) return el
        const next=STATUS_OPTIONS[(STATUS_OPTIONS.indexOf(el.cost_status)+1)%STATUS_OPTIONS.length]
        const updated={...el,cost_status:next}
        saveEl({...updated,category:catName})
        return updated
      })
    }))
  }

  function deleteEl(catName,elId,elementName){
    if(elId.startsWith('new-')){
      setCategories(prev=>prev.map(cat=>cat.name!==catName?cat:{
        ...cat,items:cat.items.filter(el=>el.id!==elId)
      }))
      return
    }
    setDeleteConfirm({catName,elId,elementName})
  }

  async function doDelete(catName,elId,elementName,allCities){
    if(allCities){
      const {data:allMatches}=await supabase.from('elements').select('id')
        .eq('event_id',event.id).eq('category',catName).eq('element_name',elementName)
      if(allMatches){
        for(const match of allMatches){
          await supabase.from('elements').delete().eq('id',match.id)
        }
      }
    } else {
      await supabase.from('elements').delete().eq('id',elId)
    }
    try{ await logElementDeleted(event.id,elId,elementName) }catch{}
    setCategories(prev=>prev.map(cat=>cat.name!==catName?cat:{
      ...cat,items:cat.items.filter(el=>el.id!==elId)
    }))
    setDeleteConfirm(null)
  }

  async function clearAllElements(){
    if(!window.confirm('Clear ALL elements in '+city+'? This cannot be undone.')) return
    await supabase.from('elements').delete().eq('event_id',event.id).eq('city',city)
    setCategories([])
  }

  // ── BUNDLE CONFIG (persisted to events.bundle_config) ──
  async function saveBundleConfig(catName,updates){
    const {data:ev}=await supabase.from('events').select('bundle_config').eq('id',event.id).single()
    const bc=ev?.bundle_config||{}
    if(!bc[city]) bc[city]={}
    if(!bc[city][catName]) bc[city][catName]={}
    Object.assign(bc[city][catName],updates)
    await supabase.from('events').update({bundle_config:bc}).eq('id',event.id)
  }

  // ── ADD CATEGORY — reads suggestion items + logs ──
  async function addCategory(name){
    const id='cat-'+Date.now()
    const defaults=getCatDefaults(name)
    const suggestions=(CATEGORY_SUGGESTIONS[name]||[]).map((el,i)=>({
      id:'new-'+Date.now()+'-'+i,
      event_id:event.id,city,category:name,
      element_name:el.element_name,finish:el.finish||'',
      size:'',size_unit:defaults.size_unit,
      qty:defaults.qty,days:defaults.days,
      rate:0,lump_sum:false,amount:0,
      internal_rate:0,internal_lump:false,internal_amount:0,
      source:'',cost_status:'Estimated',bundled:false,sort_order:i,
      is_option:false,option_group:null,
    }))
    setCategories(prev=>[...prev,{id,name,bundled:false,bundle_amt:0,original_amt:0,items:suggestions}])
    setShowCategoryPicker(false)
    if(suggestions.length>0){
      setSaving(true)
      const savedItems=[]
      for(let i=0;i<suggestions.length;i++){
        const s=suggestions[i]
        const {data}=await supabase.from('elements').insert({
          event_id:event.id,city,category:name,
          element_name:s.element_name,finish:s.finish||'',
          size:'',size_unit:s.size_unit,qty:s.qty!==''?s.qty:null,days:s.days,
          rate:0,lump_sum:false,amount:0,
          internal_rate:0,internal_lump:false,internal_amount:0,
          source:'',cost_status:'Estimated',bundled:false,sort_order:i,
          is_option:false,option_group:null,
        }).select().single()
        savedItems.push(data?{...s,id:data.id}:s)
      }
      setCategories(prev=>prev.map(cat=>cat.name!==name?cat:{...cat,items:savedItems}))
      setSaving(false)
    }
    // Update order in category_config
    const newOrder=[...categories.map(c=>c.name),name]
    await saveCategoryOrder(newOrder)
    try{ await logCategoryAdded(event.id,name) }catch{}
  }

  // ── ADD ELEMENT — pre-fills from category defaults ──
  function addElement(catName){
    const defaults=getCatDefaults(catName)
    const newEl={
      id:'new-'+Date.now(),event_id:event.id,city,category:catName,
      element_name:'',size:'',size_unit:defaults.size_unit,finish:'',
      qty:defaults.qty,days:defaults.days,rate:0,lump_sum:false,amount:0,
      internal_rate:0,internal_lump:false,internal_amount:0,
      source:'',cost_status:'Estimated',bundled:false,sort_order:0,
      is_option:false,option_group:null,
    }
    setCategories(prev=>prev.map(cat=>cat.name!==catName?cat:{...cat,items:[...cat.items,newEl]}))
  }

  // ── REORDER CATEGORIES — Phase F ──
  function moveCategoryUp(catName){
    setCategories(prev=>{
      const idx=prev.findIndex(c=>c.name===catName)
      if(idx<=0) return prev
      const next=[...prev];[next[idx-1],next[idx]]=[next[idx],next[idx-1]]
      saveCategoryOrder(next.map(c=>c.name))
      return next
    })
  }

  function moveCategoryDown(catName){
    setCategories(prev=>{
      const idx=prev.findIndex(c=>c.name===catName)
      if(idx>=prev.length-1) return prev
      const next=[...prev];[next[idx],next[idx+1]]=[next[idx+1],next[idx]]
      saveCategoryOrder(next.map(c=>c.name))
      return next
    })
  }

  // ── OPTIONS / ALTERNATES — Phase F ──
  async function markAsOption(catName,elId){
    await supabase.from('elements').update({is_option:true,option_group:catName}).eq('id',elId)
    setCategories(prev=>prev.map(cat=>cat.name!==catName?cat:{
      ...cat,items:cat.items.map(el=>el.id!==elId?el:{...el,is_option:true,option_group:catName})
    }))
  }

  async function optionBack(catName,elId){
    await supabase.from('elements').update({is_option:false,option_group:null}).eq('id',elId)
    setCategories(prev=>prev.map(cat=>cat.name!==catName?cat:{
      ...cat,items:cat.items.map(el=>el.id!==elId?el:{...el,is_option:false,option_group:null})
    }))
  }

  async function optionConfirm(catName,elId,optionGroup){
    setCategories(prev=>prev.map(cat=>{
      if(cat.name!==catName) return cat
      const siblings=cat.items.filter(el=>el.is_option&&el.option_group===optionGroup&&el.id!==elId)
      // Delete siblings from DB
      siblings.forEach(sib=>{
        if(!sib.id.startsWith('new-')) supabase.from('elements').delete().eq('id',sib.id).then(()=>{})
      })
      // Confirm winner
      supabase.from('elements').update({is_option:false,option_group:null}).eq('id',elId).then(()=>{})
      return{
        ...cat,
        items:cat.items
          .filter(el=>!(el.is_option&&el.option_group===optionGroup&&el.id!==elId))
          .map(el=>el.id!==elId?el:{...el,is_option:false,option_group:null})
      }
    }))
  }

  function moveElement(elId,fromCat,toCat){
    supabase.from('elements').update({category:toCat}).eq('id',elId).then(()=>{})
    setCategories(prev=>{
      const el=prev.find(c=>c.name===fromCat)?.items.find(e=>e.id===elId)
      if(!el) return prev
      return prev.map(c=>{
        if(c.name===fromCat) return{...c,items:c.items.filter(e=>e.id!==elId)}
        if(c.name===toCat) return{...c,items:[...c.items,{...el,category:toCat}]}
        return c
      }).filter(c=>c.items.length>0||c.name===fromCat)
    })
  }

  async function mergeCategory(fromName,toName){
    const {data:els}=await supabase.from('elements').select('id')
      .eq('event_id',event.id).eq('city',city).eq('category',fromName)
    if(els&&els.length>0){
      await supabase.from('elements').update({category:toName})
        .eq('event_id',event.id).eq('city',city).eq('category',fromName)
    }
    setCategories(prev=>{
      const from=prev.find(c=>c.name===fromName)
      if(!from) return prev
      return prev.filter(c=>c.name!==fromName)
        .map(c=>c.name!==toName?c:{...c,items:[...c.items,...from.items.map(el=>({...el,category:toName}))]})
    })
  }

  async function renameCategory(oldName,newName){
    if(!newName.trim()||newName===oldName) return
    await supabase.from('elements').update({category:newName})
      .eq('event_id',event.id).eq('city',city).eq('category',oldName)
    setCategories(prev=>prev.map(c=>c.name!==oldName?c:{...c,name:newName}))
  }

  function updateCat(catName,field,val){
    setCategories(prev=>prev.map(cat=>{
      if(cat.name!==catName) return cat
      if(field==='bundled'&&!val){
        saveBundleConfig(catName,{bundled:false,bundle_amt:0})
        return{...cat,bundled:false,bundle_amt:0}
      }
      if(field==='bundled'||field==='bundle_amt'){
        saveBundleConfig(catName,{[field]:val})
      }
      return{...cat,[field]:val}
    }))
  }

  // ── FIELD VISIBILITY ──
  async function saveFieldVis(updated){
    setFieldVis(updated)
    await supabase.from('events').update({field_visibility:updated}).eq('id',event.id)
  }

  // ── BATCH SAVE (import / paste) ──
  async function saveAllParsed(parsedCats){
    setSaving(true)
    const result=[]
    for(const cat of parsedCats){
      if(!cat.id) cat.id='cat-'+Date.now()+'-'+Math.random()
      const newItems=[]
      for(let i=0;i<cat.items.length;i++){
        const el=cat.items[i]
        const {data}=await supabase.from('elements').insert({
          event_id:event.id,city,category:cat.name,
          element_name:el.element_name||'',size:el.size||'',size_unit:el.size_unit||'ft',
          finish:el.finish||'',qty:el.qty||1,days:el.days||1,
          rate:el.rate||0,lump_sum:false,amount:calcClient(el),
          internal_rate:el.internal_rate||0,internal_lump:false,
          internal_amount:calcInternal(el),source:el.source||'',
          cost_status:'Estimated',bundled:false,sort_order:i,
          is_option:false,option_group:null,
        }).select().single()
        newItems.push(data?{...el,id:data.id}:el)
      }
      result.push({...cat,items:newItems})
    }
    setSaving(false)
    return result
  }

  function handleFileUpload(e){
    const file=e.target.files[0]; if(!file) return
    parseExcel(file,async parsed=>{
      if(!parsed.length) return
      const saved=await saveAllParsed(parsed)
      setCategories(prev=>{
        const existing={...Object.fromEntries(prev.map(c=>[c.name,c]))}
        saved.forEach(cat=>{
          if(existing[cat.name]) existing[cat.name]={...existing[cat.name],items:[...existing[cat.name].items,...cat.items]}
          else existing[cat.name]=cat
        })
        return Object.values(existing)
      })
    })
    e.target.value=''
  }

  async function confirmPaste(){
    const saved=await saveAllParsed(pastePreview)
    setCategories(prev=>{
      const existing={...Object.fromEntries(prev.map(c=>[c.name,c]))}
      saved.forEach(cat=>{
        if(existing[cat.name]) existing[cat.name]={...existing[cat.name],items:[...existing[cat.name].items,...cat.items]}
        else existing[cat.name]=cat
      })
      return Object.values(existing)
    })
    setShowPaste(false);setPasteText('');setPastePreview([])
  }

  async function handleDownloadElementMaster(){
    const {exportElementMaster}=await import('../utils/excelExport')
    const {data:allElements}=await supabase.from(isAdmin?'elements':'v_elements_safe').select('*').eq('event_id',event.id).order('category')
    const {data:client}=await supabase.from('clients').select('*').eq('id',event.client_id).single()
    await exportElementMaster(event,allElements||[],client)
  }

  // ── BOTTOM TOTALS — exclude is_option items ──
  let totalClient=0,totalInternal=0
  categories.forEach(cat=>{
    const mainItems=cat.items.filter(el=>!el.is_option)
    if(cat.bundled){ totalClient+=cat.bundle_amt||0 }
    else{ mainItems.forEach(el=>{ totalClient+=calcClient(el); totalInternal+=calcInternal(el) }) }
  })
  const margin=totalClient-totalInternal

  if(loading) return <p style={{fontSize:'14px',color:'var(--text-tertiary)',padding:'20px 0'}}>Loading…</p>

  return(
    <div>
      {/* Empty state */}
      {categories.length===0&&(
        <div style={{border:'0.5px solid var(--border)',borderRadius:'var(--radius)',padding:'48px 32px',textAlign:'center',background:'var(--bg-secondary)',marginBottom:'16px'}}>
          <p style={{fontFamily:'var(--font-display)',fontSize:'22px',color:'var(--text)',marginBottom:'6px'}}>
            Start building for {city}
          </p>
          <p style={{fontSize:'13px',color:'var(--text-tertiary)',marginBottom:'24px'}}>
            Upload an existing cost sheet, paste from Excel, or start fresh.
          </p>
          <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={downloadTemplate} style={{padding:'9px 18px',fontSize:'13px',fontFamily:'var(--font-body)',background:'none',border:'1px solid #d8d2c8',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'#2c2518'}}>
              ↓ Download template
            </button>
            <button onClick={()=>setShowImport(true)} style={{padding:'9px 18px',fontSize:'13px',fontFamily:'var(--font-body)',background:'none',border:'1px solid #d8d2c8',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'#2c2518'}}>
              ↑ Upload or Paste
            </button>
            <button onClick={()=>setShowCategoryPicker(true)} style={{padding:'9px 18px',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)',background:'#bc1723',color:'#fff',border:'1px solid #bc1723',borderRadius:'var(--radius-sm)',cursor:'pointer'}}>
              + Start from scratch
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={handleFileUpload}/>
        </div>
      )}

      {/* Top action bar */}
      {categories.length>0&&(
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
          <button onClick={()=>setShowCategoryPicker(true)} style={{padding:'7px 16px',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)',background:'none',border:'1px solid #d8d2c8',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'#2c2518'}}>
            + Add category
          </button>
          <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
            {saving&&<span style={{fontSize:'12px',color:'var(--text-tertiary)',fontStyle:'italic'}}>Saving…</span>}
            {/* Grid / Cards toggle pair */}
            <div style={{display:'flex',border:'1px solid rgba(0,0,0,0.14)',borderRadius:'4px',overflow:'hidden'}}>
              <button onClick={()=>{setViewMode('grid');try{localStorage.setItem('myoozz_element_view','grid')}catch{}}}
                style={{padding:'5px 10px',fontSize:'12px',fontFamily:'var(--font-body)',background:viewMode==='grid'?'rgba(0,0,0,0.07)':'none',border:'none',color:viewMode==='grid'?'var(--text)':'var(--text-tertiary)',cursor:'pointer',fontWeight:viewMode==='grid'?500:400}}
              >⊞ Grid</button>
              <button onClick={()=>{setViewMode('cards');try{localStorage.setItem('myoozz_element_view','cards')}catch{}}}
                style={{padding:'5px 10px',fontSize:'12px',fontFamily:'var(--font-body)',background:viewMode==='cards'?'rgba(0,0,0,0.07)':'none',border:'none',borderLeft:'1px solid rgba(0,0,0,0.14)',color:viewMode==='cards'?'var(--text)':'var(--text-tertiary)',cursor:'pointer',fontWeight:viewMode==='cards'?500:400}}
              >☰ Cards</button>
            </div>
            <button onClick={()=>setShowImport(true)} style={{fontSize:'12px',fontWeight:500,color:'#2c2518',background:'none',border:'1px solid #d8d2c8',borderRadius:'var(--radius-sm)',padding:'5px 12px',cursor:'pointer',fontFamily:'var(--font-body)'}}>↑ Import more</button>
            <button onClick={()=>setShowSheetSettings(true)} style={{fontSize:'12px',color:'#2c2518',background:'none',border:'1px solid #d8d2c8',borderRadius:'var(--radius-sm)',padding:'5px 12px',cursor:'pointer',fontFamily:'var(--font-body)'}}>⚙ Sheet</button>
            <button onClick={handleDownloadElementMaster} style={{fontSize:'12px',fontWeight:500,color:'#fff',background:'#bc1723',border:'1px solid #bc1723',borderRadius:'var(--radius-sm)',padding:'5px 12px',cursor:'pointer',fontFamily:'var(--font-body)'}}>↓ Download list</button>
            <button onClick={downloadTemplate} style={{fontSize:'12px',color:'#2c2518',background:'none',border:'1px solid #d8d2c8',borderRadius:'var(--radius-sm)',padding:'5px 12px',cursor:'pointer',fontFamily:'var(--font-body)'}}>↓ Template</button>
            <button onClick={clearAllElements} style={{fontSize:'12px',color:'#bc1723',background:'none',border:'1px solid #bc1723',borderRadius:'var(--radius-sm)',cursor:'pointer',fontFamily:'var(--font-body)',marginLeft:'8px',padding:'5px 10px'}}>Clear all</button>
          </div>
        </div>
      )}

      {/* Category jump pills */}
      {categories.length>0&&(
        <div style={{display:'flex',gap:'6px',marginBottom:'12px',flexWrap:'wrap',alignItems:'center'}}>
          {['__all__',...categories.map(c=>c.name)].map(pill=>(
            <button key={pill} onClick={()=>{
              setActivePill(pill)
              if(pill==='__all__'){
                window.scrollTo({top:0,behavior:'smooth'})
              } else {
                const el=document.getElementById('cat-block-'+pill)
                if(el){ el.scrollIntoView({behavior:'smooth',block:'start'}); setHighlightedCat(pill); setTimeout(()=>setHighlightedCat(null),1500) }
              }
            }} style={{
              padding:'4px 12px',fontSize:'12px',fontFamily:'var(--font-body)',
              border:'1px solid #d8d2c8',borderRadius:'20px',cursor:'pointer',
              background:activePill===pill?'#1a1008':'none',
              color:activePill===pill?'#fff':'var(--text-secondary)',
            }}>{pill==='__all__'?'All':pill}</button>
          ))}
        </div>
      )}

      {/* Category blocks */}
      {categories.map((cat,idx)=>(
        <div key={cat.id||cat.name} id={'cat-block-'+cat.name}
          style={{transition:'background 0.25s',background:highlightedCat===cat.name?'#fef08a':'transparent',borderRadius:'6px',marginBottom:'0'}}
        >
          <CategoryBlock
            cat={cat} isAdmin={isAdmin}
            onUpdateCat={(field,val)=>updateCat(cat.name,field,val)}
            onAddElement={()=>addElement(cat.name)}
            onUpdateEl={(elId,field,val)=>updateEl(cat.name,elId,field,val)}
            onSaveEl={el=>saveEl({...el,category:cat.name})}
            onDeleteEl={(elId,name)=>deleteEl(cat.name,elId,name)}
            onCycleStatus={elId=>cycleStatus(cat.name,elId)}
            onDelete={()=>setCategoryDeleteConfirm(cat.name)}
            onMerge={mergeCategory}
            onRename={renameCategory}
            otherCategories={categories.filter(c=>c.name!==cat.name)}
            onMoveElement={(elId,toCat)=>moveElement(elId,cat.name,toCat)}
            fieldVis={fieldVis}
            teamUsers={teamUsers}
            viewMode={viewMode}
            isFirst={idx===0}
            isLast={idx===categories.length-1}
            onMoveUp={()=>moveCategoryUp(cat.name)}
            onMoveDown={()=>moveCategoryDown(cat.name)}
            catDefaults={catDefaults[cat.name]||{}}
            onCatDefaultChange={saveCatDefault}
            onMarkAsOption={elId=>markAsOption(cat.name,elId)}
            onOptionBack={elId=>optionBack(cat.name,elId)}
            onOptionConfirm={(elId,og)=>optionConfirm(cat.name,elId,og)}
            rateCards={rateCards}
            city={city}
          />
        </div>
      ))}

      {/* Bottom summary */}
      {categories.length>0&&(
        <div style={{
          marginTop:'24px',borderTop:'0.5px solid var(--border)',paddingTop:'16px',
          display:'grid',
          gridTemplateColumns:isAdmin?(w<768?'1fr 1fr':'repeat(4,1fr)'):'1fr',
          gap:'8px',
        }}>
          <div style={{background:'var(--bg-secondary)',borderRadius:'var(--radius-sm)',padding:'14px 18px',border:'0.5px solid var(--border)'}}>
            <div style={{fontSize:'11px',color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'6px'}}>Client total</div>
            <div style={{fontSize:'24px',fontWeight:500,color:'var(--text)',fontFamily:'var(--font-display)'}}>{fmt(totalClient)||'₹0'}</div>
            <div style={{fontSize:'11px',color:'var(--text-tertiary)',marginTop:'2px'}}>{categories.length} {categories.length===1?'category':'categories'}</div>
          </div>
          {isAdmin&&(
            <div style={{background:'#FFFBEB',borderRadius:'var(--radius-sm)',padding:'14px 18px',border:'0.5px solid #F59E0B'}}>
              <div style={{fontSize:'11px',color:'#92400E',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'6px'}}>Internal cost</div>
              <div style={{fontSize:'24px',fontWeight:500,color:'#92400E',fontFamily:'var(--font-display)'}}>{fmt(totalInternal)||'₹0'}</div>
              <div style={{fontSize:'11px',color:'#92400E',opacity:0.7,marginTop:'2px'}}>Total paid to vendors</div>
            </div>
          )}
          {isAdmin&&(
            <div style={{background:margin>0?'#F0FDF4':'#FEF2F2',borderRadius:'var(--radius-sm)',padding:'14px 18px',border:`0.5px solid ${margin>0?'#22C55E':'#F87171'}`}}>
              <div style={{fontSize:'11px',color:margin>0?'#15803D':'#B91C1C',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'6px'}}>Margin</div>
              <div style={{fontSize:'24px',fontWeight:500,color:margin>0?'#15803D':'#B91C1C',fontFamily:'var(--font-display)'}}>{fmt(margin)||'₹0'}</div>
              {totalClient>0&&<div style={{fontSize:'11px',color:margin>0?'#15803D':'#B91C1C',opacity:0.8,marginTop:'2px'}}>{Math.round((margin/totalClient)*100)}% margin</div>}
            </div>
          )}
          {isAdmin&&(
            <div style={{background:'var(--bg-secondary)',borderRadius:'var(--radius-sm)',padding:'14px 18px',border:'0.5px solid var(--border)'}}>
              <div style={{fontSize:'11px',color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'6px'}}>Items on actuals</div>
              <div style={{fontSize:'24px',fontWeight:500,color:'var(--text)',fontFamily:'var(--font-display)'}}>
                {categories.reduce((s,cat)=>s+cat.items.filter(el=>!el.is_option&&(el.cost_status==='Client scope'||el.cost_status==='Actuals')).length,0)}
              </div>
              <div style={{fontSize:'11px',color:'var(--text-tertiary)',marginTop:'2px'}}>Billed post-event</div>
            </div>
          )}
        </div>
      )}

      {/* Sheet settings */}
      {showSheetSettings&&(
        <div style={{position:'fixed',inset:0,background:'rgba(26,25,21,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:400,padding:'24px'}}>
          <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)',padding:'28px 32px',maxWidth:'440px',width:'100%'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:500,color:'var(--text)'}}>Customize sheet</h3>
              <button onClick={()=>setShowSheetSettings(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'18px',color:'var(--text-tertiary)'}}>✕</button>
            </div>
            <p style={{fontSize:'13px',color:'var(--text-tertiary)',marginBottom:'20px',lineHeight:1.6}}>
              Toggle off columns you don't need for this event.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:'0',border:'0.5px solid var(--border)',borderRadius:'var(--radius-sm)',overflow:'hidden'}}>
              {[
                {key:'size',label:'Size / dimensions',desc:'e.g. 20x12ft, 8x8ft'},
                {key:'finish',label:'Finish / specs',desc:'Material, finish type, details'},
                {key:'days',label:'Days',desc:'Turn off for single-day events'},
                {key:'source',label:'Source / vendor',desc:'Who supplies this element'},
                {key:'status',label:'Status labels',desc:'Estimated, confirmed, actuals'},
              ].map((f,i,arr)=>(
                <div key={f.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:i<arr.length-1?'0.5px solid var(--border)':'none',background:fieldVis[f.key]?'var(--bg)':'var(--bg-secondary)'}}>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:500,color:'var(--text)'}}>{f.label}</div>
                    <div style={{fontSize:'11px',color:'var(--text-tertiary)',marginTop:'2px'}}>{f.desc}</div>
                  </div>
                  <button onClick={()=>saveFieldVis({...fieldVis,[f.key]:!fieldVis[f.key]})}
                    style={{width:'40px',height:'22px',borderRadius:'11px',background:fieldVis[f.key]?'var(--text)':'var(--border-strong)',border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}>
                    <div style={{width:'16px',height:'16px',borderRadius:'50%',background:'white',position:'absolute',top:'3px',left:fieldVis[f.key]?'21px':'3px',transition:'left 0.2s'}}/>
                  </button>
                </div>
              ))}
            </div>
            <p style={{fontSize:'11px',color:'var(--text-tertiary)',marginTop:'12px',textAlign:'center'}}>
              Changes save automatically and apply to export too.
            </p>
          </div>
        </div>
      )}

      {/* Category picker */}
      {showCategoryPicker&&(
        <CategoryPicker
          existingCategories={categories}
          onAdd={name=>addCategory(name)}
          onClose={()=>setShowCategoryPicker(false)}
        />
      )}

      {/* Import modal */}
      {showImport&&(
        <ImportModal
          event={event} city={city}
          onImported={()=>loadElements()}
          onClose={()=>setShowImport(false)}
        />
      )}

      {/* Delete element confirm */}
      {deleteConfirm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(26,25,21,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:'24px'}}>
          <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)',padding:'28px 32px',maxWidth:'400px',width:'100%'}}>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:500,color:'var(--text)',marginBottom:'8px'}}>Delete element</h3>
            <p style={{fontSize:'13px',color:'var(--text-secondary)',lineHeight:1.6,marginBottom:'24px'}}>
              <strong>"{deleteConfirm.elementName}"</strong> exists in multiple cities.<br/>
              Where do you want to delete it from?
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              <button onClick={()=>doDelete(deleteConfirm.catName,deleteConfirm.elId,deleteConfirm.elementName,true)}
                style={{padding:'10px 16px',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)',background:'#A32D2D',color:'white',border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer',textAlign:'left'}}
              >Delete from all cities</button>
              <button onClick={()=>doDelete(deleteConfirm.catName,deleteConfirm.elId,deleteConfirm.elementName,false)}
                style={{padding:'10px 16px',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)',background:'none',border:'0.5px solid var(--border-strong)',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'var(--text)',textAlign:'left'}}
              >Delete from {city} only</button>
              <button onClick={()=>setDeleteConfirm(null)}
                style={{padding:'8px 16px',fontSize:'12px',fontFamily:'var(--font-body)',background:'none',border:'none',cursor:'pointer',color:'var(--text-tertiary)'}}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Category delete confirm */}
      {categoryDeleteConfirm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(26,25,21,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:'24px'}}>
          <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)',padding:'28px 32px',maxWidth:'400px',width:'100%'}}>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:500,color:'var(--text)',marginBottom:'8px'}}>Remove category</h3>
            <p style={{fontSize:'13px',color:'var(--text-secondary)',lineHeight:1.6,marginBottom:'8px'}}>
              Remove <strong>"{categoryDeleteConfirm}"</strong> and all its elements?
            </p>
            <p style={{fontSize:'12px',color:'var(--text-tertiary)',marginBottom:'24px'}}>
              This will permanently delete all elements in this category for <strong>{city}</strong>.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              <button
                onClick={async()=>{
                  await supabase.from('elements').delete()
                    .eq('event_id',event.id).eq('city',city).eq('category',categoryDeleteConfirm)
                  setCategories(prev=>prev.filter(c=>c.name!==categoryDeleteConfirm))
                  try{ await logCategoryDeleted(event.id,categoryDeleteConfirm) }catch{}
                  setCategoryDeleteConfirm(null)
                }}
                style={{padding:'10px 16px',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)',background:'#A32D2D',color:'white',border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer',textAlign:'left'}}
              >Yes, remove category and all elements</button>
              <button onClick={()=>setCategoryDeleteConfirm(null)}
                style={{padding:'8px 16px',fontSize:'12px',fontFamily:'var(--font-body)',background:'none',border:'none',cursor:'pointer',color:'var(--text-tertiary)'}}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Paste modal */}
      {showPaste&&(
        <div style={{position:'fixed',inset:0,background:'rgba(26,25,21,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'24px'}}>
          <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)',padding:'28px 32px',maxWidth:'600px',width:'100%',maxHeight:'80vh',overflowY:'auto'}}>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'22px',fontWeight:500,color:'var(--text)',marginBottom:'6px'}}>Paste from Excel</h3>
            <p style={{fontSize:'13px',color:'var(--text-tertiary)',marginBottom:'16px',lineHeight:1.6}}>
              Select your cost data in Excel → Copy (Cmd+C) → paste below.
            </p>
            {pastePreview.length===0?(
              <>
                <textarea placeholder="Paste Excel data here…" value={pasteText}
                  onChange={e=>setPasteText(e.target.value)} rows={10}
                  style={{width:'100%',padding:'10px 12px',fontSize:'13px',fontFamily:'monospace',background:'var(--bg-secondary)',border:'0.5px solid var(--border-strong)',borderRadius:'var(--radius-sm)',color:'var(--text)',outline:'none',resize:'vertical',boxSizing:'border-box',lineHeight:1.6}}
                />
                <div style={{display:'flex',gap:'8px',marginTop:'12px',justifyContent:'flex-end'}}>
                  <button onClick={()=>{setShowPaste(false);setPasteText('')}} style={{padding:'8px 16px',fontSize:'13px',fontFamily:'var(--font-body)',background:'none',border:'1px solid #d8d2c8',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'#2c2518'}}>Cancel</button>
                  <button onClick={()=>setPastePreview(parsePaste(pasteText))} disabled={!pasteText.trim()} style={{padding:'8px 16px',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)',background:'#bc1723',color:'#fff',border:'1px solid #bc1723',borderRadius:'var(--radius-sm)',cursor:'pointer'}}>Preview →</button>
                </div>
              </>
            ):(
              <>
                <div style={{background:'var(--bg-secondary)',border:'0.5px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'16px',marginBottom:'16px'}}>
                  <p style={{fontSize:'11px',color:'var(--text-tertiary)',marginBottom:'10px',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.5px'}}>
                    Preview — {pastePreview.length} categories, {pastePreview.reduce((s,c)=>s+c.items.length,0)} elements
                  </p>
                  {pastePreview.map((cat,i)=>(
                    <div key={i} style={{marginBottom:'10px'}}>
                      <p style={{fontSize:'13px',fontWeight:500,color:'var(--text)',marginBottom:'4px'}}>{cat.name}</p>
                      {cat.items.map((el,j)=>(
                        <p key={j} style={{fontSize:'12px',color:'var(--text-secondary)',paddingLeft:'12px',marginBottom:'2px'}}>
                          — {el.element_name} {el.qty>1?`· ${el.qty} nos`:''} {el.rate>0?`· ₹${el.rate.toLocaleString('en-IN')}`:''}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
                  <button onClick={()=>setPastePreview([])} style={{padding:'8px 16px',fontSize:'13px',fontFamily:'var(--font-body)',background:'none',border:'1px solid #d8d2c8',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'#2c2518'}}>← Edit</button>
                  <button onClick={confirmPaste} style={{padding:'8px 16px',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)',background:'#bc1723',color:'#fff',border:'1px solid #bc1723',borderRadius:'var(--radius-sm)',cursor:'pointer'}}>Import elements</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// ELEMENT BUILDER — outer wrapper with city tabs
// ─────────────────────────────────────────────
export default function ElementBuilder({ event, userRole, teamUsers }){
  const cities=event.cities?.length>0?event.cities:['General']
  const [activeCity,setActiveCity]=useState(cities[0])
  const [copyFrom,setCopyFrom]=useState(cities[0]||'')
  const [copyTo,setCopyTo]=useState('__all__')
  const [copying,setCopying]=useState(false)

  async function executeCopy(){
    if(!copyFrom) return
    setCopying(true)
    const {data:elements}=await supabase.from('elements').select('*').eq('event_id',event.id).eq('city',copyFrom)
    if(!elements||!elements.length){ alert('No elements in '+copyFrom+' to copy.'); setCopying(false); return }
    const targets=copyTo==='__all__'?cities.filter(c=>c!==copyFrom):[copyTo]
    for(const tgt of targets){
      const {data:existing}=await supabase.from('elements').select('id').eq('event_id',event.id).eq('city',tgt)
      if(existing&&existing.length>0){
        if(!window.confirm(`${tgt} already has elements. Replace with ${copyFrom}'s?`)) continue
        await supabase.from('elements').delete().eq('event_id',event.id).eq('city',tgt)
      }
      await supabase.from('elements').insert(elements.map(el=>({
        event_id:event.id,city:tgt,category:el.category,
        element_name:el.element_name,size:el.size,size_unit:el.size_unit,
        finish:el.finish,qty:el.qty,days:el.days,rate:el.rate,
        lump_sum:el.lump_sum,amount:el.amount,internal_rate:el.internal_rate,
        internal_lump:el.internal_lump,internal_amount:el.internal_amount,
        source:el.source,cost_status:el.cost_status,
        bundled:el.bundled,sort_order:el.sort_order,
        is_option:el.is_option||false,option_group:el.option_group||null,
      })))
    }
    const toLabel=copyTo==='__all__'?'all other cities':copyTo
    alert(`Copied from ${copyFrom} to ${toLabel}.`)
    setCopying(false)
  }

  return(
    <div>
      {cities.length>1&&(
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'20px',flexWrap:'wrap'}}>
          <div style={{display:'flex',border:'0.5px solid var(--border)',borderRadius:'var(--radius-sm)',overflow:'hidden'}}>
            {cities.map(city=>(
              <button key={city} onClick={()=>setActiveCity(city)} style={{
                padding:'7px 18px',fontSize:'13px',
                fontWeight:activeCity===city?500:400,
                fontFamily:'var(--font-body)',
                background:activeCity===city?'var(--text)':'var(--bg)',
                color:activeCity===city?'var(--bg)':'var(--text-tertiary)',
                border:'none',borderRight:'0.5px solid var(--border)',cursor:'pointer',
              }}>{city}</button>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}>
            <span style={{fontSize:'12px',color:'var(--text-tertiary)',fontFamily:'var(--font-body)'}}>Copy elements</span>
            <span style={{fontSize:'12px',color:'var(--text-tertiary)'}}>from</span>
            <select
              value={copyFrom}
              onChange={e=>setCopyFrom(e.target.value)}
              style={{fontSize:'12px',padding:'6px 10px',border:'0.5px solid var(--border-strong)',borderRadius:'var(--radius-sm)',background:'var(--bg)',color:'var(--text)',fontFamily:'var(--font-body)',cursor:'pointer'}}
            >
              {cities.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <span style={{fontSize:'12px',color:'var(--text-tertiary)'}}>→ to</span>
            <select
              value={copyTo}
              onChange={e=>setCopyTo(e.target.value)}
              style={{fontSize:'12px',padding:'6px 10px',border:'0.5px solid var(--border-strong)',borderRadius:'var(--radius-sm)',background:'var(--bg)',color:'var(--text)',fontFamily:'var(--font-body)',cursor:'pointer'}}
            >
              <option value="__all__">All other cities</option>
              {cities.filter(c=>c!==copyFrom).map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={executeCopy}
              disabled={copying||!copyFrom||(copyTo!=='__all__'&&copyTo===copyFrom)}
              style={{
                padding:'7px 14px',fontSize:'12px',fontWeight:500,
                fontFamily:'var(--font-body)',background:'#bc1723',color:'#fff',
                border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer',
                opacity:(copying||!copyFrom||(copyTo!=='__all__'&&copyTo===copyFrom))?0.45:1,
              }}
            >{copying?'Copying…':'Copy'}</button>
          </div>
        </div>
      )}
      <CityElements key={activeCity} event={event} city={activeCity} userRole={userRole} teamUsers={teamUsers}/>
    </div>
  )
}

/*
 * ─────────────────────────────────────────────
 * PHASE F MIGRATION — run in Supabase SQL Editor before testing
 * ─────────────────────────────────────────────
 * ALTER TABLE elements ADD COLUMN IF NOT EXISTS is_option boolean DEFAULT false;
 * ALTER TABLE elements ADD COLUMN IF NOT EXISTS option_group text;
 * ALTER TABLE events   ADD COLUMN IF NOT EXISTS category_config jsonb DEFAULT '{}';
 * ─────────────────────────────────────────────
 */
