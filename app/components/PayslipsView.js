/* ─────────────────────────────────────────────────────────────────────────────
   app/components/PayslipsView.js
   Payroll Management — dual view:
   • Admin: create payslips, view all, see employee breakdown
   • Employee: view own payslips, mark as received, expandable detail view
───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Field helpers — outside component to prevent remount ── */
function PInput({ label, value, onChange, type = "text", placeholder = "", required = false }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-400">{label} {required && <span className="text-orange-400">*</span>}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600
                   focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all" />
    </div>
  );
}
function PSelect({ label, value, onChange, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white
                   focus:outline-none focus:border-blue-500/50 transition-all">{children}</select>
    </div>
  );
}

function fmt(n) { return parseFloat(n || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" }); }
function Spinner() {
  return (
    <svg className="animate-spin size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function PayslipDetailPanel({ payslipId, onClose, currentUser }) {
  const [slip, setSlip]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    fetch(`/api/payslips/${payslipId}`)
      .then((r) => r.json())
      .then((d) => setSlip(d.payslip))
      .finally(() => setLoading(false));
  }, [payslipId]);

  async function markReceived() {
    setMarking(true);
    const res  = await fetch(`/api/payslips/${payslipId}/mark-received`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setSlip((prev) => ({ ...prev, received_at: new Date().toISOString() }));
    } else {
      alert(data.error);
    }
    setMarking(false);
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner /></div>;
  if (!slip)   return <div className="p-6 text-zinc-500 text-sm">Payslip not found.</div>;

  const canMarkReceived = currentUser.role === "EMPLOYEE" && !slip.received_at;

  return (
    <div className="bg-[#161616] border border-[#252525] rounded-2xl p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white">Payslip</h3>
          <p className="text-xs text-zinc-500">
            {new Date(slip.pay_period_start).toLocaleDateString("en-IN", { month: "long", year: "numeric" })} period
          </p>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Employee info */}
      {currentUser.role === "ADMIN" && (
        <div className="bg-[#111] rounded-xl p-4 border border-[#2a2a2a]">
          <p className="text-xs text-zinc-500 mb-0.5">Employee</p>
          <p className="text-sm font-semibold text-white">{slip.employee_name}</p>
          <p className="text-xs text-zinc-500">{slip.department} · {slip.designation}</p>
        </div>
      )}

      {/* Pay breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {/* Earnings */}
        <div className="bg-[#111] rounded-xl p-4 border border-[#2a2a2a]">
          <p className="text-xs font-semibold text-zinc-500 mb-3 uppercase tracking-wide">Earnings</p>
          {[
            ["Basic Pay", slip.basic_pay],
            ["HRA", slip.hra],
            ["Travel Allowance", slip.travel_allowance],
            ["Other", slip.other_additions],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs py-1">
              <span className="text-zinc-500">{k}</span>
              <span className="text-zinc-300">{fmt(v)}</span>
            </div>
          ))}
          <div className="border-t border-[#2a2a2a] mt-2 pt-2 flex justify-between text-xs font-bold">
            <span className="text-zinc-400">Gross Pay</span>
            <span className="text-white">{fmt(slip.gross_pay)}</span>
          </div>
        </div>
        {/* Deductions */}
        <div className="bg-[#111] rounded-xl p-4 border border-[#2a2a2a]">
          <p className="text-xs font-semibold text-zinc-500 mb-3 uppercase tracking-wide">Deductions</p>
          {[
            ["PF", slip.pf_deduction],
            ["Tax (TDS)", slip.tax_deduction],
            ["Other", slip.other_deductions],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs py-1">
              <span className="text-zinc-500">{k}</span>
              <span className="text-red-400">{fmt(v)}</span>
            </div>
          ))}
          <div className="border-t border-[#2a2a2a] mt-2 pt-2 flex justify-between text-xs font-bold">
            <span className="text-zinc-400">Total Deductions</span>
            <span className="text-red-400">{fmt(slip.total_deductions)}</span>
          </div>
        </div>
      </div>

      {/* Net pay */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">Net Pay</p>
          <p className="text-2xl font-bold text-white mt-0.5">{fmt(slip.net_pay)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">{slip.payment_mode}</p>
          {slip.payment_date && <p className="text-xs text-zinc-400 mt-0.5">{new Date(slip.payment_date).toLocaleDateString()}</p>}
          <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded border mt-1 ${slip.status === "paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>
            {slip.status}
          </span>
        </div>
      </div>

      {slip.notes && <p className="text-xs text-zinc-500 italic">{slip.notes}</p>}

      {/* Mark received */}
      {canMarkReceived && (
        <button onClick={markReceived} disabled={marking}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
          {marking ? <Spinner /> : <span className="material-symbols-outlined text-base">done_all</span>}
          {marking ? "Confirming…" : "Mark as Received"}
        </button>
      )}
      {slip.received_at && (
        <p className="text-center text-xs text-emerald-400 flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          Received on {new Date(slip.received_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────── Main Component ─────────────────────────────── */
export default function PayslipsView({ user }) {
  const isAdmin = user.role === "ADMIN";

  const [payslips, setPayslips]     = useState([]);
  const [allUsers, setAllUsers]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showDetail, setShowDetail] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");
  const [toast, setToast]           = useState("");

  // Create form state
  const [fUser, setFUser]           = useState("");
  const [fPeriodStart, setFPeriodStart] = useState("");
  const [fPeriodEnd, setFPeriodEnd] = useState("");
  const [fBasic, setFBasic]         = useState("");
  const [fHra, setFHra]             = useState("");
  const [fTravel, setFTravel]       = useState("");
  const [fOtherAdd, setFOtherAdd]   = useState("");
  const [fPf, setFPf]               = useState("");
  const [fTax, setFTax]             = useState("");
  const [fOtherDed, setFOtherDed]   = useState("");
  const [fPayMode, setFPayMode]     = useState("Bank Transfer");
  const [fPayDate, setFPayDate]     = useState("");
  const [fNotes, setFNotes]         = useState("");

  // Computed totals
  const gross = (+fBasic || 0) + (+fHra || 0) + (+fTravel || 0) + (+fOtherAdd || 0);
  const deds  = (+fPf || 0) + (+fTax || 0) + (+fOtherDed || 0);
  const net   = gross - deds;

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const fetchPayslips = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/payslips");
      const data = await res.json();
      setPayslips(data.payslips || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchPayslips();
    if (isAdmin) {
      fetch("/api/users?status=Active&role=EMPLOYEE")
        .then((r) => r.json())
        .then((d) => setAllUsers(d.users || []));
    }
  }, [fetchPayslips, isAdmin]);

  function resetForm() {
    setFUser(""); setFPeriodStart(""); setFPeriodEnd("");
    setFBasic(""); setFHra(""); setFTravel(""); setFOtherAdd("");
    setFPf(""); setFTax(""); setFOtherDed("");
    setFPayMode("Bank Transfer"); setFPayDate(""); setFNotes("");
    setFormError("");
  }

  async function handleCreate() {
    if (!fUser || !fPeriodStart || !fPeriodEnd) { setFormError("Employee and pay period are required."); return; }
    setSaving(true); setFormError("");
    try {
      const res  = await fetch("/api/payslips", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: fUser, pay_period_start: fPeriodStart, pay_period_end: fPeriodEnd,
          basic_pay: fBasic, hra: fHra, travel_allowance: fTravel, other_additions: fOtherAdd,
          pf_deduction: fPf, tax_deduction: fTax, other_deductions: fOtherDed,
          payment_mode: fPayMode, payment_date: fPayDate || null, notes: fNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowCreateForm(false); resetForm(); fetchPayslips(); showToast("Payslip created.");
    } catch (e) { setFormError(e.message); }
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
            <span className="material-symbols-outlined text-blue-400">receipt_long</span>
            Payslips
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {isAdmin ? "Create and manage employee payslips." : "Your salary payslips."}
          </p>
        </div>
        {isAdmin && !showCreateForm && (
          <button onClick={() => setShowCreateForm(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold
                       transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20">
            <span className="material-symbols-outlined text-base">add</span> Create Payslip
          </button>
        )}
      </div>

      {/* Detail panel (slide-in replacement) */}
      {showDetail ? (
        <PayslipDetailPanel
          payslipId={showDetail}
          currentUser={user}
          onClose={() => { setShowDetail(null); fetchPayslips(); }}
        />
      ) : (
        <>
          {/* Create form (admin) */}
          {isAdmin && showCreateForm && (
            <div className="bg-[#161616] border border-[#252525] rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Create Payslip</h3>
                <button onClick={() => { setShowCreateForm(false); resetForm(); }} className="text-zinc-500 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              {formError && (
                <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>{formError}
                </div>
              )}
              {/* Employee + Period */}
              <div className="grid grid-cols-3 gap-4">
                <PSelect label="Employee *" value={fUser} onChange={setFUser}>
                  <option value="">Select employee…</option>
                  {allUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </PSelect>
                <PInput label="Period Start" type="date" value={fPeriodStart} onChange={setFPeriodStart} required />
                <PInput label="Period End" type="date" value={fPeriodEnd} onChange={setFPeriodEnd} required />
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Earnings */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Earnings</p>
                  <PInput label="Basic Pay" type="number" value={fBasic} onChange={setFBasic} placeholder="0.00" />
                  <PInput label="HRA" type="number" value={fHra} onChange={setFHra} placeholder="0.00" />
                  <PInput label="Travel Allowance" type="number" value={fTravel} onChange={setFTravel} placeholder="0.00" />
                  <PInput label="Other Additions" type="number" value={fOtherAdd} onChange={setFOtherAdd} placeholder="0.00" />
                  <div className="text-xs text-zinc-400 pt-1">Gross: <span className="text-white font-semibold">{fmt(gross)}</span></div>
                </div>
                {/* Deductions */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Deductions</p>
                  <PInput label="PF" type="number" value={fPf} onChange={setFPf} placeholder="0.00" />
                  <PInput label="Tax (TDS)" type="number" value={fTax} onChange={setFTax} placeholder="0.00" />
                  <PInput label="Other Deductions" type="number" value={fOtherDed} onChange={setFOtherDed} placeholder="0.00" />
                  <div className="text-xs text-zinc-400 pt-1">Total Ded: <span className="text-red-400 font-semibold">{fmt(deds)}</span></div>
                </div>
              </div>

              {/* Net pay preview */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-zinc-400">Net Pay</span>
                <span className="text-xl font-bold text-white">{fmt(net)}</span>
              </div>

              {/* Payment */}
              <div className="grid grid-cols-3 gap-4">
                <PSelect label="Payment Mode" value={fPayMode} onChange={setFPayMode}>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </PSelect>
                <PInput label="Payment Date" type="date" value={fPayDate} onChange={setFPayDate} />
                <PInput label="Notes" value={fNotes} onChange={setFNotes} placeholder="Optional notes" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowCreateForm(false); resetForm(); }}
                  className="px-6 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-400 text-sm font-semibold transition-all">
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={saving}
                  className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center gap-2">
                  {saving ? <Spinner /> : <span className="material-symbols-outlined text-base">check</span>}
                  {saving ? "Creating…" : "Create Payslip"}
                </button>
              </div>
            </div>
          )}

          {/* Payslips table */}
          <div className="bg-[#161616] border border-[#252525] rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-zinc-500"><Spinner /><span className="text-sm">Loading…</span></div>
            ) : payslips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="material-symbols-outlined text-zinc-700 text-4xl">receipt_long</span>
                <p className="text-sm text-zinc-600">{isAdmin ? "No payslips created yet." : "No payslips issued to you yet."}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#252525]">
                      {isAdmin && <th className="text-left text-xs font-semibold text-zinc-500 px-5 py-3">Employee</th>}
                      <th className="text-left text-xs font-semibold text-zinc-500 px-5 py-3">Pay Period</th>
                      <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Net Pay</th>
                      <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Status</th>
                      <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Received</th>
                      <th className="text-right text-xs font-semibold text-zinc-500 px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslips.map((p, i) => (
                      <tr key={p.id} className={`hover:bg-white/2 transition-colors ${i < payslips.length - 1 ? "border-b border-[#1e1e1e]" : ""}`}>
                        {isAdmin && (
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-white">{p.employee_name}</div>
                            <div className="text-xs text-zinc-500">{p.employee_email}</div>
                          </td>
                        )}
                        <td className="px-5 py-3.5 text-xs text-zinc-400">
                          {new Date(p.pay_period_start).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                          {" → "}
                          {new Date(p.pay_period_end).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3.5 text-white font-semibold">{fmt(p.net_pay)}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${p.status === "paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-zinc-500">
                          {p.received_at ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">done_all</span>
                              {new Date(p.received_at).toLocaleDateString()}
                            </span>
                          ) : <span className="text-zinc-700">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button onClick={() => setShowDetail(p.id)}
                            className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors flex items-center gap-1 ml-auto">
                            <span className="material-symbols-outlined text-sm">open_in_new</span> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
