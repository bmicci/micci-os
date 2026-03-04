import { openai } from '@ai-sdk/openai'
import { embed, embedMany } from 'ai'

// Uses OpenAI text-embedding-3-small (1536 dims) — Anthropic has no embeddings API
const embeddingModel = openai.embedding('text-embedding-3-small')

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  })
  return embedding
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
  })
  return embeddings
}

/**
 * Split text into overlapping chunks.
 * Approximation: 1 token ≈ 4 chars → 800 tokens ≈ 3200 chars, 100-token overlap ≈ 400 chars.
 */
export function chunkText(
  text: string,
  chunkSize = 3200,
  overlap = 400
): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    const chunk = text.slice(start, end).trim()

    if (chunk.length > 0) {
      chunks.push(chunk)
    }

    if (end === text.length) break
    start = end - overlap
  }

  return chunks
}
