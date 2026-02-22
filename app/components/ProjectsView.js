/* ─────────────────────────────────────────────────────────────────────────────
   app/components/ProjectsView.js
   Lists projects for the current user (role-filtered by the API).
   Clicking opens ProjectWorkspaceView inline.
───────────────────────────────────────────────────────────────────────────── */
"use client";
import { useState, useEffect, useCallback } from "react";
import ProjectWorkspaceView from "./ProjectWorkspaceView";

const STATUS_STYLE = {
  active:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  completed: "bg-blue-500/15    text-blue-400    border-blue-500/25",
  paused:    "bg-amber-500/15   text-amber-400   border-amber-500/25",
  cancelled: "bg-red-500/15     text-red-400     border-red-500/25",
};
const PRIORITY_STYLE = {
  Urgent: "text-red-400", High: "text-orange-400", Normal: "text-zinc-400", Low: "text-zinc-600",
};

function ProjectCard({ project, onClick }) {
  const ss = STATUS_STYLE[project.status] || STATUS_STYLE.active;
  return (
    <div onClick={() => onClick(project.id)}
      className="bg-[#161616] border border-[#252525] rounded-2xl p-5 cursor-pointer hover:border-zinc-600/50 hover:bg-[#1a1a1a] transition-all group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold truncate group-hover:text-orange-400 transition-colors">{project.name}</div>
          {project.lead_name && <div className="text-[11px] text-zinc-600 mt-0.5">← {project.lead_name}</div>}
        </div>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize shrink-0 ${ss}`}>{project.status}</span>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-zinc-500 flex-wrap">
        {project.dev_name && (
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-zinc-700 text-sm">engineering</span>
            {project.dev_name}
          </div>
        )}
        {project.client_name && (
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-zinc-700 text-sm">business</span>
            {project.client_name}
          </div>
        )}
        {project.deadline && (
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-zinc-700 text-sm">calendar_today</span>
            {new Date(project.deadline).toLocaleDateString()}
          </div>
        )}
        {project.deal_value > 0 && (
          <div className="flex items-center gap-1 text-emerald-500 font-semibold">
            <span className="material-symbols-outlined text-sm">currency_rupee</span>
            {Number(project.deal_value).toLocaleString("en-IN")}
          </div>
        )}
      </div>

      {project.priority && project.priority !== "Normal" && (
        <div className={`text-[10px] font-bold mt-2 ${PRIORITY_STYLE[project.priority]}`}>
          {project.priority} Priority
        </div>
      )}
    </div>
  );
}

export default function ProjectsView({ user }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [openProjectId, setOpenProjectId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (statusFilter) p.set("status", statusFilter);
    const res  = await fetch(`/api/projects?${p}`);
    const data = await res.json();
    setProjects(data.projects || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  if (openProjectId) {
    return (
      <ProjectWorkspaceView
        user={user}
        projectId={openProjectId}
        onBack={() => { setOpenProjectId(null); load(); }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Your active project workspaces</p>
        </div>
        <div className="flex items-center gap-2">
          {["", "active", "completed", "paused", "cancelled"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all
                ${statusFilter === s ? "bg-orange-500/15 text-orange-400 border border-orange-500/25" : "bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-500 hover:text-white"}`}>
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-600 gap-2">
          <svg className="animate-spin size-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          Loading…
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-600">
          <span className="material-symbols-outlined text-5xl">rocket_launch</span>
          <p className="text-sm">No projects yet. Projects are created when a lead is marked Won.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => <ProjectCard key={p.id} project={p} onClick={setOpenProjectId} />)}
        </div>
      )}
    </div>
  );
}
