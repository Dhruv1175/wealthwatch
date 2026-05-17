import Groq from "groq-sdk";
import { extractText } from "unpdf";
import prisma from "@/lib/db";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface ExtractedTransaction {
  amount: number;
  description: string;
  category: string;
  date: string;
}

export async function processStatementPipeline(fileBuffer: Buffer, userId: string) {
  try {
    // 1. Text Extraction
    const uint8Array = new Uint8Array(fileBuffer);
    const pdfData = await extractText(uint8Array);
    
    const rawText = Array.isArray(pdfData.text) 
      ? pdfData.text.join("\n") 
      : pdfData.text || "";

    // If text layer is completely blank, it's a scanned image. Fast fail safely.
    if (!rawText || rawText.trim().length === 0) {
      return { 
        error: "This PDF appears to be a scanned image or photo. WealthWatch digital parsing requires a native e-statement PDF file." 
      };
    }

    // 2. Build Groq AI Prompt
    const systemInstruction = `
      You are a specialized institutional financial parser engine for WealthWatch.
      Your explicit task is to take unstructured raw bank passbook or statement text and transform it into a perfectly clean, standardized JSON array of transaction items.
      
      CRITICAL REQUISITES:
      1. Map values directly to this TypeScript blueprint format layout:
         [{ "amount": number, "description": "string", "category": "string", "date": "YYYY-MM-DD" }]
      2. Keep amounts as positive floating numbers for money incoming/gained, and negative floating numbers for money spent/outgoing.
      3. Categorize items into logical tags (e.g., HOUSING, FOOD, INVESTMENT, SALARY, INCOME, UTILITIES, TRANSFER).
      4. Return ONLY valid, minified raw JSON arrays. Do not append conversational introductory phrases, conversational summaries, markdown ticks, or code blocks.
    `;

    // 3. Connect to Groq Cloud Platform
    const aiResponse = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: `Process this specific transactional ledger data segment now:\n${rawText}` }
      ],
      model: "llama-3.3-70b-versatile", 
      temperature: 0.1,        
      response_format: { type: "json_object" } 
    });

    const rawJsonResponse = aiResponse.choices[0]?.message?.content;
    if (!rawJsonResponse) return { error: "Failed to collect analytical structure from Groq inference." };

    // 4. Structural Parsing & Verification
    const parsedData = JSON.parse(rawJsonResponse);
    const transactionsArray: ExtractedTransaction[] = Array.isArray(parsedData) 
      ? parsedData 
      : parsedData.transactions || Object.values(parsedData)[0];

    if (!Array.isArray(transactionsArray)) {
      return { error: "AI response did not form an executable list sequence structure." };
    }

    // 5. Bulk Database Inserts
    const databaseWrites = await prisma.transaction.createMany({
      data: transactionsArray.map((tx) => ({
        userId: userId,
        amount: tx.amount,
        description: tx.description,
        category: tx.category || "UNASSIGNED",
        date: new Date(tx.date),
      })),
    });

    return { 
      success: true, 
      count: databaseWrites.count 
    };

  } catch (error) {
    console.error("Pipeline Failure details:", error);
    return { error: "Internal processing crash encountered inside the pipeline engine." };
  }
}