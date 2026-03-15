'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const LIFE_AREAS = [
  { id: 'health',    label: 'Health',           color: '#C1121F' },
  { id: 'career',    label: 'Career',            color: '#0077B6' },
  { id: 'travel',    label: 'Travel',            color: '#7209B7' },
  { id: 'family',    label: 'Family & Love',     color: '#E63946' },
  { id: 'finance',   label: 'Finance',           color: '#2D6A4F' },
  { id: 'home',      label: 'Home & Lifestyle',  color: '#E76F51' },
  { id: 'personal',  label: 'Personal Growth',   color: '#2A9D8F' },
  { id: 'spiritual', label: 'Spiritual',         color: '#4361EE' },
  { id: 'other',     label: 'Other',             color: '#8a8aa8' },
]

const AREA_MAP = Object.fromEntries(LIFE_AREAS.map(a => [a.id, a]))

interface VisionItem {
  id: string
  title: string | null
  image_url: string
  category: string | null
  created_at: string
}

// ── Sub-components ────────────────────────────────────────────

function FilterPill({ label, active, color, onClick }: {
  label: string; active: boolean; color: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
      style={{
        background: active ? `${color}25` : `${color}08`,
        border: `1px solid ${active ? color : `${color}40`}`,
        color: active ? color : 'var(--text-secondary)',
      }}>
      {label}
    </button>
  )
}

function MasonryGrid({ items, onDelete, deletingId }: {
  items: VisionItem[]
  onDelete: (item: VisionItem) => void
  deletingId: string | null
}) {
  if (!items.length) {
    return <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>No images in this category yet.</p>
  }
  return (
    <div style={{ columns: 'auto 220px', columnGap: 12 }}>
      {items.map(item => {
        const area = item.category ? AREA_MAP[item.category] : null
        return (
          <div key={item.id} className="relative group rounded-xl overflow-hidden"
            style={{ breakInside: 'avoid', marginBottom: 12, display: 'inline-block', width: '100%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url}
              alt={item.title ?? 'Vision board image'}
              loading="lazy"
              className="w-full block rounded-xl"
            />
            {/* Hover overlay */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between rounded-xl"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.75) 100%)' }}
            >
              <div className="flex justify-end p-2">
                <button
                  onClick={() => onDelete(item)}
                  disabled={deletingId === item.id}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(200,40,40,0.9)', color: 'white' }}
                >
                  {deletingId === item.id ? '…' : '✕'}
                </button>
              </div>
              <div className="p-3">
                {item.title && (
                  <p className="text-xs font-semibold text-white mb-1.5" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                    {item.title}
                  </p>
                )}
                {area && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${area.color}cc`, color: 'white' }}>
                    {area.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function VisionBoardView() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<VisionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploadCategory, setUploadCategory] = useState('travel')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchItems() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase
      .from('vision_items')
      .select('id, title, image_url, category, created_at')
      .order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length) { setPendingFiles(files); setShowModal(true) }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/'))
    if (files.length) { setPendingFiles(files); setShowModal(true) }
    e.target.value = ''
  }

  async function handleUpload() {
    if (!pendingFiles.length) return
    setUploading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setUploading(false); return }

    const newItems: VisionItem[] = []

    for (const file of pendingFiles) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/${uploadCategory}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: storageErr } = await supabase.storage
        .from('vision-board')
        .upload(path, file, { contentType: file.type })

      if (storageErr) {
        setError(`Upload failed: ${storageErr.message}. Make sure the "vision-board" storage bucket exists in Supabase (Storage → New bucket → "vision-board", Public).`)
        setUploading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('vision-board').getPublicUrl(path)

      const { data: inserted, error: dbErr } = await supabase
        .from('vision_items')
        .insert({ title: uploadTitle.trim() || null, image_url: publicUrl, category: uploadCategory })
        .select('id, title, image_url, category, created_at')
        .single()

      if (dbErr) { setError(dbErr.message); setUploading(false); return }
      if (inserted) newItems.push(inserted)
    }

    setItems(prev => [...newItems, ...prev])
    setUploading(false)
    setShowModal(false)
    setPendingFiles([])
    setUploadTitle('')
  }

  async function handleDelete(item: VisionItem) {
    if (!confirm('Remove this image from your vision board?')) return
    setDeletingId(item.id)
    try {
      const url = new URL(item.image_url)
      const marker = '/object/public/vision-board/'
      const idx = url.pathname.indexOf(marker)
      if (idx !== -1) {
        await supabase.storage.from('vision-board').remove([url.pathname.slice(idx + marker.length)])
      }
    } catch { /* storage path extraction failed — skip, still delete DB row */ }
    await supabase.from('vision_items').delete().eq('id', item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    setDeletingId(null)
  }

  const displayed = activeFilter === 'all' ? items : items.filter(i => i.category === activeFilter)
  const categoriesWithItems = LIFE_AREAS.filter(a => items.some(i => i.category === a.id))
  const groupedByCategory = LIFE_AREAS
    .map(area => ({ ...area, items: items.filter(i => i.category === area.id) }))
    .filter(g => g.items.length > 0)

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ background: 'rgba(8,8,15,0.85)', backdropFilter: 'blur(6px)' }}>
          <div className="text-center">
            <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 16 }}>🖼️</div>
            <p style={{ color: '#e8c97a', fontSize: 28, fontWeight: 800 }}>Drop to add to Vision Board</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 style={{ color: '#e8c97a', fontSize: 20, fontWeight: 700 }}>📌 Visual Vision Board</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
            Upload images of your dreams. Drag &amp; drop anywhere or click Add Images.
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded-xl font-semibold text-sm flex-shrink-0 ml-4"
          style={{ background: 'linear-gradient(135deg,#C9A84C,#e8c97a)', color: '#08080f' }}
        >
          + Add Images
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      </div>

      {/* Category filter pills */}
      {categoriesWithItems.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          <FilterPill label={`All (${items.length})`} active={activeFilter === 'all'} color="#C9A84C" onClick={() => setActiveFilter('all')} />
          {categoriesWithItems.map(area => (
            <FilterPill
              key={area.id}
              label={`${area.label} (${items.filter(i => i.category === area.id).length})`}
              active={activeFilter === area.id}
              color={area.color}
              onClick={() => setActiveFilter(area.id)}
            />
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-20" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Loading vision board…
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-24 cursor-pointer"
          style={{ border: '2px dashed rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.03)' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>🖼️</div>
          <p style={{ color: '#e8c97a', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Your vision board is empty</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Click here or drag &amp; drop images to bring your vision to life</p>
        </div>
      )}

      {/* Filtered single-category masonry */}
      {!loading && items.length > 0 && activeFilter !== 'all' && (
        <MasonryGrid items={displayed} onDelete={handleDelete} deletingId={deletingId} />
      )}

      {/* All — grouped by life area */}
      {!loading && items.length > 0 && activeFilter === 'all' && (
        <div className="space-y-10">
          {groupedByCategory.map(group => (
            <div key={group.id}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px w-8 rounded" style={{ background: group.color }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: group.color }}>
                  {group.label}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  · {group.items.length} image{group.items.length !== 1 ? 's' : ''}
                </span>
              </div>
              <MasonryGrid items={group.items} onDelete={handleDelete} deletingId={deletingId} />
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#0f0f1a', border: '1px solid rgba(201,168,76,0.35)' }}>
            <h3 style={{ color: '#e8c97a', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              Add {pendingFiles.length} Image{pendingFiles.length !== 1 ? 's' : ''}
            </h3>
            <p className="mb-5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {pendingFiles.slice(0, 3).map(f => f.name).join(', ')}{pendingFiles.length > 3 ? ` + ${pendingFiles.length - 3} more` : ''}
            </p>

            {/* Life Area */}
            <div className="mb-4">
              <label className="block mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                Life Area
              </label>
              <div className="flex flex-wrap gap-2">
                {LIFE_AREAS.map(area => (
                  <button key={area.id} onClick={() => setUploadCategory(area.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: uploadCategory === area.id ? `${area.color}22` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${uploadCategory === area.id ? area.color : 'rgba(255,255,255,0.08)'}`,
                      color: uploadCategory === area.id ? area.color : 'var(--text-secondary)',
                    }}>
                    {area.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Caption */}
            <div className="mb-6">
              <label className="block mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                Caption (optional)
              </label>
              <input
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
                placeholder="e.g. Dream home in Dallas…"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: 'rgba(200,40,40,0.1)', border: '1px solid rgba(200,40,40,0.3)', color: '#ff8080' }}>
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowModal(false); setPendingFiles([]); setError(null) }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#e8c97a)', color: '#08080f', opacity: uploading ? 0.7 : 1 }}
              >
                {uploading ? 'Uploading…' : `Upload ${pendingFiles.length} Image${pendingFiles.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
