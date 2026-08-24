import { NextResponse } from "next/server";
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

type Entry = { date: string; description?: string; title?: string; assignedTo?: string; remark?: string };

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}
function markdownRuns(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) =>
    part.startsWith("**") && part.endsWith("**")
      ? new TextRun({ text: part.slice(2, -2), bold: true })
      : new TextRun({ text: part }),
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entries = (Array.isArray(body.entries) ? body.entries : []) as Entry[];
    const overallReport = typeof body.overallReport === "string" ? body.overallReport.trim() : "";
    if (!entries.length) return NextResponse.json({ error: "No work entries to export." }, { status: 400 });

    const dates = [...new Set(entries.map((entry) => entry.date))].sort();
    const period = `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`;
    const children: Paragraph[] = [
      new Paragraph({ text: "🎨 Weekly Work Report", heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
      new Paragraph({ children: [new TextRun({ text: `Period: ${period}`, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 420 } }),
    ];

    if (overallReport) {
      const lines = overallReport.split(/\r?\n/);
      let inSummary = false;
      let remarkMode = false;
      const summaryLines: string[] = [];

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line === "---") continue;
        if (/^🎨\s*Weekly Work Report/i.test(line) || /^Period:/i.test(line)) continue;
        if (/^##\s*Weekly Summary/i.test(line)) { inSummary = true; remarkMode = false; continue; }
        if (inSummary) { summaryLines.push(line); continue; }
        if (/^###\s*/.test(line)) {
          remarkMode = false;
          children.push(new Paragraph({ text: line.replace(/^###\s*/, ""), heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 140 } }));
          continue;
        }
        if (/^\*\*Remark:\*\*/i.test(line) || /^Remark:/i.test(line)) {
          remarkMode = true;
          children.push(new Paragraph({ children: [new TextRun({ text: "Remark:", bold: true })], spacing: { before: 100, after: 80 } }));
          continue;
        }
        if (line.startsWith("- ")) {
          remarkMode = false;
          children.push(new Paragraph({ bullet: { level: 0 }, children: markdownRuns(line.slice(2)), spacing: { after: 90 } }));
          continue;
        }
        if (remarkMode) children.push(new Paragraph({ children: markdownRuns(line), spacing: { after: 180 } }));
      }

      if (summaryLines.length) {
        children.push(new Paragraph({ text: "Weekly Summary", heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 140 } }));
        for (const line of summaryLines) children.push(new Paragraph({ children: markdownRuns(line.replace(/^[-*]\s+/, "")), spacing: { after: 140 } }));
      }
    } else {
      const grouped = new Map<string, Entry[]>();
      for (const entry of entries.sort((a, b) => a.date.localeCompare(b.date))) {
        const list = grouped.get(entry.date) ?? []; list.push(entry); grouped.set(entry.date, list);
      }
      for (const [date, dayEntries] of grouped) {
        children.push(new Paragraph({ text: new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(new Date(`${date}T00:00:00`)) + ` | ${formatDate(date)}`, heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 140 } }));
        for (const entry of dayEntries) children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: entry.description ?? entry.title ?? "", bold: true })], spacing: { after: 90 } }));
      }
    }

    const doc = new Document({ creator: "Worklog", title: "Weekly Work Report", description: "Manager-ready weekly work report", sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(buffer as unknown as BodyInit, { status: 200, headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": `attachment; filename="weekly-work-report-${dates[0]}-to-${dates[dates.length - 1]}.docx"` } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not generate the Word report." }, { status: 500 });
  }
}
