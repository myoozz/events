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
