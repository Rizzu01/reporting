import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Add OPENAI_API_KEY to enable AI features." }, { status: 503 });
  try {
    const { type, entries } = await request.json();
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const safeEntries = Array.isArray(entries) ? entries : [];
    const source = safeEntries.map((e: { date?: string; description?: string; title?: string; details?: string; assignedTo?: string }) => `${e.date ?? ""} | ${e.description ?? e.title ?? ""} | ${e.details ?? ""} | ${e.assignedTo ?? "Designer"}`).join("\n");
    const prompt = type === "summary"
      ? `Write a polished Weekly Summary for a manager from these work tasks. Use the professional first-person style of a design/product employee. Mention the major work areas, important campaigns/projects, notable volume or technical work, and overall workload. Do not invent facts, numbers, projects, or outcomes. Return 1-2 strong paragraphs, not bullets.\n\nTASKS:\n${source}`
      : `Write one professional daily Remark for a manager based only on these tasks. Summarize the day's focus, work areas, and meaningful workload. If there is a clear campaign or technical implementation focus, mention it. Do not invent facts. Use natural professional language, 2-3 sentences, no heading, no bullets.\n\nTASKS:\n${source}`;
    const response = await client.responses.create({ model: "gpt-5.6-luna", input: prompt });
    return NextResponse.json({ text: response.output_text.trim() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not generate the AI report." }, { status: 500 });
  }
}
