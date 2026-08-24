"use client";

import { useEffect, useMemo, useState } from "react";

type Task = {
  id: string;
  date: string;
  description: string;
  assignedTo: string;
  remark?: string;
};

const KEY = "worklog.tasks.v2";
const ASSIGNED_KEY = "worklog.assignedTo.v1";
const today = new Date().toISOString().slice(0, 10);

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function dayName(date: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(new Date(`${date}T00:00:00`));
}

function getWeekStart(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

function getWeekDates(date: string) {
  const start = new Date(`${getWeekStart(date)}T00:00:00`);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("Designer");
  const [reportTitle, setReportTitle] = useState("Weekly Design Task Tracker");
  const [notice, setNotice] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      const savedAssigned = localStorage.getItem(ASSIGNED_KEY);
      if (saved) setTasks(JSON.parse(saved));
      if (savedAssigned) setAssignedTo(savedAssigned);
    } catch {
      setNotice("Could not read saved tasks.");
    }
  }, []);

  useEffect(() => localStorage.setItem(KEY, JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem(ASSIGNED_KEY, assignedTo), [assignedTo]);

  const weekDates = useMemo(() => getWeekDates(date), [date]);
  const weekTasks = useMemo(() => tasks.filter((t) => weekDates.includes(t.date)), [tasks, weekDates]);
  const monthTasks = useMemo(() => tasks.filter((t) => t.date.startsWith(date.slice(0, 7))), [tasks, date]);

  const groupedWeek = useMemo(() => weekDates.map((d) => ({ date: d, tasks: weekTasks.filter((t) => t.date === d) })), [weekDates, weekTasks]);

  const rangeLabel = `${shortDate(weekDates[0])} – ${shortDate(weekDates[weekDates.length - 1])}`;

  function addTask() {
    if (!description.trim()) {
      setNotice("Add a task description first.");
      return;
    }
    const task: Task = {
      id: crypto.randomUUID(),
      date,
      description: description.trim(),
      assignedTo: assignedTo.trim() || "Designer",
    };
    setTasks((current) => [...current, task]);
    setDescription("");
    setNotice("Task saved.");
  }

  function removeTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function exportCsv(scope: "week" | "month") {
    const data = scope === "week" ? weekTasks : monthTasks;
    const rows = [["#", "Day", "Date", "Task Description", "Assigned To"], ...data.map((task, index) => [index + 1, dayName(task.date), formatDate(task.date), task.description, task.assignedTo])];
    const csv = rows.map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `design-task-tracker-${scope}-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport(scope: "week" | "month") {
    const groups = scope === "week" ? groupedWeek : Array.from(new Set(monthTasks.map((t) => t.date))).sort().map((d) => ({ date: d, tasks: monthTasks.filter((t) => t.date === d) }));
    const data = scope === "week" ? weekTasks : monthTasks;
    const heading = scope === "week" ? `Weekly Design Task Tracker | ${rangeLabel}` : `Monthly Design Task Tracker | ${new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(`${date}T00:00:00`))}`;
    const rows = groups.flatMap((group) => group.tasks.map((task, i) => `<tr><td>${i === 0 ? group.tasks.indexOf(task) + 1 : ""}</td><td>${i === 0 ? `<strong>${dayName(group.date)}</strong>` : ""}</td><td>${i === 0 ? `<em>${formatDate(group.date)}</em>` : ""}</td><td>${task.description}</td><td>${task.assignedTo}</td></tr>`)).join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>${heading}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{text-align:center;font-size:20px;margin:0 0 24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:9px;text-align:left;vertical-align:top;font-size:12px}th{text-align:center;background:#f3f3f3}td:first-child{width:42px;text-align:center}td:nth-child(2){width:105px}td:nth-child(3){width:125px}</style></head><body><h1>🎨 ${heading}</h1><table><thead><tr><th>#</th><th>Day</th><th>Date</th><th>Task Description</th><th>Assigned To</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  async function generateAi(type: "remarks" | "summary") {
    const data = type === "summary" ? weekTasks : tasks.filter((task) => task.date === date);
    if (!data.length) {
      setNotice("Add at least one task first.");
      return;
    }
    setAiLoading(true);
    setNotice("");
    try {
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, entries: data }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI request failed");
      if (type === "summary") setSummary(json.text);
      else setTasks((current) => current.map((task) => task.date === date ? { ...task, remark: json.text } : task));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI request failed");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">WORKLOG / REPORTING</div>
          <h1>Daily work, organized like your manager&apos;s tracker.</h1>
          <p>Log multiple tasks against a date, then export the same clean weekly or monthly table for email.</p>
        </div>
        <div className="top-actions"><button className="ghost" onClick={() => printReport("week")}>Print report</button><button className="primary" onClick={() => exportCsv("week")}>Download CSV</button></div>
      </header>

      <section className="editor card">
        <div className="card-head"><div><span className="kicker">NEW TASK</span><h2>Add work to a specific day</h2></div><input className="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="editor-grid">
          <label>Task description<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Create 2 Blog Banner" onKeyDown={(e) => { if (e.key === "Enter") addTask(); }} /></label>
          <label>Assigned to<input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Designer" /></label>
          <button className="primary add" onClick={addTask}>+ Add task</button>
        </div>
        {notice && <div className="notice">{notice}</div>}
      </section>

      <section className="report card">
        <div className="report-toolbar">
          <div><span className="kicker">REPORT PREVIEW</span><h2>🎨 {reportTitle} <span>| {rangeLabel}</span></h2></div>
          <div className="report-actions"><input className="title-input" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} aria-label="Report title" /><button className="ghost" onClick={() => generateAi("remarks")} disabled={aiLoading}>✦ {aiLoading ? "Writing…" : "AI remarks"}</button></div>
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Day</th><th>Date</th><th>Task Description</th><th>Assigned To</th><th className="action-col"> </th></tr></thead>
            <tbody>
              {groupedWeek.flatMap((group, dayIndex) => group.tasks.length ? group.tasks.map((task, taskIndex) => <tr key={task.id}>
                <td>{taskIndex === 0 ? weekTasks.findIndex((t) => t.id === task) + 1 : ""}</td>
                <td>{taskIndex === 0 ? <strong>{dayName(group.date)}</strong> : ""}</td>
                <td>{taskIndex === 0 ? <em>{formatDate(group.date)}</em> : ""}</td>
                <td>{task.description}{task.remark && <div className="ai-remark">AI: {task.remark}</div>}</td>
                <td>{task.assignedTo}</td>
                <td className="action-col"><button onClick={() => removeTask(task.id)}>×</button></td>
              </tr>) : null)}
              {!weekTasks.length && <tr><td colSpan={6} className="empty-row">No tasks for this week. Add your first task above.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bottom-grid">
        <div className="card summary-card">
          <div><span className="kicker">AI WEEKLY SUMMARY</span><h2>Manager-ready summary</h2><p>{summary || "Generate a concise summary of the work completed across the selected week."}</p></div>
          <button className="primary" onClick={() => generateAi("summary")} disabled={aiLoading}>✦ Generate summary</button>
        </div>
        <div className="card export-card">
          <span className="kicker">EXPORT</span><h2>Ready to mail</h2><p>Download the tracker as CSV or print it and choose Save as PDF.</p>
          <div className="export-buttons"><button className="ghost" onClick={() => exportCsv("week")}>Weekly CSV</button><button className="ghost" onClick={() => exportCsv("month")}>Monthly CSV</button><button className="ghost" onClick={() => printReport("month")}>Monthly PDF</button></div>
        </div>
      </section>

      <footer>Worklog MVP · table-first reporting · saved in this browser</footer>
    </main>
  );
}
