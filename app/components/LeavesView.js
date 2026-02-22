/* ─────────────────────────────────────────────────────────────────────────────
   app/components/LeavesView.js
   Leave Management — dual view:
   • Employee: submit requests + view own request history + status
   • Admin: filterable table of all requests + approve/reject
───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Input helpers — outside to prevent remount ── */
function LInput({ label, value, onChange, type = "text", placeholder = "", required = false, min, max }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-400">
        {label} {required && <span className="text-orange-400">*</span>}
      </label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} min={min} max={max}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white
                   placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50
                   focus:ring-1 focus:ring-blue-500/20 transition-all"
      />
    </div>
  );
}
function LSelect({ label, value, onChange, options, required = false }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-400">
        {label} {required && <span className="text-orange-400">*</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white
                   focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
function LTextarea({ label, value, onChange, placeholder = "", required = false }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-400">
        {label} {required && <span className="text-orange-400">*</span>}
      </label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} rows={3}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white
                   placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50
                   focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${map[status] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>
      {status}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

/* ───────────────────────────────────────────────────────────────── */
export default function LeavesView({ user }) {
  const isAdmin = user.role === "ADMIN";

  const [leaves, setLeaves]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch]         = useState("");
  const [toast, setToast]           = useState("");
  const [modal, setModal]           = useState(null); // "submit" | "reject"
  const [selected, setSelected]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [modalError, setModalError] = useState("");

  // Submit form
  const [leaveType, setLeaveType]     = useState("Casual");
  const [startDate, setStartDate]     = useState("");
  const [endDate, setEndDate]         = useState("");
  const [reason, setReason]           = useState("");
  const [criticality, setCriticality] = useState("Normal");
  const [rejectReason, setRejectReason] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (search) params.set("search", search);
      const res  = await fetch(`/api/leaves?${params}`);
      const data = await res.json();
      setLeaves(data.leaves || []);
    } finally { setLoading(false); }
  }, [filterStatus, search]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  function openSubmit() {
    setLeaveType("Casual"); setStartDate(""); setEndDate("");
    setReason(""); setCriticality("Normal"); setModalError("");
    setModal("submit");
  }
  function openReject(leave) { setSelected(leave); setRejectReason(""); setModalError(""); setModal("reject"); }
  function closeModal() { setModal(null); setSelected(null); setSaving(false); setModalError(""); }

  async function handleSubmit() {
    if (!startDate || !endDate || !reason) { setModalError("Start date, end date, and reason are required."); return; }
    setSaving(true); setModalError("");
    try {
      const res  = await fetch("/api/leaves", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leave_type: leaveType, start_date: startDate, end_date: endDate, reason, criticality }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      closeModal(); fetchLeaves(); showToast("Leave request submitted.");
    } catch (e) { setModalError(e.message); }
    finally { setSaving(false); }
  }

  async function handleApprove(id) {
    try {
      const res  = await fetch(`/api/leaves/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchLeaves(); showToast("Leave approved.");
    } catch (e) { showToast(e.message); }
  }

  async function handleReject() {
    if (!rejectReason) { setModalError("Rejection reason is required."); return; }
    setSaving(true); setModalError("");
    try {
      const res  = await fetch(`/api/leaves/${selected.id}/reject`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejection_reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      closeModal(); fetchLeaves(); showToast("Leave rejected.");
    } catch (e) { setModalError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col gap-6">
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>{toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400">event_busy</span>
            Leave Management
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {isAdmin ? "Review and manage employee leave requests." : "Submit and track your leave requests."}
          </p>
        </div>
        {!isAdmin && (
          <button onClick={openSubmit}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold
                       transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20">
            <span className="material-symbols-outlined text-base">add</span> Request Leave
          </button>
        )}
      </div>

      {/* Admin filters */}
      {isAdmin && (
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-lg pointer-events-none">search</span>
            <input type="text" placeholder="Search by employee…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white
                         placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-all" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all min-w-[140px]">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#161616] border border-[#252525] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-zinc-500"><Spinner /><span className="text-sm">Loading…</span></div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="material-symbols-outlined text-zinc-700 text-4xl">event_busy</span>
            <p className="text-sm text-zinc-600">{isAdmin ? "No leave requests found." : "You haven't submitted any leave requests yet."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#252525]">
                  {isAdmin && <th className="text-left text-xs font-semibold text-zinc-500 px-5 py-3">Employee</th>}
                  <th className="text-left text-xs font-semibold text-zinc-500 px-5 py-3">Type</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Dates</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Days</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Criticality</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Status</th>
                  {isAdmin && <th className="text-right text-xs font-semibold text-zinc-500 px-5 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {leaves.map((lv, i) => (
                  <tr key={lv.id} className={`hover:bg-white/2 transition-colors ${i < leaves.length - 1 ? "border-b border-[#1e1e1e]" : ""}`}>
                    {isAdmin && (
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-white">{lv.employee_name}</div>
                        <div className="text-xs text-zinc-500">{lv.employee_email}</div>
                      </td>
                    )}
                    <td className="px-5 py-3.5 text-zinc-300">{lv.leave_type}</td>
                    <td className="px-4 py-3.5 text-xs text-zinc-400">
                      {new Date(lv.start_date).toLocaleDateString()} → {new Date(lv.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-300">{lv.total_days}d</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${lv.criticality === "Emergency" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>
                        {lv.criticality}
                      </span>
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={lv.status} /></td>
                    {isAdmin && (
                      <td className="px-5 py-3.5">
                        {lv.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleApprove(lv.id)}
                              className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/8 transition-all"
                              title="Approve">
                              <span className="material-symbols-outlined text-base">check_circle</span>
                            </button>
                            <button onClick={() => openReject(lv)}
                              className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/8 transition-all"
                              title="Reject">
                              <span className="material-symbols-outlined text-base">cancel</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-600 px-5">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#141414] border border-[#252525] rounded-2xl shadow-2xl overflow-hidden">

            {/* Submit modal */}
            {modal === "submit" && (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-[#252525] flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400 text-xl">event_busy</span>
                    Request Leave
                  </h3>
                  <button onClick={closeModal} className="text-zinc-500 hover:text-white"><span className="material-symbols-outlined text-xl">close</span></button>
                </div>
                <div className="px-6 py-5 flex flex-col gap-4">
                  {modalError && (
                    <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">error</span>{modalError}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <LSelect label="Leave Type" value={leaveType} onChange={setLeaveType} options={[{value:"Casual",label:"Casual"},{value:"Emergency",label:"Emergency"}]} />
                    <LSelect label="Criticality" value={criticality} onChange={setCriticality} options={[{value:"Normal",label:"Normal"},{value:"Emergency",label:"Emergency"}]} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <LInput label="Start Date" type="date" value={startDate} onChange={setStartDate} required />
                    <LInput label="End Date" type="date" value={endDate} onChange={setEndDate} required min={startDate} />
                  </div>
                  <LTextarea label="Reason" value={reason} onChange={setReason} required placeholder="Explain the reason for leave…" />
                  <div className="flex gap-3 pt-2">
                    <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-zinc-400 text-sm font-semibold transition-all">Cancel</button>
                    <button onClick={handleSubmit} disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                      {saving ? <Spinner /> : <span className="material-symbols-outlined text-base">send</span>}
                      {saving ? "Submitting…" : "Submit Request"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Reject modal */}
            {modal === "reject" && selected && (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-[#252525] flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-400 text-xl">cancel</span>
                    Reject Leave Request
                  </h3>
                  <button onClick={closeModal} className="text-zinc-500 hover:text-white"><span className="material-symbols-outlined text-xl">close</span></button>
                </div>
                <div className="px-6 py-5 flex flex-col gap-4">
                  {modalError && (
                    <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">error</span>{modalError}
                    </div>
                  )}
                  <p className="text-sm text-zinc-400">Rejecting <span className="text-white font-medium">{selected.employee_name}</span>&apos;s request ({selected.total_days} day{selected.total_days !== 1 ? "s" : ""}).</p>
                  <LTextarea label="Rejection Reason" value={rejectReason} onChange={setRejectReason} required placeholder="Explain why the leave was rejected…" />
                  <div className="flex gap-3 pt-2">
                    <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-zinc-400 text-sm font-semibold transition-all">Cancel</button>
                    <button onClick={handleReject} disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                      {saving ? <Spinner /> : <span className="material-symbols-outlined text-base">cancel</span>}
                      {saving ? "Rejecting…" : "Reject"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
