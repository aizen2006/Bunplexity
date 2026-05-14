import { Pinecone } from '@pinecone-database/pinecone';
import { openai } from './openai';
import 'dotenv/config';

export const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

const indexName ='quickstart';
const index = pc.index({ name: indexName });

async function getEmbedding(text: string) {
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
  
    return res.data[0]?.embedding;
  }

async function findCachedResult(embedding: number[]): Promise<any[] | null> {
  const res = await index.query({
      vector: embedding,
      topK: 1,                    // return the single best match
      includeMetadata: true,
  });

  const match = res.matches?.[0];

  if (!match || !match.score || match.score < 0.92) return null;

  // metadata.results is stored as a JSON string — parse it back to any[]
  const raw = match.metadata?.results;
  if (!raw || typeof raw !== "string") return null;

  try {
      return JSON.parse(raw) as any[];
  } catch {
      return null;  // corrupted cache entry — treat as miss
  }
}

async function storeInCache(embedding: number[], data: any): Promise<void> {
  const results = data.results ?? [];

  await index.upsert({
      records: [{
          id: crypto.randomUUID(),
          values: embedding,
          metadata: {
              results: JSON.stringify(results), // matches what findCachedResult reads
              cachedAt: Date.now(),
          },
      }],
  });
}
export { getEmbedding, findCachedResult, storeInCache };