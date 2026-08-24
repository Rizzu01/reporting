import { NextResponse } from "next/server";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

type Entry = {
  date: string;
  title: string;
  details?: string;
  status?: string;
  remark?: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function dayName(date: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(
    new Date(`${date}T00:00:00`),
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entries = (Array.isArray(body.entries) ? body.entries : []) as Entry[];
    const summary = typeof body.summary === "string" ? body.summary : "";

    if (!entries.length) {
      return NextResponse.json({ error: "No work entries to export." }, { status: 400 });
    }

    const grouped = new Map<string, Entry[]>();
    for (const entry of entries.sort((a, b) => a.date.localeCompare(b.date))) {
      const list = grouped.get(entry.date) ?? [];
      list.push(entry);
      grouped.set(entry.date, list);
    }

    const dates = [...grouped.keys()].sort();
    const period = `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`;
    const children: Paragraph[] = [
      new Paragraph({
        text: "🎨 Weekly Work Report",
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: `Period: ${period}`, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 420 },
      }),
    ];

    for (const [date, dayEntries] of grouped) {
      children.push(
        new Paragraph({
          text: `${dayName(date)} | ${formatDate(date)}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 220, after: 140 },
        }),
      );

      for (const entry of dayEntries) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: entry.title, bold: true }),
              ...(entry.details ? [new TextRun({ text: ` — ${entry.details}` })] : []),
            ],
            spacing: { after: 90 },
          }),
        );
      }

      const remark = dayEntries.map((e) => e.remark).find(Boolean);
      if (remark) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Remark:", bold: true })],
            spacing: { before: 100, after: 80 },
          }),
          new Paragraph({ text: remark, spacing: { after: 180 } }),
        );
      }
    }

    if (summary) {
      children.push(
        new Paragraph({
          text: "Weekly Summary",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 140 },
        }),
        new Paragraph({ text: summary, spacing: { after: 200 } }),
      );
    }

    const doc = new Document({
      creator: "Worklog",
      title: "Weekly Work Report",
      description: "AI-assisted weekly work report",
      sections: [{ children }],
    });

    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="weekly-work-report-${dates[0]}-to-${dates[dates.length - 1]}.docx"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not generate the Word report." }, { status: 500 });
  }
}
