import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const C = {
  headerBg:     '1A1917',
  headerText:   'FFFFFF',
  headerSub:    'B8B4AE',
  catBg:        '2C2C2C',
  catText:      'FFFFFF',
  colBg:        'F0EDE8',
  colText:      '6B6560',
  rowBg:        'FFFFFF',
  rowAlt:       'FAF9F7',
  rowText:      '1A1917',
  catTotalBg:   'EDE9E3',
  catTotalText: '1A1917',
  grandBg:      '1A1917',
  grandText:    'FFFFFF',
  feeBg:        'FEF3C7',
  feeText:      '92400E',
  border:       'E0DDD8',
  borderStrong: 'C8C4BE',
  estimated:    'FEF3C7',
  confirmed:    'D1FAE5',
  actuals:      'F3F4F6',
  clientScope:  'DBEAFE',
}

function hex(c) { return { argb: 'FF' + c } }

function applyBorder(cell, color) {
  const b = { style: 'thin', color: hex(color || C.border) }
  cell.border = { top: b, left: b, bottom: b, right: b }
}

function calcClient(el) {
  return el.lump_sum ? (+(el.amount) || 0) : (+(el.rate) || 0) * (+(el.qty) || 1) * (+(el.days) || 1)
}

function addHeaderBlock(ws, event, city, sheetType, totalCols) {
  // Row 1: Event name
  const r1 = ws.addRow([event.event_name || 'Event Proposal'])
  ws.mergeCells(r1.number, 1, r1.number, totalCols)
  r1.height = 30
  const c1 = r1.getCell(1)
  c1.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(C.headerBg) }
  c1.font = { bold: true, color: hex(C.headerText), size: 16, name: 'Calibri' }
  c1.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }

  // Row 2: Sheet type + prepared by
  const r2 = ws.addRow([`${sheetType}  ·  Prepared by Myoozz Consulting Pvt. Ltd.`])
  ws.mergeCells(r2.number, 1, r2.number, totalCols)
  r2.height = 18
  const c2 = r2.getCell(1)
  c2.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(C.headerBg) }
  c2.font = { color: hex(C.headerSub), size: 10, name: 'Calibri' }
  c2.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }

  // Row 3: Client | Date
  const half = Math.ceil(totalCols / 2)
  const clientStr = [event.clients?.group_name, event.clients?.brand_name].filter(Boolean).join(' · ')
  const dateStr = `Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
  const r3 = ws.addRow([`Client: ${clientStr || '—'}`])
  r3.getCell(totalCols).value = dateStr
  ws.mergeCells(r3.number, 1, r3.number, half)
  ws.mergeCells(r3.number, half + 1, r3.number, totalCols)
  r3.height = 18
  r3.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex('F5F2EE') }
    cell.font = { color: hex('3D3A36'), size: 10, name: 'Calibri' }
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }
  })

  // Row 4: City + validity
  let cityStr = city
  if (city !== 'All Cities' && event.city_dates?.[city]?.start) {
    const cd = event.city_dates[city]
    const start = new Date(cd.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const end = cd.end && cd.end !== cd.start ? new Date(cd.end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null
    cityStr = `${city}  ·  ${end ? `${start} – ${end}` : start}`
  }
  const r4 = ws.addRow([cityStr])
  r4.getCell(totalCols).value = 'Quote valid for 30 days'
  ws.mergeCells(r4.number, 1, r4.number, half)
  ws.mergeCells(r4.number, half + 1, r4.number, totalCols)
  r4.height = 18
  r4.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex('F5F2EE') }
    cell.font = { color: hex('6B6560'), size: 10, name: 'Calibri' }
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }
  })

  ws.addRow([]).height = 6
}

function addColHeaders(ws, opts, totalCols) {
  const headers = ['SNO', 'ELEMENT', 'FINISH / SPECS']
  if (opts.showSize) headers.push('SIZE')
  if (opts.showQtyDays) { headers.push('QTY'); headers.push('DAYS') }
  if (opts.showInternal) headers.push('INTERNAL (₹)')
  headers.push('AMOUNT (₹)')
  if (opts.showStatus) headers.push('STATUS')

  const hRow = ws.addRow(headers)
  hRow.height = 22
  hRow.eachCell((cell, ci) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(C.colBg) }
    cell.font = { bold: true, color: hex(C.colText), size: 10, name: 'Calibri' }
    const isRight = ci > headers.length - (opts.showStatus ? 2 : 1)
    cell.alignment = { vertical: 'middle', horizontal: isRight ? 'right' : ci === 1 ? 'center' : 'left', indent: ci > 1 && !isRight ? 1 : 0 }
    applyBorder(cell, C.borderStrong)
  })
  return headers
}

function addTotalsBlock(ws, subtotal, agencyPct, gstPct, totalCols) {
  const agencyFee = Math.round(subtotal * agencyPct / 100)
  const subtotalFee = subtotal + agencyFee
  const gstAmt = Math.round(subtotalFee * gstPct / 100)
  const grandTotal = subtotalFee + gstAmt

  ws.addRow([]).height = 8

  const rows = [
    { label: 'Elements Subtotal', value: subtotal, bg: 'F5F2EE', color: '3D3A36', bold: false, size: 10 },
    { label: `Agency Fee (${agencyPct}%)`, value: agencyFee, bg: C.feeBg, color: C.feeText, bold: false, size: 10 },
    { label: 'Subtotal (before GST)', value: subtotalFee, bg: 'F5F2EE', color: '3D3A36', bold: true, size: 11 },
    { label: `GST (${gstPct}%)`, value: gstAmt, bg: C.feeBg, color: C.feeText, bold: false, size: 10 },
  ]

  rows.forEach(({ label, value, bg, color, bold, size }) => {
    const r = ws.addRow([])
    r.getCell(2).value = label
    r.getCell(totalCols).value = value
    ws.mergeCells(r.number, 1, r.number, totalCols - 1)
    r.height = 20
    r.eachCell((cell, ci) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(bg) }
      cell.font = { bold, color: hex(color), size, name: 'Calibri' }
      cell.alignment = { vertical: 'middle', horizontal: ci === totalCols ? 'right' : 'left', indent: 2 }
      applyBorder(cell, C.borderStrong)
      if (ci === totalCols && typeof cell.value === 'number') cell.numFmt = '₹#,##0'
    })
  })

  const gt = ws.addRow([])
  gt.getCell(2).value = 'GRAND TOTAL'
  gt.getCell(totalCols).value = grandTotal
  ws.mergeCells(gt.number, 1, gt.number, totalCols - 1)
  gt.height = 30
  gt.eachCell((cell, ci) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(C.grandBg) }
    cell.font = { bold: true, color: hex(C.grandText), size: 14, name: 'Calibri' }
    cell.alignment = { vertical: 'middle', horizontal: ci === totalCols ? 'right' : 'left', indent: 2 }
    applyBorder(cell, C.grandBg)
    if (ci === totalCols) cell.numFmt = '₹#,##0'
  })

  return grandTotal
}

function addTnC(ws, tnc, totalCols) {
  if (!tnc || !tnc.length) return
  ws.addRow([]).height = 12
  const h = ws.addRow(['TERMS & CONDITIONS'])
  ws.mergeCells(h.number, 1, h.number, totalCols)
  h.height = 20
  const hc = h.getCell(1)
  hc.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(C.colBg) }
  hc.font = { bold: true, color: hex(C.colText), size: 10, name: 'Calibri' }
  hc.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }
  tnc.forEach((clause, i) => {
    const r = ws.addRow([`${i + 1}.  ${clause}`])
    ws.mergeCells(r.number, 1, r.number, totalCols)
    r.height = 16
    const c = r.getCell(1)
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: hex('FAFAF8') }
    c.font = { color: hex('6B6560'), size: 9, name: 'Calibri' }
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 2, wrapText: true }
  })
}

function buildCitySheet(wb, sheetName, elements, event, city, opts) {
  const ws = wb.addWorksheet(sheetName)
  const cols = [
    { width: 6 }, { width: 38 }, { width: 24 },
    ...(opts.showSize ? [{ width: 14 }] : []),
    ...(opts.showQtyDays ? [{ width: 8 }, { width: 8 }] : []),
    ...(opts.showInternal ? [{ width: 16 }] : []),
    { width: 18 },
    ...(opts.showStatus ? [{ width: 14 }] : []),
  ]
  ws.columns = cols
  const totalCols = cols.length

  addHeaderBlock(ws, event, city, opts.sheetType, totalCols)
  const headers = addColHeaders(ws, opts, totalCols)
  const amtColIdx = headers.indexOf('AMOUNT (₹)') + 1
  const intColIdx = opts.showInternal ? headers.indexOf('INTERNAL (₹)') + 1 : -1

  const cats = {}
  elements.forEach(el => {
    if (!cats[el.category]) cats[el.category] = []
    cats[el.category].push(el)
  })

  let grandSubtotal = 0

  Object.entries(cats).forEach(([catName, els]) => {
    // Category row
    const cr = ws.addRow([catName.toUpperCase()])
    ws.mergeCells(cr.number, 1, cr.number, totalCols)
    cr.height = 20
    const cc = cr.getCell(1)
    cc.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(C.catBg) }
    cc.font = { bold: true, color: hex(C.catText), size: 11, name: 'Calibri' }
    cc.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }

    let sno = 1
    let catTotal = 0

    els.forEach((el, ei) => {
      const clientAmt = calcClient(el)
      const isActuals = el.cost_status === 'Client scope'
      if (!isActuals) { catTotal += clientAmt; grandSubtotal += clientAmt }

      const internalAmt = el.internal_lump
        ? (+(el.internal_amount) || 0)
        : (+(el.internal_rate) || 0) * (+(el.qty) || 1) * (+(el.days) || 1)

      const rowData = [sno++, el.element_name || '', el.finish || '']
      if (opts.showSize) rowData.push(el.size ? `${el.size} ${el.size_unit || ''}`.trim() : '')
      if (opts.showQtyDays) { rowData.push(el.qty || 1); rowData.push(el.days || 1) }
      if (opts.showInternal) rowData.push(internalAmt || '')
      rowData.push(isActuals ? 'On actuals' : (clientAmt || ''))
      if (opts.showStatus) rowData.push(el.cost_status || '')

      const row = ws.addRow(rowData)
      row.height = 18
      row.eachCell((cell, ci) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(ei % 2 === 1 ? C.rowAlt : C.rowBg) }
        cell.font = { color: hex(C.rowText), size: 10, name: 'Calibri' }
        cell.alignment = {
          vertical: 'middle',
          horizontal: ci === 1 ? 'center' : ci >= amtColIdx ? 'right' : 'left',
          indent: ci > 1 && ci < amtColIdx ? 1 : 0,
        }
        applyBorder(cell)
        if (ci === amtColIdx && typeof cell.value === 'number') { cell.numFmt = '₹#,##0'; cell.font = { ...cell.font, bold: true } }
        if (ci === intColIdx && typeof cell.value === 'number') { cell.numFmt = '₹#,##0'; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex('FFFBEB') } }
        if (opts.showStatus && ci === totalCols) {
          const sc = { Estimated: C.estimated, Confirmed: C.confirmed, Actuals: C.actuals, 'Client scope': C.clientScope }[el.cost_status]
          if (sc) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(sc) }
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        }
      })
    })

    // Category total
    const ct = ws.addRow([])
    ct.getCell(2).value = 'Category Total'
    ct.getCell(amtColIdx).value = catTotal
    ws.mergeCells(ct.number, 1, ct.number, amtColIdx - 1)
    ct.height = 18
    ct.eachCell((cell, ci) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(C.catTotalBg) }
      cell.font = { bold: true, italic: true, color: hex(C.catTotalText), size: 10, name: 'Calibri' }
      cell.alignment = { vertical: 'middle', horizontal: ci === amtColIdx ? 'right' : 'left', indent: ci === 1 ? 2 : 0 }
      applyBorder(cell, C.borderStrong)
      if (ci === amtColIdx) cell.numFmt = '₹#,##0'
    })
    ws.addRow([]).height = 4
  })

  addTotalsBlock(ws, grandSubtotal, event.agency_fee_percent || 10, event.gst_percent || 18, totalCols)
  addTnC(ws, opts.tnc, totalCols)

  // Footer
  ws.addRow([]).height = 8
  const fr = ws.addRow(['This proposal is confidential and prepared exclusively for the above-mentioned client by Myoozz Consulting Pvt. Ltd.'])
  ws.mergeCells(fr.number, 1, fr.number, totalCols)
  fr.height = 16
  const fc = fr.getCell(1)
  fc.font = { color: hex('B8B4AE'), size: 8, italic: true, name: 'Calibri' }
  fc.alignment = { vertical: 'middle', horizontal: 'center' }

  ws.views = [{ state: 'frozen', ySplit: 7 }]
}

function buildSummarySheet(wb, allElements, event, opts) {
  const ws = wb.addWorksheet('Summary')
  const cities = event.cities?.length > 0 ? event.cities : ['General']
  const totalCols = cities.length + 2
  ws.columns = [
    { width: 32 },
    ...cities.map(() => ({ width: 18 })),
    { width: 20 },
  ]

  addHeaderBlock(ws, event, 'All Cities', opts.sheetType, totalCols)

  // Column headers
  const hRow = ws.addRow(['CATEGORY', ...cities, 'TOTAL'])
  hRow.height = 22
  hRow.eachCell((cell, ci) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(C.catBg) }
    cell.font = { bold: true, color: hex(C.catText), size: 10, name: 'Calibri' }
    cell.alignment = { vertical: 'middle', horizontal: ci === 1 ? 'left' : 'center', indent: ci === 1 ? 2 : 0 }
    applyBorder(cell, C.borderStrong)
  })

  // Build category × city matrix
  const cats = {}
  allElements.forEach(el => {
    if (!cats[el.category]) cats[el.category] = {}
    cities.forEach(c => { if (!cats[el.category][c]) cats[el.category][c] = 0 })
    if (el.cost_status !== 'Client scope') {
      cats[el.category][el.city] = (cats[el.category][el.city] || 0) + calcClient(el)
    }
  })

  let colTotals = new Array(cities.length).fill(0)

  Object.entries(cats).forEach(([catName, cityAmts], ri) => {
    const cityVals = cities.map(c => cityAmts[c] || 0)
    const rowTotal = cityVals.reduce((s, v) => s + v, 0)
    const row = ws.addRow([catName, ...cityVals, rowTotal])
    row.height = 18
    row.eachCell((cell, ci) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(ri % 2 === 1 ? C.rowAlt : C.rowBg) }
      cell.font = { color: hex(C.rowText), size: 10, name: 'Calibri', bold: ci === totalCols }
      cell.alignment = { vertical: 'middle', horizontal: ci === 1 ? 'left' : 'right', indent: ci === 1 ? 2 : 0 }
      applyBorder(cell)
      if (ci > 1 && typeof cell.value === 'number') cell.numFmt = '₹#,##0'
    })
    cityVals.forEach((v, i) => { colTotals[i] += v })
  })

  // Subtotals row
  const grandSubtotal = colTotals.reduce((s, v) => s + v, 0)
  const subRow = ws.addRow(['Elements Subtotal', ...colTotals, grandSubtotal])
  subRow.height = 20
  subRow.eachCell((cell, ci) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(C.catTotalBg) }
    cell.font = { bold: true, color: hex(C.catTotalText), size: 10, name: 'Calibri' }
    cell.alignment = { vertical: 'middle', horizontal: ci === 1 ? 'left' : 'right', indent: ci === 1 ? 2 : 0 }
    applyBorder(cell, C.borderStrong)
    if (ci > 1 && typeof cell.value === 'number') cell.numFmt = '₹#,##0'
  })

  addTotalsBlock(ws, grandSubtotal, event.agency_fee_percent || 10, event.gst_percent || 18, totalCols)
  addTnC(ws, opts.tnc, totalCols)

  ws.views = [{ state: 'frozen', ySplit: 7 }]
}

export async function exportProposalExcel(event, elements, tncClauses, options = {}) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Myoozz Consulting Pvt. Ltd.'
  wb.created = new Date()

  const cities = event.cities?.length > 0 ? event.cities : ['General']
  const opts = {
    showSize: true,
    showFinish: true,
    showQtyDays: true,
    showStatus: false,
    showInternal: false,
    sheetType: 'Estimate',
    tnc: tncClauses || [],
    ...options,
  }

  // Summary sheet first (appears as first tab)
  buildSummarySheet(wb, elements, event, opts)

  // One sheet per city
  cities.forEach(city => {
    const cityEls = elements.filter(el => el.city === city)
    if (!cityEls.length) return
    buildCitySheet(wb, city.substring(0, 31), cityEls, event, city, opts)
  })

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const fileName = `${(event.event_name || 'Proposal').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/ +/g, '_')}_Myoozz.xlsx`
  saveAs(blob, fileName)
}

// ─── Helper ───────────────────────────────────────────────
function autoWidth(ws) {
  ws.columns.forEach(col => {
    let max = 10
    col.eachCell?.({ includeEmpty: false }, cell => {
      const len = cell.value ? String(cell.value).length : 0
      if (len > max) max = len
    })
    col.width = Math.min(max + 2, 50)
  })
}

function sheetHeader(ws, title, subtitle, cols) {
  ws.mergeCells(1, 1, 1, cols)
  const t = ws.getCell('A1')
  t.value = title
  t.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1917' } }
  t.alignment = { vertical: 'middle', horizontal: 'left' }
  ws.getRow(1).height = 28

  if (subtitle) {
    ws.mergeCells(2, 1, 2, cols)
    const s = ws.getCell('A2')
    s.value = subtitle
    s.font = { size: 10, color: { argb: 'FF6B6560' } }
    s.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0EDE8' } }
    ws.getRow(2).height = 18
    return 3
  }
  return 2
}

function colHeader(ws, row, headers, bg = 'FF2C2C2C') {
  const r = ws.getRow(row)
  headers.forEach((h, i) => {
    const cell = r.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
    cell.alignment = { vertical: 'middle', wrapText: true }
  })
  r.height = 20
}

// ─── 1. Element Master List ───────────────────────────────
export async function exportElementMaster(event, elements, clients) {
  const ExcelJS = (await import('exceljs')).default
  const { saveAs } = await import('file-saver')
  const wb = new ExcelJS.Workbook()

  const cities = [...new Set(elements.map(e => e.city))]
  const clientName = clients?.group_name || clients?.brand_name || 'Client'

  cities.forEach(city => {
    const ws = wb.addWorksheet(city)
    const cityEls = elements.filter(e => e.city === city)
    const startRow = sheetHeader(ws, `${event.event_name} — Element Master`, `${clientName} · ${city}`, 7)
    colHeader(ws, startRow, ['#', 'Category', 'Element', 'Specification / Finish', 'Size', 'Qty', 'Days'], 'FF2C2C2C')

    let row = startRow + 1
    let sno = 1
    const cats = [...new Set(cityEls.map(e => e.category))]
    cats.forEach(cat => {
      const catEls = cityEls.filter(e => e.category === cat)
      // Category row
      const cr = ws.getRow(row)
      ws.mergeCells(row, 1, row, 7)
      cr.getCell(1).value = cat
      cr.getCell(1).font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
      cr.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C2C2C' } }
      cr.height = 18
      row++

      catEls.forEach(el => {
        const r = ws.getRow(row)
        r.getCell(1).value = sno++
        r.getCell(2).value = el.category
        r.getCell(3).value = el.element_name
        r.getCell(4).value = el.finish || ''
        r.getCell(5).value = el.size ? `${el.size} ${el.size_unit || ''}`.trim() : ''
        r.getCell(6).value = el.qty || ''
        r.getCell(7).value = el.days || ''
        r.height = 16
        row++
      })
    })

    ws.columns = [
      { width: 5 }, { width: 20 }, { width: 30 }, { width: 28 }, { width: 14 }, { width: 8 }, { width: 8 }
    ]
  })

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `${event.event_name} — Element Master.xlsx`)
}

// ─── 2. Task Assignment Sheet ─────────────────────────────
export async function exportTaskAssignment(event, tasks, clients) {
  const ExcelJS = (await import('exceljs')).default
  const { saveAs } = await import('file-saver')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Task Assignment')
  const clientName = clients?.group_name || ''

  const startRow = sheetHeader(ws, `${event.event_name} — Task Assignment`, `${clientName} · Generated ${new Date().toLocaleDateString('en-IN')}`, 8)
  colHeader(ws, startRow, ['#', 'Category', 'Element', 'Category Owner', 'Assigned To', 'Phone', 'Deadline', 'Status'])

  const STATUS_LABELS = { not_started:'Not started', in_progress:'In progress', arranged:'Arranged', on_site:'On site', done:'Done' }

  let row = startRow + 1
  let sno = 1
  const cats = [...new Set(tasks.map(t => t.category))]
  cats.forEach(cat => {
    const catTasks = tasks.filter(t => t.category === cat)
    const cr = ws.getRow(row)
    ws.mergeCells(row, 1, row, 8)
    cr.getCell(1).value = cat
    cr.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cr.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C2C2C' } }
    row++

    catTasks.forEach(t => {
      const r = ws.getRow(row)
      r.getCell(1).value = sno++
      r.getCell(2).value = t.category
      r.getCell(3).value = t.element_name || ''
      r.getCell(4).value = t.category_owner || ''
      r.getCell(5).value = t.assigned_name || t.assigned_to || 'Unassigned'
      r.getCell(6).value = t.assigned_phone || ''
      r.getCell(7).value = t.deadline ? new Date(t.deadline).toLocaleDateString('en-IN') : ''
      r.getCell(8).value = STATUS_LABELS[t.status] || t.status
      if (t.status === 'done') r.getCell(8).font = { color: { argb: 'FF16A34A' }, bold: true }
      if (!t.assigned_name && !t.assigned_to) r.getCell(5).font = { color: { argb: 'FFDC2626' } }
      row++
    })
  })

  ws.columns = [{ width:5 },{ width:20 },{ width:30 },{ width:18 },{ width:18 },{ width:14 },{ width:14 },{ width:14 }]
  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `${event.event_name} — Task Assignment.xlsx`)
}

// ─── 3. Production & Print List ───────────────────────────
export async function exportProductionList(event, tasks, clients) {
  const ExcelJS = (await import('exceljs')).default
  const { saveAs } = await import('file-saver')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Production & Print')
  const clientName = clients?.group_name || ''

  const startRow = sheetHeader(ws, `${event.event_name} — Production & Print`, `${clientName} · ${new Date().toLocaleDateString('en-IN')}`, 9)
  colHeader(ws, startRow, ['#', 'Element', 'Type', 'Creative', 'Creative By', 'Fabrication', 'Fab By', 'Print', 'Print By'])

  const TYPE_LABELS = { fab_print:'Fab + Print', print:'Print only', creative:'Creative', procurement:'Procurement' }

  let row = startRow + 1
  let sno = 1
  const cats = [...new Set(tasks.map(t => t.category))]
  cats.forEach(cat => {
    const catTasks = tasks.filter(t => t.category === cat)
    const cr = ws.getRow(row)
    ws.mergeCells(row, 1, row, 9)
    cr.getCell(1).value = cat
    cr.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cr.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C2C2C' } }
    row++

    catTasks.forEach(t => {
      const r = ws.getRow(row)
      r.getCell(1).value = sno++
      r.getCell(2).value = t.element_name || ''
      r.getCell(3).value = TYPE_LABELS[t.element_type] || 'Procurement'
      r.getCell(4).value = t.creative_status?.replace(/_/g, ' ') || '—'
      r.getCell(5).value = t.creative_assignee || '—'
      r.getCell(6).value = t.element_type === 'fab_print' ? (t.fabrication_status?.replace(/_/g, ' ') || '—') : '—'
      r.getCell(7).value = t.fabrication_assignee || '—'
      r.getCell(8).value = ['fab_print','print'].includes(t.element_type) ? (t.print_status?.replace(/_/g, ' ') || '—') : '—'
      r.getCell(9).value = t.print_assignee || '—'

      // Flag blocked print
      if (t.print_status === 'printing' && !['client_approved','file_sent'].includes(t.creative_status)) {
        r.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
        r.getCell(8).font = { color: { argb: 'FFDC2626' }, bold: true }
      }
      row++
    })
  })

  ws.columns = [{ width:5 },{ width:28 },{ width:14 },{ width:18 },{ width:16 },{ width:18 },{ width:16 },{ width:16 },{ width:16 }]
  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `${event.event_name} — Production List.xlsx`)
}

// ─── 4. Vendor Contact Sheet ──────────────────────────────
export async function exportVendorContacts(event, elements, clients) {
  const ExcelJS = (await import('exceljs')).default
  const { saveAs } = await import('file-saver')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Vendor Contacts')
  const clientName = clients?.group_name || ''

  const startRow = sheetHeader(ws, `${event.event_name} — Vendor Contact Sheet`, clientName, 5)
  colHeader(ws, startRow, ['#', 'Category', 'Element', 'Vendor / Source', 'Contact'])

  // Group by vendor
  const withVendor = elements.filter(e => e.source)
  let row = startRow + 1
  let sno = 1
  const cats = [...new Set(withVendor.map(e => e.category))]
  cats.forEach(cat => {
    const catEls = withVendor.filter(e => e.category === cat)
    const cr = ws.getRow(row)
    ws.mergeCells(row, 1, row, 5)
    cr.getCell(1).value = cat
    cr.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cr.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C2C2C' } }
    row++
    catEls.forEach(el => {
      const r = ws.getRow(row)
      r.getCell(1).value = sno++
      r.getCell(2).value = el.category
      r.getCell(3).value = el.element_name
      r.getCell(4).value = el.source || ''
      r.getCell(5).value = '' // phone — to be filled manually or from rate cards
      row++
    })
  })

  ws.columns = [{ width:5 },{ width:22 },{ width:30 },{ width:24 },{ width:18 }]
  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `${event.event_name} — Vendor Contacts.xlsx`)
}

// ─── 5. Visual Control Chart (Reverse Timeline) ───────────
export async function exportTimeline(event, tasks, clients) {
  const ExcelJS = (await import('exceljs')).default
  const { saveAs } = await import('file-saver')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Timeline')
  const clientName = clients?.group_name || ''

  // Get date range
  const eventDate = event.event_date ? new Date(event.event_date) : null
  const deadlines = tasks.map(t => t.deadline).filter(Boolean).map(d => new Date(d))
  const minDate = deadlines.length ? new Date(Math.min(...deadlines)) : new Date()
  const maxDate = eventDate || (deadlines.length ? new Date(Math.max(...deadlines)) : new Date())

  // Build date columns
  const dates = []
  const cur = new Date(minDate)
  while (cur <= maxDate) {
    dates.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }

  const fixedCols = 4 // #, Element, Owner, Status
  const totalCols = fixedCols + dates.length
  const startRow = sheetHeader(ws, `${event.event_name} — Visual Control Chart`, `${clientName} · Event: ${eventDate?.toLocaleDateString('en-IN') || 'TBD'}`, totalCols)

  // Date headers
  const hdrRow = ws.getRow(startRow)
  hdrRow.getCell(1).value = '#'
  hdrRow.getCell(2).value = 'Element'
  hdrRow.getCell(3).value = 'Owner'
  hdrRow.getCell(4).value = 'Status'
  dates.forEach((d, i) => {
    const cell = hdrRow.getCell(fixedCols + 1 + i)
    cell.value = `${d.getDate()}/${d.getMonth()+1}`
    cell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: d.toDateString() === maxDate.toDateString() ? 'FFDC2626' : 'FF2C2C2C' } }
    cell.alignment = { textRotation: 45, horizontal: 'center' }
  })
  hdrRow.height = 48

  const STATUS_LABELS = { not_started:'Not started', in_progress:'In progress', arranged:'Arranged', on_site:'On site', done:'Done ✓' }

  let row = startRow + 1
  let sno = 1
  tasks.forEach(t => {
    const r = ws.getRow(row)
    r.getCell(1).value = sno++
    r.getCell(2).value = t.element_name || ''
    r.getCell(3).value = t.assigned_name || t.assigned_to || ''
    r.getCell(4).value = STATUS_LABELS[t.status] || ''

    // Fill deadline cell
    if (t.deadline) {
      const deadlineDate = new Date(t.deadline)
      const idx = dates.findIndex(d => d.toDateString() === deadlineDate.toDateString())
      if (idx >= 0) {
        const cell = r.getCell(fixedCols + 1 + idx)
        cell.value = '●'
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: t.status === 'done' ? 'FF86EFAC' : 'FFFBBF24' } }
        cell.alignment = { horizontal: 'center' }
      }
    }
    row++
  })

  ws.getColumn(1).width = 5
  ws.getColumn(2).width = 28
  ws.getColumn(3).width = 18
  ws.getColumn(4).width = 14
  for (let i = 5; i <= totalCols; i++) ws.getColumn(i).width = 5

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `${event.event_name} — Visual Control Chart.xlsx`)
}

// ─── 6. Cue Sheet / Show Flow ─────────────────────────────
export async function exportCueSheetExcel(event, sheets) {
  const ExcelJS = (await import('exceljs')).default
  const { saveAs } = await import('file-saver')
  const wb = new ExcelJS.Workbook()

  const cities = Object.keys(sheets)
  if (cities.length === 0) {
    alert('No cue sheet data to export.')
    return
  }

  cities.forEach(city => {
    const sheet = sheets[city]
    if (!sheet?.rows?.length) return

    const ws = wb.addWorksheet(city)
    const screens = sheet.screens || []
    const totalCols = 6 + screens.length // #, Start, End, Duration, Location, Activity, ...screens

    // Header block
    const startRow = sheetHeader(ws,
      `${event.event_name} — Cue Sheet / Show Flow`,
      `${city} · ${event.event_date ? new Date(event.event_date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : ''}`,
      totalCols
    )

    // Column headers
    const headers = ['#', 'Start', 'End', 'Duration', 'Location', 'Activity / Script', ...screens]
    const hdrRow = ws.getRow(startRow)
    headers.forEach((h, i) => {
      const cell = hdrRow.getCell(i + 1)
      cell.value = h
      cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i >= 6 ? 'FF2C2C2C' : 'FF1A1917' } }
      cell.alignment = { vertical: 'middle', horizontal: i >= 6 ? 'center' : 'left', wrapText: true }
    })
    hdrRow.height = 22

    // Rows
    let rowNum = startRow + 1
    sheet.rows.forEach((row, idx) => {
      const r = ws.getRow(rowNum)
      r.getCell(1).value = idx + 1
      r.getCell(2).value = row.start || ''
      r.getCell(3).value = row.end || ''
      r.getCell(4).value = row.duration || ''
      r.getCell(5).value = row.location || ''
      r.getCell(6).value = row.activity || ''

      screens.forEach((s, si) => {
        const cell = r.getCell(7 + si)
        cell.value = row.screenCues?.[s] || ''
        cell.alignment = { wrapText: true, vertical: 'top' }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFFFF' : 'FFFAF9F7' } }
      })

      // Style fixed cols
      for (let c = 1; c <= 6; c++) {
        r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFFFF' : 'FFFAF9F7' } }
        r.getCell(c).alignment = { vertical: 'top', wrapText: c === 6 }
      }
      r.getCell(1).font = { size: 9, color: { argb: 'FF9CA3AF' } }
      r.getCell(2).font = { bold: true, size: 10 }
      r.getCell(3).font = { size: 10, color: { argb: 'FF6B7280' } }
      r.getCell(4).font = { italic: true, size: 9, color: { argb: 'FF9CA3AF' } }
      r.getCell(6).font = { size: 11 }
      r.height = Math.max(18, (row.activity?.split('\n').length || 1) * 16)
      rowNum++
    })

    // Column widths
    ws.getColumn(1).width = 5
    ws.getColumn(2).width = 10
    ws.getColumn(3).width = 10
    ws.getColumn(4).width = 12
    ws.getColumn(5).width = 16
    ws.getColumn(6).width = 36
    screens.forEach((_, i) => { ws.getColumn(7 + i).width = 22 })

    // Freeze first row after headers
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: startRow, activeCell: `A${startRow + 1}` }]
  })

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `${event.event_name} — Cue Sheet.xlsx`)
}

// ─── Rate Card Import Template ────────────────────────────
// Generates a formatted .xlsx template for a given category.
// Called from RateCard.jsx → Download template dropdown.

const RC_BASE_COLS = [
  { header: 'Element Name',       width: 30 },
  { header: 'Specification',      width: 30 },
  { header: 'Unit',               width: 14 },
  { header: 'City',               width: 14 },
  { header: 'Country',            width: 12 },
  { header: 'Location Scope',     width: 18 },
  { header: 'Venue Type',         width: 14 },
  { header: 'Rate Min',           width: 14 },
  { header: 'Rate Max',           width: 14 },
  { header: 'Rate Confirmed',     width: 16 },
  { header: 'Per Unit Type',      width: 20 },
  { header: 'Vendor / Company',   width: 24 },
  { header: 'Source',             width: 18 },
  { header: 'Source URL',         width: 28 },
  { header: 'GST (Y/N)',          width: 10 },
  { header: 'Notes',              width: 32 },
]

const RC_EXTRA_COLS = {
  'Permissions & Legal':      [{ header: 'Pax Slab Min', width: 13 }, { header: 'Pax Slab Max', width: 13 }, { header: 'Mandatory / Conditional', width: 24 }],
  'Sound':                    [{ header: 'Per (Day/Event)', width: 16 }, { header: 'Pax Slab', width: 12 }, { header: 'Area (sqft)', width: 12 }],
  'Lighting':                 [{ header: 'Per (Day/Event)', width: 16 }, { header: 'Area (sqft)', width: 12 }],
  'Video & LED':              [{ header: 'Per (Day/Sqft/Event)', width: 20 }, { header: 'Area (sqft)', width: 12 }],
  'Stage':                    [{ header: 'Area (sqft)', width: 12 }, { header: 'Per (Sqft/Day)', width: 14 }],
  'Production & Fabrication': [{ header: 'Area (sqft)', width: 12 }, { header: 'Per Sqft', width: 12 }],
  'Branding & Signage':       [{ header: 'Area (sqft)', width: 12 }, { header: 'Per (Sqft/Mtr)', width: 14 }],
  'Manpower':                 [{ header: 'Per (Day/Shift)', width: 16 }, { header: 'Pax Slab', width: 12 }],
  'Furniture':                [{ header: 'Per (Day/Event)', width: 16 }, { header: 'Nos', width: 8 }],
  'Venue & Infrastructure':   [{ header: 'Area (sqft)', width: 12 }, { header: 'Per (Day/Event)', width: 16 }, { header: 'Pax Slab', width: 12 }],
  'Power & Electrical':       [{ header: 'Per (Day/KVA)', width: 14 }, { header: 'KVA Rating', width: 12 }],
  'Food & Beverage':          [{ header: 'Per Pax', width: 10 }, { header: 'Pax Slab', width: 12 }],
  'Travel Booking':           [{ header: 'Per Pax', width: 10 }, { header: 'Class (Economy/Business)', width: 24 }],
  'Logistics':                [{ header: 'Per (Trip/Day/Load)', width: 20 }, { header: 'Vehicle Type', width: 16 }],
  'Insurance':                [{ header: 'Per Event / Per Pax / % Budget', width: 30 }, { header: 'Coverage Type', width: 18 }],
}

export const RC_CATEGORIES = Object.keys(RC_EXTRA_COLS)

export async function generateRateCardTemplate(categoryName) {
  const ExcelJS = (await import('exceljs')).default
  const { saveAs } = await import('file-saver')

  const extra = RC_EXTRA_COLS[categoryName] || []
  const allCols = [...RC_BASE_COLS, ...extra]
  const nCols = allCols.length

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Myoozz Consulting Pvt. Ltd.'
  wb.created = new Date()

  const ws = wb.addWorksheet(categoryName)
  ws.columns = allCols.map(c => ({ width: c.width }))

  const hx = c => ({ argb: 'FF' + c })

  // Row 1 — title bar (matches C.headerBg style)
  ws.mergeCells(1, 1, 1, nCols)
  const r1 = ws.getRow(1)
  r1.height = 26
  const t1 = r1.getCell(1)
  t1.value = `Myoozz Rate Card Template  ·  ${categoryName}`
  t1.font = { bold: true, size: 13, color: hx(C.headerText), name: 'Calibri' }
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: hx(C.headerBg) }
  t1.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }

  // Row 2 — scope tip bar
  ws.mergeCells(2, 1, 2, nCols)
  const r2 = ws.getRow(2)
  r2.height = 24
  const t2 = r2.getCell(1)
  t2.value = 'Location Scope:  city = one city  |  state = state-wide  |  national = Pan-India (City = "Pan-India")  |  international = outside India'
  t2.font = { italic: true, size: 9, color: hx('1D4ED8'), name: 'Calibri' }
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: hx('EFF6FF') }
  t2.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }

  // Row 3 — per unit type tip
  ws.mergeCells(3, 1, 3, nCols)
  const r3 = ws.getRow(3)
  r3.height = 20
  const t3 = r3.getCell(1)
  t3.value = 'Per Unit Type allowed:  per day · per event · per pax · per sqft · per sqmtr · per ft · per mtr · per running ft · per running mtr · per KVA · per trip · per load · per shift · % of budget'
  t3.font = { italic: true, size: 8, color: hx('6B6560'), name: 'Calibri' }
  t3.fill = { type: 'pattern', pattern: 'solid', fgColor: hx('F5F2EE') }
  t3.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }

  // Row 4 — column headers
  const hRow = ws.getRow(4)
  hRow.height = 26
  allCols.forEach((col, i) => {
    const cell = hRow.getCell(i + 1)
    const isExtra = i >= RC_BASE_COLS.length
    cell.value = col.header
    cell.font = { bold: true, size: 9, color: hx('FFFFFF'), name: 'Calibri' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hx(isExtra ? 'D97706' : C.catBg) }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    const b = { style: 'thin', color: hx(C.borderStrong) }
    cell.border = { top: b, left: b, bottom: b, right: b }
  })

  // Rows 5–54 — 50 empty data rows, zebra
  for (let row = 5; row <= 54; row++) {
    const r = ws.getRow(row)
    r.height = 18
    for (let col = 1; col <= nCols; col++) {
      const cell = r.getCell(col)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hx(row % 2 === 0 ? C.rowAlt : C.rowBg) }
      cell.font = { size: 10, color: hx(C.rowText), name: 'Calibri' }
      const b = { style: 'thin', color: hx(C.border) }
      cell.border = { top: b, left: b, bottom: b, right: b }
      cell.alignment = { vertical: 'middle', wrapText: false }
    }
  }

  // Freeze below header row
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 4, activeCell: 'A5' }]

  const buf = await wb.xlsx.writeBuffer()
  const safe = categoryName.replace(/[^a-zA-Z0-9 &]/g, '').trim().replace(/ +/g, '_')
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Myoozz_RateCard_${safe}.xlsx`)
}

// ─── 8. Travel Plan ───────────────────────────────────────
// One sheet: "Team Travel"
// City-block group headers (dark). Rows colour-coded by type:
//   flight = blue  |  stay = grey  |  ground = amber
// agent_confirmed rows get a ✓ suffix on the type cell.
// Called from TravelItinerary.jsx → Export button.
//
// Signature: exportTravelPlan(event, travelRows, clients)
//   event       — full event object
//   travelRows  — rows from travel_plan table (not archived)
//   clients     — event.clients join (for client name in header)

export async function exportTravelPlan(event, travelRows, clients) {
  const ExcelJS = (await import('exceljs')).default
  const { saveAs } = await import('file-saver')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Myoozz Consulting Pvt. Ltd.'
  wb.created = new Date()

  const ws = wb.addWorksheet('Team Travel')
  const totalCols = 9
  const clientName = clients?.group_name || ''

  ws.columns = [
    { width: 5  }, // #
    { width: 12 }, // Date
    { width: 14 }, // Type badge
    { width: 22 }, // From / Hotel name
    { width: 22 }, // To / Check-out date
    { width: 12 }, // Dep time / Check-in date
    { width: 28 }, // Details (airline+flight+PNR / rooms+room type / vehicle+purpose)
    { width: 7  }, // Pax
    { width: 28 }, // Notes
  ]

  const startRow = sheetHeader(
    ws,
    `${event.event_name} — Team Travel Plan`,
    `${clientName} · Generated ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    totalCols
  )

  const TYPE_STYLE = {
    flight: { bg: 'DBEAFE', text: '1D4ED8', hdrBg: '1D4ED8', label: '✈  Flight'   },
    stay:   { bg: 'F3F4F6', text: '374151', hdrBg: '4B5563', label: '⌂  Stay'     },
    ground: { bg: 'FEF3C7', text: '92400E', hdrBg: '92400E', label: '⬡  Ground'   },
  }
  const SEAT_CLASS = {
    economy: 'Economy', premium_economy: 'Prem. Economy',
    business: 'Business', first: 'First',
  }

  const cities = event.cities?.length > 0
    ? event.cities
    : [...new Set((travelRows || []).map(r => r.city_block))]

  cities.forEach(city => {
    const cityRows = (travelRows || []).filter(r => r.city_block === city && !r.archived_at)
    if (!cityRows.length) return

    // ── City group header ──
    const ch = ws.addRow([city.toUpperCase()])
    ws.mergeCells(ch.number, 1, ch.number, totalCols)
    ch.height = 22
    const chc = ch.getCell(1)
    chc.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(C.headerBg) }
    chc.font = { bold: true, color: hex(C.headerText), size: 11, name: 'Calibri' }
    chc.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }

    // ── Column labels under this city ──
    const hRow = ws.addRow(['#', 'DATE', 'TYPE', 'FROM / HOTEL', 'TO / CHK-OUT', 'TIME / CHK-IN', 'DETAILS', 'PAX', 'NOTES'])
    hRow.height = 18
    hRow.eachCell((cell, ci) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(C.colBg) }
      cell.font = { bold: true, color: hex(C.colText), size: 9, name: 'Calibri' }
      cell.alignment = { vertical: 'middle', horizontal: ci === 1 || ci === 8 ? 'center' : 'left', indent: ci > 1 && ci < 8 ? 1 : 0 }
      applyBorder(cell, C.borderStrong)
    })

    // Write rows in type order: flights → stays → ground
    const flights = cityRows.filter(r => r.entry_type === 'flight')
    const stays   = cityRows.filter(r => r.entry_type === 'stay')
    const ground  = cityRows.filter(r => r.entry_type === 'ground')

    ;[...flights, ...stays, ...ground].forEach((row, idx) => {
      const ts = TYPE_STYLE[row.entry_type] || TYPE_STYLE.flight

      let from = '', to = '', timecheckin = '', details = ''

      if (row.entry_type === 'flight') {
        from        = row.from_location || ''
        to          = row.to_location   || ''
        timecheckin = row.time_start    || ''
        details     = [
          row.airline,
          row.flight_no,
          row.pnr ? `PNR: ${row.pnr}` : '',
          row.seat_class ? SEAT_CLASS[row.seat_class] : '',
        ].filter(Boolean).join('  ·  ')
      } else if (row.entry_type === 'stay') {
        from        = row.hotel_name || ''
        to          = row.check_out
          ? new Date(row.check_out).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''
        timecheckin = row.check_in
          ? new Date(row.check_in).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''
        details     = [
          row.rooms     ? `${row.rooms} room${row.rooms > 1 ? 's' : ''}` : '',
          row.room_type || '',
        ].filter(Boolean).join('  ·  ')
      } else {
        from        = row.from_location  || ''
        to          = row.to_location    || ''
        timecheckin = row.time_start     || ''
        details     = [
          row.vehicle_type,
          row.vehicle_count ? `×${row.vehicle_count}` : '',
          row.purpose,
        ].filter(Boolean).join('  ·  ')
      }

      const dateStr = row.travel_date
        ? new Date(row.travel_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : ''

      const typeLabel = row.source === 'agent_confirmed'
        ? ts.label + '  ✓'
        : ts.label

      const r = ws.addRow([
        idx + 1, dateStr, typeLabel, from, to,
        timecheckin, details, row.pax_count || '', row.notes || '',
      ])
      r.height = 18

      r.eachCell((cell, ci) => {
        const isAlt = idx % 2 === 1
        cell.fill = {
          type: 'pattern', pattern: 'solid',
          fgColor: hex(ci === 3 ? ts.bg : isAlt ? C.rowAlt : C.rowBg),
        }
        cell.font = {
          color: { argb: 'FF' + (ci === 3 ? ts.text : C.rowText) },
          bold: ci === 3 || ci === 4,
          size: 10, name: 'Calibri',
        }
        cell.alignment = {
          vertical: 'middle',
          horizontal: ci === 1 || ci === 8 ? 'center' : 'left',
          indent: ci > 1 && ci < 8 ? 1 : 0,
        }
        applyBorder(cell)
      })

      // Confirmed source: make type cell text green
      if (row.source === 'agent_confirmed') {
        const tc = r.getCell(3)
        tc.font = { ...tc.font, color: { argb: 'FF15803D' }, bold: true }
        tc.fill = { type: 'pattern', pattern: 'solid', fgColor: hex('D1FAE5') }
      }
    })

    ws.addRow([]).height = 6
  })

  ws.views = [{ state: 'frozen', ySplit: startRow }]

  const safe = (event.event_name || 'Event').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/ +/g, '_')
  const buf = await wb.xlsx.writeBuffer()
  saveAs(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${safe} — Travel Plan.xlsx`
  )
}

// ─── 9. MICE Itinerary ────────────────────────────────────
// Three sheets:
//   Sheet 1 — Day Program   (section → items, time · venue · responsibility)
//   Sheet 2 — Rooming List  (per-pax hotel + meal + status)
//   Sheet 3 — Cost Summary  (admin only: per-pax + total, client vs internal)
//
// Signature: exportMICEItinerary(event, itinerary, days, sections, items, roomingList, clients, userRole)
//   days        — rows from itinerary_days
//   sections    — rows from itinerary_sections
//   items       — rows from itinerary_items
//   roomingList — rows from rooming_list (not archived)
//   userRole    — 'admin' | other (controls internal cost cols + ID col)

export async function exportMICEItinerary(event, itinerary, days, sections, items, roomingList, clients, userRole) {
  const ExcelJS = (await import('exceljs')).default
  const { saveAs } = await import('file-saver')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Myoozz Consulting Pvt. Ltd.'
  wb.created = new Date()

  const isAdmin   = userRole === 'admin'
  const clientName = clients?.group_name || ''
  const tripTitle  = itinerary?.title || event.event_name
  const pax        = itinerary?.pax_confirmed || 1

  const RESP_LABEL = { internal: 'Internal', local: 'Local DMC', client: 'Client' }
  const MEAL_LABELS = { CP: 'CP', MAP: 'MAP', AP: 'AP', EP: 'EP', AI: 'All Inclusive' }

  // ── Sheet 1: Day Program ─────────────────────────────────

  const ws1     = wb.addWorksheet('Day Program')
  const dp_cols = isAdmin ? 8 : 7

  ws1.columns = [
    { width: 7  }, // Day
    { width: 7  }, // Section
    { width: 14 }, // Time
    { width: 34 }, // Activity
    { width: 24 }, // Venue
    { width: 14 }, // Responsibility
    { width: 16 }, // Cost / pax or lump (client)
    ...(isAdmin ? [{ width: 16 }] : []), // Internal cost (admin only)
  ]

  const dateRange = [itinerary?.start_date, itinerary?.end_date]
    .filter(Boolean)
    .map(d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }))
    .join(' – ')

  const hdr1 = sheetHeader(
    ws1,
    `${tripTitle} — Day Program`,
    `${clientName}${dateRange ? '  ·  ' + dateRange : ''}  ·  ${pax} pax confirmed`,
    dp_cols
  )

  const dpHeaders = ['DAY', 'SEC', 'TIME', 'ACTIVITY', 'VENUE', 'BY', 'COST / PAX (₹)']
  if (isAdmin) dpHeaders.push('INTERNAL (₹)')
  colHeader(ws1, hdr1, dpHeaders)

  let row1 = hdr1 + 1

  ;(days || []).forEach(day => {
    // ── Day header ──
    const dayLabel = `Day ${day.day_number}${day.title ? '  —  ' + day.title : ''}${day.date ? '  ·  ' + new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }) : ''}`
    const dr = ws1.getRow(row1)
    ws1.mergeCells(row1, 1, row1, dp_cols)
    dr.getCell(1).value = dayLabel
    dr.getCell(1).font = { bold: true, color: hex(C.headerText), size: 10, name: 'Calibri' }
    dr.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: hex('BC1723') }
    dr.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }
    dr.height = 20
    row1++

    const daySects = (sections || []).filter(s => s.day_id === day.id)

    daySects.forEach(sect => {
      const sectItems = (items || [])
        .filter(i => i.section_id === sect.id)
        .sort((a, b) => a.sort_order - b.sort_order)

      if (!sectItems.length) {
        // Section row with no items
        const sr = ws1.getRow(row1)
        sr.getCell(2).value = `§${sect.section_number}`
        sr.getCell(3).value = ''
        sr.getCell(4).value = sect.title || ''
        sr.getCell(5).value = sect.venue || ''
        sr.getCell(6).value = RESP_LABEL[sect.responsibility] || 'Internal'
        sr.height = 16
        sr.eachCell((cell, ci) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(C.colBg) }
          cell.font = { size: 9, color: hex(C.colText), italic: true, name: 'Calibri' }
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
          applyBorder(cell)
        })
        row1++
        return
      }

      sectItems.forEach((item, ii) => {
        const r = ws1.getRow(row1)
        r.getCell(1).value = ii === 0 ? `D${day.day_number}` : ''
        r.getCell(2).value = ii === 0 ? `§${sect.section_number}` : ''
        r.getCell(3).value = [item.time_start, item.time_end].filter(Boolean).join(' – ')
        r.getCell(4).value = item.activity || ''
        r.getCell(5).value = item.venue || sect.venue || ''
        r.getCell(6).value = RESP_LABEL[item.responsibility || sect.responsibility] || 'Internal'
        r.getCell(7).value = item.cost_per_pax || item.cost_lump || ''
        if (isAdmin) r.getCell(8).value = item.internal_cost || ''
        r.height = 16

        const isAlt = ii % 2 === 1
        r.eachCell((cell, ci) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(isAlt ? C.rowAlt : C.rowBg) }
          cell.font = { size: 10, color: hex(C.rowText), name: 'Calibri' }
          cell.alignment = {
            vertical: 'middle',
            horizontal: ci >= 7 ? 'right' : ci === 1 ? 'center' : 'left',
            indent: ci > 1 && ci < 7 ? 1 : 0,
          }
          applyBorder(cell)
          if (ci === 7 && typeof cell.value === 'number') cell.numFmt = '₹#,##0'
          if (ci === 8 && typeof cell.value === 'number') {
            cell.numFmt = '₹#,##0'
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex('FFFBEB') }
          }
        })

        // Responsibility pill colour
        const resp = item.responsibility || sect.responsibility
        if (resp === 'local')   r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: hex('FEF3C7') }
        if (resp === 'client')  r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: hex('F3F4F6') }

        row1++
      })
    })

    ws1.addRow([]).height = 4
    row1++
  })

  ws1.views = [{ state: 'frozen', ySplit: hdr1 }]

  // ── Sheet 2: Rooming List ────────────────────────────────

  const rl_cols = isAdmin ? 9 : 7
  const ws2     = wb.addWorksheet('Rooming List')

  ws2.columns = [
    { width: 5  }, // #
    { width: 26 }, // Name
    { width: 18 }, // Room type
    { width: 14 }, // Check-in
    { width: 14 }, // Check-out
    { width: 12 }, // Meal plan
    { width: 14 }, // Status
    ...(isAdmin ? [{ width: 16 }, { width: 22 }] : []), // Mobile, ID (admin only)
  ]

  const hdr2 = sheetHeader(
    ws2,
    `${tripTitle} — Rooming List`,
    `${clientName}  ·  ${(roomingList || []).length} guests`,
    rl_cols
  )

  const rlHeaders = ['#', 'GUEST NAME', 'ROOM TYPE', 'CHECK IN', 'CHECK OUT', 'MEAL', 'STATUS']
  if (isAdmin) { rlHeaders.push('MOBILE'); rlHeaders.push('ID (ADMIN ONLY)') }
  colHeader(ws2, hdr2, rlHeaders)

  let row2 = hdr2 + 1

  ;(roomingList || []).forEach((guest, idx) => {
    const r = ws2.getRow(row2)
    r.getCell(1).value = idx + 1
    r.getCell(2).value = guest.name || ''
    r.getCell(3).value = guest.room_type || ''
    r.getCell(4).value = guest.check_in
      ? new Date(guest.check_in).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
    r.getCell(5).value = guest.check_out
      ? new Date(guest.check_out).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
    r.getCell(6).value = MEAL_LABELS[guest.meal_plan] || guest.meal_plan || ''
    r.getCell(7).value = guest.status
      ? guest.status.charAt(0).toUpperCase() + guest.status.slice(1) : ''
    if (isAdmin) {
      r.getCell(8).value = guest.mobile   || ''
      r.getCell(9).value = guest.id_type
        ? `${guest.id_type.replace(/_/g, ' ')}: ${guest.id_number || '—'}` : ''
    }
    r.height = 16

    r.eachCell((cell, ci) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(idx % 2 === 1 ? C.rowAlt : C.rowBg) }
      cell.font = { size: 10, color: hex(C.rowText), name: 'Calibri' }
      cell.alignment = { vertical: 'middle', horizontal: ci === 1 ? 'center' : 'left', indent: ci > 1 ? 1 : 0 }
      applyBorder(cell)
    })

    // Status colour
    const sc = r.getCell(7)
    if (guest.status === 'confirmed') sc.fill = { type: 'pattern', pattern: 'solid', fgColor: hex('D1FAE5') }
    if (guest.status === 'tentative') sc.fill = { type: 'pattern', pattern: 'solid', fgColor: hex('FEF3C7') }
    if (guest.status === 'cancelled') sc.fill = { type: 'pattern', pattern: 'solid', fgColor: hex('FEE2E2') }

    row2++
  })

  // Summary bar below the list
  ws2.addRow([]).height = 8
  const confirmed = (roomingList || []).filter(g => g.status === 'confirmed').length
  const tentative  = (roomingList || []).filter(g => g.status === 'tentative').length
  const sumRow = ws2.addRow([
    '', `Confirmed: ${confirmed}`, `Tentative: ${tentative}`,
    `Total: ${(roomingList || []).length}`,
  ])
  ws2.mergeCells(sumRow.number, 4, sumRow.number, rl_cols)
  sumRow.height = 18
  sumRow.eachCell(cell => {
    cell.font = { bold: true, size: 10, name: 'Calibri', color: hex('3D3A36') }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(C.catTotalBg) }
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }
    applyBorder(cell, C.borderStrong)
  })

  ws2.views = [{ state: 'frozen', ySplit: hdr2 }]

  // ── Sheet 3: Cost Summary (admin only) ───────────────────

  if (isAdmin) {
    const ws3 = wb.addWorksheet('Cost Summary')
    ws3.columns = [{ width: 36 }, { width: 18 }, { width: 18 }, { width: 18 }]

    const hdr3 = sheetHeader(
      ws3,
      `${tripTitle} — Cost Summary`,
      `${clientName}  ·  ${pax} pax confirmed  ·  Admin view`,
      4
    )
    colHeader(ws3, hdr3, ['ACTIVITY', 'CLIENT COST (₹)', 'INTERNAL COST (₹)', 'PER PAX (₹)'])

    let row3 = hdr3 + 1
    let totalClient = 0, totalInternal = 0

    ;(items || []).forEach((item, idx) => {
      const clientCost   = item.cost_per_pax ? item.cost_per_pax * pax : (item.cost_lump || 0)
      const internalCost = item.internal_cost || 0
      totalClient   += clientCost
      totalInternal += internalCost

      const r = ws3.getRow(row3)
      r.getCell(1).value = item.activity || ''
      r.getCell(2).value = clientCost   || ''
      r.getCell(3).value = internalCost || ''
      r.getCell(4).value = item.cost_per_pax || (pax > 0 ? Math.round(clientCost / pax) : 0) || ''
      r.height = 16

      r.eachCell((cell, ci) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(idx % 2 === 1 ? C.rowAlt : C.rowBg) }
        cell.font = { size: 10, color: hex(C.rowText), name: 'Calibri' }
        cell.alignment = { vertical: 'middle', horizontal: ci > 1 ? 'right' : 'left', indent: ci === 1 ? 1 : 0 }
        applyBorder(cell)
        if (ci > 1 && typeof cell.value === 'number') cell.numFmt = '₹#,##0'
        if (ci === 3) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex('FFFBEB') }
      })
      row3++
    })

    // Grand total row
    ws3.addRow([]).height = 6
    const totRow = ws3.getRow(row3 + 1)
    totRow.getCell(1).value = 'TOTAL'
    totRow.getCell(2).value = totalClient
    totRow.getCell(3).value = totalInternal
    totRow.getCell(4).value = pax > 0 ? Math.round(totalClient / pax) : 0
    totRow.height = 28
    totRow.eachCell((cell, ci) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex(C.grandBg) }
      cell.font = { bold: true, color: hex(C.grandText), size: 13, name: 'Calibri' }
      cell.alignment = { vertical: 'middle', horizontal: ci > 1 ? 'right' : 'left', indent: ci === 1 ? 2 : 0 }
      applyBorder(cell, C.grandBg)
      if (ci > 1 && typeof cell.value === 'number') cell.numFmt = '₹#,##0'
    })

    // Margin row (admin insight)
    const margin    = totalClient - totalInternal
    const marginPct = totalClient > 0 ? ((margin / totalClient) * 100).toFixed(1) : 0
    const mRow = ws3.getRow(row3 + 2)
    mRow.getCell(1).value = `Margin: ${marginPct}%`
    mRow.getCell(2).value = margin
    mRow.height = 20
    ws3.mergeCells(mRow.number, 3, mRow.number, 4)
    mRow.eachCell((cell, ci) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: hex('FFFBEB') }
      cell.font = { bold: true, size: 10, name: 'Calibri', color: hex('92400E') }
      cell.alignment = { vertical: 'middle', horizontal: ci > 1 ? 'right' : 'left', indent: ci === 1 ? 2 : 0 }
      if (ci === 2 && typeof cell.value === 'number') cell.numFmt = '₹#,##0'
    })

    ws3.views = [{ state: 'frozen', ySplit: hdr3 }]
  }

  const safe = (event.event_name || 'Event').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/ +/g, '_')
  const buf = await wb.xlsx.writeBuffer()
  saveAs(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${safe} — MICE Itinerary.xlsx`
  )
}

// ─── 10. Agent Template ───────────────────────────────────
// Pre-filled Excel the ops team sends to the travel agent.
// One row per city × type (flight / stay / ground), pre-populated
// with event name, city names, and event dates from city_dates.
// Agent fills it and returns → parsed by "Import from Agent" in TravelItinerary.jsx.
//
// Column colour-coding matches TravelItinerary.jsx card accents:
//   City/Date cols  = dark header
//   Flight cols     = blue
//   Stay cols       = grey
//   Ground cols     = amber
//
// Signature: generateAgentTemplate(event)

export async function generateAgentTemplate(event) {
  const ExcelJS = (await import('exceljs')).default
  const { saveAs } = await import('file-saver')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Myoozz Consulting Pvt. Ltd.'
  wb.created = new Date()

  const ws         = wb.addWorksheet('Agent Template')
  const totalCols  = 17

  ws.columns = [
    { width: 16 }, // A  City
    { width: 12 }, // B  Date
    { width: 13 }, // C  Type
    { width: 18 }, // D  From
    { width: 18 }, // E  To
    { width: 10 }, // F  Time
    { width: 12 }, // G  Flight No
    { width: 14 }, // H  Airline
    { width: 12 }, // I  PNR
    { width: 20 }, // J  Seat Class
    { width: 26 }, // K  Hotel Name
    { width: 12 }, // L  Check-in
    { width: 12 }, // M  Check-out
    { width: 8  }, // N  Rooms
    { width: 16 }, // O  Room Type
    { width: 18 }, // P  Budget/Night (₹)
    { width: 32 }, // Q  Notes
  ]

  // ── Row 1: Title bar ──
  ws.mergeCells(1, 1, 1, totalCols)
  const r1c = ws.getCell('A1')
  r1c.value     = `${event.event_name || 'Event'}  —  Travel Agent Template`
  r1c.font      = { bold: true, size: 13, color: hex(C.headerText), name: 'Calibri' }
  r1c.fill      = { type: 'pattern', pattern: 'solid', fgColor: hex(C.headerBg) }
  r1c.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }
  ws.getRow(1).height = 28

  // ── Row 2: Subtitle ──
  ws.mergeCells(2, 1, 2, totalCols)
  const r2c = ws.getCell('A2')
  r2c.value     = `Prepared by Myoozz Consulting Pvt. Ltd.  ·  Fill all applicable fields and return. Leave blank if not applicable.`
  r2c.font      = { size: 9, italic: true, color: hex(C.headerSub), name: 'Calibri' }
  r2c.fill      = { type: 'pattern', pattern: 'solid', fgColor: hex(C.headerBg) }
  r2c.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }
  ws.getRow(2).height = 18

  // ── Row 3: Type instruction ──
  ws.mergeCells(3, 1, 3, totalCols)
  const r3c = ws.getCell('A3')
  r3c.value     = 'TYPE: "flight" | "stay" | "ground"   ·   Seat Class: economy / premium_economy / business / first   ·   One row per flight leg / hotel stay / transfer.'
  r3c.font      = { size: 9, italic: true, color: { argb: 'FF1D4ED8' }, name: 'Calibri' }
  r3c.fill      = { type: 'pattern', pattern: 'solid', fgColor: hex('EFF6FF') }
  r3c.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }
  ws.getRow(3).height = 18

  // ── Row 4: Column headers (colour-banded by section) ──
  const colDefs = [
    { label: 'CITY',             bg: C.headerBg },
    { label: 'DATE',             bg: C.headerBg },
    { label: 'TYPE',             bg: '1D4ED8'   },
    { label: 'FROM',             bg: '1D4ED8'   },
    { label: 'TO',               bg: '1D4ED8'   },
    { label: 'TIME',             bg: '1D4ED8'   },
    { label: 'FLIGHT NO',        bg: '1D4ED8'   },
    { label: 'AIRLINE',          bg: '1D4ED8'   },
    { label: 'PNR',              bg: '1D4ED8'   },
    { label: 'SEAT CLASS',       bg: '1D4ED8'   },
    { label: 'HOTEL NAME',       bg: '4B5563'   },
    { label: 'CHECK-IN',         bg: '4B5563'   },
    { label: 'CHECK-OUT',        bg: '4B5563'   },
    { label: 'ROOMS',            bg: '4B5563'   },
    { label: 'ROOM TYPE',        bg: '92400E'   },
    { label: 'BUDGET/NIGHT (₹)', bg: '92400E'   },
    { label: 'NOTES',            bg: C.catBg    },
  ]

  const hRow = ws.getRow(4)
  hRow.height = 36
  colDefs.forEach(({ label, bg }, i) => {
    const cell = hRow.getCell(i + 1)
    cell.value     = label
    cell.font      = { bold: true, size: 9, color: { argb: 'FFFFFFFF' }, name: 'Calibri' }
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: hex(bg) }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    const b = { style: 'thin', color: hex(C.borderStrong) }
    cell.border = { top: b, left: b, bottom: b, right: b }
  })

  // ── Row 5: Section legend ──
  // Merge and label each colour band
  ws.mergeCells(5, 1, 5, 2)
  ws.mergeCells(5, 3, 5, 10)
  ws.mergeCells(5, 11, 5, 14)
  ws.mergeCells(5, 15, 5, 16)
  ws.mergeCells(5, 17, 5, 17)
  const legDefs = [
    { col: 1,  text: 'City & Date',      bg: C.headerBg },
    { col: 3,  text: '← Flight fields',  bg: '1D4ED8'   },
    { col: 11, text: '← Stay fields',    bg: '4B5563'   },
    { col: 15, text: '← Ground',         bg: '92400E'   },
    { col: 17, text: 'Notes',            bg: C.catBg    },
  ]
  const legRow = ws.getRow(5)
  legRow.height = 14
  legDefs.forEach(({ col, text, bg }) => {
    const cell = legRow.getCell(col)
    cell.value     = text
    cell.font      = { size: 8, italic: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri' }
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: hex(bg) }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  // ── Rows 6+: Pre-filled city rows ──
  const DATA_STYLE = {
    flight: { bg: 'DBEAFE', text: '1E3A5F' },
    stay:   { bg: 'F3F4F6', text: '1F2937' },
    ground: { bg: 'FEF3C7', text: '78350F' },
  }

  const cities   = event.cities || []
  let dataRow    = 6

  const bThin = { style: 'thin', color: hex(C.border) }
  const bStg  = { style: 'thin', color: hex(C.borderStrong) }

  if (cities.length > 0) {
    cities.forEach(city => {
      const cd = event.city_dates?.[city]
      const dateStr = cd?.start
        ? new Date(cd.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : ''

      ;['flight', 'stay', 'ground'].forEach(type => {
        const ds  = DATA_STYLE[type]
        const row = ws.getRow(dataRow)
        row.getCell(1).value = city
        row.getCell(2).value = dateStr
        row.getCell(3).value = type
        row.height = 20

        for (let col = 1; col <= totalCols; col++) {
          const cell = row.getCell(col)
          const isPreFill = col <= 3
          cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: hex(ds.bg) }
          cell.font      = {
            size: 10, name: 'Calibri',
            color: { argb: 'FF' + ds.text },
            italic: isPreFill, bold: isPreFill && col === 1,
          }
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: col > 1 ? 1 : 0 }
          cell.border    = { top: bThin, left: bThin, bottom: bThin, right: bThin }
        }
        // stronger left border on first data cell
        row.getCell(1).border = { top: bStg, left: bStg, bottom: bStg, right: bThin }
        dataRow++
      })

      // Spacer between cities
      ws.getRow(dataRow).height = 5
      dataRow++
    })
  } else {
    // No cities — 15 blank data rows
    for (let i = 0; i < 15; i++) {
      const r = ws.getRow(dataRow + i)
      r.height = 20
      for (let col = 1; col <= totalCols; col++) {
        const cell = r.getCell(col)
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: hex(i % 2 === 0 ? C.rowBg : C.rowAlt) }
        cell.border = { top: bThin, left: bThin, bottom: bThin, right: bThin }
      }
    }
  }

  // Freeze header block (rows 1–5)
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 5, activeCell: 'A6' }]

  const safe = (event.event_name || 'Event').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/ +/g, '_')
  const buf  = await wb.xlsx.writeBuffer()
  saveAs(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${safe}_Agent_Template.xlsx`
  )
}
