/* ─────────────────────────────────────────────────────────────────────────────
   app/components/LeadsView.js
   Sales module — Leads panel.
   Tabs: List view (table + filters) | Kanban board (drag-and-drop)
   Features:
   - Add Lead modal with live duplicate detection
   - Unattended lead highlighting
   - Per-row: View Detail (drawer), Delete
   - Kanban: drag-and-drop across pipeline stages
   - Webhook settings modal (admin only)
───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import LeadDetailDrawer from "./LeadDetailDrawer";

/* ── Spinner ── */
function Spinner({ sm }) {
  return (
    <svg className={`animate-spin ${sm ? "size-3.5" : "size-4"} inline`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

/* ── Criticality styling ── */
const CRIT = {
  Low:    { cls: "bg-zinc-700/40 text-zinc-400 border-zinc-600/30",         dot: "bg-zinc-500" },
  Normal: { cls: "bg-blue-500/10 text-blue-400 border-blue-500/20",         dot: "bg-blue-400" },
  High:   { cls: "bg-orange-500/10 text-orange-400 border-orange-500/20",   dot: "bg-orange-400" },
  Urgent: { cls: "bg-red-500/10 text-red-400 border-red-500/20",            dot: "bg-red-400" },
};

function CritBadge({ c }) {
  const s = CRIT[c] || CRIT.Normal;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${s.cls}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} /> {c}
    </span>
  );
}

/* ── Source chip ── */
function SourceChip({ source }) {
  return (
    <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
      {source}
    </span>
  );
}

const SOURCES      = ["Manual","Webhook","Referral","Social","Email","Other"];
const CRITICALITIES = ["Low","Normal","High","Urgent"];

/* ════════════════════════════════════════════════════════════════════════════
   Main Component
════════════════════════════════════════════════════════════════════════════ */
export default function LeadsView({ user }) {
  const isAdmin = user.role === "ADMIN";

  /* ── Core data ── */
  const [leads, setLeads]         = useState([]);
  const [allLeads, setAllLeads]   = useState([]);  // unfiltered — used by Kanban
  const [statuses, setStatuses]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState("");

  /* ── Filters ── */
  const [tab, setTab]             = useState("list");   // "list" | "kanban"
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilterStatus]       = useState("");
  const [filterSource, setFilterSource]       = useState("");
  const [filterCriticality, setFilterCriticality] = useState("");

  /* ── Drawer ── */
  const [drawerLeadId, setDrawerLeadId] = useState(null);

  /* ── Add-lead modal ── */
  const [addOpen, setAddOpen]     = useState(false);
  const [defaultStatus, setDefaultStatus] = useState("");  // pre-set when adding from Kanban column
  const [fName, setFName]         = useState("");
  const [fEmail, setFEmail]       = useState("");
  const [fPhone, setFPhone]       = useState("");
  const [fCompany, setFCompany]   = useState("");
  const [fSource, setFSource]     = useState("Manual");
  const [fCrit, setFCrit]         = useState("Normal");
  const [fNotes, setFNotes]       = useState("");
  const [saving, setSaving]       = useState(false);
  const [addError, setAddError]   = useState("");
  const [dupWarning, setDupWarning] = useState([]);  // probable duplicates
  const [dupChecking, setDupChecking] = useState(false);
  const dupTimer = useRef(null);

  /* ── Delete confirmation ── */
  const [delTarget, setDelTarget] = useState(null);
  const [deleting, setDeleting]   = useState(false);

  /* ── Webhook settings modal ── */
  const [whOpen, setWhOpen]         = useState(false);
  const [tokens, setTokens]         = useState([]);
  const [newTokenLabel, setNewTokenLabel] = useState("");
  const [newTokenFull, setNewTokenFull]   = useState(null); // shown once
  const [whSaving, setWhSaving]     = useState(false);
  const [whError, setWhError]       = useState("");

  /* ── Kanban drag state ── */
  const dragLead   = useRef(null);
  const dragSource = useRef(null);

  /* ════════ Data fetching ════════ */
  const fetchStatuses = useCallback(async () => {
    try {
      const res  = await fetch("/api/lead-statuses");
      const data = await res.json();
      setStatuses(data.statuses || []);
    } catch { /* silent */ }
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      // Filtered — for list view
      const p = new URLSearchParams();
      if (filterStatus)       p.set("status",      filterStatus);
      if (filterSource)       p.set("source",      filterSource);
      if (filterCriticality)  p.set("criticality", filterCriticality);
      if (search)             p.set("search",      search);
      const [r1, r2] = await Promise.all([
        fetch(`/api/leads?${p}`).then((r) => r.json()),
        fetch("/api/leads").then((r) => r.json()),   // unfiltered for Kanban
      ]);
      setLeads(r1.leads || []);
      setAllLeads(r2.leads || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filterStatus, filterSource, filterCriticality, search]);

  useEffect(() => { fetchStatuses(); }, [fetchStatuses]);
  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  /* ════════ Add Lead ════════ */
  function openAdd(statusSlug = "") {
    setFName(""); setFEmail(""); setFPhone(""); setFCompany("");
    setFSource("Manual"); setFCrit("Normal"); setFNotes("");
    setAddError(""); setDupWarning([]); setDefaultStatus(statusSlug);
    setAddOpen(true);
  }

  /* Live duplicate check on email/phone blur */
  async function runDupCheck() {
    if (!fEmail && !fPhone && !fName) return;
    setDupChecking(true);
    try {
      const res  = await fetch("/api/leads/duplicate-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fEmail, phone: fPhone, name: fName, company: fCompany }),
      });
      const data = await res.json();
      setDupWarning(data.duplicates || []);
    } catch { /* silent */ }
    finally { setDupChecking(false); }
  }

  /* Debounced duplicate check as user types */
  function scheduleDupCheck() {
    clearTimeout(dupTimer.current);
    dupTimer.current = setTimeout(runDupCheck, 700);
  }

  async function handleCreateLead(force = false) {
    if (!fName.trim()) { setAddError("Lead name is required."); return; }
    setSaving(true); setAddError("");
    try {
      const res  = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fName, email: fEmail, phone: fPhone, company: fCompany,
          source: fSource, criticality: fCrit, notes: fNotes, force,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.duplicate) {
        setDupWarning(data.duplicates || []);
        setSaving(false);
        return;
      }
      if (!res.ok) throw new Error(data.error);
      setAddOpen(false);
      fetchLeads();
      showToast("Lead created.");
    } catch (e) { setAddError(e.message); }
    finally { setSaving(false); }
  }

  /* ════════ Delete lead ════════ */
  async function handleDelete() {
    if (!delTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/leads/${delTarget.id}`, { method: "DELETE" });
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error);
      setDelTarget(null);
      fetchLeads();
      showToast("Lead deleted.");
    } catch (e) { showToast("Delete failed: " + e.message); }
    finally { setDeleting(false); }
  }

  /* ════════ Quick status change (list table) ════════ */
  async function handleQuickStatus(leadId, slug) {
    // Optimistic update
    setLeads((prev) => prev.map((l) => l.id === leadId
      ? { ...l, status_slug: slug, status_label: statuses.find((s) => s.slug === slug)?.label, status_color: statuses.find((s) => s.slug === slug)?.color }
      : l
    ));
    try {
      await fetch(`/api/leads/${leadId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_slug: slug }),
      });
      fetchLeads();
    } catch { fetchLeads(); }
  }

  /* ════════ Kanban drag-and-drop ════════ */
  function onDragStart(lead, sourceSlug) {
    dragLead.current   = lead;
    dragSource.current = sourceSlug;
  }

  async function onDrop(targetSlug) {
    const lead = dragLead.current;
    if (!lead || lead.status_slug === targetSlug) return;
    // Optimistic update
    setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, status_slug: targetSlug } : l));
    try {
      await fetch(`/api/leads/${lead.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_slug: targetSlug }),
      });
      fetchLeads();
    } catch { fetchLeads(); } // revert on failure
    dragLead.current   = null;
    dragSource.current = null;
  }

  /* ════════ Webhook token management ════════ */
  async function fetchTokens() {
    try {
      const res  = await fetch("/api/webhook-tokens");
      const data = await res.json();
      setTokens(data.tokens || []);
    } catch { /* silent */ }
  }

  async function handleCreateToken() {
    if (!newTokenLabel.trim()) { setWhError("Label is required."); return; }
    setWhSaving(true); setWhError(""); setNewTokenFull(null);
    try {
      const res  = await fetch("/api/webhook-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newTokenLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewTokenFull(data.token);
      setNewTokenLabel("");
      await fetchTokens();
      showToast("Token created — copy it now! It won't be shown again.");
    } catch (e) { setWhError(e.message); }
    finally { setWhSaving(false); }
  }

  async function handleRevokeToken(id, active) {
    await fetch(`/api/webhook-tokens/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    fetchTokens();
  }

  async function handleDeleteToken(id) {
    await fetch(`/api/webhook-tokens/${id}`, { method: "DELETE" });
    fetchTokens();
  }

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col gap-6 h-full">

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-6 right-6 z-[60] px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-400">leaderboard</span>
            Leads
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">Track and manage your sales pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Webhook button — show for all, token management only for admins */}
          <button
            onClick={() => { setWhOpen(true); if (isAdmin) fetchTokens(); setNewTokenFull(null); setWhError(""); }}
            className="px-4 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-zinc-600
                       text-zinc-400 hover:text-white text-sm font-semibold transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">webhook</span>
            Webhook
          </button>
          <button
            onClick={() => openAdd()}
            className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold
                       transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <span className="material-symbols-outlined text-base">add</span>
            New Lead
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 bg-[#161616] border border-[#252525] rounded-xl p-1 w-fit">
        {[
          { id: "list",   icon: "view_list",   label: "List" },
          { id: "kanban", icon: "view_kanban",  label: "Kanban" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
              ${tab === t.id
                ? "bg-orange-500/15 text-orange-400"
                : "text-zinc-500 hover:text-zinc-300"
              }`}
          >
            <span className="material-symbols-outlined text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════ LIST TAB ════════ */}
      {tab === "list" && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-lg pointer-events-none">search</span>
              <input
                type="text"
                placeholder="Search name, email, phone, company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600
                           focus:outline-none focus:border-orange-500/50 transition-all"
              />
            </div>
            {[
              { val: filterStatus,       set: setFilterStatus,       opts: statuses.map((s) => ({ v: s.slug, l: s.label })), placeholder: "All Stages" },
              { val: filterSource,       set: setFilterSource,       opts: SOURCES.map((s) => ({ v: s, l: s })),              placeholder: "All Sources" },
              { val: filterCriticality,  set: setFilterCriticality,  opts: CRITICALITIES.map((c) => ({ v: c, l: c })),        placeholder: "All Priorities" },
            ].map(({ val, set, opts, placeholder }, i) => (
              <select key={i} value={val} onChange={(e) => set(e.target.value)}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white
                           focus:outline-none focus:border-orange-500/50 transition-all min-w-[150px]">
                <option value="">{placeholder}</option>
                {opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            ))}
          </div>

          {/* Table */}
          <div className="bg-[#161616] border border-[#252525] rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-zinc-500">
                <Spinner /> <span className="text-sm">Loading leads…</span>
              </div>
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="material-symbols-outlined text-zinc-700 text-5xl">person_search</span>
                <p className="text-sm text-zinc-600">No leads found. Start by adding one.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#252525]">
                      <th className="text-left text-xs font-semibold text-zinc-500 px-5 py-3">Lead</th>
                      <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Stage</th>
                      <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Priority</th>
                      <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Source</th>
                      <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Assigned</th>
                      <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Created</th>
                      <th className="text-right text-xs font-semibold text-zinc-500 px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead, i) => (
                      <tr
                        key={lead.id}
                        className={`
                          transition-colors hover:bg-white/2 cursor-pointer
                          ${i < leads.length - 1 ? "border-b border-[#1e1e1e]" : ""}
                          ${lead.unattended ? "border-l-2 border-l-orange-500/70" : ""}
                        `}
                        onClick={() => setDrawerLeadId(lead.id)}
                      >
                        {/* Lead identity */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-white/10
                                            flex items-center justify-center text-orange-300 text-xs font-bold shrink-0">
                              {lead.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{lead.name}</span>
                                {lead.unattended && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                    Not Attended
                                  </span>
                                )}
                                {lead.has_followup && (() => {
                                  const overdue = lead.next_followup_at && new Date(lead.next_followup_at) < new Date();
                                  return (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5
                                      ${overdue ? "bg-red-500/15 text-red-400 border-red-500/25" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                                      <span className="material-symbols-outlined text-[10px]">{overdue ? "alarm" : "calendar_today"}</span>
                                      {overdue ? "Overdue" : "Follow-up"}
                                    </span>
                                  );
                                })()}
                                {lead.is_duplicate && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
                                    Duplicate
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                                {lead.email && <span>{lead.email}</span>}
                                {lead.email && lead.phone && <span className="text-zinc-700">·</span>}
                                {lead.phone && <span>{lead.phone}</span>}
                              </div>
                              {lead.company && <div className="text-[10px] text-zinc-600">{lead.company}</div>}
                            </div>
                          </div>
                        </td>

                        {/* Stage — inline select dropdown */}
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={lead.status_slug}
                            onChange={(e) => handleQuickStatus(lead.id, e.target.value)}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-transparent border cursor-pointer
                                       focus:outline-none appearance-none text-center"
                            style={{
                              backgroundColor: (lead.status_color || "#3b82f6") + "22",
                              color:           lead.status_color || "#3b82f6",
                              borderColor:     (lead.status_color || "#3b82f6") + "55",
                            }}
                          >
                            {statuses.map((s) => (
                              <option key={s.slug} value={s.slug} style={{ backgroundColor: "#1a1a1a", color: "#aaa" }}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Priority */}
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <CritBadge c={lead.criticality} />
                        </td>

                        {/* Source */}
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <SourceChip source={lead.source} />
                        </td>

                        {/* Assigned */}
                        <td className="px-4 py-3.5 text-zinc-500 text-xs">
                          {lead.assigned_to_name || <span className="text-zinc-700">—</span>}
                        </td>

                        {/* Created */}
                        <td className="px-4 py-3.5 text-zinc-600 text-xs">
                          {new Date(lead.created_at).toLocaleDateString([], { dateStyle: "short" })}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDrawerLeadId(lead.id)}
                              title="View detail"
                              className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all"
                            >
                              <span className="material-symbols-outlined text-base">open_in_new</span>
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => setDelTarget(lead)}
                                title="Delete lead"
                                className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/8 transition-all"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!loading && leads.length > 0 && (
            <p className="text-xs text-zinc-600">
              {leads.length} lead{leads.length !== 1 ? "s" : ""} ·{" "}
              {leads.filter((l) => l.unattended).length} unattended ·{" "}
              {leads.filter((l) => l.status_slug === "won").length} won
            </p>
          )}
        </>
      )}

      {/* ════════ KANBAN TAB ════════ */}
      {tab === "kanban" && (
        <div className="flex-1 overflow-x-auto pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-zinc-500">
              <Spinner /> <span className="text-sm">Loading pipeline…</span>
            </div>
          ) : (
            <div className="flex gap-4 h-full items-start" style={{ minWidth: `${statuses.length * 280}px` }}>
              {statuses.map((status) => {
                const colLeads = allLeads.filter((l) => l.status_slug === status.slug);
                return (
                  <div
                    key={status.slug}
                    className="flex flex-col gap-3 w-[268px] shrink-0"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(status.slug)}
                  >
                    {/* Column header */}
                    <div
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl border"
                      style={{
                        backgroundColor: status.color + "18",
                        borderColor:     status.color + "40",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-sm font-bold text-white">{status.label}</span>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: status.color + "30", color: status.color }}
                        >
                          {colLeads.length}
                        </span>
                      </div>
                      <button
                        onClick={() => openAdd(status.slug)}
                        title="Add lead to this stage"
                        className="size-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <span className="material-symbols-outlined text-base">add</span>
                      </button>
                    </div>

                    {/* Cards */}
                    <div className="flex flex-col gap-2 min-h-[80px]">
                      {colLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={() => onDragStart(lead, status.slug)}
                          onClick={() => setDrawerLeadId(lead.id)}
                          className={`
                            bg-[#161616] border rounded-xl p-3 cursor-grab active:cursor-grabbing
                            hover:border-white/20 transition-all group select-none
                            ${lead.unattended ? "border-l-[3px] border-[#252525]" : "border-[#252525]"}
                          `}
                          style={lead.unattended ? { borderLeftColor: status.color + "bb" } : {}}
                        >
                          {/* Card header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="size-6 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-white/10
                                              flex items-center justify-center text-orange-300 text-[10px] font-bold shrink-0">
                                {lead.name?.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-semibold text-white leading-tight truncate max-w-[140px]">
                                {lead.name}
                              </span>
                            </div>
                            <CritBadge c={lead.criticality} />
                          </div>

                          {lead.company && (
                            <div className="text-[11px] text-zinc-600 mb-1.5 truncate">{lead.company}</div>
                          )}

                          <div className="flex items-center justify-between mt-1">
                            <SourceChip source={lead.source} />
                            <div className="flex items-center gap-1">
                              {lead.unattended && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/25">
                                  Unattended
                                </span>
                              )}
                              {lead.has_followup && (() => {
                                const overdue = lead.next_followup_at && new Date(lead.next_followup_at) < new Date();
                                return (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5
                                    ${overdue ? "bg-red-500/15 text-red-400 border-red-500/25" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                                    <span className="material-symbols-outlined text-[10px]">{overdue ? "alarm" : "event"}</span>
                                    {overdue ? "Overdue" : "Follow-up"}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>

                          {lead.assigned_to_name && (
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-600">
                              <span className="material-symbols-outlined text-[11px]">person</span>
                              {lead.assigned_to_name}
                            </div>
                          )}
                        </div>
                      ))}

                      {colLeads.length === 0 && (
                        <div className="rounded-xl border border-dashed border-[#252525] h-20 flex items-center justify-center text-zinc-700 text-xs">
                          Drop here
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          Add Lead Modal
      ════════════════════════════════════════════════ */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141414] border border-[#252525] rounded-2xl shadow-2xl overflow-hidden">

            <div className="px-6 pt-6 pb-4 border-b border-[#252525] flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-400 text-xl">person_add</span>
                New Lead
              </h3>
              <button onClick={() => setAddOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
              {addError && (
                <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span> {addError}
                </div>
              )}

              {/* Duplicate warning */}
              {dupWarning.length > 0 && (
                <div className="px-4 py-3 rounded-xl bg-yellow-500/8 border border-yellow-500/25">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-yellow-400 text-base">warning</span>
                    <span className="text-yellow-400 text-sm font-bold">Probable duplicate{dupWarning.length > 1 ? "s" : ""} found</span>
                  </div>
                  {dupWarning.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 py-2 border-t border-yellow-500/15">
                      <div>
                        <div className="text-white text-sm font-medium">{d.name}</div>
                        <div className="text-xs text-zinc-500">{d.email} {d.phone && `· ${d.phone}`} · {d.reason}</div>
                      </div>
                      <button
                        onClick={() => { setDrawerLeadId(d.id); setAddOpen(false); }}
                        className="text-xs text-yellow-400 hover:text-yellow-300 underline underline-offset-2 shrink-0"
                      >
                        View
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleCreateLead(true)}
                      className="flex-1 py-2 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 hover:text-yellow-300 text-sm font-semibold transition-all"
                    >
                      Create Anyway
                    </button>
                    <button
                      onClick={() => setDupWarning([])}
                      className="flex-1 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-400 hover:text-white text-sm font-semibold transition-all"
                    >
                      Back to Edit
                    </button>
                  </div>
                </div>
              )}

              {dupWarning.length === 0 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label:"Name *", val:fName, set:setFName, ph:"Client name" },
                      { label:"Company", val:fCompany, set:setFCompany, ph:"Company name" },
                    ].map(({ label, val, set, ph }) => (
                      <div key={label} className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-zinc-400">{label}</label>
                        <input
                          value={val} onChange={(e) => { set(e.target.value); scheduleDupCheck(); }}
                          placeholder={ph}
                          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600
                                     focus:outline-none focus:border-orange-500/50 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label:"Email", val:fEmail, set:setFEmail, ph:"email@domain.com" },
                      { label:"Phone", val:fPhone, set:setFPhone, ph:"+91 xxxx" },
                    ].map(({ label, val, set, ph }) => (
                      <div key={label} className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-zinc-400">{label}</label>
                        <input
                          value={val} onChange={(e) => { set(e.target.value); scheduleDupCheck(); }}
                          placeholder={ph}
                          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600
                                     focus:outline-none focus:border-orange-500/50 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-zinc-400">Source</label>
                      <select value={fSource} onChange={(e) => setFSource(e.target.value)}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all">
                        {SOURCES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-zinc-400">Priority</label>
                      <select value={fCrit} onChange={(e) => setFCrit(e.target.value)}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all">
                        {CRITICALITIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-400">Notes</label>
                    <textarea value={fNotes} onChange={(e) => setFNotes(e.target.value)} rows={2} placeholder="Any initial notes…"
                      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600
                                 focus:outline-none focus:border-orange-500/50 transition-all resize-none" />
                  </div>

                  {dupChecking && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Spinner sm /> Checking for duplicates…
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setAddOpen(false)}
                      className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-zinc-400 hover:text-white text-sm font-semibold transition-all">
                      Cancel
                    </button>
                    <button onClick={() => handleCreateLead(false)} disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                      {saving ? <Spinner /> : <span className="material-symbols-outlined text-base">add</span>}
                      {saving ? "Creating…" : "Create Lead"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          Delete Confirm Modal
      ════════════════════════════════════════════════ */}
      {delTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#141414] border border-[#252525] rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-red-400 text-2xl">delete</span>
              <h3 className="text-base font-bold text-white">Delete Lead</h3>
            </div>
            <p className="text-sm text-zinc-400">
              Delete <span className="text-white font-semibold">{delTarget.name}</span>? This removes all their activity history.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDelTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-400 hover:text-white text-sm font-semibold transition-all">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                {deleting ? <Spinner /> : <span className="material-symbols-outlined text-base">delete</span>}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          Webhook Settings Modal
      ════════════════════════════════════════════════ */}
      {whOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#141414] border border-[#252525] rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-[#252525] flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-xl">webhook</span>
                Webhook Settings
              </h3>
              <button onClick={() => { setWhOpen(false); setNewTokenFull(null); }} className="text-zinc-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              {/* Endpoint info */}
              <div className="rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-3">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Endpoint</p>
                <code className="text-xs text-cyan-400 break-all">
                  {typeof window !== "undefined" ? window.location.origin : ""}/api/leads/webhook?token=YOUR_TOKEN
                </code>
                <p className="text-[10px] text-zinc-600 mt-2">POST JSON body with: name, email, phone, company, notes</p>
              </div>

              {/* New token shown once */}
              {newTokenFull && (
                <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/25 p-4">
                  <p className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">key</span>
                    Copy this token now — it will not be shown again
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-white bg-black/40 rounded-lg px-3 py-2 break-all select-all">
                      {newTokenFull}
                    </code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(newTokenFull); showToast("Token copied!"); }}
                      className="size-8 rounded-lg bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 flex items-center justify-center shrink-0"
                    >
                      <span className="material-symbols-outlined text-base">content_copy</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Create token — admin only */}
              {isAdmin && (
                <>
                  {newTokenFull && (
                    <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/25 p-4">
                      <p className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">key</span>
                        Copy this token now — it will not be shown again
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs text-white bg-black/40 rounded-lg px-3 py-2 break-all select-all">
                          {newTokenFull}
                        </code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(newTokenFull); showToast("Token copied!"); }}
                          className="size-8 rounded-lg bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 flex items-center justify-center shrink-0"
                        >
                          <span className="material-symbols-outlined text-base">content_copy</span>
                        </button>
                      </div>
                    </div>
                  )}
                  {whError && (
                    <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{whError}</div>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={newTokenLabel}
                      onChange={(e) => setNewTokenLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateToken()}
                      placeholder="Token label (e.g. Website Form)"
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600
                                 focus:outline-none focus:border-cyan-500/50 transition-all"
                    />
                    <button onClick={handleCreateToken} disabled={whSaving}
                      className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold disabled:opacity-40 transition-all flex items-center gap-2">
                      {whSaving ? <Spinner /> : <span className="material-symbols-outlined text-base">add</span>}
                      Generate
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto">
                    {tokens.length === 0 && <p className="text-sm text-zinc-600 text-center py-4">No tokens yet. Generate one above.</p>}
                    {tokens.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#252525]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{t.label}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${t.active ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-zinc-700/50 text-zinc-500 border border-zinc-600/30"}`}>
                              {t.active ? "Active" : "Revoked"}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-600 mt-0.5">
                            {t.token_preview} · {t.created_by_name} · {new Date(t.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleRevokeToken(t.id, t.active)} title={t.active ? "Revoke" : "Re-activate"}
                            className="size-7 rounded flex items-center justify-center text-zinc-500 hover:text-orange-400 hover:bg-orange-500/10 transition-all">
                            <span className="material-symbols-outlined text-sm">{t.active ? "lock" : "lock_open"}</span>
                          </button>
                          <button onClick={() => handleDeleteToken(t.id)} title="Delete token"
                            className="size-7 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          Lead Detail Drawer
      ════════════════════════════════════════════════ */}
      {drawerLeadId && (
        <LeadDetailDrawer
          leadId={drawerLeadId}
          statuses={statuses}
          onClose={() => setDrawerLeadId(null)}
          onUpdate={() => fetchLeads()}
        />
      )}
    </div>
  );
}
