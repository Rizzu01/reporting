export async function generateReportWithGemini(input: {
  tasks: Array<{
    id: string;
    date: string;
    description: string;
    assignedTo: string;
    driveLink?: string;
  }>;
  rangeLabel: string;
  scope: "week" | "month";
}) {
  const response = await fetch("/api/report/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Could not generate the report.");
  }

  if (!data?.report) {
    throw new Error("Gemini returned an empty report.");
  }

  return data.report as string;
}
