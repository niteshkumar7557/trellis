import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import type { WireMessage } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: WireMessage[] };
    const messages = body.messages;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY is missing. Add it to the .env file and restart the server.",
      );
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Please enter a message before sending.");
    }

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      messages: messages.map(({ role, content }) => ({ role, content })),
      temperature: 0.7,
      max_tokens: 1024,
    });

    const content =
      completion.choices[0]?.message?.content ||
      "I was not able to generate a response.";
    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while contacting Groq.",
      },
      { status: 500 },
    );
  }
}
