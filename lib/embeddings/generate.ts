/**
 * Embedding generation using OpenAI text-embedding-3-small
 * 1536-dimensional vectors stored in PostgreSQL via pgvector.
 *
 * Graceful degradation: if OPENAI_API_KEY is not set or the API call fails,
 * the function returns null. The search system falls back to keyword-only mode.
 *
 * The application NEVER becomes fully dependent on an external AI service.
 */

import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/**
 * Generate an embedding vector for a text string.
 * Returns a 1536-dimensional float array, or null if unavailable.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const ai = getClient();
  if (!ai) return null;

  // Truncate to ~8000 chars — model limit is ~8192 tokens
  const truncated = text.slice(0, 8000);

  try {
    const response = await ai.embeddings.create({
      model: "text-embedding-3-small",
      input: truncated,
      encoding_format: "float",
    });
    return response.data[0]?.embedding ?? null;
  } catch (err) {
    // Log but don't crash — keyword search still works
    console.warn("[Embeddings] Generation failed, falling back to keyword search:", (err as Error).message);
    return null;
  }
}

/**
 * Build searchable text for a listing.
 * This is the string that gets embedded — same content as the tsvector trigger uses.
 */
export function buildListingSearchText(listing: {
  title: string;
  description: string;
  category_name?: string;
  condition?: string;
  location?: string;
}): string {
  return [
    listing.title,
    listing.description,
    listing.category_name ?? "",
    listing.condition ?? "",
    listing.location ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Check if semantic search is available (API key configured).
 */
export function isSemanticSearchAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
