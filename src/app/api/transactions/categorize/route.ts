// src/app/api/transactions/categorize/route.ts
// POST /api/transactions/categorize
// Uses Groq to suggest a category for a transaction description.
// Lightweight — single Groq call, no DB write.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const VALID_CATEGORIES = [
  "SALARY", "INCOME", "INVESTMENT", "TRANSFER",
  "FOOD", "HOUSING", "UTILITIES", "TRANSPORT",
  "HEALTHCARE", "ENTERTAINMENT", "SHOPPING", "EDUCATION",
  "INSURANCE", "SUBSCRIPTION", "OTHER",
];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { description } = await req.json();

    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "Description required." }, { status: 400 });
    }

    const response = await groq.chat.completions.create({
      messages: [
        {
          role:    "system",
          content: `You are a financial transaction categorizer. Given a transaction description, return ONLY a single category from this exact list: ${VALID_CATEGORIES.join(", ")}. Return nothing else — no explanation, no punctuation, just the category word in uppercase.`,
        },
        {
          role:    "user",
          content: description.trim(),
        },
      ],
      model:       "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens:  20,
    });

    const raw      = response.choices[0]?.message?.content?.trim().toUpperCase() ?? "OTHER";
    const category = VALID_CATEGORIES.includes(raw) ? raw : "OTHER";

    return NextResponse.json({ category });
  } catch (err) {
    console.error("[/api/transactions/categorize POST]", err);
    return NextResponse.json({ category: "OTHER" });
  }
}