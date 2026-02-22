/* ─────────────────────────────────────────────────────────────────────────────
   app/components/DashboardHome.js
   Default dashboard — welcome, stat cards, and Follow-Ups widget.
   Admin cards: live from /api/admin/stats (all ERP metrics).
   Employee cards: live from /api/employee/stats (personalised + dept-aware).
───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect } from "react";
import FollowUpsWidget from "./FollowUpsWidget";

/* ── Revenue / number formatter ───────────────────────────────────────────── */
function fmtMoney(val) {
  const n = parseFloat(val) || 0;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

/* ── MTD revenue trend badge ─────────────────────────────────────────────── */
function revenueTrend(mtd, lastMonth) {
  const cur  = parseFloat(mtd)       || 0;
  const prev = parseFloat(lastMonth) || 0;
  if (prev === 0) return null;
  const pct  = ((cur - prev) / prev) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% vs last month`;
}

/* ── Skeleton card ── */
function SkeletonCard() {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 flex items-center gap-4 animate-pulse">
      <div className="size-11 rounded-lg bg-[#2a2a2a] shrink-0" />
      <div className="flex flex-col gap-2 flex-1">
        <div className="h-7 w-16 bg-[#2a2a2a] rounded" />
        <div className="h-3 w-24 bg-[#2a2a2a] rounded" />
      </div>
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ label, value, icon, color, bg, border, sub }) {
  return (
    <div className={`bg-[#1a1a1a] border ${border} rounded-xl p-5 flex items-center gap-4 hover:border-[#333] transition-all group`}>
      <div className={`size-11 rounded-lg ${bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
        <span className={`material-symbols-outlined text-xl ${color}`}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-zinc-600 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

/* ── Build ADMIN stat cards from live data ── */
function buildAdminCards(s) {
  const trend = revenueTrend(s.revenue_mtd, s.revenue_last_month);
  return [
    {
      label: "Total Users",      value: String(s.total_users ?? "—"),
      icon: "group",             color: "text-blue-400",
      bg: "bg-blue-500/10",      border: "border-blue-500/10",
      sub: `${s.active_users ?? 0} active`,
    },
    {
      label: "Active Projects",  value: String(s.active_projects ?? "—"),
      icon: "folder_open",       color: "text-purple-400",
      bg: "bg-purple-500/10",    border: "border-purple-500/10",
      sub: `${s.total_projects ?? 0} total`,
    },
    {
      label: "Revenue (MTD)",    value: fmtMoney(s.revenue_mtd),
      icon: "payments",          color: "text-emerald-400",
      bg: "bg-emerald-500/10",   border: "border-emerald-500/10",
      sub: trend ?? `All-time: ${fmtMoney(s.revenue_all_time)}`,
    },
    {
      label: "Open Tasks",       value: String(s.open_tasks ?? "—"),
      icon: "task_alt",          color: "text-orange-400",
      bg: "bg-orange-500/10",    border: "border-orange-500/10",
      sub: `${s.completed_tasks ?? 0} completed`,
    },
    {
      label: "Pending Follow-Ups", value: String(s.pending_followups ?? "—"),
      icon: "calendar_today",
      color: s.overdue_followups > 0 ? "text-red-400"      : "text-sky-400",
      bg:    s.overdue_followups > 0 ? "bg-red-500/10"     : "bg-sky-500/10",
      border: s.overdue_followups > 0 ? "border-red-500/10" : "border-sky-500/10",
      sub: s.overdue_followups > 0 ? `${s.overdue_followups} overdue` : "All on track",
    },
    {
      label: "Open Leads",       value: String(s.open_leads ?? "—"),
      icon: "leaderboard",       color: "text-yellow-400",
      bg: "bg-yellow-500/10",    border: "border-yellow-500/10",
      sub: `${s.won_leads ?? 0} won`,
    },
    {
      label: "Active Clients",   value: String(s.active_clients ?? "—"),
      icon: "business",          color: "text-indigo-400",
      bg: "bg-indigo-500/10",    border: "border-indigo-500/10",
    },
    {
      label: "Open Invoices",    value: String(s.open_invoices ?? "—"),
      icon: "receipt_long",      color: "text-pink-400",
      bg: "bg-pink-500/10",      border: "border-pink-500/10",
    },
    {
      label: "Leave Requests",   value: String(s.pending_leaves ?? "—"),
      icon: "event_busy",        color: "text-rose-400",
      bg: "bg-rose-500/10",      border: "border-rose-500/10",
      sub: "Pending approval",
    },
  ];
}

/* ── Build EMPLOYEE stat cards from live data ── */
function buildEmployeeCards(s, dept) {
  /* ── Common personal cards (all departments) ── */
  const common = [
    {
      label: "My Open Tasks",    value: String(s.my_open_tasks ?? "—"),
      icon: "task_alt",          color: "text-orange-400",
      bg: "bg-orange-500/10",    border: "border-orange-500/10",
      sub: `${s.my_completed_tasks ?? 0} completed`,
    },
    {
      label: "Pending Follow-Ups", value: String(s.my_pending_followups ?? "—"),
      icon: "calendar_today",
      color: s.my_overdue_followups > 0 ? "text-red-400"       : "text-sky-400",
      bg:    s.my_overdue_followups > 0 ? "bg-red-500/10"      : "bg-sky-500/10",
      border: s.my_overdue_followups > 0 ? "border-red-500/10" : "border-sky-500/10",
      sub: s.my_overdue_followups > 0 ? `${s.my_overdue_followups} overdue` : "All on track",
    },
    {
      label: "Upcoming Meetings", value: String(s.my_upcoming_meetings ?? "—"),
      icon: "groups",             color: "text-purple-400",
      bg: "bg-purple-500/10",     border: "border-purple-500/10",
    },
    {
      label: "Pending Leaves",   value: String(s.my_pending_leaves ?? "—"),
      icon: "event_busy",        color: "text-rose-400",
      bg: "bg-rose-500/10",      border: "border-rose-500/10",
      sub: `${s.my_leaves_this_year ?? 0} leaves this year`,
    },
  ];

  /* ── Department-specific extras ── */
  let deptCards = [];

  if (dept === "Sales") {
    deptCards = [
      {
        label: "My Open Leads",    value: String(s.my_open_leads ?? "—"),
        icon: "leaderboard",       color: "text-yellow-400",
        bg: "bg-yellow-500/10",    border: "border-yellow-500/10",
        sub: `${s.my_total_leads ?? 0} total assigned`,
      },
      {
        label: "Won (MTD)",        value: String(s.my_won_leads_mtd ?? "—"),
        icon: "emoji_events",      color: "text-emerald-400",
        bg: "bg-emerald-500/10",   border: "border-emerald-500/10",
        sub: "Leads won this month",
      },
      {
        label: "Open Proposals",   value: String(s.my_open_proposals ?? "—"),
        icon: "description",       color: "text-blue-400",
        bg: "bg-blue-500/10",      border: "border-blue-500/10",
        sub: "Awaiting response",
      },
    ];
  }

  else if (dept === "Development") {
    deptCards = [
      {
        label: "Active Projects",  value: String(s.my_active_projects ?? "—"),
        icon: "rocket_launch",     color: "text-purple-400",
        bg: "bg-purple-500/10",    border: "border-purple-500/10",
        sub: "Projects assigned to me",
      },
      {
        label: "Open Bugs",        value: String(s.my_open_bugs ?? "—"),
        icon: "bug_report",        color: "text-red-400",
        bg: "bg-red-500/10",       border: "border-red-500/10",
        sub: `${s.my_bugs_fixed_mtd ?? 0} fixed this month`,
      },
      {
        label: "Hours Logged (MTD)", value: `${parseFloat(s.my_hours_logged_mtd || 0).toFixed(1)}h`,
        icon: "schedule",            color: "text-blue-400",
        bg: "bg-blue-500/10",        border: "border-blue-500/10",
        sub: "This month",
      },
    ];
  }

  else if (dept === "Finance") {
    deptCards = [
      {
        label: "Open Invoices",    value: String(s.open_invoices ?? "—"),
        icon: "receipt_long",      color: "text-pink-400",
        bg: "bg-pink-500/10",      border: "border-pink-500/10",
        sub: "Awaiting payment",
      },
      {
        label: "Revenue (MTD)",    value: fmtMoney(s.revenue_mtd),
        icon: "payments",          color: "text-emerald-400",
        bg: "bg-emerald-500/10",   border: "border-emerald-500/10",
        sub: "This calendar month",
      },
      {
        label: "Pending Payslips", value: String(s.pending_payslips ?? "—"),
        icon: "account_balance",   color: "text-indigo-400",
        bg: "bg-indigo-500/10",    border: "border-indigo-500/10",
        sub: "Not yet paid",
      },
    ];
  }

  else if (dept === "HR") {
    deptCards = [
      {
        label: "Pending Leaves",   value: String(s.pending_leaves ?? "—"),
        icon: "event_busy",        color: "text-rose-400",
        bg: "bg-rose-500/10",      border: "border-rose-500/10",
        sub: "Company-wide",
      },
      {
        label: "Active Employees", value: String(s.active_employees ?? "—"),
        icon: "group",             color: "text-blue-400",
        bg: "bg-blue-500/10",      border: "border-blue-500/10",
      },
      {
        label: "Upcoming Meetings", value: String(s.upcoming_meetings ?? "—"),
        icon: "groups",             color: "text-purple-400",
        bg: "bg-purple-500/10",     border: "border-purple-500/10",
        sub: "Scheduled",
      },
    ];
  }

  return [...common, ...deptCards];
}

/* ──────────────────────────────────────────────────────────────────────────── */

export default function DashboardHome({ user, onViewChange }) {
  const isAdmin = user.role === "ADMIN";
  const dept    = user.sub_role_dept || "";

  /* Live stats state */
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  /* Overdue badge from FollowUpsWidget (original behaviour) */
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    const endpoint = isAdmin ? "/api/admin/stats" : "/api/employee/stats";
    fetch(endpoint)
      .then(r => r.json())
      .then(data => {
        if (data.success) setStats(data.stats);
        else setError(data.error || "Failed to load stats.");
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  /* Build card arrays from live data */
  const cards = stats
    ? (isAdmin
        ? buildAdminCards(stats)
        : buildEmployeeCards(stats, dept))
    : [];

  /* Grid cols:
     Admin  → 3 columns on xl (3×3 = 9 cards)
     Employee common (4) + dept (3) = up to 7 → 4 wide on xl, 2 on md */
  const gridCols = isAdmin
    ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
    : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";

  /* Skeleton count */
  const skeletonCount = isAdmin ? 9 : 7;

  return (
    <div className="flex flex-col gap-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {isAdmin ? "Admin Dashboard" : "My Dashboard"}
            </h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border
              ${isAdmin
                ? "bg-purple-500/15 text-purple-400 border-purple-500/20"
                : "bg-blue-500/15 text-blue-400 border-blue-500/20"}`}>
              {isAdmin ? "ADMIN" : (dept || user.role)}
            </span>
          </div>
          <p className="text-sm text-zinc-500">
            Welcome back, <span className="text-zinc-300 font-medium">{user.name}</span>.
            Here&apos;s your overview for today.
          </p>
        </div>

        {/* Overdue follow-ups alert button */}
        {overdueCount > 0 && (
          <button onClick={() => onViewChange?.("leads")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400
                       hover:bg-red-500/20 hover:text-red-300 transition-all text-sm font-semibold">
            <span className="material-symbols-outlined text-base animate-pulse">alarm</span>
            {overdueCount} overdue follow-up{overdueCount !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <span className="material-symbols-outlined text-base">error</span>
          {error}
        </div>
      )}

      {/* ── Stat cards grid ── */}
      <div className={`grid ${gridCols} gap-4`}>
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) => <SkeletonCard key={i} />)
          : cards.map((card) => <StatCard key={card.label} {...card} />)
        }
      </div>

      {/* ── Follow-Ups Widget ── */}
      <FollowUpsWidget
        onOverdueCount={setOverdueCount}
        onLeadClick={() => onViewChange?.("leads")}
      />

    </div>
  );
}
