"use client";

import { useEffect, useState } from "react";

type Mark = { id: string; date: string; type: "Leave" | "Holiday"; remark: string };
type TrackerEntry = { id: string; date: string; description: string; assignedTo: string; driveLink?: string; remark?: string };
const KEY = "worklog.leaveHoliday.v1";
const TASK_KEY = "worklog.tasks.v2";

function syncMarkToTracker(mark: Mark) {
  try {
    const current = JSON.parse(localStorage.getItem(TASK_KEY) || "[]") as TrackerEntry[];
    const filtered = current.filter((item) => !(item.assignedTo === "System" && (item.description === "Leave" || item.description === "Holiday") && item.date === mark.date));
    const trackerEntry: TrackerEntry = {
      id: `leave-holiday-${mark.date}`,
      date: mark.date,
      description: mark.type,
      assignedTo: "System",
      remark: mark.remark,
    };
    localStorage.setItem(TASK_KEY, JSON.stringify([...filtered, trackerEntry]));
  } catch {}
}

export default function LeaveHolidayWidget({ initialDate, onSaved }: { initialDate?: string; onSaved?: (mark: Mark) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initialDate || "");
  const [type, setType] = useState<"Leave" | "Holiday">("Leave");
  const [remark, setRemark] = useState("");
  const [marks, setMarks] = useState<Mark[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "[]") as Mark[];
      setMarks(saved);
      saved.forEach(syncMarkToTracker);
    } catch { setMarks([]); }
  }, []);

  function openModal() {
    const selectedDate = initialDate || new Date().toISOString().slice(0, 10);
    const existing = marks.find((item) => item.date === selectedDate);
    setDate(selectedDate);
    setType(existing?.type || "Leave");
    setRemark(existing?.remark || "");
    setOpen(true);
  }

  function save() {
    if (!date) return;
    const next: Mark = { id: crypto.randomUUID(), date, type, remark: remark.trim() };
    const updated = [...marks.filter((item) => item.date !== date), next];
    localStorage.setItem(KEY, JSON.stringify(updated));
    syncMarkToTracker(next);
    setMarks(updated);
    onSaved?.(next);
    setOpen(false);
    window.location.reload();
  }

  return (
    <>
      <button type="button" onClick={openModal} style={{ width: "100%", marginTop: 8, border: "1px solid #dedfe6", background: "#fff", color: "#5d6270", borderRadius: 9, padding: "9px 14px", fontWeight: 750, cursor: "pointer", fontSize: 11 }}>
        Mark Leave / Holiday
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(20,22,30,.42)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onMouseDown={() => setOpen(false)}>
          <div style={{ width: "min(420px,100%)", background: "#fff", border: "1px solid #ececf1", borderRadius: 18, boxShadow: "0 24px 70px rgba(20,22,30,.2)", padding: 24, color: "#242731" }} onMouseDown={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>Mark Leave / Holiday</h3>
            <label style={{ display: "block", fontSize: 10, fontWeight: 750, color: "#7f8592" }}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "100%", height: 40, boxSizing: "border-box", margin: "6px 0 14px", border: "1px solid #dedfe6", borderRadius: 9, padding: "0 10px" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {(["Leave", "Holiday"] as const).map((item) => (
                <button key={item} type="button" onClick={() => setType(item)} style={{ height: 38, border: "1px solid #dedfe6", borderRadius: 9, background: type === item ? "#7355f5" : "#fff", color: type === item ? "#fff" : "#555", cursor: "pointer", fontWeight: 700 }}>{item}</button>
              ))}
            </div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 750, color: "#7f8592" }}>Remark</label>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Add a remark (optional)" spellCheck autoCorrect="on" style={{ width: "100%", minHeight: 90, boxSizing: "border-box", marginTop: 6, border: "1px solid #dedfe6", borderRadius: 9, padding: 10, resize: "vertical" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button type="button" onClick={() => setOpen(false)} style={{ border: "1px solid #dedfe6", background: "#fff", color: "#5d6270", borderRadius: 9, padding: "9px 15px", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={save} style={{ border: 0, background: "#7355f5", color: "#fff", borderRadius: 9, padding: "9px 16px", fontWeight: 700, cursor: "pointer" }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
