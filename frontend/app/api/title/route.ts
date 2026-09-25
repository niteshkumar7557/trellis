import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import type { WireMessage } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: WireMessage[] };
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY is missing. Add it to the .env file and restart the server.",
      );
    }
    if (messages.length === 0) {
      throw new Error("A conversation is required to generate a title.");
    }

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content:
            "Create a concise, descriptive conversation title from this conversation. Return only 3 to 7 words, without quotes, markdown, punctuation, or a period.",
        },
        ...messages
          .slice(-4)
          .map(({ role, content }) => ({ role, content: content.slice(0, 4000) })),
      ],
      reasoning_effort: "low",
      temperature: 0.2,
      max_completion_tokens: 128,
    });

    const title = (completion.choices[0]?.message?.content || "New conversation")
      .replace(/["'`.]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return NextResponse.json({ title });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate a conversation title.",
      },
      { status: 500 },
    );
  }
}
