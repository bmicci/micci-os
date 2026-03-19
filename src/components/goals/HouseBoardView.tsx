'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Rooms (aligned with House CC room names) ─────────────────

const ROOMS = [
  { id: 'Living Room',      label: 'Living Room',      icon: '🛋️',  color: '#E76F51' },
  { id: 'Dining Room',      label: 'Dining Room',      icon: '🍽️',  color: '#A0522D' },
  { id: 'Office',           label: 'Office',            icon: '💼',  color: '#0077B6' },
  { id: 'Entertainment',    label: 'Entertainment',     icon: '🎬',  color: '#7209B7' },
  { id: 'Primary Bedroom',  label: 'Primary Bedroom',   icon: '🛏️',  color: '#E63946' },
  { id: 'Guest Room',       label: 'Guest Room',        icon: '🛌',  color: '#6A4C93' },
  { id: 'Primary Bathroom', label: 'Primary Bathroom',  icon: '🚿',  color: '#2A9D8F' },
  { id: 'Kitchen',          label: 'Kitchen',           icon: '🍳',  color: '#F4A261' },
  { id: 'Staircase',        label: 'Staircase',         icon: '🪜',  color: '#4A90D9' },
  { id: 'Patio/Deck',       label: 'Patio/Deck',        icon: '🌿',  color: '#2D6A4F' },
  { id: 'Rooftop',          label: 'Rooftop',           icon: '🌆',  color: '#4361EE' },
  { id: 'Upstairs',         label: 'Upstairs',          icon: '🧱',  color: '#C1121F' },
]

const ROOM_MAP = Object.fromEntries(ROOMS.map(r => [r.id, r]))

const STATUSES = [
  { id: 'idea',        label: 'Idea',        color: '#8a8aa8', bg: 'rgba(138,138,168,0.15)' },
  { id: 'planned',     label: 'Planned',     color: '#C9A84C', bg: 'rgba(201,168,76,0.15)'  },
  { id: 'in-progress', label: 'In Progress', color: '#00d4ff', bg: 'rgba(0,212,255,0.15)'   },
  { id: 'done',        label: 'Done',        color: '#52b788', bg: 'rgba(82,183,136,0.15)'  },
]

const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.id, s]))

// ── Status mapping (UI uses 'in-progress', DB uses 'in_progress') ──

function toDbStatus(s: string): string {
  return s === 'in-progress' ? 'in_progress' : s
}

function fromDbStatus(s: string): string {
  return s === 'in_progress' ? 'in-progress' : s
}

// ── Types ────────────────────────────────────────────────────

interface HouseIdea {
  id: string
  room: string
  title: string
  notes: string
  status: string
}

interface VisionItem {
  id: string
  title: string | null
  image_url: string
  category: string | null
  created_at: string
}

// ── Sub-components ────────────────────────────────────────────

function StatusBadge({ status, onClick }: { status: string; onClick?: () => void }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP['idea']
  return (
    <button
      onClick={onClick}
      title={onClick ? 'Click to advance status' : undefined}
      className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-all"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}40`, cursor: onClick ? 'pointer' : 'default' }}
    >
      {s.label}
    </button>
  )
}

function IdeaCard({ idea, onStatusCycle, onEdit, onDelete }: {
  idea: HouseIdea
  onStatusCycle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const room = ROOM_MAP[idea.room]
  return (
    <div className="p-4 rounded-xl border group transition-all relative"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', borderLeft: `3px solid ${room?.color ?? '#C9A84C'}` }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{idea.title}</span>
        <StatusBadge status={idea.status} onClick={onStatusCycle} />
      </div>
      {idea.notes && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{idea.notes}</p>
      )}
      <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="text-[10px] px-2 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)' }}>
          Edit
        </button>
        <button onClick={onDelete} className="text-[10px] px-2 py-0.5 rounded"
          style={{ background: 'rgba(200,40,40,0.15)', color: '#ff8080' }}>
          Remove
        </button>
      </div>
    </div>
  )
}

function PhotoGrid({ photos, onDelete, deletingId }: {
  photos: VisionItem[]
  onDelete: (item: VisionItem) => void
  deletingId: string | null
}) {
  if (!photos.length) return null
  return (
    <div style={{ columns: 'auto 200px', columnGap: 10 }}>
      {photos.map(item => (
        <div key={item.id} className="relative group rounded-xl overflow-hidden"
          style={{ breakInside: 'avoid', marginBottom: 10, display: 'inline-block', width: '100%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image_url} alt={item.title ?? 'House inspiration'} loading="lazy" className="w-full block rounded-xl" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between rounded-xl"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.7) 100%)' }}>
            <div className="flex justify-end p-2">
              <button onClick={() => onDelete(item)} disabled={deletingId === item.id}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'rgba(200,40,40,0.9)', color: 'white' }}>
                {deletingId === item.id ? '…' : '✕'}
              </button>
            </div>
            {item.title && (
              <p className="px-3 pb-3 text-xs font-semibold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                {item.title}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Idea modal ────────────────────────────────────────────────

function IdeaModal({ initial, defaultRoom, onSave, onClose }: {
  initial?: HouseIdea
  defaultRoom?: string
  onSave: (idea: Omit<HouseIdea, 'id'>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [room, setRoom] = useState(initial?.room ?? defaultRoom ?? 'Living Room')
  const [status, setStatus] = useState(initial?.status ?? 'idea')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function handleSave() {
    if (!title.trim()) return
    onSave({ title: title.trim(), room, status, notes: notes.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#0f0f1a', border: '1px solid rgba(201,168,76,0.35)' }}>
        <h3 style={{ color: '#e8c97a', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
          {initial ? 'Edit Idea' : 'Add Idea'}
        </h3>

        <div className="mb-4">
          <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="e.g. Mood lighting" autoFocus
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)' }} />
        </div>

        <div className="mb-4">
          <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Room</label>
          <div className="flex flex-wrap gap-1.5">
            {ROOMS.map(r => (
              <button key={r.id} onClick={() => setRoom(r.id)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: room === r.id ? `${r.color}22` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${room === r.id ? r.color : 'rgba(255,255,255,0.08)'}`,
                  color: room === r.id ? r.color : 'var(--text-secondary)',
                }}>
                {r.icon} {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Status</label>
          <div className="flex gap-2">
            {STATUSES.map(s => (
              <button key={s.id} onClick={() => setStatus(s.id)}
                className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                style={{
                  background: status === s.id ? s.bg : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${status === s.id ? s.color : 'rgba(255,255,255,0.08)'}`,
                  color: status === s.id ? s.color : 'var(--text-secondary)',
                }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Details, links, inspiration..."
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)' }} />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!title.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg,#C9A84C,#e8c97a)', color: '#08080f', opacity: title.trim() ? 1 : 0.5 }}>
            {initial ? 'Save Changes' : 'Add Idea'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function HouseBoardView() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTargetRoom, setUploadTargetRoom] = useState<string | null>(null)

  const [ideas, setIdeas] = useState<HouseIdea[]>([])
  const [ideasLoading, setIdeasLoading] = useState(true)
  const [photos, setPhotos] = useState<VisionItem[]>([])
  const [photosLoading, setPhotosLoading] = useState(true)

  const [activeRoom, setActiveRoom] = useState<string>('all')
  const [showIdeaModal, setShowIdeaModal] = useState(false)
  const [editingIdea, setEditingIdea] = useState<HouseIdea | null>(null)
  const [addDefaultRoom, setAddDefaultRoom] = useState<string>('Living Room')

  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [photoCaption, setPhotoCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchIdeas()
    fetchPhotos()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchIdeas() {
    setIdeasLoading(true)
    try {
      const res = await fetch('/api/house/projects')
      if (res.ok) {
        const data = await res.json()
        setIdeas(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (Array.isArray(data) ? data : []).map((p: any) => ({
            id: p.id,
            room: p.room,
            title: p.title,
            notes: p.notes ?? '',
            status: fromDbStatus(p.status),
          }))
        )
      }
    } catch { /* ignore */ }
    setIdeasLoading(false)
  }

  async function fetchPhotos() {
    setPhotosLoading(true)
    const { data } = await supabase
      .from('vision_items')
      .select('id, title, image_url, category, created_at')
      .like('category', 'house-%')
      .order('created_at', { ascending: false })
    setPhotos(data ?? [])
    setPhotosLoading(false)
  }

  // ── Idea CRUD (Supabase via /api/house/projects) ────────────

  async function handleSaveIdea(formData: Omit<HouseIdea, 'id'>) {
    if (editingIdea) {
      const res = await fetch(`/api/house/projects/${editingIdea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          room: formData.room,
          notes: formData.notes,
          status: toDbStatus(formData.status),
        }),
      })
      if (res.ok) {
        setIdeas(prev => prev.map(i =>
          i.id === editingIdea.id
            ? { ...i, title: formData.title, room: formData.room, notes: formData.notes, status: formData.status }
            : i
        ))
      }
    } else {
      const res = await fetch('/api/house/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          room: formData.room,
          notes: formData.notes,
          status: toDbStatus(formData.status),
          priority: 'low',
          estimated_budget: 0,
        }),
      })
      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const created: any = await res.json()
        setIdeas(prev => [...prev, {
          id: created.id,
          room: created.room,
          title: created.title,
          notes: created.notes ?? '',
          status: fromDbStatus(created.status),
        }])
      }
    }
    setShowIdeaModal(false)
    setEditingIdea(null)
  }

  async function cycleStatus(id: string) {
    const order = ['idea', 'planned', 'in-progress', 'done']
    const idea = ideas.find(i => i.id === id)
    if (!idea) return
    const next = order[(order.indexOf(idea.status) + 1) % order.length]
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, status: next } : i))
    await fetch(`/api/house/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: toDbStatus(next) }),
    })
  }

  async function deleteIdea(id: string) {
    if (!confirm('Remove this project?')) return
    setIdeas(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/house/projects/${id}`, { method: 'DELETE' })
  }

  // ── Photo upload ───────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/'))
    if (files.length) { setPendingFiles(files); setShowPhotoModal(true) }
    e.target.value = ''
  }

  async function handlePhotoUpload() {
    if (!pendingFiles.length || !uploadTargetRoom) return
    setUploading(true)
    setUploadError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploadError('Not authenticated'); setUploading(false); return }

    const newPhotos: VisionItem[] = []
    for (const file of pendingFiles) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/house/${uploadTargetRoom}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: storageErr } = await supabase.storage
        .from('vision-board')
        .upload(path, file, { contentType: file.type })

      if (storageErr) {
        setUploadError(`Upload failed: ${storageErr.message}. Make sure the "vision-board" storage bucket exists in Supabase.`)
        setUploading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('vision-board').getPublicUrl(path)

      const { data: inserted, error: dbErr } = await supabase
        .from('vision_items')
        .insert({ title: photoCaption.trim() || null, image_url: publicUrl, category: `house-${uploadTargetRoom}` })
        .select('id, title, image_url, category, created_at')
        .single()

      if (dbErr) { setUploadError(dbErr.message); setUploading(false); return }
      if (inserted) newPhotos.push(inserted)
    }

    setPhotos(prev => [...newPhotos, ...prev])
    setUploading(false)
    setShowPhotoModal(false)
    setPendingFiles([])
    setPhotoCaption('')
    setUploadTargetRoom(null)
  }

  async function handlePhotoDelete(item: VisionItem) {
    if (!confirm('Remove this photo?')) return
    setDeletingId(item.id)
    try {
      const url = new URL(item.image_url)
      const marker = '/object/public/vision-board/'
      const idx = url.pathname.indexOf(marker)
      if (idx !== -1) await supabase.storage.from('vision-board').remove([url.pathname.slice(idx + marker.length)])
    } catch { /* ignore */ }
    await supabase.from('vision_items').delete().eq('id', item.id)
    setPhotos(prev => prev.filter(i => i.id !== item.id))
    setDeletingId(null)
  }

  // ── Derived data ────────────────────────────────────────────

  const roomsToShow = activeRoom === 'all' ? ROOMS : ROOMS.filter(r => r.id === activeRoom)

  const ideasInRoom = (roomId: string) => ideas.filter(i => i.room === roomId)
  const photosInRoom = (roomId: string) => photos.filter(p => p.category === `house-${roomId}`)
  const totalIdeas = ideas.length
  const doneIdeas = ideas.filter(i => i.status === 'done').length

  // ── Render ──────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 style={{ color: '#e8c97a', fontSize: 20, fontWeight: 700 }}>🏡 House Board</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
            Project ideas + inspiration photos by room &nbsp;·&nbsp;
            {ideasLoading ? (
              <span style={{ color: 'var(--text-muted)' }}>loading…</span>
            ) : (
              <>
                <span style={{ color: '#52b788' }}>{doneIdeas} done</span>
                <span style={{ color: 'var(--text-muted)' }}> / {totalIdeas} projects</span>
                <span style={{ color: 'var(--text-muted)' }}> · synced with House CC</span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => { setAddDefaultRoom(activeRoom === 'all' ? 'Living Room' : activeRoom); setEditingIdea(null); setShowIdeaModal(true) }}
          className="px-4 py-2 rounded-xl font-semibold text-sm flex-shrink-0 ml-4"
          style={{ background: 'linear-gradient(135deg,#C9A84C,#e8c97a)', color: '#08080f' }}
        >
          + Add Idea
        </button>
      </div>

      {/* Room filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button onClick={() => setActiveRoom('all')}
          className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
          style={{
            background: activeRoom === 'all' ? 'rgba(201,168,76,0.2)' : 'rgba(201,168,76,0.06)',
            border: `1px solid ${activeRoom === 'all' ? '#C9A84C' : 'rgba(201,168,76,0.25)'}`,
            color: activeRoom === 'all' ? '#e8c97a' : 'var(--text-secondary)',
          }}>
          🏠 All Rooms
        </button>
        {ROOMS.map(r => {
          const count = ideasInRoom(r.id).length + photosInRoom(r.id).length
          if (count === 0 && activeRoom !== r.id) return null
          return (
            <button key={r.id} onClick={() => setActiveRoom(r.id)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={{
                background: activeRoom === r.id ? `${r.color}22` : `${r.color}0a`,
                border: `1px solid ${activeRoom === r.id ? r.color : `${r.color}35`}`,
                color: activeRoom === r.id ? r.color : 'var(--text-secondary)',
              }}>
              {r.icon} {r.label}{count > 0 ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>

      {/* Loading state */}
      {ideasLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading projects…</div>
        </div>
      )}

      {/* Room sections */}
      {!ideasLoading && (
        <div className="space-y-10">
          {roomsToShow.map(room => {
            const roomIdeas = ideasInRoom(room.id)
            const roomPhotos = photosInRoom(room.id)
            if (activeRoom === 'all' && roomIdeas.length === 0 && roomPhotos.length === 0) return null

            return (
              <div key={room.id}>
                {/* Room header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-6 rounded" style={{ background: room.color }} />
                  <span className="text-base font-bold" style={{ color: room.color }}>{room.icon} {room.label}</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <button
                    onClick={() => { setAddDefaultRoom(room.id); setEditingIdea(null); setShowIdeaModal(true) }}
                    className="text-xs px-3 py-1 rounded-lg transition-all"
                    style={{ background: `${room.color}15`, border: `1px solid ${room.color}40`, color: room.color }}>
                    + Idea
                  </button>
                  <button
                    onClick={() => { setUploadTargetRoom(room.id); fileInputRef.current?.click() }}
                    className="text-xs px-3 py-1 rounded-lg transition-all"
                    style={{ background: `${room.color}15`, border: `1px solid ${room.color}40`, color: room.color }}>
                    + Photo
                  </button>
                </div>

                {/* Ideas grid */}
                {roomIdeas.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    {roomIdeas.map(idea => (
                      <IdeaCard
                        key={idea.id}
                        idea={idea}
                        onStatusCycle={() => cycleStatus(idea.id)}
                        onEdit={() => { setEditingIdea(idea); setShowIdeaModal(true) }}
                        onDelete={() => deleteIdea(idea.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Photos */}
                {roomPhotos.length > 0 && (
                  <PhotoGrid photos={roomPhotos} onDelete={handlePhotoDelete} deletingId={deletingId} />
                )}

                {/* Empty room prompt */}
                {activeRoom !== 'all' && roomIdeas.length === 0 && roomPhotos.length === 0 && !photosLoading && (
                  <div className="flex flex-col items-center justify-center rounded-xl py-12 cursor-pointer"
                    style={{ border: `2px dashed ${room.color}30`, background: `${room.color}05` }}
                    onClick={() => { setAddDefaultRoom(room.id); setEditingIdea(null); setShowIdeaModal(true) }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>{room.icon}</div>
                    <p style={{ color: room.color, fontWeight: 600, marginBottom: 4 }}>Nothing here yet</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Add ideas or inspiration photos for your {room.label}</p>
                  </div>
                )}
              </div>
            )
          })}

          {/* Empty state when no projects at all */}
          {activeRoom === 'all' && ideas.length === 0 && photos.length === 0 && !photosLoading && (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl"
              style={{ border: '2px dashed rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.03)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏡</div>
              <p style={{ color: '#e8c97a', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No house projects yet</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
                Add your first idea — it will also appear in the House Command Center kanban.
              </p>
              <button
                onClick={() => { setAddDefaultRoom('Living Room'); setEditingIdea(null); setShowIdeaModal(true) }}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#e8c97a)', color: '#08080f' }}>
                + Add First Idea
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />

      {/* Idea modal */}
      {showIdeaModal && (
        <IdeaModal
          initial={editingIdea ?? undefined}
          defaultRoom={addDefaultRoom}
          onSave={handleSaveIdea}
          onClose={() => { setShowIdeaModal(false); setEditingIdea(null) }}
        />
      )}

      {/* Photo upload modal */}
      {showPhotoModal && uploadTargetRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#0f0f1a', border: '1px solid rgba(201,168,76,0.35)' }}>
            <h3 style={{ color: '#e8c97a', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              Add {pendingFiles.length} Photo{pendingFiles.length !== 1 ? 's' : ''} — {uploadTargetRoom}
            </h3>
            <p className="mb-5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {pendingFiles.slice(0, 3).map(f => f.name).join(', ')}{pendingFiles.length > 3 ? ` + ${pendingFiles.length - 3} more` : ''}
            </p>
            <div className="mb-6">
              <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Caption (optional)</label>
              <input value={photoCaption} onChange={e => setPhotoCaption(e.target.value)}
                placeholder="e.g. Sofa from RH..."
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }} />
            </div>
            {uploadError && (
              <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: 'rgba(200,40,40,0.1)', border: '1px solid rgba(200,40,40,0.3)', color: '#ff8080' }}>
                {uploadError}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowPhotoModal(false); setPendingFiles([]); setUploadError(null) }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button onClick={handlePhotoUpload} disabled={uploading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#e8c97a)', color: '#08080f', opacity: uploading ? 0.7 : 1 }}>
                {uploading ? 'Uploading…' : `Upload ${pendingFiles.length} Photo${pendingFiles.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
