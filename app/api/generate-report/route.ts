import { NextRequest, NextResponse } from "next/server";

const FUNCTION_URL = "https://xaaerrvvcfrwtggzwmjh.supabase.co/functions/v1/generate-report";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const upstream = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await upstream.text();
    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { error: `Report service returned an unexpected response (HTTP ${upstream.status}).` };
    }

    return NextResponse.json(payload, { status: upstream.status });
  } catch (error) {
    console.error("Report proxy error:", error);
    return NextResponse.json(
      { error: "Unable to reach the report service." },
      { status: 502 },
    );
  }
}
