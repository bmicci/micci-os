'use client'

import type { JobSearchData } from '@/lib/job-search-data'
import type { DbJobRecruiter } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

const STATUS_COLORS: Record<string, string> = {
  to_contact: '#ef4444',
  cold: 'var(--text-muted)',
  warm: '#f59e0b',
  engaged: '#22c55e',
}

const STATUS_LABELS: Record<string, string> = {
  to_contact: 'To Contact',
  cold: 'Cold Outreach Sent',
  warm: 'Warm',
  engaged: 'Engaged',
}

interface Props {
  data: JobSearchData
  setData: React.Dispatch<React.SetStateAction<JobSearchData>>
}

export default function RecruitersTab({ data, setData }: Props) {
  const updateStatus = async (id: string, status: string) => {
    const lastContact =
      status !== 'to_contact' ? new Date().toISOString().split('T')[0] : null
    setData((s) => ({
      ...s,
      recruiters: s.recruiters.map((r) =>
        r.id === id
          ? {
              ...r,
              status: status as DbJobRecruiter['status'],
              last_contact: lastContact ?? r.last_contact,
            }
          : r
      ),
    }))
    try {
      const supabase = createClient()
      await supabase
        .from('job_recruiters')
        .update({ status, ...(lastContact ? { last_contact: lastContact } : {}) })
        .eq('id', id)
    } catch {}
  }

  const pendingCount = data.recruiters.filter((r) => r.status === 'to_contact').length
  const contactedCount = data.recruiters.filter((r) => r.status !== 'to_contact').length

  const selectStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(0,212,255,0.15)',
    borderRadius: 6,
    padding: '3px 8px',
    fontSize: 10,
    cursor: 'pointer',
  }

  return (
    <div>
      <div className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
        {pendingCount} pending · {contactedCount} contacted
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Firm', 'Practice', 'Status', 'Last Contact', 'Notes'].map((h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2 text-[10px] font-semibold tracking-widest uppercase"
                  style={{
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid rgba(0,212,255,0.1)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.recruiters.map((r) => (
              <tr key={r.id}>
                <td
                  className="px-3 py-2.5 font-bold"
                  style={{
                    color: 'var(--text-primary)',
                    borderBottom: '1px solid rgba(0,212,255,0.05)',
                  }}
                >
                  {r.name}
                </td>
                <td
                  className="px-3 py-2.5 text-[11px]"
                  style={{
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid rgba(0,212,255,0.05)',
                  }}
                >
                  {r.practice || '—'}
                </td>
                <td
                  className="px-3 py-2.5"
                  style={{ borderBottom: '1px solid rgba(0,212,255,0.05)' }}
                >
                  <select
                    style={{
                      ...selectStyle,
                      color: STATUS_COLORS[r.status] || 'var(--text-muted)',
                    }}
                    value={r.status}
                    onChange={(e) => updateStatus(r.id, e.target.value)}
                  >
                    <option value="to_contact">To Contact</option>
                    <option value="cold">Cold Outreach Sent</option>
                    <option value="warm">Warm</option>
                    <option value="engaged">Engaged</option>
                  </select>
                </td>
                <td
                  className="px-3 py-2.5 text-[11px]"
                  style={{
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid rgba(0,212,255,0.05)',
                  }}
                >
                  {r.last_contact || '—'}
                </td>
                <td
                  className="px-3 py-2.5 text-[11px]"
                  style={{
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid rgba(0,212,255,0.05)',
                  }}
                >
                  {r.notes || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
