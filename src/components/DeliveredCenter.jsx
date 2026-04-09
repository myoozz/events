import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import {
  exportProposalExcel,
  exportElementMaster,
  exportTaskAssignment,
  exportProductionList,
  exportVendorContacts,
  exportTimeline,
} from '../utils/excelExport'

const DOCS = [
  {
    key: 'proposal',
    icon: '📄',
    title: 'Proposal',
    desc: 'Full cost sheet as sent to client — city-wise with agency fee, GST and T&C',
    color: '#1A1917',
  },
  {
    key: 'elements',
    icon: '📋',
    title: 'Element master list',
    desc: 'All elements city-wise with size, qty, specification — in the format you need',
    color: '#1E40AF',
  },
  {
    key: 'tasks',
    icon: '👥',
    title: 'Task assignment sheet',
    desc: 'Who owns what — category owner, assigned to, deadline, status',
    color: '#5B21B6',
  },
  {
    key: 'production',
    icon: '🎨',
    title: 'Production & print list',
    desc: 'Creative, fabrication and print status for every element',
    color: '#065F46',
  },
  {
    key: 'vendors',
    icon: '📞',
    title: 'Vendor contact sheet',
    desc: 'Element → vendor → contact — ready to share with your team',
    color: '#92400E',
  },
  {
    key: 'timeline',
    icon: '📅',
    title: 'Visual control chart',
    desc: 'Reverse timeline — every task mapped against dates. Your Gantt.',
    color: '#9D174D',
  },
]

export default function DeliveredCenter({ event, session }) {
  const [elements, setElements] = useState([])
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(null)
  const [allDone, setAllDone] = useState(false)

  useEffect(() => { loadData() }, [event.id])

  async function loadData() {
    setLoading(true)
    const [{ data: els }, { data: tks }, { data: cl }] = await Promise.all([
      supabase.from('elements').select('*').eq('event_id', event.id).order('category'),
      supabase.from('tasks')
        .select('*, elements(element_name, size, size_unit, qty, days, finish, source, city)')
        .eq('event_id', event.id).order('category'),
      supabase.from('clients').select('*').eq('id', event.client_id).single(),
    ])
    const flatTasks = (tks || []).map(t => ({
      ...t,
      element_name: t.elements?.element_name || '',
      size: t.elements?.size || '',
      size_unit: t.elements?.size_unit || '',
      qty: t.elements?.qty || '',
      days: t.elements?.days || '',
      finish: t.elements?.finish || '',
      source: t.elements?.source || '',
      city: t.elements?.city || '',
    }))
    setElements(els || [])
    setTasks(flatTasks)
    setClients(cl)
    const tasksDone = flatTasks.length > 0 && flatTasks.every(t => t.status === 'done')
    setAllDone(tasksDone)
    setLoading(false)
  }

  async function download(key) {
    setDownloading(key)
    try {
      if (key === 'proposal') await exportProposalExcel(event, elements, [], {})
      if (key === 'elements') await exportElementMaster(event, elements, clients)
      if (key === 'tasks') await exportTaskAssignment(event, tasks, clients)
      if (key === 'production') await exportProductionList(event, tasks, clients)
      if (key === 'vendors') await exportVendorContacts(event, elements, clients)
      if (key === 'timeline') await exportTimeline(event, tasks, clients)
    } catch (e) {
      console.error(e)
      alert('Export failed. Please try again.')
    }
    setDownloading(null)
  }

  async function downloadAll() {
    setDownloading('all')
    for (const doc of DOCS) {
      await download(doc.key)
      await new Promise(r => setTimeout(r, 400))
    }
    setDownloading(null)
  }

  const taskTotal = tasks.length
  const taskDone = tasks.filter(t => t.status === 'done').length
  const pct = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0

  return (
    <div>
      {/* Status banner */}
      <div style={{
        padding: '20px 24px',
        borderRadius: 'var(--radius-sm)',
        background: allDone ? '#DCFCE7' : 'var(--bg-secondary)',
        border: `0.5px solid ${allDone ? '#86EFAC' : 'var(--border)'}`,
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <p style={{ fontSize: '16px', fontWeight: 500, color: allDone ? '#15803D' : 'var(--text)', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
            {allDone ? '🎉 All tasks done. Well done.' : `${taskDone} of ${taskTotal} tasks complete — ${pct}%`}
          </p>
          <p style={{ fontSize: '12px', color: allDone ? '#16A34A' : 'var(--text-tertiary)' }}>
            {allDone
              ? 'Your event has been delivered. All documents are ready to download.'
              : 'Complete all tasks to unlock the full delivered state. Documents are available anytime.'}
          </p>
        </div>
        {taskTotal > 0 && (
          <div style={{ minWidth: '120px' }}>
            <div style={{ height: '8px', background: 'white', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: allDone ? '#16A34A' : 'var(--text)', borderRadius: '4px', transition: 'width 0.3s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Document grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {DOCS.map(doc => (
          <div key={doc.key} style={{
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '20px',
            background: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '24px', flexShrink: 0 }}>{doc.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>{doc.title}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>{doc.desc}</p>
              </div>
            </div>
            <button
              onClick={() => download(doc.key)}
              disabled={downloading === doc.key || loading}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 500,
                fontFamily: 'var(--font-body)',
                background: downloading === doc.key ? 'var(--bg-secondary)' : 'var(--text)',
                color: downloading === doc.key ? 'var(--text-tertiary)' : 'var(--bg)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: downloading === doc.key || loading ? 'wait' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {downloading === doc.key ? 'Downloading...' : '↓ Download'}
            </button>
          </div>
        ))}
      </div>

      {/* Download all */}
      <div style={{ textAlign: 'center', padding: '24px', border: '0.5px dashed var(--border-strong)', borderRadius: 'var(--radius-sm)' }}>
        <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '6px', fontWeight: 500 }}>
          All of the above in one go
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
          Downloads all 6 documents one after another. Give it a few seconds.
        </p>
        <button
          onClick={downloadAll}
          disabled={!!downloading || loading}
          style={{
            padding: '12px 32px',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: 'var(--font-body)',
            background: 'var(--text)',
            color: 'var(--bg)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: downloading || loading ? 'wait' : 'pointer',
            opacity: downloading ? 0.7 : 1,
          }}
        >
          {downloading === 'all' ? 'Downloading all...' : '↓ Download everything'}
        </button>
      </div>

      {/* Cue sheet note */}
      <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          🎬 <strong>Cue sheet / Show flow</strong> — builder coming in the next release. You'll be able to build minute-by-minute show flows with technical cues per department, city-wise.
        </p>
      </div>

      {/* Bug 12 — Confidentiality disclaimer */}
      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '0.5px solid var(--border)', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
          All documents are confidential and prepared exclusively for{' '}
          <strong>{clients?.group_name || 'your client'}</strong>.
          {' '}Not for circulation without permission.
          {' '}Myoozz Events · Myoozz Consulting Pvt. Ltd.
        </p>
      </div>
    </div>
  )
}
