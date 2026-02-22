/* ─────────────────────────────────────────────────────────────────────────────
   app/components/ProjectWorkspaceView.js
   Tabbed workspace for a single project. Role-gates tabs:
     • Developer → Tasks, Timeline, Files, Time Log, Bugs
     • Finance    → Invoices, Payments, Expenses, Ledger
     • Admin      → all tabs + project settings
     • Sales      → Overview only
───────────────────────────────────────────────────────────────────────────── */
"use client";
import { useState, useEffect } from "react";
import ProjectTasksPanel    from "./ProjectTasksPanel";
import ProjectTimelinePanel from "./ProjectTimelinePanel";
import ProjectFinancePanel  from "./ProjectFinancePanel";

/* ── Role helpers (use sub_role_dept from JWT) ── */
function isDevRole(u)     { return (u.sub_role_dept || "") === "Development"; }
function isFinanceRole(u) { return (u.sub_role_dept || "") === "Finance"; }

const STATUS_STYLE = {
  active:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  completed: "bg-blue-500/15    text-blue-400    border-blue-500/20",
  paused:    "bg-amber-500/15   text-amber-400   border-amber-500/20",
  cancelled: "bg-red-500/15     text-red-400     border-red-500/20",
};

/* ── Tabs available per sub-role ── */
function getTabs(user) {
  const isAdmin   = user.role === "ADMIN";
  const isDev     = isDevRole(user);
  const isFinance = isFinanceRole(user);
  const tabs = [{ id: "overview", label: "Overview", icon: "info" }];
  if (isAdmin || isDev) {
    tabs.push(
      { id: "tasks",    label: "Tasks",    icon: "checklist" },
      { id: "timeline", label: "Timeline", icon: "history" },
      { id: "files",    label: "Files",    icon: "folder" },
      { id: "timelog",  label: "Time Log", icon: "schedule" },
      { id: "bugs",     label: "Bugs",     icon: "bug_report" },
    );
  }
  if (isAdmin || isFinance) {
    tabs.push({ id: "finance", label: "Finance", icon: "account_balance" });
  }
  if (isAdmin) {
    tabs.push({ id: "settings", label: "Settings", icon: "settings" });
  }
  return tabs;
}

/* ── Overview panel ── */
function OverviewPanel({ project }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[
        { label:"Client",   value: project.client_name || "—",  icon:"business" },
        { label:"Developer",value: project.dev_name    || "Unassigned", icon:"engineering" },
        { label:"Priority", value: project.priority    || "Normal",     icon:"flag" },
        { label:"Deadline", value: project.deadline ? new Date(project.deadline).toLocaleDateString() : "—", icon:"calendar_today" },
        { label:"Deal Value",value:`₹${Number(project.deal_value||0).toLocaleString("en-IN")}`,icon:"currency_rupee" },
        { label:"Lead",     value: project.lead_name   || "—",  icon:"leaderboard" },
      ].map((row) => (
        <div key={row.label} className="bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="material-symbols-outlined text-zinc-600 text-sm">{row.icon}</span>
            <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">{row.label}</span>
          </div>
          <div className="text-sm font-medium text-white">{row.value}</div>
        </div>
      ))}
      {project.description && (
        <div className="col-span-2 bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3">
          <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Description</div>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{project.description}</p>
        </div>
      )}
      {/* Recent activity */}
      {project.activity?.length > 0 && (
        <div className="col-span-2 bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3">
          <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Recent Activity</div>
          <div className="flex flex-col gap-1.5">
            {project.activity.slice(0,5).map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="size-1.5 rounded-full bg-zinc-600 shrink-0" />
                <span className="text-zinc-400">{ev.actor_name}</span>
                <span>{ev.event_type.replace(/_/g," ")}</span>
                <span className="ml-auto text-zinc-700 text-[10px]">{new Date(ev.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Settings panel ── */
function SettingsPanel({ project, onSaved }) {
  const [name, setName]       = useState(project.name);
  const [status, setStatus]   = useState(project.status);
  const [priority, setPriority] = useState(project.priority);
  const [deadline, setDeadline] = useState(project.deadline?.slice(0,10) || "");
  const [desc, setDesc]       = useState(project.description || "");
  const [saving, setSaving]   = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/projects/${project.id}`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ name, status, priority, deadline: deadline||undefined, description: desc,
        assigned_dev: project.assigned_dev, deal_value: project.deal_value })
    });
    setSaving(false); onSaved?.();
  }

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      {[
        { label:"Project Name", val:name, set:setName, type:"text" },
        { label:"Deadline",     val:deadline, set:setDeadline, type:"date" },
      ].map(({label,val,set,type}) => (
        <div key={label} className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>
          <input type={type} value={val} onChange={(e)=>set(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all" />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label:"Status",   val:status,   set:setStatus,   opts:["active","completed","paused","cancelled"] },
          { label:"Priority", val:priority, set:setPriority, opts:["Urgent","High","Normal","Low"] },
        ].map(({label,val,set,opts}) => (
          <div key={label} className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>
            <select value={val} onChange={(e)=>set(e.target.value)}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all">
              {opts.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Description</label>
        <textarea value={desc} onChange={(e)=>setDesc(e.target.value)} rows={3}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all resize-none" />
      </div>
      <button onClick={save} disabled={saving}
        className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-40 transition-all">
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

/* ════════════ MAIN ════════════ */
export default function ProjectWorkspaceView({ user, projectId, onBack }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("overview");

  const tabs = project ? getTabs(user) : [];

  async function load() {
    setLoading(true);
    const res  = await fetch(`/api/projects/${projectId}`);
    const data = await res.json();
    setProject(data.project);
    setLoading(false);
  }
  useEffect(() => { load(); }, [projectId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-zinc-600 gap-2">
      <svg className="animate-spin size-5" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>
      Loading workspace…
    </div>
  );

  const ss = STATUS_STYLE[project?.status] || STATUS_STYLE.active;

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-zinc-500 hover:text-white text-sm font-semibold transition-colors">
          <span className="material-symbols-outlined text-base">arrow_back</span> Projects
        </button>
        <span className="text-zinc-700">/</span>
        <h1 className="text-xl font-bold text-white truncate">{project?.name}</h1>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize ${ss}`}>{project?.status}</span>
        {project?.priority && project.priority !== "Normal" && (
          <span className="text-[9px] font-bold text-orange-400">{project.priority}</span>
        )}
        <div className="ml-auto text-xs text-zinc-600">
          {project?.dev_name && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">engineering</span>{project.dev_name}</span>}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-[#252525] shrink-0 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-1 py-2.5 mr-5 text-[11px] font-semibold border-b-2 transition-all -mb-px shrink-0
              ${tab === t.id ? "border-orange-500 text-orange-400" : "border-transparent text-zinc-600 hover:text-zinc-400"}`}>
            <span className="material-symbols-outlined text-sm">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto pt-5">
        {tab === "overview"  && <OverviewPanel project={project} />}
        {tab === "tasks"     && <ProjectTasksPanel projectId={projectId} user={user} />}
        {tab === "timeline"  && <ProjectTimelinePanel projectId={projectId} user={user} />}
        {tab === "timelog"   && <ProjectTimelinePanel projectId={projectId} user={user} mode="timelog" />}
        {tab === "files"     && <ProjectTimelinePanel projectId={projectId} user={user} mode="files" />}
        {tab === "bugs"      && <ProjectTimelinePanel projectId={projectId} user={user} mode="bugs" />}
        {tab === "finance"   && <ProjectFinancePanel  projectId={projectId} user={user} />}
        {tab === "settings"  && <SettingsPanel project={project} onSaved={load} />}
      </div>
    </div>
  );
}
