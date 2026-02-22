/* ─────────────────────────────────────────────────────────────────────────────
   app/components/ProjectTimelinePanel.js
   Multi-mode panel used for: timeline | timelog | files | bugs
   mode prop controls which API + UI to render.
───────────────────────────────────────────────────────────────────────────── */
"use client";
import { useState, useEffect, useRef } from "react";

/* ── Timeline (dev updates) ── */
function TimelineMode({ projectId }) {
  const [entries, setEntries] = useState([]);
  const [text, setText]       = useState("");
  const [type, setType]       = useState("update");
  const [saving, setSaving]   = useState(false);

  async function load() {
    const r = await fetch(`/api/projects/${projectId}/timeline`);
    const d = await r.json();
    setEntries(d.entries || []);
  }
  useEffect(() => { load(); }, [projectId]);

  async function post() {
    if (!text.trim()) return;
    setSaving(true);
    await fetch(`/api/projects/${projectId}/timeline`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ content: text, entry_type: type })
    });
    setText(""); await load(); setSaving(false);
  }

  const TYPE_STYLE = {
    update:   "text-blue-400",
    blocker:  "text-red-400",
    revision: "text-amber-400",
    milestone:"text-emerald-400",
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {["update","blocker","revision","milestone"].map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold capitalize border transition-all
                ${type===t ? "bg-orange-500/15 border-orange-500/30 text-orange-400" : "bg-[#1a1a1a] border-[#2a2a2a] text-zinc-500 hover:text-white"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea value={text} onChange={(e)=>setText(e.target.value)} rows={2} placeholder="Post an update, blocker, or milestone…"
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all resize-none" />
          <button onClick={post} disabled={!text.trim()||saving}
            className="px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-40 transition-all self-end py-2.5">
            Post
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {entries.length === 0 && <p className="text-xs text-zinc-700 text-center py-6">No timeline entries yet.</p>}
        {entries.map((e) => (
          <div key={e.id} className="bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${TYPE_STYLE[e.entry_type] || "text-zinc-400"}`}>{e.entry_type}</span>
              <span className="text-[10px] text-zinc-600">·</span>
              <span className="text-[10px] text-zinc-600">{e.author_name}</span>
              <span className="text-[10px] text-zinc-700 ml-auto">{new Date(e.created_at).toLocaleString([], { dateStyle:"medium", timeStyle:"short" })}</span>
            </div>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{e.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Time Log mode ── */
function TimeLogMode({ projectId }) {
  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [date, setDate]       = useState(new Date().toISOString().slice(0,10));
  const [hours, setHours]     = useState("");
  const [desc, setDesc]       = useState("");
  const [saving, setSaving]   = useState(false);

  async function load() {
    const r = await fetch(`/api/projects/${projectId}/time-logs`);
    const d = await r.json();
    setLogs(d.logs || []); setTotal(d.total_hours || 0);
  }
  useEffect(() => { load(); }, [projectId]);

  async function add() {
    if (!hours) return;
    setSaving(true);
    await fetch(`/api/projects/${projectId}/time-logs`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ date, hours, description: desc || undefined })
    });
    setHours(""); setDesc(""); await load(); setSaving(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4 flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <input type="date" value={date} onChange={(e)=>setDate(e.target.value)}
            className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-zinc-400 focus:outline-none" />
          <input type="number" value={hours} onChange={(e)=>setHours(e.target.value)} min="0.25" step="0.25" placeholder="Hours"
            className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none" />
          <input value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Description"
            className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none" />
        </div>
        <button onClick={add} disabled={!hours||saving}
          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-40 transition-all self-end">
          Log Hours
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Total logged:</span>
        <span className="text-sm font-bold text-white">{Number(total).toFixed(1)}h</span>
      </div>
      <div className="flex flex-col gap-2">
        {logs.map((l) => (
          <div key={l.id} className="flex items-center gap-4 bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3 text-sm">
            <span className="text-zinc-500 text-xs shrink-0">{new Date(l.date).toLocaleDateString()}</span>
            <span className="text-orange-400 font-bold shrink-0">{l.hours}h</span>
            <span className="text-zinc-400 truncate">{l.description || "—"}</span>
            <span className="text-zinc-700 text-xs ml-auto shrink-0">{l.user_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Files mode ── */
function FilesMode({ projectId, userId, isAdmin }) {
  const [files, setFiles]     = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  async function load() {
    const r = await fetch(`/api/projects/${projectId}/files`);
    const d = await r.json();
    setFiles(d.files || []);
  }
  useEffect(() => { load(); }, [projectId]);

  async function upload(file) {
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    await fetch(`/api/projects/${projectId}/files`, { method:"POST", body:fd });
    await load(); setUploading(false);
  }

  async function del(fid) {
    await fetch(`/api/projects/${projectId}/files/${fid}`, { method:"DELETE" });
    await load();
  }

  function fmtSize(b) { return b<1024?`${b}B`:b<1048576?`${(b/1024).toFixed(1)}KB`:`${(b/1048576).toFixed(1)}MB`; }

  return (
    <div className="flex flex-col gap-3">
      <div onDragOver={(e)=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
        onDrop={(e)=>{e.preventDefault();setDragOver(false);[...e.dataTransfer.files].forEach(upload);}}
        onClick={()=>inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center py-6 gap-2 transition-all
          ${dragOver?"border-orange-500/60 bg-orange-500/5":"border-[#2a2a2a] hover:border-[#444]"}`}>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e)=>[...e.target.files].forEach(upload)} />
        {uploading ? <p className="text-sm text-zinc-500">Uploading…</p> : <>
          <span className="material-symbols-outlined text-zinc-600 text-3xl">upload_file</span>
          <p className="text-xs text-zinc-500">Drag & drop or click to upload</p>
        </>}
      </div>
      <div className="flex flex-col gap-2">
        {files.map((f) => (
          <div key={f.id} className="flex items-center gap-3 bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3 group">
            <span className="material-symbols-outlined text-zinc-500 text-xl">attach_file</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{f.filename}</div>
              <div className="text-[10px] text-zinc-600">{fmtSize(f.file_size)} · {f.uploaded_by_name}</div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <a href={`/uploads/projects/${projectId}/${f.stored_name}`} download={f.filename}
                className="size-7 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
                <span className="material-symbols-outlined text-sm">download</span>
              </a>
              {(f.uploaded_by === userId || isAdmin) && (
                <button onClick={()=>del(f.id)} className="size-7 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Bugs mode ── */
function BugsMode({ projectId }) {
  const [bugs, setBugs]       = useState([]);
  const [showResolved, setShowResolved] = useState(false);
  const [title, setTitle]     = useState("");
  const [desc, setDesc]       = useState("");
  const [priority, setPriority] = useState("Normal");
  const [saving, setSaving]   = useState(false);

  async function load() {
    const r = await fetch(`/api/projects/${projectId}/bugs`);
    const d = await r.json();
    setBugs(d.bugs || []);
  }
  useEffect(() => { load(); }, [projectId]);

  async function add() {
    if (!title.trim()) return;
    setSaving(true);
    await fetch(`/api/projects/${projectId}/bugs`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ title, description: desc||undefined, priority })
    });
    setTitle(""); setDesc(""); await load(); setSaving(false);
  }

  async function resolve(bid) {
    await fetch(`/api/projects/${projectId}/bugs/${bid}`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ status:"resolved", priority:"Normal", title:"" })
    });
    await load();
  }

  async function reopen(bid) {
    await fetch(`/api/projects/${projectId}/bugs/${bid}`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ status:"open", priority:"Normal", title:"" })
    });
    await load();
  }

  const PSTYLE = {
    Urgent:"text-red-400 border-red-500/25 bg-red-500/10",
    High:  "text-orange-400 border-orange-500/25 bg-orange-500/10",
    Normal:"text-zinc-400 border-zinc-600/30 bg-zinc-700/20",
    Low:   "text-zinc-600 border-zinc-700/20 bg-zinc-800/20"
  };

  const open     = bugs.filter((b) => b.status !== "resolved");
  const resolved = bugs.filter((b) => b.status === "resolved");
  const shown    = showResolved ? bugs : open;

  return (
    <div className="flex flex-col gap-4">
      {/* Report form */}
      <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4 flex flex-col gap-2">
        <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Bug title *"
          className="bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none" />
        <div className="flex gap-2">
          <input value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Description"
            className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none" />
          <select value={priority} onChange={(e)=>setPriority(e.target.value)}
            className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            {["Urgent","High","Normal","Low"].map((p)=><option key={p}>{p}</option>)}
          </select>
          <button onClick={add} disabled={!title.trim()||saving}
            className="px-4 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-bold disabled:opacity-40 transition-all">
            Report
          </button>
        </div>
      </div>

      {/* Header with resolved toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-white">{open.length} open</span>
        {resolved.length > 0 && (
          <button onClick={() => setShowResolved((v) => !v)}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors ml-auto flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">{showResolved ? "visibility_off" : "visibility"}</span>
            {showResolved ? "Hide" : "Show"} {resolved.length} resolved
          </button>
        )}
      </div>

      {/* Bug list */}
      <div className="flex flex-col gap-2">
        {shown.length === 0 && (
          <p className="text-xs text-zinc-700 text-center py-6">No bugs. Keep it up!</p>
        )}
        {shown.map((b) => (
          <div key={b.id} className={`flex flex-col gap-2 bg-[#1a1a1a] border rounded-xl px-4 py-3 group
            ${b.status === "resolved" ? "border-emerald-500/15 opacity-60" : "border-[#252525]"}`}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${PSTYLE[b.priority]||PSTYLE.Normal}`}>{b.priority}</span>
                  {b.status === "resolved" && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">resolved</span>
                  )}
                  <span className={`text-sm font-medium text-white truncate ${b.status==="resolved"?"line-through opacity-60":""}`}>{b.title}</span>
                </div>
                {b.description && <p className="text-xs text-zinc-500">{b.description}</p>}
                <div className="text-[10px] text-zinc-700 mt-1">{b.reported_by_name} · {new Date(b.created_at).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {b.status !== "resolved" ? (
                  <button onClick={() => resolve(b.id)} title="Mark resolved"
                    className="size-7 rounded flex items-center justify-center text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                  </button>
                ) : (
                  <button onClick={() => reopen(b.id)} title="Reopen"
                    className="size-7 rounded flex items-center justify-center text-zinc-600 hover:text-orange-400 hover:bg-orange-500/10 transition-all">
                    <span className="material-symbols-outlined text-sm">restart_alt</span>
                  </button>
                )}
              </div>
            </div>
            {/* Attachments */}
            {b.attachment_urls?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#222]">
                {b.attachment_urls.map((url, i) => {
                  const ext = url.split(".").pop().toLowerCase();
                  const isImg = ["png","jpg","jpeg","gif","webp"].includes(ext);
                  return isImg ? (
                    <a key={i} href={url} target="_blank" rel="noreferrer"
                      className="block w-14 h-14 rounded-lg overflow-hidden border border-zinc-700/40 hover:border-orange-500/40 transition-all shrink-0">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ) : (
                    <a key={i} href={url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-orange-400 bg-zinc-800/40 border border-zinc-700/30 rounded-lg px-2 py-1 transition-all">
                      <span className="material-symbols-outlined text-sm">attach_file</span>
                      {url.split("/").pop()}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Router ── */
export default function ProjectTimelinePanel({ projectId, user, mode = "timeline" }) {
  if (mode === "timelog")  return <TimeLogMode projectId={projectId} />;
  if (mode === "files")    return <FilesMode   projectId={projectId} userId={user?.id} isAdmin={user?.role==="ADMIN"} />;
  if (mode === "bugs")     return <BugsMode    projectId={projectId} />;
  return <TimelineMode projectId={projectId} />;
}
