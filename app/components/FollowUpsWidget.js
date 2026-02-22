/* ─────────────────────────────────────────────────────────────────────────────
   app/components/FollowUpsWidget.js
   Dashboard widget showing upcoming + overdue follow-ups.
   Polls /api/followups every 90 seconds.
   Emits an overdue count badge via onOverdueCount callback.
───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback } from "react";

function relTime(ts) {
  if (!ts) return "";
  const d   = new Date(ts);
  const now = new Date();
  const diff = d - now; // ms, can be negative
  const abs  = Math.abs(diff);
  const m    = Math.floor(abs / 60000);
  if (m < 1)  return diff < 0 ? "just now" : "in < 1m";
  if (m < 60) return diff < 0 ? `${m}m ago` : `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return diff < 0 ? `${h}h ago` : `in ${h}h`;
  const dys = Math.floor(h / 24);
  return diff < 0 ? `${dys}d ago` : `in ${dys}d`;
}

const PRIORITY_STYLE = {
  Urgent: "bg-red-500/15 text-red-400 border-red-500/25",
  Normal: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Low:    "bg-zinc-700/40 text-zinc-400 border-zinc-600/25",
};

export default function FollowUpsWidget({ onLeadClick, onOverdueCount }) {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res  = await fetch("/api/followups?status=pending&limit=20");
      const data = await res.json();
      const list = data.followups || [];
      setFollowups(list);
      const overdueCount = list.filter((f) => new Date(f.due_at) < new Date()).length;
      onOverdueCount?.(overdueCount);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [onOverdueCount]);

  useEffect(() => {
    fetch_();
    const iv = setInterval(fetch_, 90_000); // poll every 90 s
    return () => clearInterval(iv);
  }, [fetch_]);

  const overdue  = followups.filter((f) => new Date(f.due_at) < new Date());
  const upcoming = followups.filter((f) => new Date(f.due_at) >= new Date());

  return (
    <div className="bg-[#161616] border border-[#252525] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#252525]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400 text-xl">calendar_today</span>
          <span className="text-sm font-bold text-white">Follow-Ups</span>
          {overdue.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
              {overdue.length} overdue
            </span>
          )}
          {overdue.length === 0 && upcoming.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {upcoming.length} upcoming
            </span>
          )}
        </div>
        <button onClick={() => setExpanded((v) => !v)}
          className="size-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/8 transition-all">
          <span className="material-symbols-outlined text-base">{expanded ? "expand_less" : "expand_more"}</span>
        </button>
      </div>

      {/* Body */}
      {expanded && (
        <div className="flex flex-col divide-y divide-[#1e1e1e]">
          {loading && (
            <div className="py-8 flex items-center justify-center text-zinc-600 text-sm">Loading…</div>
          )}

          {!loading && followups.length === 0 && (
            <div className="py-8 flex flex-col items-center gap-2 text-zinc-700">
              <span className="material-symbols-outlined text-3xl">event_available</span>
              <p className="text-xs">No pending follow-ups. All clear!</p>
            </div>
          )}

          {/* Overdue */}
          {overdue.length > 0 && (
            <div>
              <div className="px-5 py-1.5 text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-500/5">
                ⚠ Overdue
              </div>
              {overdue.map((f) => <FollowUpRow key={f.id} f={f} overdue onLeadClick={onLeadClick} />)}
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              {overdue.length > 0 && (
                <div className="px-5 py-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/3">
                  Upcoming
                </div>
              )}
              {upcoming.map((f) => <FollowUpRow key={f.id} f={f} onLeadClick={onLeadClick} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FollowUpRow({ f, overdue, onLeadClick }) {
  return (
    <div
      onClick={() => onLeadClick?.(f.lead_id)}
      className={`flex items-start gap-3 px-5 py-3 cursor-pointer transition-colors hover:bg-white/2
        ${overdue ? "border-l-2 border-l-red-500/60" : ""}`}
    >
      {/* Lead avatar */}
      <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5
        ${overdue ? "bg-red-500/20 text-red-300" : "bg-amber-500/15 text-amber-300"}`}>
        {(f.lead_name || "?").charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">{f.lead_name}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${PRIORITY_STYLE[f.priority] || PRIORITY_STYLE.Normal} shrink-0`}>
            {f.priority}
          </span>
        </div>
        {f.note && <p className="text-xs text-zinc-500 truncate mt-0.5">{f.note}</p>}
        <div className={`text-[10px] mt-1 flex items-center gap-1 ${overdue ? "text-red-500" : "text-zinc-600"}`}>
          <span className="material-symbols-outlined text-[11px]">schedule</span>
          {relTime(f.due_at)}
          {f.status_label && (
            <>
              <span className="text-zinc-700 mx-1">·</span>
              <span style={{ color: f.status_color }}>{f.status_label}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
