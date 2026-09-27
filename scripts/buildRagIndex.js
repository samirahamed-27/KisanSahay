/**
 * RAG Index Builder — KisanSahay
 *
 * Run once (or after updating data files) to build the vector index:
 *   node scripts/buildRagIndex.js
 *
 * Reads:
 *   - src/data/data.jsonl          (421 webpage entries)
 *   - src/data/pdf_data.jsonl      (192 PDF entries)
 *   - src/data/pmkisan_period_data.json  (23 PM-KISAN stats)
 *
 * Outputs:
 *   - src/data/rag_index.json      (vector store — gitignored)
 */

const fs = require('fs');
const path = require('path');

// ─── Paths ───────────────────────────────────────────────────────────
const DATA_DIR   = path.join(__dirname, '..', 'src', 'data');
const OUTPUT     = path.join(DATA_DIR, 'rag_index.json');
const DATA_JSONL = path.join(DATA_DIR, 'data.jsonl');
const PDF_JSONL  = path.join(DATA_DIR, 'pdf_data.jsonl');
const PMKISAN    = path.join(DATA_DIR, 'pmkisan_period_data.json');

// ─── Ollama Config ────────────────────────────────────────────────────
const OLLAMA_BASE  = 'http://127.0.0.1:11434';
const EMBED_MODEL  = 'nomic-embed-text';

// ─── Chunking Config ──────────────────────────────────────────────────
const CHUNK_SIZE    = 1800; // characters per chunk (~450 tokens)
const CHUNK_OVERLAP = 200;  // overlap between consecutive chunks
const MIN_TEXT_LEN  = 80;   // skip entries with text shorter than this

// ─── Helpers ─────────────────────────────────────────────────────────

/** Sanitize text: fix TextEdit's \r\r\n, collapse whitespace, strip HTML */
function sanitize(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\r\r\n/g, '\n')        // TextEdit artefact
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/<[^>]+>/g, ' ')        // strip any HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')         // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')      // collapse triple+ newlines
    .trim();
}

// ─── Two-Tier Structural Chunking Engine ──────────────────────────────

/**
 * Split text by Markdown headers (# through ####).
 * Preserves structural hierarchy, section levels, and complete breadcrumb paths.
 */
function splitMarkdownSections(text) {
  const lines = text.split('\n');
  const sections = [];
  let currentHeader = '';
  let currentLevel = 0;
  let currentHeaders = [];
  let currentLines = [];

  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+)$/);
    if (match) {
      if (currentLines.length > 0 || currentHeader) {
        sections.push({
          header: currentHeader,
          level: currentLevel,
          headers: [...currentHeaders],
          content: currentLines.join('\n').trim()
        });
      }
      currentLevel = match[1].length;
      currentHeader = match[2].trim();
      currentHeaders = currentHeaders.slice(0, currentLevel - 1);
      currentHeaders[currentLevel - 1] = currentHeader;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0 || currentHeader) {
    sections.push({
      header: currentHeader,
      level: currentLevel,
      headers: [...currentHeaders],
      content: currentLines.join('\n').trim()
    });
  }

  return sections.filter(s => s.content.length > 0);
}

/**
 * Recursive character splitter for Tier 2 overflow handling.
 * Safely breaks on paragraph (\n\n), newline (\n), sentence (. ), or space ( )
 * so clauses and words are never severed abruptly.
 */
function recursiveSubSplit(text, maxSize = 1800, overlap = 200) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);
    if (end < text.length) {
      // Find nearest boundary before end: paragraph > newline > sentence
      const lastParagraph = text.lastIndexOf('\n\n', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const lastPeriod = text.lastIndexOf('. ', end);
      const candidateBreak = Math.max(lastParagraph, lastNewline, lastPeriod > 0 ? lastPeriod + 1 : -1);

      if (candidateBreak > start + (maxSize * 0.4)) {
        end = candidateBreak;
      }
    }
    const chunk = text.slice(start, end).trim();
    if (chunk.length >= MIN_TEXT_LEN) {
      chunks.push(chunk);
    }
    if (end >= text.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}

/**
 * Two-Tier Structural Decomposition with Enhanced Metadata:
 * - Tier 1: Markdown header sections (#, ##, ###) kept atomic.
 * - Tier 2: Overflow sections (> maxSize) split recursively with Contextual Anchor prepended.
 * - Metadata: breadcrumb_path, depth_level, parent_id, child_id, is_overflow.
 */
function chunkTextStructural(text, baseMetadata = {}, maxSize = 3500, overlap = 200) {
  if (!text || typeof text !== 'string') return [];
  const cleanText = text.trim();
  if (cleanText.length < MIN_TEXT_LEN) return [];

  const sections = splitMarkdownSections(cleanText);
  const docCategory = baseMetadata.category || 'General';
  const docTitle = baseMetadata.title || 'Directives';
  const docBaseId = (baseMetadata.source || 'doc').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);

  const results = [];
  let chunkCounter = 0;

  if (sections.length === 0 || (sections.length === 1 && sections[0].level === 0)) {
    // Document without markdown headers
    if (cleanText.length <= maxSize) {
      // Atomic structural chunk
      results.push({
        text: cleanText,
        metadata: {
          ...baseMetadata,
          chunk_id: `${docBaseId}_s01_c00`,
          parent_id: `${docBaseId}_s01`,
          child_id: 0,
          depth_level: 0,
          breadcrumb_path: `${docCategory} > ${docTitle}`,
          header_text: '',
          is_overflow: false,
          total_sub_chunks: 1,
          chunkIndex: 0,
          totalChunks: 1
        }
      });
      return results;
    } else {
      // Tier 2 Safety Net overflow handling
      const subChunks = recursiveSubSplit(cleanText, CHUNK_SIZE, overlap);
      const anchor = `[Context: ${docTitle}]\n\n`;
      return subChunks.map((sub, i) => ({
        text: sub.startsWith('[Context:') ? sub : anchor + sub,
        metadata: {
          ...baseMetadata,
          chunk_id: `${docBaseId}_s01_c0${i + 1}`,
          parent_id: `${docBaseId}_s01`,
          child_id: i + 1,
          depth_level: 0,
          breadcrumb_path: `${docCategory} > ${docTitle}`,
          header_text: '',
          is_overflow: true,
          total_sub_chunks: subChunks.length,
          chunkIndex: i,
          totalChunks: subChunks.length
        }
      }));
    }
  }

  // Multi-section Markdown document
  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    const sectionId = `${docBaseId}_s${String(sIdx + 1).padStart(2, '0')}`;
    const headerPath = sec.headers.filter(Boolean);
    const breadcrumb = [docCategory, docTitle, ...headerPath].join(' > ');
    const anchor = headerPath.length > 0 ? `[Context: ${headerPath.join(' > ')}]\n\n` : '';

    if (sec.content.length <= maxSize) {
      // Atomic Section (zero fragmentation)
      results.push({
        text: sec.content,
        metadata: {
          ...baseMetadata,
          chunk_id: `${sectionId}_c00`,
          parent_id: sectionId,
          child_id: 0,
          depth_level: sec.level,
          breadcrumb_path: breadcrumb,
          header_text: sec.header,
          is_overflow: false,
          total_sub_chunks: 1,
          chunkIndex: chunkCounter++,
          totalChunks: 0
        }
      });
    } else {
      // Tier 2: Overflow handling with Contextual Anchor
      const subs = recursiveSubSplit(sec.content, CHUNK_SIZE, overlap);
      for (let cIdx = 0; cIdx < subs.length; cIdx++) {
        const sub = subs[cIdx];
        const subText = (sub.startsWith('#') || sub.startsWith('[Context:')) ? sub : anchor + sub;
        results.push({
          text: subText,
          metadata: {
            ...baseMetadata,
            chunk_id: `${sectionId}_c0${cIdx + 1}`,
            parent_id: sectionId,
            child_id: cIdx + 1,
            depth_level: sec.level,
            breadcrumb_path: breadcrumb,
            header_text: sec.header,
            is_overflow: true,
            total_sub_chunks: subs.length,
            chunkIndex: chunkCounter++,
            totalChunks: 0
          }
        });
      }
    }
  }

  // Update totalChunks across all items
  results.forEach(r => { r.metadata.totalChunks = results.length; });
  return results;
}

/**
 * Backward-compatible chunkText: returns Array<string>.
 * Preserves exact public API contract while upgrading internal splitting logic.
 */
function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const structuralDocs = chunkTextStructural(text, {}, size * 2, overlap);
  return structuralDocs.map(d => d.text);
}

/** Parse a JSONL file — returns array of valid parsed objects */
function parseJsonl(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const results = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      results.push(JSON.parse(trimmed));
    } catch {
      // silently skip malformed lines
    }
  }
  return results;
}

/** Sleep helper for rate-limiting Ollama calls */
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Embed text via Ollama's nomic-embed-text */
async function embed(text) {
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
    signal: AbortSignal.timeout(30000)
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama embed error ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.embedding;
}

// ─── Ingestion Functions ──────────────────────────────────────────────

/** Ingest data.jsonl — 421 webpage entries */
function ingestDataJsonl() {
  console.log('\n📄 Ingesting data.jsonl...');
  const entries = parseJsonl(DATA_JSONL);
  const documents = [];

  for (const entry of entries) {
    const text = sanitize(entry.text);
    if (text.length < MIN_TEXT_LEN) continue;

    const metadata = {
      source: 'data.jsonl',
      type: entry.type || 'webpage',
      category: entry.category || 'other',
      title: (entry.title || 'Unknown').slice(0, 200),
      url: entry.url || null,
      contentHash: entry.content_hash || null
    };

    const structuralChunks = chunkTextStructural(text, metadata);
    structuralChunks.forEach((chunk) => {
      documents.push(chunk);
    });
  }

  console.log(`   ✓ ${entries.length} entries → ${documents.length} chunks`);
  return documents;
}

/** Ingest pdf_data.jsonl — 192 PDF entries (skipping empty text) */
function ingestPdfJsonl() {
  console.log('\n📑 Ingesting pdf_data.jsonl...');
  const entries = parseJsonl(PDF_JSONL);
  const documents = [];
  let skipped = 0;

  for (const entry of entries) {
    const text = sanitize(entry.text);
    if (text.length < MIN_TEXT_LEN) { skipped++; continue; }

    const metadata = {
      source: 'pdf_data.jsonl',
      type: 'pdf',
      category: entry.category || 'other',
      title: decodeURIComponent((entry.title || 'Unknown PDF').replace(/%20/g, ' ')).slice(0, 200),
      url: entry.url || null,
      localPdf: entry.local_pdf || null
    };

    const structuralChunks = chunkTextStructural(text, metadata);
    structuralChunks.forEach((chunk) => {
      documents.push(chunk);
    });
  }

  console.log(`   ✓ ${entries.length} entries → ${documents.length} chunks (${skipped} empty PDFs skipped)`);
  return documents;
}

/** Ingest pmkisan_period_data.json — structured as descriptive text blocks */
function ingestPmkisanJson() {
  console.log('\n🌾 Ingesting pmkisan_period_data.json...');
  const raw = fs.readFileSync(PMKISAN, 'utf8');
  const entries = JSON.parse(raw.replace(/\r\r\n/g, '\n').replace(/\r\n/g, '\n'));
  const documents = [];

  // Flatten structured rows into natural language text for embedding
  for (const entry of entries) {
    const text = [
      `PM-KISAN Beneficiary Data`,
      `Financial Year: ${entry.financial_year}`,
      `Installment Period: ${entry.installment_period}`,
      `Beneficiary Count: ${Number(entry.beneficiary_count).toLocaleString('en-IN')} farmers`,
      `Source: ${entry.source}`,
      `Source URL: ${entry.source_url}`,
      ``,
      `During the ${entry.installment_period} installment of financial year ${entry.financial_year}, ` +
      `a total of ${Number(entry.beneficiary_count).toLocaleString('en-IN')} farmers received PM-KISAN benefits.`
    ].join('\n');

    documents.push({
      text,
      metadata: {
        source: 'pmkisan_period_data.json',
        type: 'structured',
        category: 'scheme',
        title: `PM-KISAN ${entry.installment_period} ${entry.financial_year}`,
        url: entry.source_url,
        chunkIndex: 0,
        totalChunks: 1,
        financial_year: entry.financial_year,
        installment_period: entry.installment_period,
        beneficiary_count: entry.beneficiary_count
      }
    });
  }

  // Also add a summary document covering all years
  const allYears = entries.map(e =>
    `${e.financial_year} (${e.installment_period}): ${Number(e.beneficiary_count).toLocaleString('en-IN')} beneficiaries`
  ).join('\n');

  documents.push({
    text: `PM-KISAN Complete Beneficiary Count History (All Installments):\n\n${allYears}\n\nSource: https://www.pmkisan.gov.in/`,
    metadata: {
      source: 'pmkisan_period_data.json',
      type: 'structured',
      category: 'scheme',
      title: 'PM-KISAN All Installments Summary',
      url: 'https://www.pmkisan.gov.in/',
      chunkIndex: 0,
      totalChunks: 1
    }
  });

  console.log(`   ✓ ${entries.length} entries → ${documents.length} documents (${entries.length} individual + 1 summary)`);
  return documents;
}

// ─── Main Build Function ──────────────────────────────────────────────

async function buildIndex() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🛠️  KisanSahay RAG Index Builder');
  console.log('   Embedding model: nomic-embed-text (via Ollama)');
  console.log('═══════════════════════════════════════════════════════');

  // Check Ollama is running
  try {
    const health = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(4000) });
    if (!health.ok) throw new Error();
    console.log('\n✅ Ollama is running');
  } catch {
    console.error('\n❌ Ollama is not running. Start it with:\n   ollama serve\n');
    process.exit(1);
  }

  // Collect all documents from all 3 sources
  const allDocs = [
    ...ingestDataJsonl(),
    ...ingestPdfJsonl(),
    ...ingestPmkisanJson()
  ];

  console.log(`\n📊 Total chunks to embed: ${allDocs.length}`);
  console.log('   (This may take 5–15 minutes depending on your machine)\n');

  const indexed = [];
  let errors = 0;
  const BATCH_DELAY_MS = 50; // small delay between calls to avoid overwhelming Ollama

  for (let i = 0; i < allDocs.length; i++) {
    const doc = allDocs[i];
    const pct = (((i + 1) / allDocs.length) * 100).toFixed(1);
    process.stdout.write(`\r   Embedding ${i + 1}/${allDocs.length} (${pct}%)...`);

    try {
      const embedding = await embed(doc.text);
      indexed.push({
        id: `chunk-${i}`,
        text: doc.text,
        embedding,
        metadata: doc.metadata
      });
    } catch (err) {
      errors++;
      // Log every 10th error to avoid spam
      if (errors <= 5 || errors % 20 === 0) {
        process.stdout.write(`\n   ⚠️  Chunk ${i} embed failed: ${err.message}\n`);
      }
    }

    // Small delay to avoid flooding Ollama
    if (BATCH_DELAY_MS > 0) await sleep(BATCH_DELAY_MS);
  }

  console.log(`\n\n✅ Embedded ${indexed.length} chunks (${errors} errors)`);

  // Write index to disk
  fs.writeFileSync(OUTPUT, JSON.stringify(indexed), 'utf8');
  const sizeKB = Math.round(fs.statSync(OUTPUT).size / 1024);
  console.log(`💾 Index saved to: src/data/rag_index.json (${sizeKB} KB)`);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎉 RAG index built successfully!');
  console.log('   Start the server: npm start');
  console.log('   Test:  POST http://localhost:3000/api/assistant/chat');
  console.log('          Body: { "message": "How many PM-KISAN beneficiaries in 2025-26?" }');
  console.log('═══════════════════════════════════════════════════════\n');
}

buildIndex().catch(err => {
  console.error('\n❌ Build failed:', err.message);
  process.exit(1);
});
