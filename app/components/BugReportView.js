/* ─────────────────────────────────────────────────────────────────────────────
   app/components/BugReportView.js
   All employees can submit bug reports with optional file attachments.
   Developers and admins see ALL reports with status controls + project assignment.
   Others see only their own submitted reports.
───────────────────────────────────────────────────────────────────────────── */
"use client";
import { useState, useEffect, useRef } from "react";

const PRIORITY_STYLE = {
  Urgent: "bg-red-500/15    text-red-400    border-red-500/25",
  High:   "bg-orange-500/15 text-orange-400 border-orange-500/25",
  Normal: "bg-zinc-700/30   text-zinc-400   border-zinc-600/30",
  Low:    "bg-zinc-800/30   text-zinc-500   border-zinc-700/20",
};
const STATUS_STYLE = {
  open:       "bg-red-500/15     text-red-400     border-red-500/20",
  in_progress:"bg-blue-500/15   text-blue-400    border-blue-500/20",
  resolved:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

/* ── File icon helper ── */
function FileIcon({ url }) {
  const ext = url.split(".").pop().toLowerCase();
  const isImage = ["png","jpg","jpeg","gif","webp"].includes(ext);
  return isImage ? (
    <a href={url} target="_blank" rel="noreferrer"
      className="block w-16 h-16 rounded-lg overflow-hidden border border-zinc-700/40 hover:border-orange-500/40 transition-all shrink-0">
      <img src={url} alt="" className="w-full h-full object-cover" />
    </a>
  ) : (
    <a href={url} target="_blank" rel="noreferrer"
      className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-orange-400 bg-zinc-800/40 border border-zinc-700/30 rounded-lg px-2.5 py-1.5 transition-all shrink-0">
      <span className="material-symbols-outlined text-sm">attach_file</span>
      {url.split("/").pop().slice(13)} {/* strip timestamp prefix */}
    </a>
  );
}

export default function BugReportView({ user }) {
  const [bugs, setBugs]         = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);

  /* Form state */
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [priority, setPriority] = useState("Normal");
  const [projectId, setProjectId] = useState("");
  const [attachments, setAttachments] = useState([]);  // array of uploaded URLs
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState(false);
  const fileRef = useRef(null);

  const isAdminOrDev = user.role === "ADMIN" || user.sub_role_dept === "Development";

  async function load() {
    setLoading(true);
    const [bugsRes, projRes] = await Promise.all([
      fetch("/api/bug-reports").then((r) => r.json()),
      isAdminOrDev ? fetch("/api/projects").then((r) => r.json()) : Promise.resolve({ projects: [] }),
    ]);
    setBugs(bugsRes.bugs || []);
    setProjects(projRes.projects || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  /* ── File upload ── */
  async function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/bug-reports/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.url) uploaded.push(d.url);
    }
    setAttachments((prev) => [...prev, ...uploaded]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  /* ── Submit report ── */
  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const r = await fetch("/api/bug-reports", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description:     desc   || undefined,
        priority,
        project_id:      projectId || null,
        attachment_urls: attachments,
      }),
    });
    if (r.ok) {
      setTitle(""); setDesc(""); setPriority("Normal"); setProjectId(""); setAttachments([]);
      setSuccess(true); setTimeout(() => setSuccess(false), 2500);
      await load();
    }
    setSaving(false);
  }

  async function updateStatus(bid, status) {
    await fetch(`/api/bug-reports/${bid}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function assignToProject(bid, pid) {
    await fetch(`/api/bug-reports/${bid}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_to_project: pid }),
    });
    await load();
  }

  async function deleteBug(bid) {
    await fetch(`/api/bug-reports/${bid}`, { method: "DELETE" });
    await load();
  }

  const open     = bugs.filter((b) => b.status !== "resolved");
  const resolved = bugs.filter((b) => b.status === "resolved");

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-red-400 text-2xl">bug_report</span>
          Bug Reports
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Spotted something broken? Report it here — our developers will take a look.
        </p>
      </div>

      {/* ═══ Submit form ═══ */}
      <div className="bg-[#161616] border border-[#252525] rounded-2xl p-5 flex flex-col gap-4">
        <h2 className="text-sm font-bold text-white">Report a Bug</h2>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Bug title — what went wrong? *"
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
            placeholder="Steps to reproduce, expected vs actual behaviour, screenshots, etc."
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all resize-none" />

          {/* Priority + project selector row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Priority */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Priority</label>
              <div className="flex gap-1">
                {["Urgent","High","Normal","Low"].map((p) => (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all
                      ${priority === p ? PRIORITY_STYLE[p] : "bg-transparent border-zinc-700/50 text-zinc-600 hover:text-zinc-400"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Project selector (optional) */}
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/50 transition-all min-w-[140px]">
                <option value="">No project (general)</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* File attachment */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/40 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all disabled:opacity-50">
                <span className="material-symbols-outlined text-sm">attach_file</span>
                {uploading ? "Uploading…" : "Attach files"}
              </button>
              <span className="text-[10px] text-zinc-600">PNG, JPG, PDF, ZIP supported</span>
              <input ref={fileRef} type="file" multiple accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.zip,.mp4"
                onChange={handleFileChange} className="hidden" />
            </div>
            {/* Preview uploaded attachments */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {attachments.map((url, i) => (
                  <div key={i} className="relative group">
                    <FileIcon url={url} />
                    <button onClick={() => setAttachments((a) => a.filter((_,j)=>j!==i))} type="button"
                      className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button type="submit" disabled={!title.trim() || saving || uploading}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all
              ${success
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                : "bg-red-500/80 hover:bg-red-500 text-white disabled:opacity-40"}`}>
            <span className="material-symbols-outlined text-base">{success ? "check" : "send"}</span>
            {saving ? "Sending…" : success ? "Reported!" : "Submit Report"}
          </button>
        </form>
      </div>

      {/* ═══ Bug list ═══ */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">Open Reports</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
            {open.length}
          </span>
        </div>
        {loading ? (
          <div className="text-zinc-600 text-sm text-center py-8">Loading…</div>
        ) : open.length === 0 ? (
          <div className="flex items-center gap-2 text-zinc-700 text-sm py-4">
            <span className="material-symbols-outlined text-base">check_circle</span> No open bugs — all clear!
          </div>
        ) : (
          open.map((bug) => (
            <BugCard key={bug.id} bug={bug} user={user} isAdminOrDev={isAdminOrDev}
              projects={projects}
              onStatusChange={updateStatus}
              onAssign={assignToProject}
              onDelete={deleteBug} />
          ))
        )}
      </div>

      {/* Resolved (collapsed) */}
      {resolved.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-400 transition-colors select-none flex items-center gap-1">
            <span className="material-symbols-outlined text-sm group-open:rotate-90 transition-transform">chevron_right</span>
            {resolved.length} resolved report{resolved.length !== 1 ? "s" : ""}
          </summary>
          <div className="flex flex-col gap-2 mt-3">
            {resolved.map((bug) => (
              <BugCard key={bug.id} bug={bug} user={user} isAdminOrDev={isAdminOrDev}
                projects={projects}
                onStatusChange={updateStatus}
                onAssign={assignToProject}
                onDelete={deleteBug} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/* ── Individual bug card ── */
function BugCard({ bug, user, isAdminOrDev, projects, onStatusChange, onAssign, onDelete }) {
  const [assigning, setAssigning] = useState(false);
  const [selProject, setSelProject] = useState("");
  const ps = PRIORITY_STYLE[bug.priority] || PRIORITY_STYLE.Normal;
  const ss = STATUS_STYLE[bug.status]     || STATUS_STYLE.open;
  const canDelete = user.role === "ADMIN" || bug.reported_by === user.id;

  return (
    <div className="bg-[#161616] border border-[#252525] rounded-2xl p-4 group">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Title + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${ps}`}>{bug.priority}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize ${ss}`}>
              {bug.status.replace("_"," ")}
            </span>
            <span className="text-sm font-semibold text-white">{bug.title}</span>
          </div>

          {bug.description && (
            <p className="text-xs text-zinc-500 whitespace-pre-wrap mt-1 mb-2">{bug.description}</p>
          )}

          {/* Attachments */}
          {bug.attachment_urls?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {bug.attachment_urls.map((url, i) => <FileIcon key={i} url={url} />)}
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-[10px] text-zinc-700 flex-wrap">
            <span>by {bug.reporter_name}</span>
            <span>{new Date(bug.created_at).toLocaleDateString([], { dateStyle:"medium" })}</span>
            {bug.project_name && (
              <span className="text-orange-500/60">→ {bug.project_name}</span>
            )}
          </div>
        </div>

        {/* Action buttons (hover) */}
        {(isAdminOrDev || canDelete) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex-wrap justify-end">
            {isAdminOrDev && bug.status === "open" && (
              <button onClick={() => onStatusChange(bug.id, "in_progress")}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all">
                In Progress
              </button>
            )}
            {isAdminOrDev && bug.status !== "resolved" && (
              <button onClick={() => onStatusChange(bug.id, "resolved")}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                Resolve
              </button>
            )}
            {/* Assign to project */}
            {isAdminOrDev && projects.length > 0 && (
              <button onClick={() => setAssigning((v) => !v)}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-all">
                Assign →
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(bug.id)}
                className="size-6 rounded flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Project assignment inline form */}
      {assigning && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#222]">
          <select value={selProject} onChange={(e) => setSelProject(e.target.value)}
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none">
            <option value="">Select project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button disabled={!selProject}
            onClick={() => { onAssign(bug.id, selProject); setAssigning(false); }}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white disabled:opacity-40 transition-all">
            Assign
          </button>
          <button onClick={() => setAssigning(false)}
            className="text-[10px] text-zinc-600 hover:text-white transition-colors">Cancel</button>
        </div>
      )}
    </div>
  );
}
