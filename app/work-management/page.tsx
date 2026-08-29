"use client";

import { useMemo, useState } from "react";

type Status = "Not started" | "In progress" | "Review" | "Completed";
type Priority = "Low" | "Medium" | "High" | "Urgent";

type DemoTask = {
  id: number;
  title: string;
  project: string;
  assignee: string;
  status: Status;
  priority: Priority;
  due: string;
};

const seedTasks: DemoTask[] = [
  { id: 1, title: "KYC article", project: "KYC Campaign", assignee: "Rizwan", status: "In progress", priority: "High", due: "Aug 29" },
  { id: 2, title: "Crypto Digest carousel", project: "Crypto Marketing", assignee: "Designer", status: "Review", priority: "Medium", due: "Aug 30" },
  { id: 3, title: "Rakhi YouTube thumbnail", project: "Rakhi Campaign", assignee: "Designer", status: "Completed", priority: "Medium", due: "Aug 28" },
  { id: 4, title: "Landing page copy", project: "Website", assignee: "Rizwan", status: "Not started", priority: "Urgent", due: "Sep 1" },
  { id: 5, title: "Weekly report", project: "Operations", assignee: "Rizwan", status: "Completed", priority: "Low", due: "Aug 29" },
];

const statuses: Status[] = ["Not started", "In progress", "Review", "Completed"];
const priorities: Priority[] = ["Low", "Medium", "High", "Urgent"];

function statusClass(status: Status) {
  return {
    "Not started": "wm-status wm-status-muted",
    "In progress": "wm-status wm-status-blue",
    Review: "wm-status wm-status-purple",
    Completed: "wm-status wm-status-green",
  }[status];
}

function priorityClass(priority: Priority) {
  return {
    Low: "wm-priority wm-priority-low",
    Medium: "wm-priority wm-priority-medium",
    High: "wm-priority wm-priority-high",
    Urgent: "wm-priority wm-priority-urgent",
  }[priority];
}

export default function WorkManagementPage() {
  const [tasks, setTasks] = useState(seedTasks);
  const [view, setView] = useState<"list" | "board">("list");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const [notice, setNotice] = useState("");

  const projects = useMemo(() => ["All", ...Array.from(new Set(tasks.map((task) => task.project)))], [tasks]);

  const filteredTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesQuery = !normalized || [task.title, task.project, task.assignee].some((value) => value.toLowerCase().includes(normalized));
      const matchesStatus = statusFilter === "All" || task.status === statusFilter;
      const matchesProject = projectFilter === "All" || task.project === projectFilter;
      return matchesQuery && matchesStatus && matchesProject;
    });
  }, [projectFilter, query, statusFilter, tasks]);

  const counts = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter((task) => task.status === "Completed").length,
    progress: tasks.filter((task) => task.status === "In progress").length,
    overdue: 1,
  }), [tasks]);

  function addTask() {
    const nextId = Math.max(0, ...tasks.map((task) => task.id)) + 1;
    setTasks((current) => [
      ...current,
      { id: nextId, title: `New task ${nextId}`, project: "Operations", assignee: "Rizwan", status: "Not started", priority: "Medium", due: "Sep 2" },
    ]);
    setNotice("Task added. Use the row controls to customize it.");
  }

  function updateTask(id: number, patch: Partial<DemoTask>) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, ...patch } : task));
  }

  return (
    <main className="wm-shell">
      <style>{`
        .wm-shell{min-height:100vh;background:#f7f7f9;color:#23262d;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:28px}
        .wm-wrap{max-width:1280px;margin:0 auto}
        .wm-top{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:22px}
        .wm-eyebrow{font-size:12px;font-weight:700;color:#8a8e99;letter-spacing:.04em;text-transform:uppercase;margin-bottom:7px}
        .wm-title{font-size:28px;line-height:1.1;margin:0;letter-spacing:-.035em}
        .wm-sub{margin:8px 0 0;color:#777c87;font-size:13px}
        .wm-actions{display:flex;gap:8px;flex-wrap:wrap}
        .wm-btn{border:1px solid #dedfe6;background:#fff;border-radius:9px;padding:10px 14px;font-size:12px;font-weight:700;color:#454954;cursor:pointer}
        .wm-btn:hover{background:#fafafa}
        .wm-btn-primary{border-color:#7657f5;background:#7657f5;color:#fff;box-shadow:0 6px 16px rgba(118,87,245,.18)}
        .wm-btn-primary:hover{background:#6848ee}
        .wm-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
        .wm-metric{background:#fff;border:1px solid #ececf1;border-radius:13px;padding:15px}
        .wm-metric-label{font-size:11px;color:#858995;margin-bottom:7px}
        .wm-metric-value{font-size:24px;font-weight:800;letter-spacing:-.03em}
        .wm-toolbar{background:#fff;border:1px solid #ececf1;border-radius:13px;padding:12px;display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:12px}
        .wm-left-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .wm-search{min-width:250px;height:38px;border:1px solid #dedfe6;border-radius:9px;padding:0 11px;font-size:12px;outline:none}
        .wm-search:focus{border-color:#9b89f5;box-shadow:0 0 0 3px rgba(118,87,245,.10)}
        .wm-select{height:38px;border:1px solid #dedfe6;border-radius:9px;padding:0 10px;font-size:12px;background:#fff;color:#444851}
        .wm-view-toggle{display:inline-flex;border:1px solid #dedfe6;border-radius:9px;overflow:hidden}
        .wm-view-btn{border:0;background:#fff;padding:9px 12px;font-size:11px;font-weight:700;color:#6d717c;cursor:pointer}
        .wm-view-btn.active{background:#f2efff;color:#6f51ed}
        .wm-notice{font-size:11px;color:#6d51e7;margin:0 0 10px 2px}
        .wm-table-wrap{background:#fff;border:1px solid #ececf1;border-radius:13px;overflow:auto}
        table{width:100%;border-collapse:collapse;min-width:860px}
        th{padding:11px 13px;text-align:left;font-size:10px;color:#9699a3;font-weight:800;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #eeeeF2;background:#fbfbfc}
        td{padding:10px 13px;border-bottom:1px solid #f1f1f4;font-size:12px;vertical-align:middle}
        tr:last-child td{border-bottom:0}
        .wm-title-cell{font-weight:750;color:#2d3038}
        .wm-project{font-size:11px;color:#858995;margin-top:4px}
        .wm-person{display:flex;align-items:center;gap:8px}
        .wm-avatar{width:26px;height:26px;border-radius:8px;background:#ece9ff;color:#6247df;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800}
        .wm-status,.wm-priority{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:800;white-space:nowrap}
        .wm-status-muted{background:#f1f2f4;color:#6c707a}.wm-status-blue{background:#eaf4ff;color:#2f72c9}.wm-status-purple{background:#efeaff;color:#684fe0}.wm-status-green{background:#e9f8ef;color:#27834c}
        .wm-priority-low{color:#737780;background:#f2f2f4}.wm-priority-medium{color:#8a6d18;background:#fbf4d9}.wm-priority-high{color:#bf5e24;background:#fff0e5}.wm-priority-urgent{color:#bb3b48;background:#ffe7ea}
        .wm-inline-select{border:1px solid transparent;background:transparent;font-size:11px;font-weight:700;padding:5px 6px;border-radius:7px}
        .wm-inline-select:hover,.wm-inline-select:focus{border-color:#dedfe6;background:#fff;outline:none}
        .wm-board{display:grid;grid-template-columns:repeat(4,minmax(220px,1fr));gap:12px;padding:12px}
        .wm-column{background:#f8f8fa;border:1px solid #ececf1;border-radius:12px;padding:10px;min-height:260px}
        .wm-column-title{font-size:11px;font-weight:800;color:#626670;margin-bottom:9px;text-transform:uppercase;letter-spacing:.03em}
        .wm-card{background:#fff;border:1px solid #e8e8ed;border-radius:10px;padding:11px;margin-bottom:8px}
        .wm-card-title{font-size:12px;font-weight:750;line-height:1.35}
        .wm-card-meta{font-size:10px;color:#8b8f99;margin-top:7px}
        @media(max-width:900px){.wm-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.wm-board{grid-template-columns:1fr 1fr}}
        @media(max-width:620px){.wm-shell{padding:17px}.wm-top{display:block}.wm-actions{margin-top:15px}.wm-metrics{grid-template-columns:1fr 1fr}.wm-search{min-width:190px;width:100%}.wm-left-tools{width:100%}.wm-select{flex:1}.wm-board{grid-template-columns:1fr}}
      `}</style>

      <div className="wm-wrap">
        <div className="wm-top">
          <div>
            <div className="wm-eyebrow">Workspace / My Work</div>
            <h1 className="wm-title">Work management</h1>
            <p className="wm-sub">Manage projects and tasks without changing your existing daily reporting flow.</p>
          </div>
          <div className="wm-actions">
            <button className="wm-btn" type="button">+ New Project</button>
            <button className="wm-btn wm-btn-primary" type="button" onClick={addTask}>+ New Task</button>
          </div>
        </div>

        <section className="wm-metrics" aria-label="Work summary">
          <div className="wm-metric"><div className="wm-metric-label">Total tasks</div><div className="wm-metric-value">{counts.total}</div></div>
          <div className="wm-metric"><div className="wm-metric-label">Completed</div><div className="wm-metric-value">{counts.completed}</div></div>
          <div className="wm-metric"><div className="wm-metric-label">In progress</div><div className="wm-metric-value">{counts.progress}</div></div>
          <div className="wm-metric"><div className="wm-metric-label">Overdue</div><div className="wm-metric-value">{counts.overdue}</div></div>
        </section>

        <section className="wm-toolbar">
          <div className="wm-left-tools">
            <input className="wm-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks, projects or people…" aria-label="Search tasks" />
            <select className="wm-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as Status | "All")} aria-label="Filter by status">
              <option value="All">All statuses</option>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
            <select className="wm-select" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} aria-label="Filter by project">
              {projects.map((project) => <option key={project}>{project}</option>)}
            </select>
          </div>
          <div className="wm-view-toggle" aria-label="Task view">
            <button type="button" className={`wm-view-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>List</button>
            <button type="button" className={`wm-view-btn ${view === "board" ? "active" : ""}`} onClick={() => setView("board")}>Board</button>
          </div>
        </section>

        {notice ? <p className="wm-notice">{notice}</p> : null}

        <section className="wm-table-wrap" aria-label="Tasks">
          {view === "list" ? (
            <table>
              <thead><tr><th>Task</th><th>Assignee</th><th>Status</th><th>Priority</th><th>Due</th></tr></thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td><div className="wm-title-cell">{task.title}</div><div className="wm-project">{task.project}</div></td>
                    <td><div className="wm-person"><span className="wm-avatar">{task.assignee.slice(0,2).toUpperCase()}</span>{task.assignee}</div></td>
                    <td>
                      <select className="wm-inline-select" value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value as Status })} aria-label={`${task.title} status`}>
                        {statuses.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </td>
                    <td><span className={priorityClass(task.priority)}>{task.priority}</span></td>
                    <td>{task.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="wm-board">
              {statuses.map((status) => (
                <div className="wm-column" key={status}>
                  <div className="wm-column-title">{status} <span>({filteredTasks.filter((task) => task.status === status).length})</span></div>
                  {filteredTasks.filter((task) => task.status === status).map((task) => (
                    <article className="wm-card" key={task.id}>
                      <div className="wm-card-title">{task.title}</div>
                      <div className="wm-card-meta">{task.project} · {task.assignee} · {task.due}</div>
                      <select className="wm-inline-select" value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value as Status })} aria-label={`${task.title} status`}>
                        {statuses.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
