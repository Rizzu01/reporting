import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Task = {
  id: string;
  date: string;
  description: string;
  assignedTo: string;
  driveLink?: string;
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured." }, { status: 500 });
    }

    const { tasks, rangeLabel, scope } = (await request.json()) as {
      tasks: Task[];
      rangeLabel: string;
      scope: "week" | "month";
    };

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: "No tasks found for the selected period." }, { status: 400 });
    }

    const grouped = tasks.reduce<Record<string, Task[]>>((acc, task) => {
      (acc[task.date] ??= []).push(task);
      return acc;
    }, {});

    const taskText = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayTasks]) => {
        const heading = new Intl.DateTimeFormat("en-IN", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${date}T00:00:00Z`));
        const lines = dayTasks.map((task) => `- ${task.description} (Assigned To: ${task.assignedTo})`);
        const driveLink = dayTasks.find((task) => task.driveLink)?.driveLink;
        if (driveLink) lines.push(`- Work Files: ${driveLink}`);
        return `### ${heading}\n${lines.join("\n")}`;
      })
      .join("\n\n");

    const reportTitle = scope === "month" ? "Monthly Work Report" : "Weekly Work Report";
    const summaryTitle = scope === "month" ? "Monthly Summary" : "Weekly Summary";

    const prompt = `Create a complete professional ${scope} work report for a manager using ONLY the work log below.\n\nPeriod: ${rangeLabel}\n\nWORK LOG:\n${taskText}\n\nReturn ONLY the report in this exact structure:\n\n# 🎨 ${reportTitle}\n\nPeriod: ${rangeLabel}\n\nFor every date with tasks:\n### Day | Date\n\n- Keep every logged task as a bullet.\n\n**Work Files:** exact provided link, only when present.\n\n**Remark:**\nWrite a professional 2-3 sentence remark based only on that day's logged work.\n\n---\n\nAfter all days add:\n## ${summaryTitle}\n\nWrite a polished manager-facing summary based only on the logged tasks. Do not invent facts, numbers, outcomes, achievements, blockers, or work that is not present. Preserve every Drive link exactly.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
        }),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data?.error?.message || "Gemini could not generate the report." }, { status: response.status });
    }

    const report = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
    if (!report) {
      return NextResponse.json({ error: "Gemini returned an empty report." }, { status: 502 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Gemini report generation error:", error);
    return NextResponse.json({ error: "Unable to generate the report right now." }, { status: 500 });
  }
}
