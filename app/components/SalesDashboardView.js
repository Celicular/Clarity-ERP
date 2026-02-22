/* ─────────────────────────────────────────────────────────────────────────────
   app/components/SalesDashboardView.js
   Operational Sales Dashboard — replaces default home for Sales sub-role users.
   Widgets: stat cards, leads by stage (bar), leads by source, overdue follow-ups,
   proposal pipeline, and recent activity feed.
───────────────────────────────────────────────────────────────────────────── */
"use client";
import { useState, useEffect, useCallback } from "react";

/* ── Tiny helpers ── */
function relTime(ts) {
  if (!ts) return "";
  const m = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString([], { dateStyle: "medium" });
}

function fmt(n) {
  return Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

const ACTIVITY_ICONS = {
  created:          { icon: "add_circle",     color: "text-blue-400"    },
  status_changed:   { icon: "swap_horiz",     color: "text-purple-400"  },
  edited:           { icon: "edit",           color: "text-zinc-500"    },
  commented:        { icon: "chat_bubble",    color: "text-emerald-400" },
  interaction:      { icon: "handshake",      color: "text-orange-400"  },
  followup_set:     { icon: "calendar_today", color: "text-amber-400"   },
  followup_done:    { icon: "task_alt",       color: "text-green-400"   },
  proposal_created: { icon: "receipt_long",   color: "text-cyan-400"    },
  proposal_status:  { icon: "receipt_long",   color: "text-cyan-400"    },
  attachment_added: { icon: "attach_file",    color: "text-zinc-400"    },
};

/* ── Stat card ── */
function StatCard({ label, value, icon, color, bg, sub }) {
  return (
    <div className={`bg-[#1a1a1a] border border-[#252525] rounded-xl p-5 flex items-center gap-4 hover:border-[#333] transition-all group`}>
      <div className={`size-12 rounded-xl ${bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
        <span className={`material-symbols-outlined text-xl ${color}`}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-zinc-500">{label}</div>
        {sub && <div className={`text-[10px] mt-0.5 ${sub.color || "text-zinc-600"}`}>{sub.text}</div>}
      </div>
    </div>
  );
}

/* ── Stage bar ── */
function StageBar({ stages }) {
  const max = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div className="flex flex-col gap-2">
      {stages.map((s) => (
        <div key={s.slug} className="flex items-center gap-3">
          <div className="w-24 shrink-0 text-xs text-zinc-500 text-right truncate">{s.label}</div>
          <div className="flex-1 h-5 bg-[#1a1a1a] rounded-full overflow-hidden border border-[#252525]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(s.count / max) * 100}%`, backgroundColor: s.color || "#f97316" }}
            />
          </div>
          <div className="w-8 text-xs text-zinc-400 font-bold">{s.count}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Source list ── */
function SourceList({ sources, total }) {
  return (
    <div className="flex flex-col gap-2">
      {sources.map((s) => {
        const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
        return (
          <div key={s.source} className="flex items-center gap-3">
            <div className="flex-1 text-xs text-zinc-400 capitalize">{s.source || "Unknown"}</div>
            <div className="flex items-center gap-2 w-40">
              <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] text-zinc-500 w-8 text-right">{s.count}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Main Component
════════════════════════════════════════════════════════════════════════════ */
export default function SalesDashboardView({ user }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshed, setRefreshed] = useState(new Date());

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/sales/stats");
      const json = await res.json();
      setData(json);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  function refresh() { setRefreshed(new Date()); loadStats(); }

  const t = data?.totals || {};
  const fu = data?.followups || {};
  const pr = data?.proposals || {};

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Pipeline health for <span className="text-zinc-300">{user.name}</span>
            {user.sub_role_name && <span className="text-zinc-600"> · {user.sub_role_name}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-700">Updated {relTime(refreshed)}</span>
          <button onClick={refresh} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-zinc-600
                       text-zinc-400 hover:text-white text-xs font-semibold transition-all disabled:opacity-40">
            <span className={`material-symbols-outlined text-base ${loading ? "animate-spin" : ""}`}>refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20 text-zinc-600 gap-2">
          <svg className="animate-spin size-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          Loading…
        </div>
      ) : (
        <>
          {/* ── Row 1: Stat cards ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total Leads"    value={t.total || 0}     icon="person_raised_hand" color="text-blue-400"    bg="bg-blue-500/10" />
            <StatCard label="Won"            value={t.won || 0}       icon="emoji_events"       color="text-emerald-400" bg="bg-emerald-500/10" />
            <StatCard label="Unattended"     value={t.unattended || 0} icon="visibility_off"    color="text-orange-400"  bg="bg-orange-500/10"
              sub={t.unattended > 0 ? { text: "Need immediate attention", color: "text-orange-500" } : { text: "All good!", color: "text-zinc-600" }} />
            <StatCard label="Overdue Follow-ups" value={fu.overdue || 0} icon="alarm"           color="text-red-400"     bg="bg-red-500/10"
              sub={fu.upcoming > 0 ? { text: `${fu.upcoming} upcoming`, color: "text-amber-500" } : undefined} />
          </div>

          {/* ── Row 2: Pipeline stage bars + Source breakdown ── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-[#161616] border border-[#252525] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-orange-400 text-xl">view_kanban</span>
                <h3 className="text-sm font-bold text-white">Leads by Pipeline Stage</h3>
              </div>
              {data?.statusCounts?.length > 0 ? (
                <StageBar stages={data.statusCounts} />
              ) : (
                <p className="text-xs text-zinc-600 text-center py-6">No data yet.</p>
              )}
            </div>
            <div className="bg-[#161616] border border-[#252525] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-purple-400 text-xl">hub</span>
                <h3 className="text-sm font-bold text-white">Leads by Source</h3>
              </div>
              {data?.bySource?.length > 0 ? (
                <SourceList sources={data.bySource} total={t.total || 0} />
              ) : (
                <p className="text-xs text-zinc-600 text-center py-6">No data yet.</p>
              )}
            </div>
          </div>

          {/* ── Row 3: Proposal pipeline + Follow-up summary ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Proposal pipeline */}
            <div className="xl:col-span-1 bg-[#161616] border border-[#252525] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-cyan-400 text-xl">receipt_long</span>
                <h3 className="text-sm font-bold text-white">Proposals</h3>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Drafts",   value: pr.draft || 0,    color: "text-zinc-400",   bg: "bg-zinc-700/30" },
                  { label: "Sent",     value: pr.sent || 0,     color: "text-blue-400",   bg: "bg-blue-500/10" },
                  { label: "Accepted", value: pr.accepted || 0, color: "text-emerald-400",bg: "bg-emerald-500/10" },
                  { label: "Rejected", value: pr.rejected || 0, color: "text-red-400",    bg: "bg-red-500/10" },
                ].map((row) => (
                  <div key={row.label} className={`flex items-center justify-between px-4 py-2.5 rounded-xl ${row.bg} border border-white/5`}>
                    <span className={`text-xs font-semibold ${row.color}`}>{row.label}</span>
                    <span className={`text-lg font-bold ${row.color}`}>{row.value}</span>
                  </div>
                ))}
                {pr.won_value > 0 && (
                  <div className="mt-2 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Accepted Value</div>
                    <div className="text-base font-bold text-emerald-400">₹{fmt(pr.won_value)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent activity */}
            <div className="xl:col-span-2 bg-[#161616] border border-[#252525] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-zinc-400 text-xl">history</span>
                <h3 className="text-sm font-bold text-white">Recent Activity</h3>
              </div>
              <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
                {(!data?.recentActivity || data.recentActivity.length === 0) && (
                  <p className="text-xs text-zinc-700 text-center py-6">No activity yet.</p>
                )}
                {data?.recentActivity?.map((ev) => {
                  const meta = ACTIVITY_ICONS[ev.event_type] || { icon:"info", color:"text-zinc-600" };
                  const payload = typeof ev.payload === "string" ? JSON.parse(ev.payload || "{}") : (ev.payload || {});
                  return (
                    <div key={ev.id} className="flex items-start gap-2.5 py-1.5 border-b border-[#1e1e1e] last:border-0">
                      <div className="size-6 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0 mt-0.5">
                        <span className={`material-symbols-outlined text-[11px] ${meta.color}`}>{meta.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-zinc-400 truncate">
                          <span className="text-white font-medium">{ev.lead_name}</span>
                          <span className="text-zinc-600"> · {ev.actor_name} · {ev.event_type.replace(/_/g," ")}</span>
                          {ev.event_type === "status_changed" && payload.to && (
                            <span className="text-zinc-500"> → {payload.to}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-700">{relTime(ev.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
