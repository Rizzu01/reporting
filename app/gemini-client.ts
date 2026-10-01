import { getSupabaseClient } from "@/lib/supabase";

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

export async function generateReportWithOpenRouter(input: ReportInput) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 90_000);

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    const { data, error } = await supabase.functions.invoke("generate-report", {
      body: input,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      const context = error.context;
      let message = error.message || "Report generation failed.";

      if (context instanceof Response) {
        try {
          const payload = await context.clone().json();
          message = payload?.error || message;
        } catch {
          // Keep the original Supabase function error.
        }
      }

      throw new Error(message);
    }

    if (!data?.report || !data.report.trim()) {
      throw new Error("OpenRouter returned an empty report.");
    }

    return data.report.trim();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Report generation timed out. Please try again.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
