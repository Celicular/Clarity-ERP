/* ─────────────────────────────────────────────────────────────────────────────
   app/components/LeadDetailDrawer.js
   Full-featured lead detail panel with:
   ① Clickable pipeline stage stepper
   ② Inline-editable lead info
   ③ Follow-Up section (set / edit / mark done)
   ④ Tabbed bottom area: Activity + Comments | Interactions
   ⑤ Input row tabs: Comment | Log Interaction
───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ProposalsPanel, AttachmentsPanel } from "./ProposalBuilderModal";
import DeveloperSuggestionModal from "./DeveloperSuggestionModal";

/* ── Tiny spinner ── */
function Spinner({ sm }) {
  return (
    <svg className={`animate-spin ${sm ? "size-3" : "size-4"} inline`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

/* ── Relative time ── */
function relTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString([], { dateStyle: "medium" });
}

/* ── Format datetime for <input type="datetime-local"> ── */
function toLocalInput(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ── Activity event meta ── */
const EVENT_META = {
  created:          { icon: "add_circle",      label: "Lead created",         color: "text-blue-400" },
  status_changed:   { icon: "swap_horiz",      label: "Status changed",       color: "text-purple-400" },
  edited:           { icon: "edit",            label: "Lead edited",          color: "text-zinc-400" },
  merged:           { icon: "merge",           label: "Merged",               color: "text-orange-400" },
  duplicate_flagged:{ icon: "warning",         label: "Duplicate flagged",    color: "text-yellow-400" },
  webhook_received: { icon: "webhook",         label: "Received via webhook", color: "text-cyan-400" },
  commented:        { icon: "chat_bubble",     label: "Comment",              color: "text-emerald-400" },
  interaction:      { icon: "handshake",       label: "Interaction logged",   color: "text-orange-400" },
  followup_set:     { icon: "calendar_today",  label: "Follow-up scheduled",  color: "text-amber-400" },
  followup_done:    { icon: "task_alt",        label: "Follow-up completed",  color: "text-green-400" },
};

/* ── Interaction types ── */
const INTERACTION_TYPES = [
  { v: "call",    label: "📞 Call",    color: "text-blue-400"  },
  { v: "meeting", label: "🤝 Meeting", color: "text-purple-400"},
  { v: "demo",    label: "💻 Demo",    color: "text-cyan-400"  },
  { v: "chat",    label: "💬 Chat",    color: "text-green-400" },
  { v: "email",   label: "✉️ Email",   color: "text-orange-400"},
  { v: "other",   label: "📋 Other",   color: "text-zinc-400"  },
];

const INTERACTION_ICONS = {
  call: "call", meeting: "handshake", demo: "laptop_mac",
  chat: "chat", email: "mail", other: "description",
};

const INTERACTION_COLORS = {
  call:    { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/25" },
  meeting: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/25" },
  demo:    { bg: "bg-cyan-500/10",   text: "text-cyan-400",   border: "border-cyan-500/25" },
  chat:    { bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/25" },
  email:   { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/25" },
  other:   { bg: "bg-zinc-500/10",   text: "text-zinc-400",   border: "border-zinc-500/25" },
};

const CRIT_COLORS = {
  Low:    "bg-zinc-700/50 text-zinc-400 border-zinc-600/40",
  Normal: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  High:   "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Urgent: "bg-red-500/15 text-red-400 border-red-500/20",
};

/* ════════════════════════════════════════════════════════════════════════════
   Main Component
════════════════════════════════════════════════════════════════════════════ */
export default function LeadDetailDrawer({ leadId, statuses = [], onClose, onUpdate }) {
  const [lead, setLead]               = useState(null);
  const [activity, setActivity]       = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [followups, setFollowups]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  /* Editing */
  const [editing, setEditing]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [fName, setFName]             = useState("");
  const [fEmail, setFEmail]           = useState("");
  const [fPhone, setFPhone]           = useState("");
  const [fCompany, setFCompany]       = useState("");
  const [fCrit, setFCrit]             = useState("Normal");
  const [fNotes, setFNotes]           = useState("");

  /* Status */
  const [statusChanging, setStatusChanging] = useState(false);

  /* Timeline tab */
  const [timelineTab, setTimelineTab] = useState("activity"); // "activity" | "interactions"

  /* Comment */
  const [comment, setComment]         = useState("");
  const [posting, setPosting]         = useState(false);

  /* Interaction log */
  const [inputTab, setInputTab]       = useState("comment"); // "comment" | "interaction"
  const [iType, setIType]             = useState("call");
  const [iNotes, setINotes]           = useState("");
  const [iDate, setIDate]             = useState("");
  const [iLogging, setILogging]       = useState(false);
  const [iEditId, setIEditId]         = useState(null);

  /* Follow-up */
  const [fuOpen, setFuOpen]           = useState(false);   // follow-up form visible
  const [fuDueAt, setFuDueAt]         = useState("");
  const [fuNote, setFuNote]           = useState("");
  const [fuPriority, setFuPriority]   = useState("Normal");
  const [fuSaving, setFuSaving]       = useState(false);
  const [fuEditId, setFuEditId]       = useState(null);    // which follow-up being edited

  /* Won → Project modal */
  const [showWonModal, setShowWonModal] = useState(false);

  const timelineRef = useRef(null);

  /* ─ Fetch all lead data ─ */
  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [leadRes, interRes, fuRes] = await Promise.all([
        fetch(`/api/leads/${leadId}`).then((r) => r.json()),
        fetch(`/api/leads/${leadId}/interactions`).then((r) => r.json()),
        fetch(`/api/leads/${leadId}/followups`).then((r) => r.json()),
      ]);
      if (!leadRes.lead) throw new Error(leadRes.error || "Lead not found");
      setLead(leadRes.lead);
      setActivity(leadRes.activity || []);
      setInteractions(interRes.interactions || []);
      setFollowups(fuRes.followups || []);
      // Seed edit form
      setFName(leadRes.lead.name || "");
      setFEmail(leadRes.lead.email || "");
      setFPhone(leadRes.lead.phone || "");
      setFCompany(leadRes.lead.company || "");
      setFCrit(leadRes.lead.criticality || "Normal");
      setFNotes(leadRes.lead.notes || "");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [leadId]);

  useEffect(() => { if (leadId) fetchDetail(); }, [leadId, fetchDetail]);

  /* Auto-scroll timeline */
  useEffect(() => {
    if (timelineRef.current) timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
  }, [activity, timelineTab]);

  /* ─ Status change (intercepts "won" to show project creation modal) ─ */
  async function handleStatusChange(slug) {
    if (!lead || lead.status_slug === slug) return;
    /* If marking won, open the developer suggestion modal first */
    if (slug === "won") {
      setShowWonModal(true);
      return;
    }
    setStatusChanging(true);
    try {
      const res  = await fetch(`/api/leads/${leadId}/status`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_slug: slug }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await fetchDetail(); onUpdate?.();
    } catch (e) { setError(e.message); }
    finally { setStatusChanging(false); }
  }

  /* Called after project is confirmed — also mark lead as won */
  async function handleProjectConfirmed(projectId) {
    try {
      await fetch(`/api/leads/${leadId}/status`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_slug: "won" }),
      });
      await fetchDetail(); onUpdate?.();
    } catch { /* silent */ }
  }

  /* ─ Save lead edits ─ */
  async function handleSave() {
    setSaving(true); setError("");
    try {
      const res  = await fetch(`/api/leads/${leadId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fName, email: fEmail, phone: fPhone, company: fCompany, criticality: fCrit, notes: fNotes }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEditing(false); await fetchDetail(); onUpdate?.();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  /* ─ Post comment ─ */
  async function handleComment() {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await fetch(`/api/leads/${leadId}/comment`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: comment.trim() }),
      });
      setComment(""); await fetchDetail();
    } catch { /* silent */ }
    finally { setPosting(false); }
  }

  /* ─ Log interaction ─ */
  async function handleLogInteraction() {
    if (!iNotes.trim()) return;
    setILogging(true);
    try {
      if (iEditId) {
        await fetch(`/api/leads/${leadId}/interactions/${iEditId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: iType, notes: iNotes.trim(), interacted_at: iDate || undefined }),
        });
        setIEditId(null);
      } else {
        await fetch(`/api/leads/${leadId}/interactions`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: iType, notes: iNotes.trim(), interacted_at: iDate || undefined }),
        });
      }
      setINotes(""); setIDate(""); setIType("call");
      await fetchDetail(); onUpdate?.();
    } catch { /* silent */ }
    finally { setILogging(false); }
  }

  function startEditInteraction(ix) {
    setIEditId(ix.id); setIType(ix.type); setINotes(ix.notes);
    setIDate(toLocalInput(ix.interacted_at));
    setInputTab("interaction"); setTimelineTab("interactions");
  }

  async function handleDeleteInteraction(iid) {
    await fetch(`/api/leads/${leadId}/interactions/${iid}`, { method: "DELETE" });
    await fetchDetail(); onUpdate?.();
  }

  /* ─ Follow-up ─ */
  const pendingFollowup = followups.find((f) => f.status === "pending");

  function openFollowupForm(existing) {
    if (existing) {
      setFuEditId(existing.id);
      setFuDueAt(toLocalInput(existing.due_at));
      setFuNote(existing.note || "");
      setFuPriority(existing.priority || "Normal");
    } else {
      setFuEditId(null);
      setFuDueAt(""); setFuNote(""); setFuPriority("Normal");
    }
    setFuOpen(true);
  }

  async function handleSaveFollowup() {
    if (!fuDueAt) return;
    setFuSaving(true);
    try {
      if (fuEditId) {
        await fetch(`/api/leads/${leadId}/followups/${fuEditId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ due_at: new Date(fuDueAt).toISOString(), note: fuNote, priority: fuPriority }),
        });
      } else {
        await fetch(`/api/leads/${leadId}/followups`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ due_at: new Date(fuDueAt).toISOString(), note: fuNote, priority: fuPriority }),
        });
      }
      setFuOpen(false); await fetchDetail(); onUpdate?.();
    } catch { /* silent */ }
    finally { setFuSaving(false); }
  }

  async function handleMarkDone(fid) {
    await fetch(`/api/leads/${leadId}/followups/${fid}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "done" }),
    });
    await fetchDetail(); onUpdate?.();
  }

  async function handleDeleteFollowup(fid) {
    await fetch(`/api/leads/${leadId}/followups/${fid}`, { method: "DELETE" });
    await fetchDetail(); onUpdate?.();
  }

  /* ─ Helpers ─ */
  const currentIdx = statuses.findIndex((s) => s.slug === lead?.status_slug);
  const isOverdue  = pendingFollowup && new Date(pendingFollowup.due_at) < new Date();

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Won → Project creation modal (z-70 sits above the drawer) */}
      {showWonModal && lead && (
        <DeveloperSuggestionModal
          lead={lead}
          onClose={() => setShowWonModal(false)}
          onConfirm={handleProjectConfirmed}
        />
      )}

      <aside className="relative z-10 w-full max-w-[540px] h-full bg-[#141414] border-l border-[#252525]
                        flex flex-col shadow-2xl animate-slide-in-right overflow-hidden">

        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#252525] shrink-0">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-400 text-xl">person_raised_hand</span>
            Lead Detail
          </h3>
          <div className="flex items-center gap-1.5">
            {!editing ? (
              <button onClick={() => setEditing(true)} title="Edit lead"
                className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all">
                <span className="material-symbols-outlined text-base">edit</span>
              </button>
            ) : (
              <button onClick={() => { setEditing(false); setError(""); }}
                className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
            <button onClick={onClose}
              className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all">
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 gap-2">
            <Spinner /> <span className="text-sm">Loading…</span>
          </div>
        ) : !lead ? (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">Lead not found.</div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* ═══ STAGE STEPPER ═══ */}
            <div className="px-5 py-3 border-b border-[#252525] bg-[#111] shrink-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold">Pipeline Stage</span>
                {statusChanging && <Spinner sm />}
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {statuses.map((s, i) => {
                  const isCurrent = s.slug === lead.status_slug;
                  const isPast    = i < currentIdx;
                  return (
                    <button key={s.slug} onClick={() => handleStatusChange(s.slug)} disabled={statusChanging}
                      title={`Move to ${s.label}`}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold
                        border transition-all whitespace-nowrap shrink-0 disabled:cursor-not-allowed
                        ${isCurrent ? "scale-[1.04]" : isPast ? "border-transparent text-zinc-700 hover:text-zinc-500" : "border-[#252525] text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"}`}
                      style={isCurrent ? { backgroundColor: s.color+"22", borderColor: s.color+"55", color: s.color } : {}}>
                      <span className="size-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: isCurrent ? s.color : isPast ? "#333" : "#2a2a2a" }} />
                      {s.label}
                      {isCurrent && <span className="material-symbols-outlined text-[10px]">check</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ═══ LEAD INFO ═══ */}
            <div className="px-5 py-4 border-b border-[#252525] shrink-0">
              {error && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>
              )}
              {!editing ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-white font-bold text-lg leading-tight">{lead.name}</div>
                      {lead.company && <div className="text-zinc-500 text-sm">{lead.company}</div>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${CRIT_COLORS[lead.criticality] || CRIT_COLORS.Normal}`}>
                      {lead.criticality}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {lead.email && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <span className="material-symbols-outlined text-zinc-600 text-sm">mail</span>{lead.email}
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <span className="material-symbols-outlined text-zinc-600 text-sm">call</span>{lead.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                      <span className="material-symbols-outlined text-zinc-700 text-sm">podcasts</span>{lead.source}
                    </div>
                    {lead.assigned_to_name && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <span className="material-symbols-outlined text-zinc-600 text-sm">person</span>{lead.assigned_to_name}
                      </div>
                    )}
                  </div>
                  {lead.notes && (
                    <p className="text-xs text-zinc-500 bg-white/3 rounded-lg px-3 py-2 border border-white/5 whitespace-pre-wrap">{lead.notes}</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Name",    val: fName,    set: setFName,    ph: "Client name" },
                    { label: "Email",   val: fEmail,   set: setFEmail,   ph: "email@domain.com" },
                    { label: "Phone",   val: fPhone,   set: setFPhone,   ph: "+91 xxxx" },
                    { label: "Company", val: fCompany, set: setFCompany, ph: "Company name" },
                  ].map(({ label, val, set, ph }) => (
                    <div key={label} className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>
                      <input value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all" />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Priority</label>
                      <select value={fCrit} onChange={(e) => setFCrit(e.target.value)}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all">
                        {["Low","Normal","High","Urgent"].map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Notes</label>
                      <textarea value={fNotes} onChange={(e) => setFNotes(e.target.value)} rows={1} placeholder="Internal notes…"
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all resize-none" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setEditing(false); setError(""); }}
                      className="flex-1 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-zinc-400 hover:text-white text-sm font-semibold transition-all">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                      {saving ? <Spinner /> : <span className="material-symbols-outlined text-base">save</span>}
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ═══ FOLLOW-UP SECTION ═══ */}
            <div className={`px-5 py-3 border-b shrink-0 ${isOverdue ? "bg-red-500/5 border-red-500/20" : "border-[#252525]"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-base ${isOverdue ? "text-red-400" : pendingFollowup ? "text-amber-400" : "text-zinc-500"}`}>
                    {pendingFollowup ? "calendar_today" : "event_available"}
                  </span>
                  <span className={`text-xs font-bold ${isOverdue ? "text-red-400" : pendingFollowup ? "text-amber-400" : "text-zinc-500"}`}>
                    Follow-Up
                  </span>
                  {isOverdue && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/25 uppercase tracking-wide">
                      Overdue
                    </span>
                  )}
                </div>
                <button
                  onClick={() => openFollowupForm(pendingFollowup)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-orange-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">{pendingFollowup ? "edit" : "add"}</span>
                  {pendingFollowup ? "Edit" : "Set Follow-Up"}
                </button>
              </div>

              {/* Pending follow-up display */}
              {pendingFollowup && !fuOpen && (
                <div className={`rounded-xl border px-3 py-2.5 flex items-start justify-between gap-3 ${isOverdue ? "bg-red-500/8 border-red-500/20" : "bg-amber-500/5 border-amber-500/15"}`}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide
                        ${pendingFollowup.priority === "Urgent" ? "bg-red-500/15 text-red-400 border border-red-500/25" :
                          pendingFollowup.priority === "Normal" ? "bg-blue-500/15 text-blue-400 border border-blue-500/25" :
                          "bg-zinc-700/50 text-zinc-400 border border-zinc-600/30"}`}>
                        {pendingFollowup.priority}
                      </span>
                      <span className={`text-xs font-semibold ${isOverdue ? "text-red-300" : "text-amber-300"}`}>
                        {new Date(pendingFollowup.due_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    {pendingFollowup.note && (
                      <p className="text-xs text-zinc-400">{pendingFollowup.note}</p>
                    )}
                    <div className="text-[10px] text-zinc-600">Set by {pendingFollowup.created_by_name}</div>
                  </div>
                  <button onClick={() => handleMarkDone(pendingFollowup.id)}
                    className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 transition-all">
                    <span className="material-symbols-outlined text-sm">check</span> Done
                  </button>
                </div>
              )}

              {/* No follow-up */}
              {!pendingFollowup && !fuOpen && (
                <p className="text-xs text-zinc-700">No follow-up scheduled.</p>
              )}

              {/* Follow-up form */}
              {fuOpen && (
                <div className="flex flex-col gap-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] p-4 mt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Due Date & Time *</label>
                      <input type="datetime-local" value={fuDueAt} onChange={(e) => setFuDueAt(e.target.value)}
                        className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Priority</label>
                      <select value={fuPriority} onChange={(e) => setFuPriority(e.target.value)}
                        className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all">
                        {["Low","Normal","Urgent"].map((p) => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Note</label>
                      <input value={fuNote} onChange={(e) => setFuNote(e.target.value)} placeholder="e.g. Call back about pricing"
                        className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setFuOpen(false)}
                      className="flex-1 py-2 rounded-xl bg-[#111] border border-[#333] text-zinc-500 hover:text-white text-sm font-semibold transition-all">
                      Cancel
                    </button>
                    {pendingFollowup && (
                      <button onClick={() => handleDeleteFollowup(pendingFollowup.id)}
                        className="py-2 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 text-sm font-semibold transition-all">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                    <button onClick={handleSaveFollowup} disabled={!fuDueAt || fuSaving}
                      className="flex-1 py-2 rounded-xl bg-amber-500/80 hover:bg-amber-400 text-black text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                      {fuSaving ? <Spinner /> : <span className="material-symbols-outlined text-base">calendar_today</span>}
                      {fuSaving ? "Saving…" : fuEditId ? "Update" : "Schedule"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ═══ TIMELINE TABS ═══ */}
            <div className="flex items-center gap-0 border-b border-[#252525] shrink-0 px-5 overflow-x-auto">
              {[
                { id: "activity",     label: "Activity",     count: activity.length },
                { id: "interactions", label: "Interactions", count: interactions.length },
                { id: "proposals",    label: "Proposals",    count: null },
                { id: "attachments",  label: "Attachments",  count: null },
              ].map((t) => (
                <button key={t.id} onClick={() => setTimelineTab(t.id)}
                  className={`flex items-center gap-1.5 px-1 py-2.5 mr-4 text-[11px] font-semibold border-b-2 transition-all -mb-px shrink-0
                    ${timelineTab === t.id ? "border-orange-500 text-orange-400" : "border-transparent text-zinc-600 hover:text-zinc-400"}`}>
                  {t.label}
                  {t.count !== null && (
                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${timelineTab === t.id ? "bg-orange-500/20 text-orange-400" : "bg-zinc-800 text-zinc-500"}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ═══ TIMELINE CONTENT ═══ */}
            <div ref={timelineRef} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

              {/* ── Activity & Comments ── */}
              {timelineTab === "activity" && (
                <>
                  {activity.length === 0 && (
                    <p className="text-sm text-zinc-700 text-center py-6">No activity yet.</p>
                  )}
                  {activity.map((ev) => {
                    const meta = EVENT_META[ev.event_type] || { icon: "info", label: ev.event_type, color: "text-zinc-500" };
                    const isComment = ev.event_type === "commented";
                    const payload = typeof ev.payload === "string" ? JSON.parse(ev.payload || "{}") : (ev.payload || {});

                    if (isComment) {
                      return (
                        <div key={ev.id} className="flex gap-2.5 items-start">
                          <div className="size-7 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10
                                          flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                            {(ev.actor_name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col gap-0.5 max-w-[85%]">
                            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl rounded-tl-sm px-3 py-2">
                              <p className="text-sm text-white leading-snug">{payload.text}</p>
                            </div>
                            <div className="flex items-center gap-1.5 px-1">
                              <span className="text-[10px] text-zinc-600 font-medium">{ev.actor_name}</span>
                              <span className="text-zinc-700 text-[10px]">·</span>
                              <span className="text-[10px] text-zinc-700">{relTime(ev.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Interaction event — shown in activity as a compact card
                    if (ev.event_type === "interaction") {
                      const ic = INTERACTION_COLORS[payload.type] || INTERACTION_COLORS.other;
                      return (
                        <div key={ev.id} className={`rounded-xl border ${ic.bg} ${ic.border} px-3 py-2.5`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`material-symbols-outlined text-base ${ic.text}`}>{INTERACTION_ICONS[payload.type] || "description"}</span>
                            <span className={`text-xs font-bold capitalize ${ic.text}`}>{payload.type}</span>
                            <span className="text-zinc-600 text-[10px] ml-auto">{relTime(ev.created_at)}</span>
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed">{payload.notes}</p>
                          <div className="text-[10px] text-zinc-600 mt-1">by {ev.actor_name}</div>
                        </div>
                      );
                    }

                    return (
                      <div key={ev.id} className="flex items-start gap-2.5">
                        <div className="size-5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0 mt-0.5">
                          <span className={`material-symbols-outlined text-[11px] ${meta.color}`}>{meta.icon}</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-zinc-400">
                            {ev.actor_name && <span className="text-white font-medium">{ev.actor_name} </span>}
                            <span>{meta.label}</span>
                            {ev.event_type === "status_changed" && payload.from && payload.to && (
                              <span className="text-zinc-600"> · {payload.from} → <span className="text-zinc-400">{payload.to}</span></span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-700 mt-0.5">{relTime(ev.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* ── Interactions Tab ── */}
              {timelineTab === "interactions" && (
                <>
                  {interactions.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <span className="material-symbols-outlined text-zinc-700 text-4xl">handshake</span>
                      <p className="text-sm text-zinc-600">No interactions logged yet.</p>
                      <button onClick={() => { setInputTab("interaction"); setTimelineTab("interactions"); }}
                        className="text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors">
                        <span className="material-symbols-outlined text-sm">add</span> Log first interaction
                      </button>
                    </div>
                  )}
                  {interactions.map((ix) => {
                    const ic = INTERACTION_COLORS[ix.type] || INTERACTION_COLORS.other;
                    return (
                      <div key={ix.id} className={`rounded-xl border p-4 ${ic.bg} ${ic.border} group relative`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-lg ${ic.text}`}>{INTERACTION_ICONS[ix.type] || "description"}</span>
                            <span className={`text-sm font-bold capitalize ${ic.text}`}>{ix.type}</span>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEditInteraction(ix)} title="Edit"
                              className="size-6 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                            <button onClick={() => handleDeleteInteraction(ix.id)} title="Delete"
                              className="size-6 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{ix.notes}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                            <span className="material-symbols-outlined text-[11px]">schedule</span>
                            {new Date(ix.interacted_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                            <span className="material-symbols-outlined text-[11px]">person</span>
                            {ix.actor_name}
                          </div>
                          {ix.updated_at && ix.updated_at !== ix.created_at && (
                            <span className="text-[10px] text-zinc-700 italic">edited</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* ── Proposals Tab ── */}
              {timelineTab === "proposals" && (
                <ProposalsPanel leadId={leadId} isAdmin={false} />
              )}

              {/* ── Attachments Tab ── */}
              {timelineTab === "attachments" && (
                <AttachmentsPanel leadId={leadId} isAdmin={false} />
              )}

            </div>

            {/* ═══ INPUT TABS ═══ */}
            <div className="px-5 pt-3 pb-4 border-t border-[#252525] shrink-0 space-y-3">
              {/* Tab switcher */}
              <div className="flex items-center gap-1 bg-[#111] rounded-xl p-1 border border-[#222]">
                {[
                  { id: "comment",     icon: "chat",       label: "Comment" },
                  { id: "interaction", icon: "handshake",  label: "Log Interaction" },
                ].map((t) => (
                  <button key={t.id} onClick={() => setInputTab(t.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all
                      ${inputTab === t.id ? "bg-orange-500/15 text-orange-400" : "text-zinc-500 hover:text-zinc-300"}`}>
                    <span className="material-symbols-outlined text-sm">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Comment input */}
              {inputTab === "comment" && (
                <div className="flex gap-2 items-end">
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                    rows={2} placeholder="Add a comment… (Enter to send)"
                    className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600
                               focus:outline-none focus:border-orange-500/50 transition-all resize-none" />
                  <button onClick={handleComment} disabled={posting || !comment.trim()}
                    className="size-10 rounded-xl bg-orange-500 hover:bg-orange-400 text-white flex items-center justify-center
                               disabled:opacity-40 transition-all shrink-0">
                    {posting ? <Spinner /> : <span className="material-symbols-outlined text-base">send</span>}
                  </button>
                </div>
              )}

              {/* Interaction log input */}
              {inputTab === "interaction" && (
                <div className="space-y-3">
                  {iEditId && (
                    <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Editing interaction
                      <button onClick={() => { setIEditId(null); setINotes(""); setIDate(""); setIType("call"); }}
                        className="ml-auto text-zinc-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <select value={iType} onChange={(e) => setIType(e.target.value)}
                      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all">
                      {INTERACTION_TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                    </select>
                    <input type="datetime-local" value={iDate} onChange={(e) => setIDate(e.target.value)}
                      title="When did this happen? (defaults to now)"
                      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-zinc-400 focus:outline-none focus:border-orange-500/50 transition-all" />
                  </div>
                  <div className="flex gap-2 items-end">
                    <textarea value={iNotes} onChange={(e) => setINotes(e.target.value)}
                      rows={2} placeholder="Notes from this interaction…"
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600
                                 focus:outline-none focus:border-orange-500/50 transition-all resize-none" />
                    <button onClick={handleLogInteraction} disabled={iLogging || !iNotes.trim()}
                      className="size-10 rounded-xl bg-orange-500 hover:bg-orange-400 text-white flex items-center justify-center
                                 disabled:opacity-40 transition-all shrink-0">
                      {iLogging ? <Spinner /> : <span className="material-symbols-outlined text-base">add</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </aside>
    </div>
  );
}
