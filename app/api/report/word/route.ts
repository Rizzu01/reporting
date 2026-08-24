import { NextResponse } from "next/server";
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

type Entry = { date: string; description?: string; title?: string; assignedTo?: string; driveLink?: string; remark?: string };

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function cleanMarkdown(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]+/g, "")
    .replace(/\\([*_#~`])/g, "$1")
    .trim();
}

function richText(text: string) {
  const cleaned = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  const parts = cleaned.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return new TextRun({ text: part.slice(2, -2), bold: true });
    }
    return new TextRun({ text: part.replace(/[*_`~]+/g, "") });
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entries = (Array.isArray(body.entries) ? body.entries : []) as Entry[];
    const overallReport = typeof body.overallReport === "string" ? body.overallReport.trim() : "";
    if (!entries.length) return NextResponse.json({ error: "No work entries to export." }, { status: 400 });

    const dates = [...new Set(entries.map((entry) => entry.date))].sort();
    const period = `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`;
    const driveLinks = new Map(entries.map((entry) => [entry.date, entry.driveLink || ""]));
    const children: Paragraph[] = [
      new Paragraph({ text: "🎨 Weekly Work Report", heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: `Period: ${period}`, bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 360 } }),
    ];

    if (overallReport) {
      const lines: string[] = overallReport.split(/\r?\n/).map((line: string) => line.trim());
      let inSummary = false;
      let remarkMode = false;
      const summaryLines: string[] = [];

      for (const raw of lines) {
        const line = raw.replace(/\\([*_#~`])/g, "$1").trim();
        if (!line || line === "---") continue;
        if (/^#\s*🎨?\s*Weekly Work Report/i.test(line) || /^🎨\s*Weekly Work Report/i.test(line) || /^Period:/i.test(line)) continue;

        if (/^#{1,2}\s*Weekly Summary/i.test(line) || /^Weekly Summary$/i.test(cleanMarkdown(line))) {
          inSummary = true;
          remarkMode = false;
          continue;
        }

        if (inSummary) {
          summaryLines.push(line);
          continue;
        }

        if (/^###\s*/.test(line)) {
          remarkMode = false;
          const headingText = cleanMarkdown(line.replace(/^###\s*/, ""));
          children.push(new Paragraph({
            children: [new TextRun({ text: headingText, bold: true, size: 26 })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 260, after: 130 },
          }));
          const dateText = headingText.split("|").slice(1).join("|").trim();
          const matchedDate = dates.find((date) => formatDate(date) === dateText);
          const link = matchedDate ? driveLinks.get(matchedDate) : "";
          if (link && !overallReport.includes(link)) {
            children.push(new Paragraph({
              children: [new TextRun({ text: "Work Files: ", bold: true, color: "7355F5" }), new TextRun({ text: link, color: "7355F5", underline: {} })],
              spacing: { after: 110 },
            }));
          }
          continue;
        }

        if (/^\*{0,2}Remark:\*{0,2}/i.test(line) || /^Remark:/i.test(cleanMarkdown(line))) {
          remarkMode = true;
          children.push(new Paragraph({
            children: [new TextRun({ text: "Remark", bold: true, color: "7355F5" })],
            spacing: { before: 100, after: 70 },
          }));
          const remainder = line.replace(/^\*{0,2}Remark:\*{0,2}/i, "").trim();
          if (remainder) children.push(new Paragraph({ children: richText(remainder), spacing: { after: 160 } }));
          continue;
        }

        if (/^[-*]\s+/.test(line)) {
          remarkMode = false;
          children.push(new Paragraph({ bullet: { level: 0 }, children: richText(line.replace(/^[-*]\s+/, "")), spacing: { after: 90 } }));
          continue;
        }

        if (remarkMode) {
          children.push(new Paragraph({ children: richText(line), spacing: { after: 160 } }));
        } else {
          children.push(new Paragraph({ children: richText(line), spacing: { after: 110 } }));
        }
      }

      if (summaryLines.length) {
        children.push(new Paragraph({
          children: [new TextRun({ text: "Weekly Summary", bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 320, after: 140 },
        }));
        for (const raw of summaryLines) {
          const line = raw.replace(/^[-*]\s+/, "");
          if (!line) continue;
          children.push(new Paragraph({ children: richText(line), spacing: { after: 150 } }));
        }
      }
    } else {
      const grouped = new Map<string, Entry[]>();
      for (const entry of entries.sort((a, b) => a.date.localeCompare(b.date))) {
        const list = grouped.get(entry.date) ?? [];
        list.push(entry);
        grouped.set(entry.date, list);
      }
      for (const [date, dayEntries] of grouped) {
        children.push(new Paragraph({ text: `${new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(new Date(`${date}T00:00:00`))} | ${formatDate(date)}`, heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 140 } }));
        if (dayEntries[0]?.driveLink) children.push(new Paragraph({ children: [new TextRun({ text: "Work Files: ", bold: true, color: "7355F5" }), new TextRun({ text: dayEntries[0].driveLink, color: "7355F5", underline: {} })], spacing: { after: 110 } }));
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
