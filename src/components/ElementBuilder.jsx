import { useState, useEffect, useRef } from 'react'
import ImportModal from './ImportModal'
import { CATEGORY_SUGGESTIONS } from './CategoryLibrary'
import CategoryPicker from './CategoryPicker'
import { supabase } from '../supabase'
import * as XLSX from 'xlsx'

const SIZE_UNITS = ['ft','mtr','sq ft','cm','inch','nos','—']
const STATUS_OPTIONS = ['Estimated','Confirmed','Actuals','Client scope']
const STATUS_STYLES = {
  'Estimated':    { bg:'#FEF3C7', color:'#92400E' },
  'Confirmed':    { bg:'#D1FAE5', color:'#065F46' },
  'Actuals':      { bg:'#F3F4F6', color:'#6B7280' },
  'Client scope': { bg:'#DBEAFE', color:'#1E40AF' },
}

function fmt(n){ return (!n||n===0)?null:'₹'+Math.round(n).toLocaleString('en-IN') }
function calcClient(el){ return el.lump_sum?(+(el.amount)||0):(+(el.rate)||0)*(+(el.qty)||1)*(+(el.days)||1) }
function calcInternal(el){ return el.internal_lump?(+(el.internal_amount)||0):(+(el.internal_rate)||0)*(+(el.qty)||1)*(+(el.days)||1) }

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
        cost_status:'Estimated',bundled:false,
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
      element_name:name,
      size:textCols[0]||'',
      size_unit:'ft',finish:textCols[1]||'',qty:1,days:1,
      rate:nums.find(n=>n>=1000)||0,internal_rate:0,source:'',
      lump_sum:false,internal_lump:false,amount:0,internal_amount:0,
      cost_status:'Estimated',bundled:false,
    })
  })
  return Object.entries(cats).filter(([,i])=>i.length>0)
    .map(([name,items])=>({name,bundled:false,bundle_amt:0,original_amt:0,
      items:items.map((el,i)=>({...el,id:'new-'+Date.now()+'-'+i}))}))
}

// Bug fix: central responsive hook used by ElementRow and CityElements
function useWindowSize() {
  const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}

// Shared input style
const inp = (amber,locked) => ({
  width:'100%',fontSize:'13px',padding:'6px 8px',
  border:'0.5px solid '+(amber?'#F59E0B':'var(--border)'),
  borderRadius:'4px',
  background:locked?'var(--bg-secondary)':amber?'#FFFBEB':'var(--bg)',
  color:amber?'#92400E':'var(--text)',
  fontFamily:'var(--font-body)',outline:'none',
  boxSizing:'border-box',minWidth:0,
})

const subLabel = (text) => (
  <div style={{fontSize:'10px',color:'var(--text-tertiary)',marginBottom:'2px',letterSpacing:'0.3px'}}>{text}</div>
)

const modeToggle = (isLump, onUnit, onLump, amber) => (
  <div style={{display:'flex',gap:'2px',marginTop:'3px'}}>
    <button onClick={onUnit} style={{
      padding:'1px 6px',fontSize:'10px',fontFamily:'var(--font-body)',
      background:!isLump?(amber?'#92400E':'var(--text)'):'none',
      color:!isLump?'white':(amber?'#92400E':'var(--text-tertiary)'),
      border:'0.5px solid '+(amber?'#F59E0B':'var(--border)'),
      borderRadius:'3px',cursor:'pointer',
    }}>Unit</button>
    <button onClick={onLump} style={{
      padding:'1px 6px',fontSize:'10px',fontFamily:'var(--font-body)',
      background:isLump?(amber?'#92400E':'var(--text)'):'none',
      color:isLump?'white':(amber?'#92400E':'var(--text-tertiary)'),
      border:'0.5px solid '+(amber?'#F59E0B':'var(--border)'),
      borderRadius:'3px',cursor:'pointer',
    }}>Lump</button>
  </div>
)

function ElementRow({el,isAdmin,locked,onUpdate,onSave,onDelete,onCycleStatus,elementName,otherCategories,onMove,fieldVis,teamUsers}){
  const fv = fieldVis||{days:true,source:true,status:true,size:true,finish:true}
  // Bug fix: replaced local state+effect with shared hook
  const w = useWindowSize()
  const isMobile = w < 768
  const sc=STATUS_STYLES[el.cost_status]||STATUS_STYLES['Estimated']
  const clientAmt=calcClient(el)
  const internalAmt=calcInternal(el)
  const margin=clientAmt-internalAmt

  // Bug fix: responsive grid — on mobile use 2 cols, on desktop use full grid
  const cols = isMobile
    ? '1fr 1fr'
    : isAdmin
      ? '2fr 1.6fr 1.2fr 1.2fr 1.2fr 1.2fr 72px 24px'
      : '2fr 1.6fr 1.2fr 1.6fr 72px 24px'

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

      {/* Finish / specs */}
      <div>
        {subLabel('Finish / specs')}
        <input style={inp(false,locked)}
          placeholder="Material, specs, details..." value={el.finish}
          title="Material type, finish, or specifications" disabled={locked}
          onChange={e=>onUpdate('finish',e.target.value)} onBlur={onSave}
        />
      </div>

      {/* Size · Qty · Days */}
      <div>
        {subLabel('Size · Qty · Days')}
        <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
          <input style={{...inp(false,locked),width:'54px',fontSize:'12px',padding:'6px 5px'}}
            placeholder="Size" value={el.size} title="Dimensions"
            disabled={locked} onChange={e=>onUpdate('size',e.target.value)} onBlur={onSave}
          />
          <select style={{...inp(false,locked),width:'42px',fontSize:'11px',padding:'6px 2px',cursor:'pointer'}}
            value={el.size_unit} disabled={locked} title="Unit"
            onChange={e=>{onUpdate('size_unit',e.target.value);onSave()}}
          >
            {SIZE_UNITS.map(u=><option key={u}>{u}</option>)}
          </select>
          <input style={{...inp(false,locked),width:'38px',fontSize:'12px',padding:'6px 4px',textAlign:'center'}}
            type="number" min="1" value={el.qty} title="Quantity"
            disabled={locked} onChange={e=>onUpdate('qty',+e.target.value)} onBlur={onSave}
          />
          <input style={{...inp(false,locked),width:'38px',fontSize:'12px',padding:'6px 4px',textAlign:'center'}}
            type="number" min="1" value={el.days} title="Days"
            disabled={locked} onChange={e=>onUpdate('days',+e.target.value)} onBlur={onSave}
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
          title="What you charge the client" disabled={locked}
          onChange={e=>onUpdate(el.lump_sum?'amount':'rate',+e.target.value)}
          onBlur={onSave}
        />
        {!locked && modeToggle(el.lump_sum,
          ()=>{onUpdate('lump_sum',false);onSave()},
          ()=>{onUpdate('lump_sum',true);onSave()},
          false
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
            onChange={e=>onUpdate(el.internal_lump?'internal_amount':'internal_rate',+e.target.value)}
            onBlur={onSave}
          />
          {modeToggle(el.internal_lump,
            ()=>{onUpdate('internal_lump',false);onSave()},
            ()=>{onUpdate('internal_lump',true);onSave()},
            true
          )}
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
            title="Who is supplying this"
            onChange={e=>onUpdate('source',e.target.value)} onBlur={onSave}
          />
          {isAdmin&&clientAmt>0&&(+(el.internal_rate)||+(el.internal_amount))>0&&(
            <div style={{fontSize:'11px',marginTop:'2px',fontWeight:500,
              color:margin>0?'#065F46':margin===0?'#92400E':'#A32D2D'}}>
              Margin: {fmt(margin)} ({Math.round((margin/clientAmt)*100)}%)
            </div>
          )}
          {isAdmin&&clientAmt>0&&!((+(el.internal_rate)||+(el.internal_amount))>0)&&(
            <div style={{fontSize:'11px',marginTop:'2px',color:'#92400E',fontWeight:500}}>
              Margin: ₹0 — add internal cost
            </div>
          )}
        </div>
      )}

      {/* Status */}
      {fv.status && <div>
        {subLabel('Status')}
        <button onClick={onCycleStatus} title="Click to change status"
          style={{
            width:'100%',padding:'6px 4px',fontSize:'11px',fontWeight:500,
            background:sc.bg,color:sc.color,border:'none',
            borderRadius:'4px',cursor:'pointer',fontFamily:'var(--font-body)',
            textAlign:'center',
          }}
        >{el.cost_status}</button>
        {otherCategories&&otherCategories.length>0&&(
          <select
            value=""
            onChange={e=>{if(e.target.value&&onMove)onMove(e.target.value)}}
            title="Move to another category"
            style={{width:'100%',fontSize:'10px',padding:'2px 4px',marginTop:'3px',border:'0.5px solid var(--border)',borderRadius:'3px',background:'none',color:'var(--text-tertiary)',fontFamily:'var(--font-body)',cursor:'pointer'}}
          >
            <option value="">Move to →</option>
            {otherCategories.map(oc=><option key={oc.name} value={oc.name}>{oc.name}</option>)}
          </select>
        )}
      </div>}

      {/* Delete */}
      <div style={{paddingTop:'18px'}}>
        <button onClick={onDelete} title="Remove element"
          style={{background:'none',border:'none',cursor:'pointer',
            fontSize:'14px',color:'var(--text-tertiary)',padding:'4px',lineHeight:1}}
          onMouseOver={e=>e.currentTarget.style.color='#A32D2D'}
          onMouseOut={e=>e.currentTarget.style.color='var(--text-tertiary)'}
        >✕</button>
      </div>
    </div>
  )
}

function CategoryBlock({cat,isAdmin,onUpdateCat,onAddElement,onUpdateEl,onSaveEl,onDeleteEl,onCycleStatus,onDelete,onMerge,onRename,otherCategories,onMoveElement,fieldVis,teamUsers}){
  const [open,setOpen]=useState(false)
  const [showMerge,setShowMerge]=useState(false)
  const [mergeTarget,setMergeTarget]=useState('')
  const [editingName,setEditingName]=useState(false)
  const [nameVal,setNameVal]=useState(cat.name)
  const nameRef=useRef(null)

  useEffect(()=>{ setNameVal(cat.name) },[cat.name])

  const catClientTotal=cat.bundled
    ?(cat.bundle_amt||0)
    :cat.items.reduce((s,el)=>s+calcClient(el),0)

  const autoSum=cat.items.reduce((s,el)=>s+calcClient(el),0)

  return(
    <div style={{border:'0.5px solid var(--border)',borderRadius:'var(--radius-sm)',marginBottom:'8px',overflow:'hidden'}}>

      {/* Category header */}
      <div style={{
        display:'flex',alignItems:'center',gap:'10px',
        padding:'10px 14px',
        background:open?'var(--bg-secondary)':'var(--bg)',
        cursor:'pointer',
        borderBottom:open?'0.5px solid var(--border)':'none',
      }}>
        {/* Collapse toggle */}
        <button onClick={()=>setOpen(!open)} style={{
          background:'none',border:'none',cursor:'pointer',
          fontSize:'12px',color:'var(--text-tertiary)',padding:'0 4px',lineHeight:1,flexShrink:0,
        }}>
          {open?'▼':'▶'}
        </button>

        {/* Editable category name */}
        {editingName ? (
          <input
            ref={nameRef}
            value={nameVal}
            placeholder="Category name"
            autoFocus
            onClick={e=>e.stopPropagation()}
            onChange={e=>setNameVal(e.target.value)}
            onBlur={e=>{e.stopPropagation();onRename&&onRename(cat.name,nameVal);setEditingName(false)}}
            onKeyDown={e=>{ if(e.key==='Enter'){onRename&&onRename(cat.name,nameVal);setEditingName(false)} if(e.key==='Escape')setEditingName(false) }}
            style={{flex:1,fontSize:'14px',fontWeight:500,background:'none',border:'none',
              outline:'none',color:'var(--text)',fontFamily:'var(--font-body)',borderBottom:'1px solid var(--text)'}}
          />
        ) : (
          <span
            onClick={e=>{e.stopPropagation();setEditingName(true)}}
            title="Click to rename"
            style={{flex:1,fontSize:'14px',fontWeight:500,color:'var(--text)',cursor:'text',
              padding:'0 2px',borderBottom:'1px solid transparent'}}
          >
            {cat.name}
          </span>
        )}

        {/* Element count */}
        <span style={{fontSize:'12px',color:'var(--text-tertiary)',flexShrink:0}}>
          {cat.items.length} {cat.items.length===1?'item':'items'}
        </span>

        {/* Category total */}
        {catClientTotal>0&&(
          <span style={{fontSize:'14px',fontWeight:500,color:'var(--text)',fontFamily:'var(--font-display)',flexShrink:0}}>
            {fmt(catClientTotal)}
          </span>
        )}

        {/* Merge button */}
        {otherCategories&&otherCategories.length>0&&(
          <div style={{position:'relative',flexShrink:0}} onClick={e=>e.stopPropagation()}>
            <button
              onClick={()=>setShowMerge(!showMerge)}
              title="Merge this category into another"
              style={{fontSize:'11px',padding:'2px 8px',background:'none',border:'0.5px solid var(--border)',borderRadius:'3px',cursor:'pointer',color:'var(--text-tertiary)',fontFamily:'var(--font-body)'}}
            >
              Merge →
            </button>
            {showMerge&&(
              <div style={{position:'absolute',right:0,top:'100%',marginTop:'4px',background:'var(--bg)',border:'0.5px solid var(--border-strong)',borderRadius:'var(--radius-sm)',padding:'8px',zIndex:50,minWidth:'180px',boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}>
                <p style={{fontSize:'11px',color:'var(--text-tertiary)',marginBottom:'6px',fontWeight:500}}>Merge into:</p>
                {otherCategories.map(oc=>(
                  <button key={oc.name} onClick={()=>{onMerge&&onMerge(cat.name,oc.name);setShowMerge(false)}}
                    style={{display:'block',width:'100%',textAlign:'left',padding:'6px 8px',fontSize:'12px',background:'none',border:'none',cursor:'pointer',color:'var(--text)',fontFamily:'var(--font-body)',borderRadius:'3px'}}
                    onMouseOver={e=>e.currentTarget.style.background='var(--bg-secondary)'}
                    onMouseOut={e=>e.currentTarget.style.background='none'}
                  >
                    {oc.name}
                  </button>
                ))}
                <button onClick={()=>setShowMerge(false)} style={{display:'block',width:'100%',textAlign:'left',padding:'4px 8px',fontSize:'11px',background:'none',border:'none',cursor:'pointer',color:'var(--text-tertiary)',fontFamily:'var(--font-body)',marginTop:'4px',borderTop:'0.5px solid var(--border)'}}>Cancel</button>
              </div>
            )}
          </div>
        )}

        {/* Bundle checkbox */}
        <label onClick={e=>e.stopPropagation()} style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'12px',color:'var(--text-tertiary)',cursor:'pointer',flexShrink:0}}>
          <input type="checkbox" checked={cat.bundled}
            onChange={e=>{
              const bundling=e.target.checked
              onUpdateCat('bundled',bundling)
              if(bundling) onUpdateCat('bundle_amt',autoSum)
            }}
          />
          Bundle
        </label>

        {/* Delete category */}
        <button onClick={e=>{e.stopPropagation();onDelete()}} title="Remove category"
          style={{background:'none',border:'none',cursor:'pointer',fontSize:'14px',color:'var(--text-tertiary)',padding:'0 4px',lineHeight:1,flexShrink:0}}
          onMouseOver={e=>e.currentTarget.style.color='#A32D2D'}
          onMouseOut={e=>e.currentTarget.style.color='var(--text-tertiary)'}
        >✕</button>
      </div>

      {/* Expanded content */}
      {open&&(
        <>
          {/* Bundle override */}
          {cat.bundled&&(
            <div style={{padding:'8px 14px',background:'#FFFBEB',borderBottom:'0.5px solid var(--border)',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
              <span style={{fontSize:'12px',fontWeight:500,color:'#92400E'}}>Client sees one total:</span>
              <input
                type="number"
                style={{width:'160px',fontSize:'13px',padding:'5px 10px',border:'0.5px solid #F59E0B',borderRadius:'4px',background:'white',color:'#92400E',fontFamily:'var(--font-body)',outline:'none'}}
                value={cat.bundle_amt||''}
                placeholder={`Auto: ${fmt(autoSum)||'₹0'}`}
                title="Edit to override the bundled total shown to client"
                onChange={e=>onUpdateCat('bundle_amt',+e.target.value)}
              />
              <span style={{fontSize:'11px',color:'#92400E',opacity:0.7}}>Auto-sum: {fmt(autoSum)||'₹0'} · Edit to override</span>
            </div>
          )}

          {/* Column headers */}
          {(() => {
            const fv = fieldVis||{days:true,source:true,status:true,size:true,finish:true}
            const adminHeaders = [
              'Element',
              fv.finish ? 'Finish / specs' : null,
              (fv.size||fv.days) ? 'Size · Qty · Days' : null,
              'Client cost',
              isAdmin ? 'Internal cost' : null,
              isAdmin && fv.source ? 'Source / vendor' : null,
              fv.status ? 'Status' : null,
              '',
            ].filter(Boolean)
            const cols = isAdmin
              ? `2fr ${fv.finish?'1.6fr':''} ${(fv.size||fv.days)?'1.2fr':''} 1.2fr 1.2fr ${fv.source?'1.2fr':''} ${fv.status?'72px':''} 24px`.replace(/\s+/g,' ').trim()
              : `2fr ${fv.finish?'1.6fr':''} ${(fv.size||fv.days)?'1.2fr':''} 1.6fr ${fv.status?'72px':''} 24px`.replace(/\s+/g,' ').trim()
            return (
              <div style={{display:'grid',gridTemplateColumns:cols,gap:'6px',padding:'4px 14px',background:'var(--bg-secondary)',borderBottom:'0.5px solid var(--border)'}}>
                {adminHeaders.map((h,i)=>(
                  <div key={i} style={{fontSize:'10px',color:'var(--text-tertiary)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.4px',padding:'3px 0'}}>{h}</div>
                ))}
              </div>
            )
          })()}

          {/* Element rows */}
          {cat.items.length===0&&(
            <div style={{padding:'20px 14px',textAlign:'center',color:'var(--text-tertiary)',fontSize:'13px'}}>
              No elements yet — click "+ Add element" below.
            </div>
          )}
          {cat.items.map(el=>(
            <ElementRow key={el.id} el={el} isAdmin={isAdmin}
              locked={el.cost_status==='Client scope'}
              elementName={el.element_name}
              otherCategories={otherCategories}
              teamUsers={teamUsers}
              fieldVis={fieldVis||{days:true,source:true,status:true,size:true,finish:true}}
              onUpdate={(field,val)=>onUpdateEl(el.id,field,val)}
              onSave={()=>onSaveEl(el)}
              onDelete={()=>onDeleteEl(el.id,el.element_name)}
              onCycleStatus={()=>onCycleStatus(el.id)}
              onMove={toCat=>onMoveElement&&onMoveElement(el.id,toCat)}
            />
          ))}

          {/* Add element */}
          <div style={{padding:'8px 14px',borderTop:'0.5px solid var(--border)'}}>
            <button onClick={onAddElement}
              style={{fontSize:'13px',color:'var(--text-tertiary)',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-body)',padding:0}}
              onMouseOver={e=>e.currentTarget.style.color='var(--text)'}
              onMouseOut={e=>e.currentTarget.style.color='var(--text-tertiary)'}
            >
              + Add element
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function CityElements({event,city,userRole,teamUsers}){
  const [categories,setCategories]=useState([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const fileRef=useRef(null)
  const [showPaste,setShowPaste]=useState(false)
  const [pasteText,setPasteText]=useState('')
  const [pastePreview,setPastePreview]=useState([])
  const [deleteConfirm,setDeleteConfirm]=useState(null)
  const [categoryDeleteConfirm,setCategoryDeleteConfirm]=useState(null)
  const [showImport,setShowImport]=useState(false)
  const [showCategoryPicker,setShowCategoryPicker]=useState(false)
  const [showSheetSettings,setShowSheetSettings]=useState(false)
  // Bug fix: add responsive hook
  const w = useWindowSize()

  async function handleDownloadElementMaster() {
    const { exportElementMaster } = await import('../utils/excelExport')
    const { data: allElements } = await supabase.from('elements').select('*').eq('event_id', event.id).order('category')
    const { data: client } = await supabase.from('clients').select('*').eq('id', event.client_id).single()
    await exportElementMaster(event, allElements || [], client)
  }
  const [fieldVis,setFieldVis]=useState(
    event?.field_visibility || { days:true, source:true, status:true, size:true, finish:true }
  )

  async function saveFieldVis(updated) {
    setFieldVis(updated)
    await supabase.from('events').update({ field_visibility: updated }).eq('id', event.id)
  }
  const isAdmin=userRole==='admin'
  const eventCities=event.cities?.length>0?event.cities:['General']
  const isMultiCity=eventCities.length>1

  useEffect(()=>{loadElements()},[event.id,city])

  // ── Bug 4: read bundle config from events table alongside elements ──
  async function loadElements(){
    setLoading(true)
    const [{ data }, { data: evData }] = await Promise.all([
      supabase.from('elements').select('*').eq('event_id',event.id).eq('city',city).order('sort_order'),
      supabase.from('events').select('bundle_config').eq('id',event.id).single(),
    ])
    const bundleConfig = evData?.bundle_config || {}
    const cityBundle   = bundleConfig[city] || {}

    if(data&&data.length>0){
      const cats={}
      data.forEach(el=>{
        if(!cats[el.category]){
          const cb = cityBundle[el.category] || {}
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
      setCategories(Object.values(cats))
    } else setCategories([])
    setLoading(false)
  }

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
    }
    if(el.id&&!el.id.startsWith('new-')){
      await supabase.from('elements').update(payload).eq('id',el.id)
    } else {
      const {data}=await supabase.from('elements').insert(payload).select().single()
      if(data) setCategories(prev=>prev.map(cat=>cat.name!==el.category?cat:{
        ...cat,items:cat.items.map(e=>e.id===el.id?{...e,id:data.id}:e)
      }))
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
      const {data:allMatches}=await supabase.from('elements')
        .select('id').eq('event_id',event.id)
        .eq('category',catName).eq('element_name',elementName)
      if(allMatches){
        for(const match of allMatches){
          await supabase.from('elements').delete().eq('id',match.id)
        }
      }
    } else {
      await supabase.from('elements').delete().eq('id',elId)
    }
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

  // ── Bug 4: save bundle config to events table ──
  async function saveBundleConfig(catName, updates) {
    const { data: ev } = await supabase.from('events').select('bundle_config').eq('id',event.id).single()
    const bc = ev?.bundle_config || {}
    if (!bc[city]) bc[city] = {}
    if (!bc[city][catName]) bc[city][catName] = {}
    Object.assign(bc[city][catName], updates)
    await supabase.from('events').update({ bundle_config: bc }).eq('id', event.id)
  }

  // ── Bug 3: addCategory now immediately saves suggestion items to Supabase ──
  async function addCategory(name){
    const id='cat-'+Date.now()
    const suggestions=(CATEGORY_SUGGESTIONS[name]||[]).map((el,i)=>({
      id:'new-'+Date.now()+'-'+i,
      event_id:event.id,city,category:name,
      element_name:el.element_name,finish:el.finish||'',
      size:'',size_unit:'ft',qty:1,days:1,
      rate:0,lump_sum:false,amount:0,
      internal_rate:0,internal_lump:false,internal_amount:0,
      source:'',cost_status:'Estimated',bundled:false,sort_order:i,
    }))

    // Add to local state immediately so UI is responsive
    setCategories(prev=>[...prev,{id,name,bundled:false,bundle_amt:0,original_amt:0,items:suggestions}])
    setShowCategoryPicker(false)

    // Save all suggestion elements to Supabase straight away
    if(suggestions.length>0){
      setSaving(true)
      const savedItems=[]
      for(let i=0;i<suggestions.length;i++){
        const s=suggestions[i]
        const {data}=await supabase.from('elements').insert({
          event_id:event.id,city,category:name,
          element_name:s.element_name,finish:s.finish||'',
          size:'',size_unit:'ft',qty:1,days:1,
          rate:0,lump_sum:false,amount:0,
          internal_rate:0,internal_lump:false,internal_amount:0,
          source:'',cost_status:'Estimated',bundled:false,sort_order:i,
        }).select().single()
        savedItems.push(data?{...s,id:data.id}:s)
      }
      // Replace temp IDs with real Supabase IDs
      setCategories(prev=>prev.map(cat=>cat.name!==name?cat:{...cat,items:savedItems}))
      setSaving(false)
    }
    // Empty custom categories persist on first element save (unchanged behaviour)
  }

  async function moveElement(elId, fromCat, toCat){
    await supabase.from('elements').update({category: toCat}).eq('id', elId)
    setCategories(prev => {
      const el = prev.find(c => c.name === fromCat)?.items.find(e => e.id === elId)
      if (!el) return prev
      return prev.map(c => {
        if (c.name === fromCat) return { ...c, items: c.items.filter(e => e.id !== elId) }
        if (c.name === toCat) return { ...c, items: [...c.items, { ...el, category: toCat }] }
        return c
      }).filter(c => c.items.length > 0 || c.name === fromCat)
    })
  }

  async function mergeCategory(fromName, toName){
    const {data:els}=await supabase.from('elements').select('id')
      .eq('event_id',event.id).eq('city',city).eq('category',fromName)
    if(els&&els.length>0){
      await supabase.from('elements').update({category:toName})
        .eq('event_id',event.id).eq('city',city).eq('category',fromName)
    }
    setCategories(prev=>{
      const from=prev.find(c=>c.name===fromName)
      if(!from) return prev
      return prev
        .filter(c=>c.name!==fromName)
        .map(c=>c.name!==toName?c:{
          ...c,
          items:[...c.items,...from.items.map(el=>({...el,category:toName}))]
        })
    })
  }

  async function renameCategory(oldName, newName){
    if(!newName.trim()||newName===oldName) return
    await supabase.from('elements').update({category:newName})
      .eq('event_id',event.id).eq('city',city).eq('category',oldName)
    setCategories(prev=>prev.map(c=>c.name!==oldName?c:{...c,name:newName}))
  }

  function addElement(catName){
    const newEl={
      id:'new-'+Date.now(),event_id:event.id,city,category:catName,
      element_name:'',size:'',size_unit:'ft',finish:'',
      qty:1,days:1,rate:0,lump_sum:false,amount:0,
      internal_rate:0,internal_lump:false,internal_amount:0,
      source:'',cost_status:'Estimated',bundled:false,sort_order:0,
    }
    setCategories(prev=>prev.map(cat=>cat.name!==catName?cat:{...cat,items:[...cat.items,newEl]}))
  }

  // ── Bug 4: updateCat persists bundle changes ──
  function updateCat(catName,field,val){
    setCategories(prev=>prev.map(cat=>{
      if(cat.name!==catName) return cat
      if(field==='bundled'&&!val){
        saveBundleConfig(catName,{bundled:false,bundle_amt:0})
        return {...cat,bundled:false,bundle_amt:0}
      }
      if(field==='bundled'||field==='bundle_amt'){
        saveBundleConfig(catName,{[field]:val})
      }
      return {...cat,[field]:val}
    }))
  }

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
          if(existing[cat.name]){
            existing[cat.name]={...existing[cat.name],items:[...existing[cat.name].items,...cat.items]}
          } else {
            existing[cat.name]=cat
          }
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
        if(existing[cat.name]){
          existing[cat.name]={...existing[cat.name],items:[...existing[cat.name].items,...cat.items]}
        } else {
          existing[cat.name]=cat
        }
      })
      return Object.values(existing)
    })
    setShowPaste(false);setPasteText('');setPastePreview([])
  }

  // Totals for bottom summary
  let totalClient=0,totalInternal=0
  categories.forEach(cat=>{
    if(cat.bundled){ totalClient+=cat.bundle_amt||0 }
    else{ cat.items.forEach(el=>{ totalClient+=calcClient(el); totalInternal+=calcInternal(el) }) }
  })
  const margin=totalClient-totalInternal

  if(loading) return <p style={{fontSize:'14px',color:'var(--text-tertiary)',padding:'20px 0'}}>Loading...</p>

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
            <button onClick={downloadTemplate} style={{padding:'9px 18px',fontSize:'13px',fontFamily:'var(--font-body)',background:'none',border:'0.5px solid var(--border-strong)',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'var(--text)'}}>
              ↓ Download template
            </button>
            <button onClick={()=>setShowImport(true)} style={{padding:'9px 18px',fontSize:'13px',fontFamily:'var(--font-body)',background:'none',border:'0.5px solid var(--border-strong)',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'var(--text)'}}>
              ↑ Upload or Paste
            </button>
            <button onClick={()=>setShowCategoryPicker(true)} style={{padding:'9px 18px',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)',background:'var(--text)',color:'var(--bg)',border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer'}}>
              + Start from scratch
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={handleFileUpload}/>
        </div>
      )}

      {/* Top action bar */}
      {categories.length>0&&(
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
          <button onClick={()=>setShowCategoryPicker(true)} style={{padding:'7px 16px',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)',background:'none',border:'0.5px solid var(--border-strong)',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'var(--text)'}}>
            + Add category
          </button>
          <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
            {saving&&<span style={{fontSize:'12px',color:'var(--text-tertiary)',fontStyle:'italic'}}>Saving...</span>}
            <button onClick={()=>setShowImport(true)} style={{fontSize:'12px',fontWeight:500,color:'var(--text)',background:'none',border:'0.5px solid var(--border-strong)',borderRadius:'var(--radius-sm)',padding:'5px 12px',cursor:'pointer',fontFamily:'var(--font-body)'}}>↑ Import more</button>
            <button onClick={()=>setShowSheetSettings(true)} style={{fontSize:'12px',color:'var(--text-secondary)',background:'none',border:'0.5px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'5px 12px',cursor:'pointer',fontFamily:'var(--font-body)'}}>⚙ Sheet</button>
            <button onClick={handleDownloadElementMaster} style={{fontSize:'12px',fontWeight:500,color:'var(--bg)',background:'var(--text)',border:'none',borderRadius:'var(--radius-sm)',padding:'5px 12px',cursor:'pointer',fontFamily:'var(--font-body)'}}>↓ Download list</button>
            <button onClick={downloadTemplate} style={{fontSize:'12px',color:'var(--text-secondary)',background:'none',border:'0.5px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'5px 12px',cursor:'pointer',fontFamily:'var(--font-body)'}}>↓ Template</button>
            <button onClick={clearAllElements} style={{fontSize:'12px',color:'#A32D2D',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-body)',marginLeft:'8px'}}>Clear all</button>
          </div>
        </div>
      )}

      {/* Category blocks */}
      {categories.map(cat=>(
        <CategoryBlock
          key={cat.id||cat.name} cat={cat} isAdmin={isAdmin}
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
        />
      ))}

      {/* Bottom summary */}
      {categories.length>0&&(
        <div style={{
          marginTop:'24px',
          borderTop:'0.5px solid var(--border)',
          paddingTop:'16px',
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
                {categories.reduce((s,cat)=>s+cat.items.filter(el=>el.cost_status==='Client scope'||el.cost_status==='Actuals').length,0)}
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
              Toggle off columns you don't need for this event. Default settings work for most events.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:'0',border:'0.5px solid var(--border)',borderRadius:'var(--radius-sm)',overflow:'hidden'}}>
              {[
                {key:'size', label:'Size / dimensions', desc:'e.g. 20x12ft, 8x8ft'},
                {key:'finish', label:'Finish / specs', desc:'Material, finish type, details'},
                {key:'days', label:'Days', desc:'Turn off for single-day events'},
                {key:'source', label:'Source / vendor', desc:'Who supplies this element'},
                {key:'status', label:'Status labels', desc:'Estimated, confirmed, actuals'},
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

      {/* Delete confirm dialog */}
      {deleteConfirm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(26,25,21,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:'24px'}}>
          <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)',padding:'28px 32px',maxWidth:'400px',width:'100%'}}>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:500,color:'var(--text)',marginBottom:'8px'}}>
              Delete element
            </h3>
            <p style={{fontSize:'13px',color:'var(--text-secondary)',lineHeight:1.6,marginBottom:'24px'}}>
              <strong>"{deleteConfirm.elementName}"</strong> exists in multiple cities.<br/>
              Where do you want to delete it from?
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              <button
                onClick={()=>doDelete(deleteConfirm.catName,deleteConfirm.elId,deleteConfirm.elementName,true)}
                style={{padding:'10px 16px',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)',background:'#A32D2D',color:'white',border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer',textAlign:'left'}}
              >
                Delete from all cities
              </button>
              <button
                onClick={()=>doDelete(deleteConfirm.catName,deleteConfirm.elId,deleteConfirm.elementName,false)}
                style={{padding:'10px 16px',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)',background:'none',border:'0.5px solid var(--border-strong)',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'var(--text)',textAlign:'left'}}
              >
                Delete from {city} only
              </button>
              <button
                onClick={()=>setDeleteConfirm(null)}
                style={{padding:'8px 16px',fontSize:'12px',fontFamily:'var(--font-body)',background:'none',border:'none',cursor:'pointer',color:'var(--text-tertiary)'}}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category delete confirm dialog */}
      {categoryDeleteConfirm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(26,25,21,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:'24px'}}>
          <div style={{background:'var(--bg)',border:'0.5px solid var(--border)',borderRadius:'var(--radius)',padding:'28px 32px',maxWidth:'400px',width:'100%'}}>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:'20px',fontWeight:500,color:'var(--text)',marginBottom:'8px'}}>
              Remove category
            </h3>
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
                  setCategoryDeleteConfirm(null)
                }}
                style={{padding:'10px 16px',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)',background:'#A32D2D',color:'white',border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer',textAlign:'left'}}
              >
                Yes, remove category and all elements
              </button>
              <button
                onClick={()=>setCategoryDeleteConfirm(null)}
                style={{padding:'8px 16px',fontSize:'12px',fontFamily:'var(--font-body)',background:'none',border:'none',cursor:'pointer',color:'var(--text-tertiary)'}}
              >
                Cancel
              </button>
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
                <textarea placeholder="Paste Excel data here..." value={pasteText}
                  onChange={e=>setPasteText(e.target.value)} rows={10}
                  style={{width:'100%',padding:'10px 12px',fontSize:'13px',fontFamily:'monospace',background:'var(--bg-secondary)',border:'0.5px solid var(--border-strong)',borderRadius:'var(--radius-sm)',color:'var(--text)',outline:'none',resize:'vertical',boxSizing:'border-box',lineHeight:1.6}}
                />
                <div style={{display:'flex',gap:'8px',marginTop:'12px',justifyContent:'flex-end'}}>
                  <button onClick={()=>{setShowPaste(false);setPasteText('')}} style={{padding:'8px 16px',fontSize:'13px',fontFamily:'var(--font-body)',background:'none',border:'0.5px solid var(--border-strong)',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'var(--text)'}}>Cancel</button>
                  <button onClick={()=>setPastePreview(parsePaste(pasteText))} disabled={!pasteText.trim()} style={{padding:'8px 16px',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)',background:'var(--text)',color:'var(--bg)',border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer'}}>Preview →</button>
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
                          — {el.element_name} {el.qty>1?`· ${el.qty} nos`:''} {el.rate>0?`· ₹${el.rate.toLocaleString('en-IN')}` :''}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
                  <button onClick={()=>setPastePreview([])} style={{padding:'8px 16px',fontSize:'13px',fontFamily:'var(--font-body)',background:'none',border:'0.5px solid var(--border-strong)',borderRadius:'var(--radius-sm)',cursor:'pointer',color:'var(--text)'}}>← Edit</button>
                  <button onClick={confirmPaste} style={{padding:'8px 16px',fontSize:'13px',fontWeight:500,fontFamily:'var(--font-body)',background:'var(--text)',color:'var(--bg)',border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer'}}>Import elements</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ElementBuilder({event,userRole,teamUsers}){
  const cities=event.cities?.length>0?event.cities:['General']
  const [activeCity,setActiveCity]=useState(cities[0])

  async function copyToOtherCities(fromCity){
    const {data:elements}=await supabase.from('elements').select('*').eq('event_id',event.id).eq('city',fromCity)
    if(!elements||!elements.length){alert('No elements in '+fromCity+' to copy.');return}
    for(const toCity of cities){
      if(toCity===fromCity) continue
      const {data:existing}=await supabase.from('elements').select('id').eq('event_id',event.id).eq('city',toCity)
      if(existing&&existing.length>0){
        if(!window.confirm(`${toCity} already has elements. Replace with ${fromCity}'s?`)) continue
        await supabase.from('elements').delete().eq('event_id',event.id).eq('city',toCity)
      }
      await supabase.from('elements').insert(elements.map(el=>({
        event_id:event.id,city:toCity,category:el.category,
        element_name:el.element_name,size:el.size,size_unit:el.size_unit,
        finish:el.finish,qty:el.qty,days:el.days,rate:el.rate,
        lump_sum:el.lump_sum,amount:el.amount,internal_rate:el.internal_rate,
        internal_lump:el.internal_lump,internal_amount:el.internal_amount,
        source:el.source,cost_status:el.cost_status,
        bundled:el.bundled,sort_order:el.sort_order,
      })))
    }
    alert(`Copied from ${fromCity} to all other cities.`)
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
          <button onClick={()=>copyToOtherCities(activeCity)} style={{
            padding:'7px 14px',fontSize:'12px',fontWeight:500,
            fontFamily:'var(--font-body)',background:'none',
            border:'0.5px solid var(--border-strong)',
            borderRadius:'var(--radius-sm)',cursor:'pointer',color:'var(--text)',
          }}>
            Copy {activeCity} → all cities
          </button>
        </div>
      )}
      <CityElements key={activeCity} event={event} city={activeCity} userRole={userRole} teamUsers={teamUsers}/>
    </div>
  )
}
