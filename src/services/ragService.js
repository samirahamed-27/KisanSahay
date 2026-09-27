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
      ? 'मुझे आधिकारिक निर्देशों में इसका विशिष्ट उत्तर नहीं मिल सका। कृपया इस विवरण को अपनी स्थानीय बैंक शाखा या कृषि विज्ञान केंद्र से सत्यापित करें।'
      : 'I cannot find the specific answer to this in the official directives. Please verify this detail with your local bank branch or Krishi Vigyan Kendra.';
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

  // ── 5. Build grounded, factually reliable system prompt ──
  const systemPrompt = isHindi
    ? `आप किसानसहाय के आधिकारिक कृषि सहायक (Sahay AI) हैं। आपका प्राथमिक उद्देश्य पूर्ण तथ्यात्मक विश्वसनीयता है।
प्रत्येक उत्तर को पूरी तरह से प्रदान किए गए 'आधिकारिक अपलोड किए गए दस्तावेज़ों' ([Source]) पर आधारित करें।

सख्त विश्वसनीयता निर्देश:
1. यदि उत्तर दस्तावेजों में स्पष्ट रूप से उल्लिखित है, तो विशिष्ट धारा या दस्तावेज़ का नाम उद्धृत करें।
2. यदि जानकारी प्रदान किए गए दस्तावेजों में मौजूद नहीं है, तो अनुमान लगाने या सामान्य ज्ञान का उपयोग करने का प्रयास न करें। इसके बजाय उत्तर दें: 'मुझे आधिकारिक निर्देशों में इसका विशिष्ट उत्तर नहीं मिल सका। कृपया इस विवरण को अपनी स्थानीय बैंक शाखा या कृषि विज्ञान केंद्र से सत्यापित करें।'
3. उपयोगिता की तुलना में सटीकता को प्राथमिकता दें; अस्पष्ट या गलत उत्तर देने से बेहतर है कि आप स्वीकार करें कि आपको नहीं पता।
4. जब किसी ऋण या सरकारी योजना की व्याख्या करें:
   - स्पष्ट, बुलेटेड पात्रता मानदंड: 'आप पात्र हैं यदि आप इन विशिष्ट शर्तों को पूरा करते हैं: [शर्तें]' लिखें। यदि कोई शर्त डेटा में नहीं है, तो लिखें: '⚠️ [शर्त का नाम] आधिकारिक निर्देशों में निर्दिष्ट नहीं है।'
   - आवश्यक दस्तावेजों की पूरी सूची बुलेट पॉइंट्स में दें।
   - आवेदन करने के चरण-दर-चरण निर्देश (संख्यांकित) दें।
5. प्रतिबंधित वाक्यांश: कभी भी 'आप पात्र हो सकते हैं', 'शायद', या 'आम तौर पर' जैसे अस्पष्ट शब्दों का उपयोग न करें।
6. उपयोगकर्ता जिस भाषा में प्रश्न पूछे, विशेष रूप से उसी भाषा में उत्तर दें।`
    : `You are Sahay AI, the official agricultural finance assistant for KisanSahay.
Your primary goal is absolute factual reliability. Base every answer strictly on the provided 'Official Uploaded Documents' ([Source]).

CRITICAL FACTUAL RELIABILITY & GROUNDING RULES:
1. Base every answer strictly on the provided context. If the answer is explicitly stated in the documents, cite the specific section or document name.
2. If the information is NOT present in the provided documents, do not attempt to guess or use general knowledge. Instead, respond with: 'I cannot find the specific answer to this in the official directives. Please verify this detail with your local bank branch or Krishi Vigyan Kendra.'
3. Prioritize accuracy over helpfulness; it is better to admit you don't know than to provide a vague or incorrect answer.
4. Avoid vague or generic responses. When explaining a loan or government scheme, you must provide:
   - **📋 Eligibility Criteria**: Clear, bulleted eligibility criteria. Instead of saying 'you may be eligible,' use 'You are eligible if you meet these specific conditions: [List Conditions].' If a detail is not specified in your data, state exactly what is missing rather than giving a general answer: '⚠️ [Condition name] not specified in official directives.'
   - **📄 Required Documentation**: A complete list of required documentation as bullet points.
   - **🪜 Step-by-Step Instructions on How to Apply**: Numbered step-by-step instructions.
5. BANNED PHRASES — Never use:
   - 'you may be eligible' → MUST use: 'You are eligible if you meet these specific conditions: [List Conditions]'
   - 'you might qualify'
   - 'generally' / 'typically' / 'usually'
   - 'contact your bank for details' (as a standalone answer)
6. LANGUAGE RULE: Detect the language used by the user in their query and respond exclusively in that same language. Do not switch languages mid-conversation. If ambiguous, default to English.`;

  const userPrompt = `OFFICIAL UPLOADED DOCUMENTS (Base your answer strictly on these):\n\n${contextBlocks}\n\n---\n\nUSER QUERY: ${query}\n\nAnswer:`;

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
