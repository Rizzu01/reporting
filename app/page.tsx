"use client";

import { useEffect, useMemo, useState } from "react";

type Entry = {
  id: string;
  date: string;
  title: string;
  details: string;
  status: "Done" | "In progress" | "Blocked";
  tags: string[];
  remark?: string;
};

const KEY = "worklog.entries.v1";
const today = new Date().toISOString().slice(0, 10);

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function getWeekStart(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<Entry["status"]>("Done");
  const [tags, setTags] = useState("");
  const [notice, setNotice] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setEntries(JSON.parse(saved));
    } catch {
      setNotice("Could not read saved worklogs.");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(entries));
  }, [entries]);

  const selected = useMemo(() => entries.filter((e) => e.date === date), [entries, date]);
  const weekEntries = useMemo(() => {
    const start = getWeekStart(date);
    const end = new Date(`${start}T00:00:00`);
    end.setDate(end.getDate() + 6);
    const endDate = end.toISOString().slice(0, 10);
    return entries.filter((e) => e.date >= start && e.date <= endDate);
  }, [entries, date]);
  const monthEntries = useMemo(() => entries.filter((e) => e.date.startsWith(date.slice(0, 7))), [entries, date]);

  function addEntry() {
    if (!title.trim() || !details.trim()) {
      setNotice("Add a work title and details first.");
      return;
    }
    const entry: Entry = {
      id: crypto.randomUUID(),
      date,
      title: title.trim(),
      details: details.trim(),
      status,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    setEntries((current) => [entry, ...current]);
    setTitle("");
    setDetails("");
    setTags("");
    setNotice("Saved locally.");
  }

  function removeEntry(id: string) {
    setEntries((current) => current.filter((e) => e.id !== id));
  }

  function exportCsv(scope: "week" | "month") {
    const data = scope === "week" ? weekEntries : monthEntries;
    const rows = [["Date", "Work", "Details", "Status", "Tags", "AI Remark"], ...data.map((e) => [e.date, e.title, e.details, e.status, e.tags.join("; "), e.remark ?? ""])];
    const csv = rows.map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `worklog-${scope}-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport(scope: "week" | "month") {
    const data = scope === "week" ? weekEntries : monthEntries;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>${scope} work report</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{margin-bottom:4px}small{color:#666}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #ddd;padding:10px;text-align:left;vertical-align:top}th{background:#f5f5f5}</style></head><body><h1>${scope === "week" ? "Weekly" : "Monthly"} Work Report</h1><small>Generated ${formatDate(date)}</small><table><tr><th>Date</th><th>Work</th><th>Details</th><th>Status</th><th>Remark</th></tr>${data.map((e) => `<tr><td>${formatDate(e.date)}</td><td>${e.title}</td><td>${e.details}</td><td>${e.status}</td><td>${e.remark ?? "—"}</td></tr>`).join("")}</table></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  async function generateAi(type: "remarks" | "summary") {
    const data = type === "summary" ? weekEntries : selected;
    if (!data.length) {
      setNotice("Add at least one work entry first.");
      return;
    }
    setAiLoading(true);
    setNotice("");
    try {
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, entries: data }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI request failed");
      if (type === "summary") setSummary(json.text);
      else {
        const text = json.text as string;
        setEntries((current) => current.map((e) => e.date === date ? { ...e, remark: text } : e));
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI request failed.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div><div className="eyebrow">WORKLOG</div><h1>Daily reporting, without the daily hassle.</h1><p>Capture the work. Let AI turn it into manager-ready reporting.</p></div>
        <div className="top-actions"><button className="ghost" onClick={() => printReport("week")}>Print weekly</button><button className="primary" onClick={() => exportCsv("week")}>Export CSV</button></div>
      </header>

      <section className="stats">
        <div><span>This week</span><strong>{weekEntries.length}</strong><small>work items</small></div>
        <div><span>This month</span><strong>{monthEntries.length}</strong><small>work items</small></div>
        <div><span>Selected day</span><strong>{selected.length}</strong><small>{formatDate(date)}</small></div>
      </section>

      <section className="grid">
        <div className="card composer">
          <div className="card-head"><div><span className="kicker">LOG WORK</span><h2>What did you do?</h2></div><input className="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <label>Work title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Redesigned onboarding flow" /></label>
          <label>Details<textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Describe what you completed, decisions made, outcomes, or blockers..." rows={6} /></label>
          <div className="two"><label>Status<select value={status} onChange={(e) => setStatus(e.target.value as Entry["status"])}><option>Done</option><option>In progress</option><option>Blocked</option></select></label><label>Tags<input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="UI, research, crypto" /></label></div>
          <button className="primary full" onClick={addEntry}>Save work entry</button>
          {notice && <div className="notice">{notice}</div>}
        </div>

        <div className="card entries">
          <div className="card-head"><div><span className="kicker">{formatDate(date)}</span><h2>Today&apos;s work</h2></div><button className="ai" disabled={aiLoading} onClick={() => generateAi("remarks")}>✦ {aiLoading ? "Writing…" : "AI remark"}</button></div>
          {!selected.length ? <div className="empty"><div className="empty-icon">＋</div><h3>No work logged yet</h3><p>Pick a date and add your first activity. Your entries stay saved in this browser.</p></div> : <div className="entry-list">{selected.map((e) => <article className="entry" key={e.id}><div className="entry-top"><span className={`status ${e.status.toLowerCase().replaceAll(" ", "-")}`}>{e.status}</span><button onClick={() => removeEntry(e.id)}>Delete</button></div><h3>{e.title}</h3><p>{e.details}</p>{e.tags.length > 0 && <div className="tags">{e.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}{e.remark && <div className="remark"><b>AI remark</b><span>{e.remark}</span></div>}</article>)}</div>}
        </div>
      </section>

      <section className="card reports">
        <div className="card-head"><div><span className="kicker">REPORTS</span><h2>Manager-ready reporting</h2><p>Export the selected week or month when it&apos;s time to send your update.</p></div><div className="report-actions"><button className="ghost" onClick={() => printReport("month")}>Print month</button><button className="ghost" onClick={() => exportCsv("month")}>Month CSV</button></div></div>
        <div className="summary-box"><div><span className="kicker">AI WEEKLY SUMMARY</span><p>{summary || "Generate a concise, professional summary from this week’s saved work."}</p></div><button className="primary" disabled={aiLoading} onClick={() => generateAi("summary")}>✦ Generate summary</button></div>
      </section>

      <footer>Worklog MVP · local-first storage · AI is optional and only runs when you ask it to.</footer>
    </main>
  );
}
