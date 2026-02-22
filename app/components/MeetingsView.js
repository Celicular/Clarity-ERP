/* ─────────────────────────────────────────────────────────────────────────────
   app/components/MeetingsView.js
   Meeting Management — dual view:
   • Admin: create meetings, pick attendees, view all, conclude + mark attendance
   • Employee: see own meetings, add remarks
───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Field helpers — defined outside to prevent remount on re-render ── */
function MInput({ label, value, onChange, type = "text", placeholder = "", required = false }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-400">
        {label} {required && <span className="text-orange-400">*</span>}
      </label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white
                   placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50
                   focus:ring-1 focus:ring-blue-500/20 transition-all"
      />
    </div>
  );
}

function MSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white
                   focus:outline-none focus:border-blue-500/50 transition-all"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function MTextarea({ label, value, onChange, placeholder = "", rows = 3 }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white
                   placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50
                   focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    in_progress:"bg-blue-500/10 text-blue-400 border-blue-500/20",
    completed:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  return (
    <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${map[status] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>
      {status}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────────────────── */
export default function MeetingsView({ user }) {
  const isAdmin = user.role === "ADMIN";

  const [meetings, setMeetings]     = useState([]);
  const [allUsers, setAllUsers]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState("");
  const [modal, setModal]           = useState(null); // "create" | "conclude" | "remark"
  const [selected, setSelected]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [modalError, setModalError] = useState("");

  /* ── Create form fields ── */
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMin, setDurationMin] = useState("60");
  const [platform, setPlatform]       = useState("GMeet");
  const [meetingLink, setMeetingLink] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState([]);

  /* ── Remark + conclude ── */
  const [remarkText, setRemarkText] = useState("");
  const [attendedIds, setAttendedIds] = useState([]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  /* ── Fetch meetings ── */
  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/meetings");
      const data = await res.json();
      setMeetings(data.meetings || []);
    } finally { setLoading(false); }
  }, []);

  /* ── Fetch user list for attendee picker (admin only) ── */
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    const res  = await fetch("/api/users?status=Active");
    const data = await res.json();
    // Exclude self from attendee list
    setAllUsers((data.users || []).filter((u) => u.id !== user.id));
  }, [isAdmin, user.id]);

  useEffect(() => { fetchMeetings(); fetchUsers(); }, [fetchMeetings, fetchUsers]);

  /* ── Modal helpers ── */
  function openCreate() {
    setTitle(""); setDescription(""); setScheduledAt(""); setDurationMin("60");
    setPlatform("GMeet"); setMeetingLink(""); setSelectedAttendees([]); setModalError("");
    setModal("create");
  }

  function openConclude(m) {
    setSelected(m);
    // Pre-check attendees who were already marked
    setAttendedIds(Array.isArray(m.attendees) ? m.attendees.filter((a) => a.attended).map((a) => a.user_id) : []);
    setModalError("");
    setModal("conclude");
  }

  function openRemark(m) { setSelected(m); setRemarkText(""); setModalError(""); setModal("remark"); }

  function closeModal() { setModal(null); setSelected(null); setSaving(false); setModalError(""); }

  function toggleAttendee(id) {
    setSelectedAttendees((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleAttended(id) {
    setAttendedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  /* ── Create meeting ── */
  async function handleCreate() {
    if (!title || !scheduledAt) { setModalError("Title and schedule time are required."); return; }
    setSaving(true); setModalError("");
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, scheduled_at: scheduledAt,
          duration_min: +durationMin, platform, meeting_link: meetingLink,
          attendee_ids: selectedAttendees,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      closeModal(); fetchMeetings(); showToast("Meeting created.");
    } catch (e) { setModalError(e.message); }
    finally { setSaving(false); }
  }

  /* ── Conclude meeting ── */
  async function handleConclude() {
    setSaving(true); setModalError("");
    try {
      const res = await fetch(`/api/meetings/${selected.id}/conclude`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attended_ids: attendedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      closeModal(); fetchMeetings(); showToast("Meeting concluded.");
    } catch (e) { setModalError(e.message); }
    finally { setSaving(false); }
  }

  /* ── Add remark ── */
  async function handleRemark() {
    if (!remarkText) { setModalError("Remark text is required."); return; }
    setSaving(true); setModalError("");
    try {
      const res = await fetch(`/api/meetings/${selected.id}/remark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark: remarkText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      closeModal(); fetchMeetings(); showToast("Remark added.");
    } catch (e) { setModalError(e.message); }
    finally { setSaving(false); }
  }

  /* ── Platform badge color ── */
  function platformClass(p) {
    if (p === "GMeet")  return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (p === "Teams")  return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    if (p === "Zoom")   return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  }

  /* ─────────────────────────────── Render ─────────────────────────────── */
  return (
    <div className="flex flex-col gap-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>{toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400">groups</span>
            Meetings
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {isAdmin ? "Schedule and manage company meetings." : "Your upcoming and past meetings."}
          </p>
        </div>
        {isAdmin && (
          <button onClick={openCreate}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold
                       transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20">
            <span className="material-symbols-outlined text-base">add</span> New Meeting
          </button>
        )}
      </div>

      {/* Meeting cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-zinc-500">
          <Spinner /><span className="text-sm">Loading…</span>
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-[#161616] border border-[#252525] rounded-2xl flex flex-col items-center justify-center py-16 gap-2">
          <span className="material-symbols-outlined text-zinc-700 text-4xl">groups</span>
          <p className="text-sm text-zinc-600">
            {isAdmin ? "No meetings scheduled yet." : "No meetings assigned to you yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {meetings.map((m) => (
            <div key={m.id}
              className="bg-[#161616] border border-[#252525] rounded-2xl p-5 hover:border-[#333] transition-all">
              <div className="flex items-start justify-between gap-4">

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-bold text-white">{m.title}</h3>
                    <StatusBadge status={m.status} />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${platformClass(m.platform)}`}>
                      {m.platform}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500">
                    {new Date(m.scheduled_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    {" · "}{m.duration_min} min
                    {isAdmin && <span className="ml-2 text-zinc-600">· by {m.creator_name}</span>}
                  </p>

                  {m.description && (
                    <p className="text-xs text-zinc-500 mt-1.5">{m.description}</p>
                  )}

                  {/* Attendee chips (admin view) */}
                  {isAdmin && Array.isArray(m.attendees) && m.attendees.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                      <span className="text-[10px] text-zinc-600">Attendees:</span>
                      {m.attendees.map((a) => (
                        <span key={a.user_id}
                          className={`text-[10px] px-2 py-0.5 rounded border ${a.attended
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"}`}>
                          {a.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Meeting link */}
                  {m.meeting_link && (
                    <a href={m.meeting_link} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      <span className="material-symbols-outlined text-sm">link</span> Join Meeting
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isAdmin && m.status !== "completed" && (
                    <button onClick={() => openConclude(m)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20
                                 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20
                                 transition-all flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">check_circle</span> Conclude
                    </button>
                  )}
                  <button onClick={() => openRemark(m)} title="Add remark"
                    className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all">
                    <span className="material-symbols-outlined text-base">comment</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════
          MODALS
      ══════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141414] border border-[#252525] rounded-2xl shadow-2xl overflow-hidden">

            {/* ── Create Modal ── */}
            {modal === "create" && (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-[#252525] flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400 text-xl">groups</span>
                    Schedule Meeting
                  </h3>
                  <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>

                <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
                  {modalError && (
                    <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">error</span>{modalError}
                    </div>
                  )}
                  <MInput label="Meeting Title" value={title} onChange={setTitle} required placeholder="e.g. Weekly Standup" />
                  <MTextarea label="Description / Agenda" value={description} onChange={setDescription} placeholder="What will be discussed…" rows={2} />
                  <div className="grid grid-cols-2 gap-4">
                    <MInput label="Date & Time" type="datetime-local" value={scheduledAt} onChange={setScheduledAt} required />
                    <MInput label="Duration (min)" type="number" value={durationMin} onChange={setDurationMin} placeholder="60" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <MSelect label="Platform" value={platform} onChange={setPlatform} options={[
                      { value: "GMeet", label: "Google Meet" },
                      { value: "Teams", label: "Microsoft Teams" },
                      { value: "Zoom",  label: "Zoom" },
                      { value: "Other", label: "Other" },
                    ]} />
                    <MInput label="Meeting Link" value={meetingLink} onChange={setMeetingLink} placeholder="https://meet.google.com/…" />
                  </div>

                  {/* Attendee picker */}
                  {allUsers.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-zinc-400 mb-2">Attendees</p>
                      <div className="max-h-36 overflow-y-auto flex flex-col gap-1.5 bg-[#111] rounded-lg p-3 border border-[#2a2a2a]">
                        {allUsers.map((u) => (
                          <label key={u.id} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={selectedAttendees.includes(u.id)}
                              onChange={() => toggleAttendee(u.id)}
                              className="accent-blue-500 size-3.5"
                            />
                            <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">
                              {u.name} <span className="text-zinc-600">({u.email})</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button onClick={closeModal}
                      className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-zinc-400 text-sm font-semibold transition-all">
                      Cancel
                    </button>
                    <button onClick={handleCreate} disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                      {saving ? <Spinner /> : <span className="material-symbols-outlined text-base">check</span>}
                      {saving ? "Creating…" : "Create Meeting"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Conclude Modal ── */}
            {modal === "conclude" && selected && (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-[#252525] flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-xl">check_circle</span>
                    Conclude Meeting
                  </h3>
                  <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
                <div className="px-6 py-5 flex flex-col gap-4">
                  {modalError && (
                    <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">error</span>{modalError}
                    </div>
                  )}
                  <p className="text-sm text-zinc-400">
                    Mark attendance for <span className="text-white font-medium">{selected.title}</span>:
                  </p>
                  {Array.isArray(selected.attendees) && selected.attendees.length > 0 ? (
                    <div className="flex flex-col gap-2 bg-[#111] rounded-lg p-3 border border-[#2a2a2a]">
                      {selected.attendees.map((a) => (
                        <label key={a.user_id} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={attendedIds.includes(a.user_id)}
                            onChange={() => toggleAttended(a.user_id)}
                            className="accent-emerald-500 size-3.5"
                          />
                          <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">
                            {a.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600">No attendees to mark.</p>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button onClick={closeModal}
                      className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-zinc-400 text-sm font-semibold transition-all">
                      Cancel
                    </button>
                    <button onClick={handleConclude} disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                      {saving ? <Spinner /> : <span className="material-symbols-outlined text-base">check_circle</span>}
                      {saving ? "Concluding…" : "Conclude Meeting"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Remark Modal ── */}
            {modal === "remark" && selected && (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-[#252525] flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400 text-xl">comment</span>
                    Add Remark
                  </h3>
                  <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
                <div className="px-6 py-5 flex flex-col gap-4">
                  {modalError && (
                    <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">error</span>{modalError}
                    </div>
                  )}
                  <p className="text-sm text-zinc-400">
                    Remark for: <span className="text-white font-medium">{selected.title}</span>
                  </p>
                  <MTextarea
                    label="Remark / Feedback"
                    value={remarkText}
                    onChange={setRemarkText}
                    placeholder="Share your feedback or notes about this meeting…"
                    rows={4}
                  />
                  <div className="flex gap-3 pt-2">
                    <button onClick={closeModal}
                      className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-zinc-400 text-sm font-semibold transition-all">
                      Cancel
                    </button>
                    <button onClick={handleRemark} disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                      {saving ? <Spinner /> : <span className="material-symbols-outlined text-base">send</span>}
                      {saving ? "Sending…" : "Add Remark"}
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
