/* ─────────────────────────────────────────────────────────────────────────────
   app/components/NotesView.js
   Notes — universal (Admin + Employee)
   • Chat-message style feed, newest at top
   • Compose bar at the bottom (topic + description + status + elevate-to)
   • Notes elevated to YOU are visually highlighted
   • Status chip: pending / in_progress / complete
   • Owner or admin can delete; any user can cycle status
───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ── Tiny helpers ── */
function Spinner() {
  return (
    <svg className="animate-spin size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

const STATUS_CONFIG = {
  pending:     { label: "Pending",     cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25" },
  in_progress: { label: "In Progress", cls: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  complete:    { label: "Complete",    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
};
const STATUS_CYCLE = { pending: "in_progress", in_progress: "complete", complete: "pending" };

function StatusChip({ status, onClick, interactive }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <button
      onClick={onClick}
      title={interactive ? "Click to change status" : undefined}
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border
                  transition-all ${cfg.cls} ${interactive ? "cursor-pointer hover:opacity-80 active:scale-95" : "cursor-default"}`}
    >
      {cfg.label}
    </button>
  );
}

function Avatar({ name, size = "sm" }) {
  const initials = name?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const colors   = ["bg-blue-600","bg-purple-600","bg-pink-600","bg-orange-600","bg-teal-600","bg-rose-600"];
  const color    = colors[initials.charCodeAt(0) % colors.length];
  const sz       = size === "sm" ? "size-8 text-xs" : "size-6 text-[10px]";
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold text-white shrink-0`}>
      {initials}
    </div>
  );
}

/* ── Note card (chat bubble style) ── */
function NoteCard({ note, currentUser, onStatusChange, onDelete }) {
  const isMine    = note.created_by === currentUser.id;
  const isAdmin   = currentUser.role === "ADMIN";
  const isElevatedToMe = note.elevated_to === currentUser.id;
  const canDelete = isMine || isAdmin;

  const time = new Date(note.created_at).toLocaleString([], {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className={`flex gap-3 group ${isMine ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar name={note.created_by_name} />

      <div className={`max-w-[72%] flex flex-col gap-1.5 ${isMine ? "items-end" : "items-start"}`}>
        {/* Sender + time */}
        <div className={`flex items-center gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
          <span className="text-xs font-semibold text-zinc-300">{isMine ? "You" : note.created_by_name}</span>
          <span className="text-[10px] text-zinc-600">{time}</span>
          {note.elevated_to_name && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25 flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px]">arrow_upward</span>
              {note.elevated_to === currentUser.id ? "↑ You" : `↑ ${note.elevated_to_name}`}
            </span>
          )}
        </div>

        {/* Bubble */}
        <div className={`relative rounded-2xl px-4 py-3 text-sm transition-all
          ${isMine
            ? "bg-blue-600/20 border border-blue-500/25 rounded-tr-sm"
            : "bg-[#1e1e1e] border border-[#2a2a2a] rounded-tl-sm"}
          ${isElevatedToMe
            ? "ring-2 ring-orange-400/50 shadow-lg shadow-orange-500/10 bg-orange-500/8 border-orange-500/30"
            : ""}
        `}>
          {/* Highlight banner */}
          {isElevatedToMe && (
            <div className="flex items-center gap-1 mb-2 text-[10px] text-orange-400 font-bold">
              <span className="material-symbols-outlined text-sm">priority_high</span>
              Elevated to you
            </div>
          )}

          {/* Topic */}
          <p className="font-semibold text-white mb-1 text-[13px]">{note.topic}</p>

          {/* Description */}
          <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-wrap">{note.description}</p>
        </div>

        {/* Status + actions */}
        <div className={`flex items-center gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
          <StatusChip status={note.status} interactive onClick={() => onStatusChange(note)} />
          {canDelete && (
            <button onClick={() => onDelete(note.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity size-6 flex items-center justify-center
                         rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10">
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────── Main ─────────────────────────────── */
export default function NotesView({ user }) {
  const [notes, setNotes]         = useState([]);
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState("");
  const [sending, setSending]     = useState(false);

  /* Compose state */
  const [topic, setTopic]         = useState("");
  const [desc, setDesc]           = useState("");
  const [status, setStatus]       = useState("pending");
  const [elevateTo, setElevateTo] = useState("");
  const [showCompose, setShowCompose] = useState(false);

  const feedRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/notes");
      const data = await res.json();
      setNotes(data.notes || []);
    } finally { setLoading(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    const res  = await fetch("/api/users");
    const data = await res.json();
    setUsers((data.users || []).filter((u) => u.id !== user.id));
  }, [user.id]);

  useEffect(() => { fetchNotes(); fetchUsers(); }, [fetchNotes, fetchUsers]);

  async function handleSend() {
    if (!topic.trim() || !desc.trim()) { showToast("Topic and description are required."); return; }
    setSending(true);
    try {
      const res  = await fetch("/api/notes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), description: desc.trim(), status, elevated_to: elevateTo || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTopic(""); setDesc(""); setStatus("pending"); setElevateTo(""); setShowCompose(false);
      fetchNotes(); showToast("Note posted.");
    } catch (e) { showToast(e.message); }
    finally { setSending(false); }
  }

  async function handleStatusChange(note) {
    const next = STATUS_CYCLE[note.status] || "pending";
    try {
      const res  = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, status: next } : n));
    } catch (e) { showToast(e.message); }
  }

  async function handleDelete(id) {
    try {
      const res  = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setNotes((prev) => prev.filter((n) => n.id !== id));
      showToast("Note deleted.");
    } catch (e) { showToast(e.message); }
  }

  const elevatedCount = notes.filter((n) => n.elevated_to === user.id).length;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-0">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm font-semibold shadow-2xl flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-blue-400">info</span>{toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400">sticky_note_2</span>
            Notes
            {elevatedCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">
                {elevatedCount} elevated to you
              </span>
            )}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">Shared workspace notes — click a status badge to cycle it.</p>
        </div>
        <button onClick={() => setShowCompose((v) => !v)}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg
            ${showCompose
              ? "bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-400 hover:text-white"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"}`}>
          <span className="material-symbols-outlined text-base">{showCompose ? "close" : "edit_note"}</span>
          {showCompose ? "Cancel" : "New Note"}
        </button>
      </div>

      {/* Compose panel */}
      {showCompose && (
        <div className="bg-[#161616] border border-[#252525] rounded-2xl p-5 mb-4 shrink-0">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-3">
              {/* Topic */}
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">Topic <span className="text-orange-400">*</span></label>
                <input value={topic} onChange={(e) => setTopic(e.target.value)}
                  placeholder="What's this note about?"
                  className="bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-700
                             focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all" />
              </div>
              {/* Status */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                  className="bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white
                             focus:outline-none focus:border-blue-500/50 transition-all">
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-500">Description <span className="text-orange-400">*</span></label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
                placeholder="Add details, context, or instructions…" rows={3}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend(); }}
                className="bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-700
                           focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none" />
            </div>

            <div className="flex items-center gap-3">
              {/* Elevate to */}
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-orange-400">arrow_upward</span>
                  Elevate to (optional)
                </label>
                <select value={elevateTo} onChange={(e) => setElevateTo(e.target.value)}
                  className="bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white
                             focus:outline-none focus:border-orange-500/50 transition-all">
                  <option value="">No one (broadcast)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              {/* Send */}
              <div className="flex items-end">
                <button onClick={handleSend} disabled={sending}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold
                             disabled:opacity-40 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 mt-5">
                  {sending ? <Spinner /> : <span className="material-symbols-outlined text-base">send</span>}
                  {sending ? "Posting…" : "Post Note"}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-zinc-600">Tip: Ctrl+Enter to post quickly.</p>
          </div>
        </div>
      )}

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-zinc-500"><Spinner /><span className="text-sm">Loading…</span></div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="material-symbols-outlined text-zinc-700 text-5xl">sticky_note_2</span>
            <p className="text-sm text-zinc-600">No notes yet. Be the first to post one!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5 pb-4">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                currentUser={user}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
