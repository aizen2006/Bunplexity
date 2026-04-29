import { Pinecone } from '@pinecone-database/pinecone';
import { generateText } from 'ai';
import OpenAI from "openai";
import 'dotenv/config';

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

const openai = new OpenAI();

const indexName = "chatembeddingsindex";
await pinecone.createIndexForModel({
  name: indexName,
  cloud: 'aws',
  region: 'us-east-1',
  embed: {
    model: 'llama-text-embed-v2',
    fieldMap: { text: 'chunk_text' },
  },
  waitUntilReady: true,
});
const index = pinecone.index(indexName);

// Helper functions

async function rewriteQuery(query: string) {
    const res: any = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `
      Rewrite this into a short, search-optimized query.
      Keep intent same.
  
      Query: ${query}
      `,
    });
  
    return res.text.trim();
}

async function getEmbedding(text: string) {
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
  
    return res.data[0]?.embedding;
  }

async function findCachedResult(embedding: number[]) {
    const res = await index.query({
        vector: embedding,
        topK: 1,
        includeMetadata: true,
    });

    const match = res.matches?.[0];

    // Use only high-confidence matches to avoid serving unrelated cached answers.
    if (match && match.score && match.score > 0.88) {
        return match.metadata;
    }

    return null;
}

async function storeInCache(
    embedding: number[],
    data: any
  ) {
    // Pinecone metadata supports scalar values, so nested search results are stringified.
    await index.upsert({
      records: [
      {
        id: crypto.randomUUID(),
        values: embedding,
        metadata: {
          ...data,
          searchResults: JSON.stringify(data.searchResults),
          timestamp: Date.now(),
        },
      },
    ]});
  }

export { rewriteQuery, getEmbedding, findCachedResult, storeInCache };