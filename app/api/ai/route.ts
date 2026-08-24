import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Add OPENAI_API_KEY to enable AI features." }, { status: 503 });
  }

  try {
    const { type, entries } = await request.json();
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const safeEntries = Array.isArray(entries) ? entries : [];
    const source = safeEntries.map((e: { date?: string; title?: string; details?: string; status?: string }) => `${e.date ?? ""} | ${e.title ?? ""} | ${e.details ?? ""} | ${e.status ?? ""}`).join("\n");

    const prompt = type === "summary"
      ? `Create a concise, professional weekly manager update from these work logs. Mention the most meaningful accomplishments, progress, blockers if any, and next focus. Do not invent facts. Use 3-5 bullets and a short opening sentence.\n\n${source}`
      : `Write one polished manager-facing remark for today's work logs. Combine related work, focus on outcome and progress, avoid exaggeration, and do not invent facts. Return only the remark in 1-3 sentences.\n\n${source}`;

    const response = await client.responses.create({ model: "gpt-5.6-luna", input: prompt });
    return NextResponse.json({ text: response.output_text.trim() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not generate the AI report." }, { status: 500 });
  }
}
