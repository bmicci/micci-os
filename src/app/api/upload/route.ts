import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xlsx',
  'text/csv': 'csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const section = (formData.get('section') as string) || 'general'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const fileType = ALLOWED_TYPES[file.type]
  if (!fileType) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Accepted: PDF, XLSX, CSV, DOCX, TXT` },
      { status: 400 }
    )
  }

  // Use service client for storage operations
  const service = await createServiceClient()

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Upload to Supabase Storage
  const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const { error: storageError } = await service.storage
    .from('documents')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (storageError) {
    console.error('Storage error:', storageError)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }

  // Insert document record
  const { data: doc, error: dbError } = await service
    .from('documents')
    .insert({
      user_id: user.id,
      name: file.name,
      file_path: fileName,
      file_type: fileType,
      file_size: file.size,
      section,
      is_processed: false,
    })
    .select()
    .single()

  if (dbError) {
    console.error('DB error:', dbError)
    // Clean up uploaded file
    await service.storage.from('documents').remove([fileName])
    return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 })
  }

  return NextResponse.json({
    document: doc,
    message: 'File uploaded. Trigger /api/process-document to parse and embed.',
  })
}
