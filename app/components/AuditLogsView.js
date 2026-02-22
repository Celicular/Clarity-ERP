"use client";

import { useState, useEffect } from "react";

export default function AuditLogsView({ user, onViewChange }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ activeSessions: 0, failedLogins: 0, criticalEvents: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchLogs() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auditlogs");
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        if (data.stats) setStats(data.stats);
      } else {
        throw new Error(data.error || "Failed to load logs");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  const getStatusColor = (status) => {
    // Normalize to handle case variations
    const s = String(status).toUpperCase();
    switch(s) {
      case "SUCCESS":
      case "LOW":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "WARNING":
      case "MEDIUM":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "CRITICAL":
      case "HIGH":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default: 
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in-up">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">System Audit Logs</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-red-500/20 text-red-500 border border-red-500/30 uppercase">
              Restricted
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Immutable ledger of system events, access requests, and configuration changes.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchLogs}
            disabled={isLoading}
            title="Refresh Logs"
            className="flex items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium text-white transition-colors border border-white/5 text-nowrap">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Events (24h)", value: logs.length, icon: "monitoring", color: "text-blue-400" },
          { label: "Failed Logins", value: stats.failedLogins, icon: "gpp_bad", color: "text-red-400" },
          { label: "Critical Events", value: stats.criticalEvents, icon: "warning", color: "text-yellow-400" },
          { label: "Active Sessions", value: stats.activeSessions, icon: "public", color: "text-emerald-400" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 rounded-xl border border-white/5">
            <div className={`size-8 rounded-lg bg-white/5 flex items-center justify-center mb-3 ${stat.color}`}>
              <span className="material-symbols-outlined text-[18px]">{stat.icon}</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {isLoading ? "-" : stat.value}
            </div>
            <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Logs Table ── */}
      <div className="flex-1 glass-card rounded-xl border border-white/5 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-zinc-400 text-[18px]">filter_list</span>
            <span className="text-sm font-medium text-zinc-300">Latest Activity</span>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[16px]">search</span>
            <input 
              type="text" 
              placeholder="Search logs..." 
              className="w-64 bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500 bg-black/10">
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">Target / Details</th>
                <th className="px-6 py-3 font-medium">IP Address</th>
                <th className="px-6 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm text-zinc-300">
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-semibold text-white bg-white/5 px-2 py-1 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400">{log.target || "-"}</td>
                  <td className="px-6 py-4 font-mono text-xs text-zinc-500">{log.ip || "-"}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusColor(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading && (
            <div className="p-8 text-center text-zinc-500 text-sm flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin">refresh</span>
              Loading audit logs...
            </div>
          )}
          {!isLoading && error && (
            <div className="p-8 text-center text-red-500 text-sm">{error}</div>
          )}
          {!isLoading && !error && logs.length === 0 && (
            <div className="p-8 text-center text-zinc-500 text-sm">No logs found matching your criteria.</div>
          )}
        </div>
      </div>
    </div>
  );
}
