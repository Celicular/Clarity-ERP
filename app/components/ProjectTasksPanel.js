/* ─────────────────────────────────────────────────────────────────────────────
   app/components/ProjectTasksPanel.js
   4-column kanban task board with subtasks, status cycling, and add/delete.
───────────────────────────────────────────────────────────────────────────── */
"use client";
import { useState, useEffect } from "react";

const STATUSES    = ["todo", "in_progress", "review", "done"];
const STATUS_LABEL = { todo:"To Do", in_progress:"In Progress", review:"Review", done:"Done" };
const STATUS_STYLE = {
  todo:        "border-zinc-700/50  text-zinc-400",
  in_progress: "border-blue-500/30  text-blue-400",
  review:      "border-amber-500/30 text-amber-400",
  done:        "border-emerald-500/30 text-emerald-400",
};
const NEXT_STATUS = { todo:"in_progress", in_progress:"review", review:"done", done:"todo" };

export default function ProjectTasksPanel({ projectId, user }) {
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [addOpen, setAddOpen]   = useState(false);
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [priority, setPriority] = useState("Normal");
  const [saving, setSaving]     = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/tasks`);
      const d = await r.json();
      setTasks(d.tasks || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [projectId]);

  async function addTask() {
    if (!title.trim()) return;
    setSaving(true);
    await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: desc || undefined, priority }),
    });
    setTitle(""); setDesc(""); setPriority("Normal"); setAddOpen(false);
    await load(); setSaving(false);
  }

  async function cycleStatus(task) {
    await fetch(`/api/projects/${projectId}/tasks/${task.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...task, status: NEXT_STATUS[task.status] }),
    });
    await load();
  }

  async function toggleSubtask(sid, done) {
    await fetch(`/api/projects/${projectId}/subtasks/${sid}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !done }),
    });
    await load();
  }

  async function deleteTask(tid) {
    await fetch(`/api/projects/${projectId}/tasks/${tid}`, { method: "DELETE" });
    await load();
  }

  const grouped = STATUSES.reduce((acc, s) => ({
    ...acc, [s]: tasks.filter((t) => t.status === s),
  }), {});

  if (loading) return (
    <div className="text-zinc-600 text-sm text-center py-10">Loading tasks…</div>
  );

  return (
    <div className="flex flex-col gap-4">

      {/* Add task button */}
      <div className="flex justify-end">
        <button onClick={() => setAddOpen((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-400 hover:bg-orange-500/20 text-sm font-semibold transition-all">
          <span className="material-symbols-outlined text-base">add</span> Add Task
        </button>
      </div>

      {/* Add task form */}
      {addOpen && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex flex-col gap-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title *"
            className="bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Description (optional)"
            className="bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all resize-none" />
          <div className="flex items-center gap-2">
            <select value={priority} onChange={(e) => setPriority(e.target.value)}
              className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              {["Urgent","High","Normal","Low"].map((p) => <option key={p}>{p}</option>)}
            </select>
            <button onClick={() => { setAddOpen(false); setTitle(""); }}
              className="text-xs text-zinc-500 hover:text-white transition-colors flex-1 text-right">
              Cancel
            </button>
            <button onClick={addTask} disabled={!title.trim() || saving}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-40 transition-all">
              {saving ? "…" : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {STATUSES.map((s) => (
          <div key={s} className="flex flex-col gap-2">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border bg-transparent ${STATUS_STYLE[s]}`}>
                {STATUS_LABEL[s]}
              </span>
              <span className="text-[10px] text-zinc-700">{grouped[s].length}</span>
            </div>

            {/* Task cards */}
            {grouped[s].map((task) => (
              <div key={task.id} className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-3 group">
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <p className="text-xs font-semibold text-white leading-snug flex-1">{task.title}</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => cycleStatus(task)} title="Advance status"
                      className="size-5 rounded flex items-center justify-center text-zinc-600 hover:text-orange-400 transition-colors">
                      <span className="material-symbols-outlined text-[11px]">east</span>
                    </button>
                    <button onClick={() => deleteTask(task.id)}
                      className="size-5 rounded flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors">
                      <span className="material-symbols-outlined text-[11px]">delete</span>
                    </button>
                  </div>
                </div>

                {task.description && (
                  <p className="text-[10px] text-zinc-600 mb-1.5">{task.description}</p>
                )}

                {/* Subtasks */}
                {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1.5 border-t border-[#1e1e1e] pt-1.5">
                    {task.subtasks.map((st) => (
                      <button key={st.id} onClick={() => toggleSubtask(st.id, st.done)}
                        className="flex items-center gap-1.5 text-[10px] text-left text-zinc-500 hover:text-white transition-colors">
                        <span className={`material-symbols-outlined text-sm ${st.done ? "text-emerald-400" : "text-zinc-700"}`}>
                          {st.done ? "check_box" : "check_box_outline_blank"}
                        </span>
                        <span className={st.done ? "line-through text-zinc-700" : ""}>{st.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2 text-[9px]">
                  {task.priority !== "Normal" && (
                    <span className={
                      task.priority === "Urgent" ? "text-red-400" :
                      task.priority === "High"   ? "text-orange-400" : "text-zinc-600"
                    }>{task.priority}</span>
                  )}
                  {task.due_date && (
                    <span className="text-zinc-700">{new Date(task.due_date).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
