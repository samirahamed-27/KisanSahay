/**
 * Sahay RAG Service
 * Retrieval-Augmented Generation using local Ollama (nomic-embed-text + llama3.2).
 * Retrieves relevant chunks from the pre-built vector index and generates
 * grounded answers strictly based on retrieved context — no hallucinations.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const OLLAMA_BASE = 'http://127.0.0.1:11434';
const EMBED_MODEL = 'nomic-embed-text';
const LLM_MODEL = 'llama3.2';
const INDEX_FILE = path.join(__dirname, '..', 'data', 'rag_index.json');

// Confidence thresholds
const HIGH_CONFIDENCE_THRESHOLD = 0.60;
const LOW_CONFIDENCE_THRESHOLD = 0.35;

// In-memory cache of the vector index
let _indexCache = null;
let _indexLoadTime = 0;
const INDEX_TTL_MS = 5 * 60 * 1000; // Re-check for updates every 5 minutes

// ─────────────────────────────────────────────
// Index Loading
// ─────────────────────────────────────────────

function loadIndex(forceReload = false) {
  const now = Date.now();
  if (_indexCache && !forceReload && (now - _indexLoadTime) < INDEX_TTL_MS) {
    return _indexCache;
  }

  if (!fs.existsSync(INDEX_FILE)) {
    logger.warn('[RAG] rag_index.json not found. Run: node scripts/buildRagIndex.js');
    return null;
  }

  try {
    const raw = fs.readFileSync(INDEX_FILE, 'utf8');
    _indexCache = JSON.parse(raw);
    _indexLoadTime = now;
    logger.info(`[RAG] Index loaded: ${_indexCache.length} chunks`);
    return _indexCache;
  } catch (err) {
    logger.error('[RAG] Failed to load index:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// Math Helpers
// ─────────────────────────────────────────────

/**
 * Cosine similarity between two float arrays.
 * Returns a value between -1 and 1 (1 = identical direction).
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─────────────────────────────────────────────
// Ollama API Helpers
// ─────────────────────────────────────────────

/**
 * Check if Ollama is running — throws a clean error if not.
 */
async function assertOllamaRunning() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error('Non-OK response');
  } catch {
    throw new Error(
      'Ollama is not running. Start it with: ollama serve\n' +
      'Then make sure both llama3.2 and nomic-embed-text are pulled.'
    );
  }
}

/**
 * Embed a text string using nomic-embed-text via Ollama.
 * Returns a float[] embedding vector.
 */
async function embedText(text) {
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
    signal: AbortSignal.timeout(30000)
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama embeddings error (${res.status}): ${body}`);
  }

  const json = await res.json();
  if (!json.embedding || !Array.isArray(json.embedding)) {
    throw new Error('Unexpected embedding response shape from Ollama');
  }
  return json.embedding;
}

/**
 * Generate a completion from llama3.2.
 * Returns the full response string (non-streaming).
 */
async function generateCompletion(systemPrompt, userPrompt) {
  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LLM_MODEL,
      system: systemPrompt,
      prompt: userPrompt,
      stream: false,
      options: {
        temperature: 0.1,   // Low temperature = more factual, less creative
        top_p: 0.9,
        num_predict: 1024   // Max tokens in response
      }
    }),
    signal: AbortSignal.timeout(120000) // 2-minute timeout for generation
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama generate error (${res.status}): ${body}`);
  }

  const json = await res.json();
  return (json.response || '').trim();
}

// ─────────────────────────────────────────────
// Retrieval
// ─────────────────────────────────────────────

/**
 * Retrieve the top-K most relevant chunks for a given query.
 * Returns an array of { chunk, score } sorted by descending score.
 */
async function retrieve(query, topK = 5) {
  const index = loadIndex();
  if (!index || index.length === 0) {
    throw new Error('RAG index is empty or not built. Run: node scripts/buildRagIndex.js');
  }

  const queryEmbedding = await embedText(query);

  const scored = index.map(chunk => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// ─────────────────────────────────────────────
// RAG Pipeline — Main Query Function
// ─────────────────────────────────────────────

/**
 * Full RAG pipeline: retrieve → grade → generate → return.
 *
 * @param {string} query       - The user's question
 * @param {object} options     - { topK, language, farmerProfile }
 * @returns {Promise<{answer, sources, confidence, ragUsed}>}
 */
async function ragAnswer(query, options = {}) {
  const { topK = 5, language = 'en' } = options;
  const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(query);

  await assertOllamaRunning();

  // ── 1. Retrieve top-K chunks ──
  const results = await retrieve(query, topK);
  const bestScore = results[0]?.score ?? 0;

  // ── 2. Confidence gate — if no chunk is relevant, skip LLM entirely ──
  if (bestScore < LOW_CONFIDENCE_THRESHOLD) {
    const notFoundMsg = isHindi
      ? 'मुझे प्रदान किए गए दस्तावेजों में इस प्रश्न का उत्तर नहीं मिला। कृपया अधिक विशिष्ट प्रश्न पूछें जैसे कि PM-KISAN, सहकारिता अधिनियम, या कृषि योजनाओं के बारे में।'
      : 'I could not find relevant information in the provided documents to answer this question. Try asking about PM-KISAN, cooperative acts, agricultural schemes, or government circulars.';
    return {
      answer: notFoundMsg,
      sources: [],
      confidence: 'none',
      ragUsed: false,
      bestScore
    };
  }

  // ── 3. Filter to only meaningfully relevant chunks (score > threshold) ──
  const relevantResults = results.filter(r => r.score >= LOW_CONFIDENCE_THRESHOLD);

  // ── 4. Build context block for the LLM ──
  const contextBlocks = relevantResults.map((r, i) => {
    const m = r.chunk.metadata;
    return [
      `[Source ${i + 1}]`,
      `Title: ${m.title || 'Unknown'}`,
      `Category: ${m.category || 'Unknown'}`,
      `URL: ${m.url || 'N/A'}`,
      `Relevance Score: ${r.score.toFixed(3)}`,
      ``,
      r.chunk.text
    ].join('\n');
  }).join('\n\n---\n\n');

  // ── 5. Build grounded but helpful system prompt ──
  const systemPrompt = isHindi
    ? `आप किसानसहाय के कृषि सहायक हैं। आपका काम नीचे दिए गए सरकारी दस्तावेजों के आधार पर किसानों को सटीक, उपयोगी जानकारी देना है।

नियम:
1. उत्तर मुख्य रूप से दिए गए [Source] दस्तावेजों से दें।
2. यदि दस्तावेज़ों में आंशिक जानकारी है, तो उसे सारांशित करें और स्रोत का नाम बताएं।
3. यदि संदर्भ में उत्तर नहीं मिलता, तो सामान्य सरकारी कृषि ज्ञान का उपयोग कर सकते हैं लेकिन स्पष्ट करें।
4. उत्तर सरल, स्पष्ट और हिंदी में दें। अनावश्यक विवरण न दें।`
    : `You are Sahay AI, the agricultural assistant for KisanSahay — an Indian government farmer welfare portal.
Your job is to give grounded, useful answers to Indian farmers using the retrieved government documents below.

GUIDELINES:
1. Base your answer primarily on the provided [Source] documents. Cite source titles where possible.
2. If the context is partial (e.g. only raw data rows), synthesize and summarize what you can from it.
3. If the context does not cover the question at all, you may briefly answer from general agricultural knowledge but clearly label it as general guidance.
4. Keep answers concise, practical, and farmer-friendly. Avoid legal jargon.
5. Always suggest the farmer verify final details at their local bank branch or the official government portal.`;

  const userPrompt = `RETRIEVED GOVERNMENT DOCUMENTS (use these as your primary source):\n\n${contextBlocks}\n\n---\n\nFARMER'S QUESTION: ${query}\n\nGive a clear, helpful answer. If the documents contain relevant data, summarize it for the farmer. Cite source titles. Keep it concise:`;

  // ── 6. Generate answer with llama3.2 ──
  const answer = await generateCompletion(systemPrompt, userPrompt);

  // ── 7. Build structured source citations ──
  const sources = relevantResults.map(r => ({
    title: r.chunk.metadata.title || 'Unknown',
    url: r.chunk.metadata.url || null,
    category: r.chunk.metadata.category || 'unknown',
    source: r.chunk.metadata.source || 'unknown',
    score: parseFloat(r.score.toFixed(3)),
    chunkIndex: r.chunk.metadata.chunkIndex ?? 0
  }));

  // ── 8. Determine confidence level ──
  const confidence = bestScore >= HIGH_CONFIDENCE_THRESHOLD
    ? 'high'
    : bestScore >= LOW_CONFIDENCE_THRESHOLD
      ? 'medium'
      : 'low';

  return {
    answer,
    sources,
    confidence,
    ragUsed: true,
    bestScore: parseFloat(bestScore.toFixed(3))
  };
}

/**
 * Check if the RAG index exists and return stats.
 */
function getRagStatus() {
  const index = loadIndex();
  if (!index) {
    return { ready: false, message: 'Index not built. Run: node scripts/buildRagIndex.js' };
  }
  return {
    ready: true,
    totalChunks: index.length,
    message: `RAG index loaded with ${index.length} chunks`
  };
}

module.exports = {
  ragAnswer,
  retrieve,
  getRagStatus,
  loadIndex
};
