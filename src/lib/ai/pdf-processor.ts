
import { extractText } from "unpdf";
import Groq from "groq-sdk";
import prisma from "@/lib/db";
import crypto from "crypto";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Types ──────────────────────────────────────────────────────────────────────
interface RawTransaction {
  amount:      number;
  description: string;
  category:    string;
  date:        string;
  confidence:  number; // 0–1, model self-assessed
}

interface ParseResult {
  success:      true;
  count:        number;
  skipped:      number; // duplicates
  lowConfidence: number; // flagged but still inserted
  transactions: RawTransaction[];
}

interface ParseError {
  error:   string;
  stage:   "extraction" | "ocr" | "ai" | "database" | "validation";
  partial?: RawTransaction[]; // any transactions recovered before failure
}

const VALID_CATEGORIES = [
  "SALARY", "INCOME", "INVESTMENT", "TRANSFER",
  "FOOD", "HOUSING", "UTILITIES", "TRANSPORT",
  "HEALTHCARE", "ENTERTAINMENT", "SHOPPING", "EDUCATION",
  "INSURANCE", "SUBSCRIPTION", "EMI", "TAX", "OTHER",
];

// ── Main pipeline ──────────────────────────────────────────────────────────────
export async function processStatementPipeline(
  fileBuffer: Buffer,
  userId:     string
): Promise<ParseResult | ParseError> {

  // ── STAGE 1: Text extraction ────────────────────────────────────────────────
  let rawText = "";
  let extractionMethod: "text-layer" | "ocr" = "text-layer";

  try {
    const uint8Array = new Uint8Array(fileBuffer);
    const pdfData    = await extractText(uint8Array);
    rawText = Array.isArray(pdfData.text)
      ? pdfData.text.join("\n")
      : (pdfData.text as string) || "";
  } catch (err) {
    console.error("[parser] Text extraction failed:", err);
    rawText = "";
  }

  // ── STAGE 2: OCR fallback for scanned/image PDFs ────────────────────────────
  // If text layer is blank or suspiciously short (< 100 chars), attempt OCR.
  // Requires: tesseract.js + sharp (for PDF → image conversion)
  if (!rawText || rawText.trim().length < 100) {
    extractionMethod = "ocr";
    const ocrResult = await attemptOcr(fileBuffer);
    if (!ocrResult.success) {
      return {
        error: "This document appears to be a scanned image and OCR extraction failed. "
          + "Please use a digital e-statement PDF exported directly from your bank's portal.",
        stage: "ocr",
      };
    }
    rawText = ocrResult.text;
  }

  // Truncate to avoid hitting Groq token limits (~6000 chars is safe for llama-3.3-70b)
  const truncatedText = rawText.slice(0, 6000);

  // ── STAGE 3: AI extraction with retry ──────────────────────────────────────
  const extracted = await extractWithRetry(truncatedText, 2);
  if (!extracted) {
    return {
      error: "AI extraction produced no valid transactions after 2 attempts. "
        + "Ensure the document is a bank statement or passbook.",
      stage: "ai",
    };
  }

  if (extracted.length === 0) {
    return {
      error: "No transactions were found in this document for the detected period.",
      stage: "validation",
    };
  }

  // ── STAGE 4: Validate + sanitize each transaction ──────────────────────────
  const valid: RawTransaction[] = [];
  for (const tx of extracted) {
    const sanitized = sanitizeTransaction(tx);
    if (sanitized) valid.push(sanitized);
  }

  if (valid.length === 0) {
    return {
      error: "All extracted transactions failed validation. "
        + "Check that the document contains numerical amounts and dates.",
      stage: "validation",
    };
  }

  // ── STAGE 5: Deduplication via content hash ─────────────────────────────────
  // Hash = userId + date + amount + description (lowercased, trimmed)
  // Existing hashes are stored in a field we add to Transaction model.
  // For now we check by (userId, date, amount, description) tuple.
  const existingTx = await prisma.transaction.findMany({
    where:  { userId },
    select: { amount: true, description: true, date: true },
  });

  const existingSet = new Set(
    existingTx.map((t) =>
      buildHash(t.description, t.amount, t.date.toISOString().split("T")[0])
    )
  );

  const toInsert:  RawTransaction[] = [];
  const skippedTx: RawTransaction[] = [];

  for (const tx of valid) {
    const hash = buildHash(tx.description, tx.amount, tx.date);
    if (existingSet.has(hash)) {
      skippedTx.push(tx);
    } else {
      toInsert.push(tx);
    }
  }

  // ── STAGE 6: Tier enforcement ───────────────────────────────────────────────
  const BASIC_TX_LIMIT = 50;
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { tier: true, _count: { select: { transactions: true } } },
  });

  if (user?.tier === "BASIC") {
    const remaining = Math.max(0, BASIC_TX_LIMIT - user._count.transactions);
    if (remaining === 0) {
      return {
        error: `Transaction limit reached (${BASIC_TX_LIMIT} max on Basic tier). `
          + `Upgrade to Pro to import unlimited records.`,
        stage: "database",
        partial: toInsert, // Return what would have been inserted
      };
    }
    // Trim to what fits within the limit
    toInsert.splice(remaining);
  }

  // ── STAGE 7: Bulk insert ────────────────────────────────────────────────────
  if (toInsert.length === 0) {
    return {
      success:      true,
      count:        0,
      skipped:      skippedTx.length,
      lowConfidence: 0,
      transactions: [],
    };
  }

  const lowConfidence = toInsert.filter((tx) => tx.confidence < 0.7).length;

  await prisma.transaction.createMany({
    data: toInsert.map((tx) => ({
      userId,
      amount:      tx.amount,
      description: tx.description,
      category:    tx.category,
      date:        new Date(tx.date),
    })),
  });

  return {
    success:      true,
    count:        toInsert.length,
    skipped:      skippedTx.length,
    lowConfidence,
    transactions: toInsert,
  };
}

// ── Groq extraction with retry ─────────────────────────────────────────────────
async function extractWithRetry(
  text:    string,
  retries: number
): Promise<RawTransaction[] | null> {
  // The prompt explicitly asks for a JSON object with a "transactions" key
  // so Groq's json_object mode works correctly (it requires an object, not an array)
  const systemPrompt = `You are a financial statement parser for WealthWatch.
Extract every transaction from the bank statement text provided.

Return a JSON object in this exact shape:
{
  "transactions": [
    {
      "amount": -1500.00,
      "description": "Amazon Purchase",
      "category": "SHOPPING",
      "date": "2024-01-15",
      "confidence": 0.95
    }
  ]
}

Rules:
- amount: negative for debits/expenses, positive for credits/income
- description: clean merchant/payee name, max 120 chars
- category: one of SALARY|INCOME|INVESTMENT|TRANSFER|FOOD|HOUSING|UTILITIES|TRANSPORT|HEALTHCARE|ENTERTAINMENT|SHOPPING|EDUCATION|INSURANCE|SUBSCRIPTION|EMI|TAX|OTHER
- date: YYYY-MM-DD format only
- confidence: 0.0–1.0 — your confidence that this is a real transaction (not a running balance, header, or noise)
- Omit running balances, opening/closing balance rows, and header rows
- Return ONLY the JSON object, no markdown, no explanation`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: `Parse this statement:\n\n${text}` },
        ],
        model:           "llama-3.3-70b-versatile",
        temperature:     0.05, // Near-zero for deterministic extraction
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const arr    = parsed.transactions;

      if (!Array.isArray(arr)) {
        console.warn(`[parser] Attempt ${attempt + 1}: response.transactions is not an array`);
        continue;
      }

      return arr;
    } catch (err) {
      console.error(`[parser] Groq attempt ${attempt + 1} failed:`, err);
      if (attempt === retries) return null;
      await sleep(1000 * (attempt + 1)); // Exponential backoff
    }
  }
  return null;
}

// ── OCR fallback ───────────────────────────────────────────────────────────────
// Uses tesseract.js. Requires sharp to rasterize PDF pages to images.
// This is a best-effort fallback — results on scanned documents vary.
async function attemptOcr(
  buffer: Buffer
): Promise<{ success: true; text: string } | { success: false }> {
  try {
    // Dynamic imports — only loads if actually needed (keeps cold start fast)
    const { createWorker } = await import("tesseract.js");
    const sharp            = (await import("sharp")).default;

    // Convert first page of PDF to PNG via sharp + pdf-to-image
    // Note: full PDF → image requires either @napi-rs/canvas or poppler bindings.
    // Without a native PDF rasterizer we do a basic attempt on the raw buffer.
    // For production, consider using pdf-poppler or a cloud vision API instead.
    const imageBuffer = await sharp(buffer, { pages: 1 })
      .png()
      .toBuffer()
      .catch(() => null);

    if (!imageBuffer) {
      console.warn("[parser] sharp could not rasterize PDF — OCR skipped");
      return { success: false };
    }

    const worker = await createWorker("eng");
    const { data: { text } } = await worker.recognize(imageBuffer);
    await worker.terminate();

    if (!text || text.trim().length < 50) return { success: false };
    return { success: true, text };
  } catch (err) {
    console.error("[parser] OCR attempt failed:", err);
    return { success: false };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function sanitizeTransaction(raw: Partial<RawTransaction>): RawTransaction | null {
  const amount      = Number(raw.amount);
  const description = String(raw.description ?? "").trim().slice(0, 120);
  const dateStr     = String(raw.date ?? "").trim();
  const confidence  = Math.min(1, Math.max(0, Number(raw.confidence ?? 0.8)));

  if (isNaN(amount) || amount === 0)             return null;
  if (!description)                              return null;
  if (isNaN(Date.parse(dateStr)))                return null;
  if (new Date(dateStr) > new Date())            return null; // No future dates

  const rawCategory = String(raw.category ?? "OTHER").trim().toUpperCase();
  const category    = VALID_CATEGORIES.includes(rawCategory) ? rawCategory : "OTHER";

  return { amount, description, category, date: dateStr, confidence };
}

function buildHash(description: string, amount: number, date: string): string {
  const key = `${description.toLowerCase().trim()}|${amount}|${date}`;
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}