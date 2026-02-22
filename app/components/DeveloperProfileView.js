/* ─────────────────────────────────────────────────────────────────────────────
   app/components/DeveloperProfileView.js
   Developer's own profile — set skills, availability, and view their stats.
───────────────────────────────────────────────────────────────────────────── */
"use client";
import { useState, useEffect } from "react";

const SKILL_SUGGESTIONS = [
  "React","Next.js","Node.js","Python","Django","PostgreSQL","MongoDB","TypeScript",
  "Docker","AWS","Figma","Flutter","PHP","Laravel","Vue.js","GraphQL","Redis","Tailwind"
];

export default function DeveloperProfileView({ user }) {
  const [profile, setProfile] = useState(null);
  const [skills, setSkills]   = useState([]);
  const [rating, setRating]   = useState(3.0);
  const [avail, setAvail]     = useState("available");
  const [notes, setNotes]     = useState("");
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    fetch(`/api/developer-profiles/${user.id}`)
      .then(r => r.json())
      .then(d => {
        const p = d.profile || {};
        setProfile(p); setSkills(p.skills||[]); setRating(p.rating||3.0);
        setAvail(p.availability||"available"); setNotes(p.notes||"");
      });
  }, [user.id]);

  function addTag(e) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().replace(/,$/,"");
      if (!skills.includes(t)) setSkills(p => [...p, t]);
      setTagInput("");
    }
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/developer-profiles/${user.id}`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ skills, rating, availability: avail, notes })
    });
    setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),2000);
  }

  const AVAIL_OPTS = [
    { val:"available",   label:"Available",   cls:"text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
    { val:"busy",        label:"Busy",        cls:"text-amber-400  bg-amber-500/10  border-amber-500/25"  },
    { val:"unavailable", label:"Unavailable", cls:"text-red-400    bg-red-500/10    border-red-500/25"    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Developer Profile</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Your skills and availability feed the project assignment engine.</p>
      </div>

      {/* Availability */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Availability</label>
        <div className="flex gap-2">
          {AVAIL_OPTS.map(o => (
            <button key={o.val} onClick={() => setAvail(o.val)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all
                ${avail===o.val ? o.cls : "bg-[#1a1a1a] border-[#2a2a2a] text-zinc-500 hover:text-white"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rating (admin sets, dev views) */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Rating (set by admin)</label>
        <div className="flex items-center gap-2">
          {[1,2,3,4,5].map(s => (
            <button key={s} onClick={() => user.role==="ADMIN" && setRating(s)}
              className={`text-2xl transition-colors ${s<=Math.round(rating)?"text-amber-400":"text-zinc-700"}`}>★</button>
          ))}
          <span className="text-zinc-400 text-sm ml-2">{Number(rating).toFixed(1)}</span>
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Skills</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {skills.map(sk => (
            <span key={sk} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">
              {sk}
              <button onClick={() => setSkills(s => s.filter(x=>x!==sk))} className="text-orange-500/60 hover:text-orange-300 transition-colors">×</button>
            </span>
          ))}
        </div>
        <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag}
          placeholder="Type skill + Enter (e.g. React, Node.js)"
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all" />
        {/* Suggestions */}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {SKILL_SUGGESTIONS.filter(s => !skills.includes(s)).slice(0,10).map(s => (
            <button key={s} onClick={() => setSkills(p => [...p, s])}
              className="text-[10px] px-2 py-0.5 rounded border border-zinc-700/50 bg-zinc-800/50 text-zinc-500 hover:text-white hover:border-zinc-500 transition-all">
              + {s}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Tech stack preferences, timezone, etc."
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all resize-none" />
      </div>

      <button onClick={save} disabled={saving}
        className={`w-fit px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2
          ${saved ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" : "bg-orange-500 hover:bg-orange-400 text-white disabled:opacity-40"}`}>
        <span className="material-symbols-outlined text-base">{saved ? "check" : "save"}</span>
        {saving ? "Saving…" : saved ? "Saved!" : "Save Profile"}
      </button>
    </div>
  );
}
