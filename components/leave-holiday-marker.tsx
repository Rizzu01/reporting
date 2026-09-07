"use client";

import { useEffect, useState } from "react";

type Mark = { id: string; date: string; type: "Leave" | "Holiday"; remark: string };

const KEY = "worklog.leaveHoliday.v1";

export default function LeaveHolidayMarker() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [type, setType] = useState<"Leave" | "Holiday">("Leave");
  const [remark, setRemark] = useState("");

  useEffect(() => {
    const openModal = (event: Event) => {
      const detail = (event as CustomEvent<{ date?: string }>).detail;
      setDate(detail?.date || new Date().toISOString().slice(0, 10));
      setType("Leave");
      setRemark("");
      setOpen(true);
    };
    window.addEventListener("worklog:open-leave-modal", openModal);
    return () => window.removeEventListener("worklog:open-leave-modal", openModal);
  }, []);

  const save = () => {
    if (!date) return;
    const existing: Mark[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    const next = [...existing.filter(item => item.date !== date), { id: crypto.randomUUID(), date, type, remark: remark.trim() }];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("worklog:leave-holiday-updated"));
    setOpen(false);
  };

  if (!open) return null;
  return <div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(20,22,30,.42)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onMouseDown={() => setOpen(false)}>
    <div style={{width:"min(420px,100%)",background:"#fff",borderRadius:18,padding:24,boxShadow:"0 24px 70px rgba(20,22,30,.2)"}} onMouseDown={e => e.stopPropagation()}>
      <h3 style={{margin:"0 0 16px",fontSize:18}}>Mark Leave / Holiday</h3>
      <label style={{display:"block",fontSize:11,fontWeight:700,color:"#6b7080",marginBottom:6}}>Date</label>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{width:"100%",height:40,border:"1px solid #dedfe6",borderRadius:9,padding:"0 10px",boxSizing:"border-box",marginBottom:14}} />
      <label style={{display:"block",fontSize:11,fontWeight:700,color:"#6b7080",marginBottom:7}}>Mark as</label>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {(["Leave","Holiday"] as const).map(item => <button key={item} onClick={() => setType(item)} style={{flex:1,height:38,border:"1px solid #dedfe6",borderRadius:9,cursor:"pointer",fontWeight:700,background:type===item?"#7355f5":"#fff",color:type===item?"#fff":"#555"}}>{item}</button>)}
      </div>
      <label style={{display:"block",fontSize:11,fontWeight:700,color:"#6b7080",marginBottom:6}}>Remark</label>
      <textarea value={remark} onChange={e => setRemark(e.target.value)} placeholder="Add a remark (optional)" spellCheck autoCorrect="on" style={{width:"100%",minHeight:90,border:"1px solid #dedfe6",borderRadius:9,padding:10,boxSizing:"border-box",resize:"vertical"}} />
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18}}>
        <button onClick={() => setOpen(false)} style={{border:"1px solid #dedfe6",background:"#fff",borderRadius:9,padding:"9px 15px",fontWeight:700,cursor:"pointer"}}>Cancel</button>
        <button onClick={save} style={{border:0,background:"#7355f5",color:"#fff",borderRadius:9,padding:"9px 16px",fontWeight:700,cursor:"pointer"}}>Save</button>
      </div>
    </div>
  </div>;
}
