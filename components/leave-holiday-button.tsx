"use client";

export default function LeaveHolidayButton() {
  return <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("worklog:open-leave-modal"))} style={{border:"1px solid #dedfe6",background:"#fff",color:"#5d6270",borderRadius:9,padding:"9px 14px",fontWeight:750,cursor:"pointer",fontSize:11}}>Mark Leave / Holiday</button>;
}
