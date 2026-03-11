import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { chunkText, generateEmbeddings } from '@/lib/ai/embeddings'

async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  switch (fileType) {
    case 'pdf': {
      // Dynamic import to avoid Next.js bundling issues with pdf-parse
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParse = ((await import('pdf-parse')) as any).default ?? (await import('pdf-parse'))
      const data = await pdfParse(buffer)
      return data.text
    }

    case 'xlsx':
    case 'csv': {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const lines: string[] = []

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const csv = XLSX.utils.sheet_to_csv(sheet)
        lines.push(`## Sheet: ${sheetName}\n${csv}`)
      }
      return lines.join('\n\n')
    }

    case 'docx': {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return result.value
    }

    case 'txt': {
      return buffer.toString('utf-8')
    }

    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { documentId } = await request.json()

  if (!documentId) {
    return NextResponse.json({ error: 'documentId required' }, { status: 400 })
  }

  const service = await createServiceClient()

  // Fetch document record
  const { data: doc, error: docError } = await service
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (docError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Verify the authenticated user owns this document
  if (doc.user_id !== user.id) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (doc.is_processed) {
    return NextResponse.json({ message: 'Already processed', document: doc })
  }

  // Download from Supabase Storage
  const { data: fileData, error: downloadError } = await service.storage
    .from('documents')
    .download(doc.file_path)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'Failed to download file from storage' }, { status: 500 })
  }

  const buffer = Buffer.from(await fileData.arrayBuffer())

  // Extract text
  let text: string
  try {
    text = await extractText(buffer, doc.file_type)
  } catch (err) {
    console.error('Parse error:', err)
    return NextResponse.json({ error: 'Failed to parse document' }, { status: 500 })
  }

  if (!text.trim()) {
    return NextResponse.json({ error: 'Document appears to be empty or unreadable' }, { status: 400 })
  }

  // Chunk the text
  const chunks = chunkText(text)

  if (chunks.length === 0) {
    return NextResponse.json({ error: 'No content chunks generated' }, { status: 400 })
  }

  // Generate embeddings in batches of 20
  const batchSize = 20
  const allEmbeddings: number[][] = []

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const embeddings = await generateEmbeddings(batch)
    allEmbeddings.push(...embeddings)
  }

  // Store chunks + embeddings
  const chunkRecords = chunks.map((content, index) => ({
    document_id: documentId,
    content,
    embedding: JSON.stringify(allEmbeddings[index]),
    chunk_index: index,
    metadata: {
      file_name: doc.name,
      file_type: doc.file_type,
      section: doc.section,
      char_count: content.length,
    },
  }))

  const { error: chunksError } = await service
    .from('document_chunks')
    .insert(chunkRecords)

  if (chunksError) {
    console.error('Chunks insert error:', chunksError)
    return NextResponse.json({ error: 'Failed to store document chunks' }, { status: 500 })
  }

  // Mark document as processed
  const { error: updateError } = await service
    .from('documents')
    .update({ is_processed: true, updated_at: new Date().toISOString() })
    .eq('id', documentId)

  if (updateError) {
    console.error('Update error:', updateError)
  }

  return NextResponse.json({
    message: 'Document processed successfully',
    chunks: chunks.length,
    documentId,
  })
}
