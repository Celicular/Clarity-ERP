/* ─────────────────────────────────────────────────────────────────────────────
   app/components/OnboardingModal.js
   Multi-step onboarding wizard shown on first login.
   Steps: 1) Change password  2) Personal info  3) Work schedule  4) Banking

   NOTE: Input and OSelect are defined OUTSIDE OnboardingModal so React
   doesn't remount them on every keystroke (which kills focus).
───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState } from "react";

const STEPS = [
  { id: 1, label: "Security", icon: "lock" },
  { id: 2, label: "Personal", icon: "person" },
  { id: 3, label: "Work",     icon: "schedule" },
  { id: 4, label: "Banking",  icon: "account_balance" },
];

/* ── Shared input — defined outside so it is stable across renders ── */
function OInput({ label, value, onChange, type = "text", required = false, placeholder = "" }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-400">
        {label} {required && <span className="text-orange-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5
                   text-sm text-white placeholder:text-zinc-600
                   focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20
                   transition-all"
      />
    </div>
  );
}

/* ── Shared select — defined outside for the same reason ── */
function OSelect({ label, value, onChange, options, required = false }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-400">
        {label} {required && <span className="text-orange-400">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5
                   text-sm text-white
                   focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20
                   transition-all"
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

export default function OnboardingModal({ onComplete }) {
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  // Step 1 — Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordDone, setPasswordDone]       = useState(false);

  // Step 2 — Personal
  const [fullName, setFullName]       = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender]           = useState("");
  const [address, setAddress]         = useState("");
  const [city, setCity]               = useState("");
  const [state, setState]             = useState("");
  const [postalCode, setPostalCode]   = useState("");
  const [country, setCountry]         = useState("");

  // Step 3 — Work
  const [employeeType, setEmployeeType] = useState("Full-Time");
  const [department, setDepartment]     = useState("");
  const [designation, setDesignation]   = useState("");
  const [checkInTime, setCheckInTime]   = useState("09:00");
  const [checkOutTime, setCheckOutTime] = useState("18:00");

  // Step 4 — Banking
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName]       = useState("");
  const [ifscCode, setIfscCode]       = useState("");

  /* ── Step 1: Change Password ── */
  async function handlePasswordReset() {
    setError(""); setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch("/api/onboarding/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess("Password updated!");
      setPasswordDone(true);
      setTimeout(() => { setStep(2); setSuccess(""); setError(""); }, 800);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  /* ── Steps 2-4: Complete Profile ── */
  async function handleCompleteProfile() {
    setError(""); setSuccess("");

    if (!fullName || !phoneNumber)    { setError("Name and phone are required."); return; }
    if (!department || !designation)  { setError("Department and designation are required."); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/onboarding/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName, phone_number: phoneNumber,
          date_of_birth: dateOfBirth || null, gender: gender || null,
          address, city, state, postal_code: postalCode, country,
          employee_type: employeeType, department, designation,
          check_in_time: checkInTime, check_out_time: checkOutTime,
          bank_account_number: bankAccount || null,
          bank_name: bankName || null,
          ifsc_code: ifscCode || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess("🎉 Welcome aboard!");
      setTimeout(() => onComplete?.(), 1200);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#141414] border border-[#252525] rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="px-8 pt-8 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400">waving_hand</span>
            Welcome! Let&apos;s set up your profile
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Complete these steps to get started.</p>
        </div>

        {/* ── Step indicator ── */}
        <div className="flex px-8 gap-2 mb-6">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                if (s.id === 1 || (s.id > 1 && passwordDone)) setStep(s.id);
              }}
              className={`
                flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all
                ${step === s.id
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                  : s.id < step || (s.id === 1 && passwordDone)
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-[#1a1a1a] text-zinc-600 border border-[#252525]"
                }
              `}
            >
              <span className="material-symbols-outlined text-sm">
                {s.id < step || (s.id === 1 && passwordDone) ? "check_circle" : s.icon}
              </span>
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Error / Success ── */}
        {error && (
          <div className="mx-8 mb-4 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}
        {success && (
          <div className="mx-8 mb-4 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            {success}
          </div>
        )}

        {/* ── Step content ── */}
        <div className="px-8 pb-8 max-h-[60vh] overflow-y-auto">

          {/* Step 1: Password */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <OInput label="Current Password" type="password" value={currentPassword} onChange={setCurrentPassword} required placeholder="Enter your default password" />
              <OInput label="New Password" type="password" value={newPassword} onChange={setNewPassword} required placeholder="Min 6 characters" />
              <OInput label="Confirm Password" type="password" value={confirmPassword} onChange={setConfirmPassword} required placeholder="Re-enter new password" />
              <button
                onClick={handlePasswordReset}
                disabled={loading || !currentPassword || !newPassword}
                className="mt-2 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold
                           disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : <span className="material-symbols-outlined text-base">lock_reset</span>}
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          )}

          {/* Step 2: Personal */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <OInput label="Full Name" value={fullName} onChange={setFullName} required placeholder="Your legal name" />
                <OInput label="Phone Number" value={phoneNumber} onChange={setPhoneNumber} required placeholder="+91 98765 43210" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <OInput label="Date of Birth" type="date" value={dateOfBirth} onChange={setDateOfBirth} />
                <OSelect label="Gender" value={gender} onChange={setGender} options={["Male", "Female", "Other"]} />
              </div>
              <OInput label="Address" value={address} onChange={setAddress} placeholder="Street address" />
              <div className="grid grid-cols-3 gap-4">
                <OInput label="City" value={city} onChange={setCity} />
                <OInput label="State" value={state} onChange={setState} />
                <OInput label="Postal Code" value={postalCode} onChange={setPostalCode} />
              </div>
              <OInput label="Country" value={country} onChange={setCountry} placeholder="India" />
              <div className="flex justify-end mt-2">
                <button onClick={() => setStep(3)} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all flex items-center gap-1">
                  Next <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Work */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <OSelect label="Employee Type" value={employeeType} onChange={setEmployeeType} options={["Full-Time", "Part-Time", "Contract", "Intern"]} required />
                <OInput label="Department" value={department} onChange={setDepartment} required placeholder="e.g. Engineering" />
              </div>
              <OInput label="Designation" value={designation} onChange={setDesignation} required placeholder="e.g. Software Engineer" />
              <div className="grid grid-cols-2 gap-4">
                <OInput label="Check-in Time" type="time" value={checkInTime} onChange={setCheckInTime} required />
                <OInput label="Check-out Time" type="time" value={checkOutTime} onChange={setCheckOutTime} required />
              </div>
              <p className="text-xs text-zinc-600">These define your shift window for overtime calculation.</p>
              <div className="flex justify-between mt-2">
                <button onClick={() => setStep(2)} className="px-6 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-zinc-400 hover:text-white text-sm font-semibold transition-all flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">arrow_back</span> Back
                </button>
                <button onClick={() => setStep(4)} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all flex items-center gap-1">
                  Next <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Banking */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-zinc-500">Banking details are optional and can be added later from your profile.</p>
              <OInput label="Bank Account Number" value={bankAccount} onChange={setBankAccount} placeholder="e.g. 1234567890" />
              <div className="grid grid-cols-2 gap-4">
                <OInput label="Bank Name" value={bankName} onChange={setBankName} placeholder="e.g. HDFC Bank" />
                <OInput label="IFSC Code" value={ifscCode} onChange={setIfscCode} placeholder="e.g. HDFC0001234" />
              </div>
              <div className="flex justify-between mt-2">
                <button onClick={() => setStep(3)} className="px-6 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-zinc-400 hover:text-white text-sm font-semibold transition-all flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">arrow_back</span> Back
                </button>
                <button
                  onClick={handleCompleteProfile}
                  disabled={loading || !fullName || !phoneNumber || !department || !designation}
                  className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold
                             disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : <span className="material-symbols-outlined text-base">check</span>}
                  {loading ? "Saving..." : "Complete Setup"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
