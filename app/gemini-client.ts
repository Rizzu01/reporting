type ReportInput = {
  tasks: Array<{
    id: string;
    date: string;
    description: string;
    assignedTo: string;
    driveLink?: string;
  }>;
  rangeLabel: string;
  scope: "week" | "month";
};

export async function generateReportWithGemini(input: ReportInput) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 90_000);

  try {
    const response = await fetch("/api/generate-report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: controller.signal,
    });

    const raw = await response.text();
    let data: { report?: string; error?: string } = {};

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(`The report service returned an unexpected response (HTTP ${response.status}). ${raw.slice(0, 180)}`);
    }

    if (!response.ok) {
      throw new Error(data.error || `Report generation failed (HTTP ${response.status}).`);
    }

    if (!data.report || !data.report.trim()) {
      throw new Error("Gemini returned an empty report.");
    }

    return data.report.trim();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Report generation timed out. Please try again.");
    }
    if (error instanceof TypeError) {
      throw new Error("Could not reach the report service. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
