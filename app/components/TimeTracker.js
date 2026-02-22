/* ─────────────────────────────────────────────────────────────────────────────
   app/components/TimeTracker.js
   Employee time tracker panel — start/end sessions, manage breaks.
   Shows a live elapsed timer and today's session history.
───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const BREAK_REASONS = ["Lunch", "Prayer", "Personal", "Restroom", "Stretch", "Meeting", "Other"];

/** Format seconds → HH:MM:SS */
function formatDuration(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TimeTracker() {
  const [status, setStatus]             = useState("idle"); // idle | active | on_break
  const [sessionId, setSessionId]       = useState(null);
  const [sessionStart, setSessionStart] = useState(null);
  const [breakStart, setBreakStart]     = useState(null);
  const [breakReason, setBreakReason]   = useState("Personal");
  const [elapsed, setElapsed]           = useState(0);
  const [breakElapsed, setBreakElapsed] = useState(0);
  const [todaySessions, setTodaySessions] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const timerRef  = useRef(null);
  const breakRef  = useRef(null);

  /* ── Fetch current status on mount ── */
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/activity/check-ongoing");
      const data = await res.json();

      if (data.has_ongoing_session) {
        setSessionId(data.session.id);
        setSessionStart(new Date(data.session.session_start_time));
        if (data.has_active_break) {
          setStatus("on_break");
          setBreakStart(new Date(data.active_break.start_time));
          setBreakReason(data.active_break.reason || "Personal");
        } else {
          setStatus("active");
        }
      } else {
        setStatus("idle");
      }

      setTodaySessions(data.today_sessions || []);
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  /* ── Session timer ── */
  useEffect(() => {
    if (status === "active" || status === "on_break") {
      timerRef.current = setInterval(() => {
        if (sessionStart) {
          setElapsed(Math.floor((Date.now() - sessionStart.getTime()) / 1000));
        }
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [status, sessionStart]);

  /* ── Break timer ── */
  useEffect(() => {
    if (status === "on_break" && breakStart) {
      breakRef.current = setInterval(() => {
        setBreakElapsed(Math.floor((Date.now() - breakStart.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(breakRef.current);
  }, [status, breakStart]);

  /* ── Actions ── */
  async function startSession() {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/activity/start-session", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSessionId(data.session_id);
      setSessionStart(new Date());
      setStatus("active");
      setElapsed(0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function endSession() {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/activity/end-session", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatus("idle");
      setSessionId(null);
      setSessionStart(null);
      setElapsed(0);
      fetchStatus(); // Refresh today's sessions
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function startBreak() {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/activity/start-break", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: breakReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatus("on_break");
      setBreakStart(new Date());
      setBreakElapsed(0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function endBreak() {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/activity/end-break", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatus("active");
      setBreakStart(null);
      setBreakElapsed(0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400">schedule</span>
            Time Tracker
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">Track your work sessions and breaks.</p>
        </div>
        {/* Status badge */}
        <div className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border
          ${status === "active"   ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
            status === "on_break" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                                    "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"}
        `}>
          <span className={`size-2 rounded-full ${
            status === "active" ? "bg-emerald-400 animate-pulse" :
            status === "on_break" ? "bg-orange-400 animate-pulse" :
            "bg-zinc-600"
          }`} />
          {status === "active" ? "Working" : status === "on_break" ? "On Break" : "Offline"}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          {error}
        </div>
      )}

      {/* ── Main control panel ── */}
      <div className="bg-[#161616] border border-[#252525] rounded-2xl p-6">

        {/* IDLE STATE */}
        {status === "idle" && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="size-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-400 text-4xl">play_circle</span>
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">Ready to start your shift?</p>
              <p className="text-sm text-zinc-500 mt-1">Click below to begin tracking your work session.</p>
            </div>
            <button
              onClick={startSession}
              disabled={loading}
              className="px-10 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm
                         disabled:opacity-40 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30
                         flex items-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : <span className="material-symbols-outlined text-lg">play_arrow</span>}
              Start Session
            </button>
          </div>
        )}

        {/* ACTIVE STATE */}
        {status === "active" && (
          <div className="flex flex-col gap-6">
            {/* Timer */}
            <div className="text-center">
              <div className="text-5xl font-mono font-bold text-white tracking-wider mb-2">
                {formatDuration(elapsed)}
              </div>
              <p className="text-xs text-zinc-500">Session duration</p>
            </div>

            {/* Break controls */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-3 font-medium">Take a break:</p>
              <div className="flex items-center gap-3">
                <select
                  value={breakReason}
                  onChange={(e) => setBreakReason(e.target.value)}
                  className="flex-1 bg-[#141414] border border-[#333] rounded-lg px-3 py-2 text-sm text-white
                             focus:outline-none focus:border-blue-500/50"
                >
                  {BREAK_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button
                  onClick={startBreak}
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-orange-500/15 border border-orange-500/20
                             text-orange-400 text-sm font-semibold hover:bg-orange-500/25 transition-all
                             disabled:opacity-40 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">coffee</span>
                  Start Break
                </button>
              </div>
            </div>

            {/* End session */}
            <button
              onClick={endSession}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20
                         text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all
                         disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">stop_circle</span>
              End Session
            </button>
          </div>
        )}

        {/* ON BREAK STATE */}
        {status === "on_break" && (
          <div className="flex flex-col gap-6">
            {/* Session timer (dimmed) */}
            <div className="text-center opacity-50">
              <div className="text-2xl font-mono text-zinc-400 tracking-wider">
                {formatDuration(elapsed)}
              </div>
              <p className="text-xs text-zinc-600">Session</p>
            </div>

            {/* Break timer (prominent) */}
            <div className="text-center bg-orange-500/5 border border-orange-500/15 rounded-xl py-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="material-symbols-outlined text-orange-400 animate-pulse">coffee</span>
                <span className="text-sm text-orange-400 font-semibold">{breakReason} Break</span>
              </div>
              <div className="text-4xl font-mono font-bold text-orange-300 tracking-wider">
                {formatDuration(breakElapsed)}
              </div>
            </div>

            <button
              onClick={endBreak}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold
                         disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">play_arrow</span>
              End Break & Resume Work
            </button>
          </div>
        )}
      </div>

      {/* ── Today's Sessions ── */}
      {todaySessions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base text-zinc-600">history</span>
            Today&apos;s Sessions
          </h3>
          <div className="flex flex-col gap-2">
            {todaySessions.map((sess, i) => (
              <div
                key={sess.id}
                className="flex items-center justify-between bg-[#161616] border border-[#252525] rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-600 font-mono w-6">#{i + 1}</span>
                  <div>
                    <div className="text-sm text-white font-medium">
                      {new Date(sess.session_start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" → "}
                      {sess.session_end_time
                        ? new Date(sess.session_end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "ongoing"}
                    </div>
                    <div className="text-xs text-zinc-600">
                      {sess.break_count} break{sess.break_count !== 1 ? "s" : ""} · {formatDuration(sess.total_break_duration)} break time
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-white">{formatDuration(sess.session_duration)}</div>
                  {sess.total_overtime > 0 && (
                    <span className="text-[10px] text-purple-400">+{formatDuration(sess.total_overtime)} OT</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
