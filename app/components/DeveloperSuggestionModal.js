/* ─────────────────────────────────────────────────────────────────────────────
   app/components/DeveloperSuggestionModal.js
   Modal shown after a lead is marked Won — pick a developer or create a project.
───────────────────────────────────────────────────────────────────────────── */
"use client";
import { useState, useEffect } from "react";

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <span key={s} className={`text-xs ${s <= Math.round(rating) ? "text-amber-400" : "text-zinc-700"}`}>★</span>
      ))}
      <span className="text-[10px] text-zinc-500 ml-1">{Number(rating).toFixed(1)}</span>
    </div>
  );
}

export default function DeveloperSuggestionModal({ lead, onClose, onConfirm }) {
  const [devs, setDevs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [name, setName]       = useState(lead?.name || "");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    async function load() {
      const res  = await fetch(`/api/developers/suggest`);
      const data = await res.json();
      setDevs(data.developers || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleConfirm() {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, deadline: deadline || undefined,
          dev_id: selected?.id || null,
          deal_value: lead?.deal_value || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onConfirm?.(data.id);
      onClose();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  const AVAIL_STYLE = {
    available:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    busy:        "bg-amber-500/15  text-amber-400  border-amber-500/25",
    unavailable: "bg-red-500/15    text-red-400    border-red-500/25",
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#141414] border border-[#252525] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#252525] shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-xl">emoji_events</span>
            <h3 className="text-base font-bold text-white">Deal Won — Create Project</h3>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Project name + deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Project Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Deadline (optional)</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-orange-500/50 transition-all" />
            </div>
          </div>

          {/* Developer pick */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-orange-400 text-lg">engineering</span>
              <h4 className="text-sm font-bold text-white">Select Developer</h4>
              <span className="text-[10px] text-zinc-600">(optional — can assign later)</span>
            </div>

            {loading ? (
              <div className="text-center text-zinc-600 text-sm py-6">Loading suggestions…</div>
            ) : devs.length === 0 ? (
              <div className="text-center text-zinc-700 text-sm py-6">No developer profiles set up yet.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {devs.map((dev) => (
                  <button key={dev.id} onClick={() => setSelected(selected?.id === dev.id ? null : dev)}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left
                      ${selected?.id === dev.id
                        ? "border-orange-500/50 bg-orange-500/8"
                        : "border-[#252525] bg-[#1a1a1a] hover:border-zinc-600/50 hover:bg-[#1f1f1f]"}`}>
                    {/* Avatar */}
                    <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {dev.name?.charAt(0)}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{dev.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize ${AVAIL_STYLE[dev.availability] || AVAIL_STYLE.available}`}>
                          {dev.availability}
                        </span>
                        <span className="text-[10px] text-zinc-600">{dev.active_projects} active</span>
                      </div>
                      <Stars rating={dev.rating} />
                      {dev.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {dev.skills.slice(0,6).map((sk) => (
                            <span key={sk} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">{sk}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Score */}
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-orange-400">{dev.score}</div>
                      <div className="text-[9px] text-zinc-600">score</div>
                      <div className="text-[9px] text-zinc-600 mt-0.5">{dev.skill_match_pct}% match</div>
                    </div>
                    {selected?.id === dev.id && (
                      <span className="material-symbols-outlined text-orange-400 text-xl shrink-0">check_circle</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#252525] shrink-0 flex items-center gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-400 hover:text-white text-sm font-semibold transition-all">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={!name.trim() || saving}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center gap-2">
            {saving ? "Creating…" : selected ? `Assign ${selected.name} & Create` : "Create Project"}
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
