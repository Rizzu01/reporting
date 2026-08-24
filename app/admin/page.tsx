"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../lib/supabase";

type Profile = { id: string; full_name: string | null; email: string | null; role: string };
type Task = { id: string; user_id: string; work_date: string; description: string; assigned_to: string; drive_link?: string | null; created_at: string };

const supabase = getSupabaseClient();

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!supabase) { setError("Supabase is not configured."); setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Please sign in first."); setLoading(false); return; }
      const { data: me, error: profileError } = await supabase.from("profiles").select("id,full_name,email,role").eq("id", user.id).single();
      if (profileError || me?.role !== "admin") { setError("You do not have admin access."); setLoading(false); return; }
      const [{ data: users, error: usersError }, { data: allTasks, error: tasksError }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,role").order("full_name"),
        supabase.from("tasks").select("id,user_id,work_date,description,assigned_to,drive_link,created_at").order("work_date", { ascending: false }).order("created_at", { ascending: false }),
      ]);
      if (usersError || tasksError) { setError(usersError?.message || tasksError?.message || "Could not load admin data."); setLoading(false); return; }
      if (mounted) { setProfiles((users ?? []) as Profile[]); setTasks((allTasks ?? []) as Task[]); setAuthorized(true); setLoading(false); }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const visibleTasks = useMemo(() => tasks.filter(task => {
    if (selectedUser !== "all" && task.user_id !== selectedUser) return false;
    if (dateFrom && task.work_date < dateFrom) return false;
    if (dateTo && task.work_date > dateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      const user = profiles.find(p => p.id === task.user_id);
      return task.description.toLowerCase().includes(q) || (user?.full_name ?? "").toLowerCase().includes(q) || (user?.email ?? "").toLowerCase().includes(q);
    }
    return true;
  }), [tasks, profiles, selectedUser, dateFrom, dateTo, search]);

  const stats = useMemo(() => ({ users: profiles.length, tasks: visibleTasks.length, active: new Set(visibleTasks.map(t => t.user_id)).size }), [profiles, visibleTasks]);
  const userTaskCount = (id: string) => visibleTasks.filter(t => t.user_id === id).length;
  const userName = (id: string) => profiles.find(p => p.id === id)?.full_name || profiles.find(p => p.id === id)?.email || "Unknown user";

  if (loading) return <main className="admin-page"><div className="admin-loading">Loading admin workspace…</div></main>;
  if (!authorized) return <main className="admin-page"><div className="admin-denied"><div className="admin-logo">W</div><h1>Admin access required</h1><p>{error}</p><a href="/">Return to Worklog</a></div></main>;

  return <main className="admin-page"><style>{`
    .admin-page{min-height:100vh;background:#f7f7fa;color:#20222a;padding:30px;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.admin-wrap{max-width:1200px;margin:0 auto}.admin-top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:26px}.admin-brand{display:flex;gap:12px;align-items:center}.admin-logo{width:42px;height:42px;border-radius:12px;background:#20222a;color:#fff;display:grid;place-items:center;font-weight:800}.admin-top h1{margin:0;font-size:26px}.admin-top p{margin:5px 0 0;color:#858a95;font-size:13px}.admin-badge{padding:8px 12px;border-radius:999px;background:#eeeaff;color:#6850d8;font-size:11px;font-weight:800}.admin-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px}.admin-stat,.admin-panel{background:#fff;border:1px solid #e8e8ed;border-radius:16px;box-shadow:0 8px 24px rgba(20,22,30,.04)}.admin-stat{padding:18px}.admin-stat span{display:block;color:#858a95;font-size:11px}.admin-stat strong{display:block;font-size:25px;margin-top:5px}.admin-panel{padding:18px}.admin-filters{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:9px;margin-bottom:18px}.admin-filters input,.admin-filters select{height:40px;border:1px solid #dedfe6;border-radius:9px;background:#fff;padding:0 11px;color:#30333c;outline:none}.admin-table{width:100%;border-collapse:collapse}.admin-table th{text-align:left;color:#8a8e98;font-size:10px;text-transform:uppercase;letter-spacing:.06em;padding:11px;border-bottom:1px solid #ececf0}.admin-table td{padding:13px 11px;border-bottom:1px solid #f0f0f3;font-size:12px;vertical-align:top}.admin-user{font-weight:750}.admin-email{display:block;color:#9296a0;font-size:10px;margin-top:3px}.admin-link{color:#6650d8;text-decoration:none}.admin-task{max-width:470px}.admin-count{font-weight:800}.admin-empty{text-align:center;padding:45px;color:#9296a0}.admin-loading,.admin-denied{min-height:80vh;display:grid;place-items:center;text-align:center}.admin-denied{align-content:center}.admin-denied .admin-logo{margin:0 auto 14px}.admin-denied h1{margin:0}.admin-denied p{color:#858a95}.admin-denied a{color:#6850d8;text-decoration:none;font-weight:700}.admin-mobile-card{display:none}@media(max-width:800px){.admin-page{padding:18px}.admin-top{align-items:center}.admin-stats{grid-template-columns:1fr}.admin-filters{grid-template-columns:1fr 1fr}.admin-table{display:none}.admin-mobile-card{display:block;padding:14px 0;border-bottom:1px solid #eee}.admin-mobile-card strong{display:block;margin-bottom:5px}.admin-mobile-card span{display:block;color:#858a95;font-size:11px;margin:3px 0}.admin-task{max-width:none}}@media(max-width:520px){.admin-filters{grid-template-columns:1fr}.admin-top h1{font-size:21px}.admin-badge{display:none}}
  `}</style><div className="admin-wrap"><header className="admin-top"><div className="admin-brand"><div className="admin-logo">W</div><div><h1>Admin Workspace</h1><p>See who did what, when, and where the work files are.</p></div></div><span className="admin-badge">ADMIN ACCESS</span></header><section className="admin-stats"><div className="admin-stat"><span>Total users</span><strong>{stats.users}</strong></div><div className="admin-stat"><span>Tasks in view</span><strong>{stats.tasks}</strong></div><div className="admin-stat"><span>Active users</span><strong>{stats.active}</strong></div></section><section className="admin-panel"><div className="admin-filters"><input placeholder="Search user or task…" value={search} onChange={e => setSearch(e.target.value)} /><select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}><option value="all">All users</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email || "Unnamed user"}</option>)}</select><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div><table className="admin-table"><thead><tr><th>User</th><th>Date</th><th>Work</th><th>Assigned To</th><th>Files</th><th>Tasks</th></tr></thead><tbody>{visibleTasks.length ? visibleTasks.map(task => <tr key={task.id}><td><span className="admin-user">{userName(task.user_id)}</span><span className="admin-email">{profiles.find(p => p.id === task.user_id)?.email}</span></td><td>{formatDate(task.work_date)}</td><td className="admin-task">{task.description}</td><td>{task.assigned_to}</td><td>{task.drive_link ? <a className="admin-link" href={task.drive_link} target="_blank" rel="noreferrer">Open files ↗</a> : "—"}</td><td className="admin-count">{userTaskCount(task.user_id)}</td></tr>) : <tr><td colSpan={6}><div className="admin-empty">No work matches these filters.</div></td></tr>}</tbody></table><div>{visibleTasks.length ? visibleTasks.map(task => <article className="admin-mobile-card" key={task.id}><strong>{userName(task.user_id)}</strong><span>{formatDate(task.work_date)} · {task.assigned_to}</span><span>{task.description}</span>{task.drive_link ? <a className="admin-link" href={task.drive_link} target="_blank" rel="noreferrer">Open work files ↗</a> : null}</article>) : <div className="admin-empty">No work matches these filters.</div>}</div></section></div></main>;
}
