'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Document {
  id: string
  name: string
  file_type: string
  file_size: number
  is_processed: boolean
  created_at: string
}

interface DocumentUploadProps {
  section: 'financial' | 'goals' | 'planner' | 'health' | 'general'
}

const FILE_ACCEPT = '.pdf,.xlsx,.xls,.csv,.docx,.txt'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentUpload({ section }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadDocuments()
  }, [section]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDocuments() {
    const { data } = await supabase
      .from('documents')
      .select('id, name, file_type, file_size, is_processed, created_at')
      .eq('section', section)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) setDocuments(data)
  }

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const file = Array.from(files)[0]
      if (!file) return

      setError(null)
      setUploading(true)
      setUploadProgress('Uploading...')

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('section', section)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const uploadData = await uploadRes.json()

        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Upload failed')
        }

        setUploadProgress('Processing & embedding...')
        setProcessing(uploadData.document.id)

        const processRes = await fetch('/api/process-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: uploadData.document.id }),
        })

        const processData = await processRes.json()

        if (!processRes.ok) {
          throw new Error(processData.error || 'Processing failed')
        }

        setUploadProgress(`Done — ${processData.chunks} chunks embedded`)
        await loadDocuments()

        setTimeout(() => {
          setUploadProgress(null)
          setProcessing(null)
        }, 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setUploadProgress(null)
        setProcessing(null)
      } finally {
        setUploading(false)
      }
    },
    [section] // eslint-disable-line react-hooks/exhaustive-deps
  )

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  return (
    <div className="glass-card p-6" style={{ borderRadius: 16 }}>
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-semibold"
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Documents
        </h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background: 'rgba(0,212,255,0.1)',
            border: '1px solid rgba(0,212,255,0.2)',
            color: 'var(--accent-cyan)',
          }}
        >
          {documents.length} file{documents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Drop Zone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        style={{
          display: 'block',
          border: `2px dashed ${isDragging ? 'rgba(0,212,255,0.7)' : 'rgba(0,212,255,0.25)'}`,
          borderRadius: 12,
          padding: '28px 20px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          background: isDragging ? 'rgba(0,212,255,0.05)' : 'transparent',
          marginBottom: 16,
        }}
      >
        <input
          type="file"
          accept={FILE_ACCEPT}
          style={{ display: 'none' }}
          onChange={onInputChange}
          disabled={uploading}
        />
        <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
        {uploadProgress ? (
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--accent-cyan)' }}>
              {uploadProgress}
            </p>
            {processing && (
              <div className="flex justify-center gap-1 mt-2">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'var(--accent-cyan)',
                      display: 'inline-block',
                      animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Drop a file or click to browse
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              PDF · XLSX · CSV · DOCX · TXT
            </p>
          </>
        )}
      </label>

      {error && (
        <p
          className="text-xs mb-3 px-3 py-2 rounded-lg"
          style={{
            color: '#ff6b6b',
            background: 'rgba(255,107,107,0.08)',
            border: '1px solid rgba(255,107,107,0.2)',
          }}
        >
          ⚠️ {error}
        </p>
      )}

      {/* Document List */}
      {documents.length > 0 && (
        <div className="flex flex-col gap-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span style={{ fontSize: 14, flexShrink: 0 }}>
                  {doc.file_type === 'pdf' ? '📕' : doc.file_type === 'xlsx' || doc.file_type === 'csv' ? '📊' : '📄'}
                </span>
                <span
                  className="text-xs truncate"
                  style={{ color: 'var(--text-secondary)', maxWidth: 180 }}
                  title={doc.name}
                >
                  {doc.name}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatBytes(doc.file_size)}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: doc.is_processed
                      ? 'rgba(52,211,153,0.1)'
                      : 'rgba(251,191,36,0.1)',
                    color: doc.is_processed ? '#34d399' : '#fbbf24',
                    border: `1px solid ${doc.is_processed ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)'}`,
                  }}
                >
                  {doc.is_processed ? 'embedded' : 'pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
