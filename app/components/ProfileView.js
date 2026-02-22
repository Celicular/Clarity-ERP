/* ─────────────────────────────────────────────────────────────────────────────
   app/components/ProfileView.js
   My Profile panel — fetches user data, allows editing based on role.
   Admin: can edit everything
   Employee: email, name, phone are read-only; rest is editable
───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect } from "react";

export default function ProfileView({ user }) {
  const isAdmin = user.role === "ADMIN";

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  // User fields
  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");

  // Detail fields
  const [fullName, setFullName]             = useState("");
  const [phoneNumber, setPhoneNumber]       = useState("");
  const [dateOfBirth, setDateOfBirth]       = useState("");
  const [gender, setGender]                 = useState("");
  const [address, setAddress]               = useState("");
  const [city, setCity]                     = useState("");
  const [state, setState]                   = useState("");
  const [postalCode, setPostalCode]         = useState("");
  const [country, setCountry]               = useState("");
  const [employeeType, setEmployeeType]     = useState("");
  const [department, setDepartment]         = useState("");
  const [designation, setDesignation]       = useState("");
  const [checkInTime, setCheckInTime]       = useState("");
  const [checkOutTime, setCheckOutTime]     = useState("");
  const [bankAccount, setBankAccount]       = useState("");
  const [bankName, setBankName]             = useState("");
  const [ifscCode, setIfscCode]             = useState("");

  /* ── Fetch profile on mount ── */
  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch("/api/profile");
        const data = await res.json();

        if (data.user) {
          setName(data.user.name || "");
          setEmail(data.user.email || "");
        }

        if (data.details) {
          setFullName(data.details.full_name || "");
          setPhoneNumber(data.details.phone_number || "");
          setDateOfBirth(data.details.date_of_birth ? data.details.date_of_birth.split("T")[0] : "");
          setGender(data.details.gender || "");
          setAddress(data.details.address || "");
          setCity(data.details.city || "");
          setState(data.details.state || "");
          setPostalCode(data.details.postal_code || "");
          setCountry(data.details.country || "");
          setEmployeeType(data.details.employee_type || "Full-Time");
          setDepartment(data.details.department || "");
          setDesignation(data.details.designation || "");
          setCheckInTime(data.details.check_in_time || "");
          setCheckOutTime(data.details.check_out_time || "");
          setBankAccount(data.details.bank_account_number || "");
          setBankName(data.details.bank_name || "");
          setIfscCode(data.details.ifsc_code || "");
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  /* ── Save profile ── */
  async function handleSave() {
    setSaving(true); setError(""); setSuccess("");
    try {
      const body = {
        name: isAdmin ? name : undefined,
        full_name: isAdmin ? fullName : undefined,
        phone_number: isAdmin ? phoneNumber : undefined,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        address, city, state, postal_code: postalCode, country,
        employee_type: employeeType,
        department, designation,
        check_in_time: checkInTime, check_out_time: checkOutTime,
        bank_account_number: bankAccount || null,
        bank_name: bankName || null,
        ifsc_code: ifscCode || null,
      };

      const res  = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess("Profile saved!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  /* ── Reusable input ── */
  function Input({ label, value, onChange, type = "text", disabled = false, placeholder = "" }) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-400">
          {label}
          {disabled && <span className="ml-1 text-zinc-600">(locked)</span>}
        </label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5
            text-sm text-white placeholder:text-zinc-600
            focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20
            transition-all
            ${disabled ? "opacity-50 cursor-not-allowed bg-[#141414]" : ""}
          `}
        />
      </div>
    );
  }

  function Select({ label, value, onChange, options, disabled = false }) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-400">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5
            text-sm text-white
            focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20
            transition-all
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <option value="">Select...</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin size-6 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400">account_circle</span>
            My Profile
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {isAdmin ? "You can edit all fields." : "Some fields are locked by your admin."}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold
                     disabled:opacity-40 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          {saving ? (
            <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : <span className="material-symbols-outlined text-base">save</span>}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* ── Messages ── */}
      {error && (
        <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span> {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span> {success}
        </div>
      )}

      {/* ── Account Info ── */}
      <section className="bg-[#161616] border border-[#252525] rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-zinc-500">badge</span>
          Account Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Display Name" value={name} onChange={setName} disabled={!isAdmin} />
          <Input label="Email" value={email} onChange={() => {}} disabled={true} />
        </div>
      </section>

      {/* ── Personal Info ── */}
      <section className="bg-[#161616] border border-[#252525] rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-zinc-500">person</span>
          Personal Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name" value={fullName} onChange={setFullName} disabled={!isAdmin} />
          <Input label="Phone Number" value={phoneNumber} onChange={setPhoneNumber} disabled={!isAdmin} />
          <Input label="Date of Birth" type="date" value={dateOfBirth} onChange={setDateOfBirth} />
          <Select label="Gender" value={gender} onChange={setGender} options={["Male", "Female", "Other"]} />
        </div>
      </section>

      {/* ── Address ── */}
      <section className="bg-[#161616] border border-[#252525] rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-zinc-500">home</span>
          Address
        </h3>
        <div className="flex flex-col gap-4">
          <Input label="Street Address" value={address} onChange={setAddress} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="City" value={city} onChange={setCity} />
            <Input label="State" value={state} onChange={setState} />
            <Input label="Postal Code" value={postalCode} onChange={setPostalCode} />
          </div>
          <Input label="Country" value={country} onChange={setCountry} />
        </div>
      </section>

      {/* ── Work Schedule ── */}
      <section className="bg-[#161616] border border-[#252525] rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-zinc-500">work</span>
          Work Schedule
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Employee Type" value={employeeType} onChange={setEmployeeType}
                  options={["Full-Time", "Part-Time", "Contract", "Intern"]} />
          <Input label="Department" value={department} onChange={setDepartment} />
          <Input label="Designation" value={designation} onChange={setDesignation} />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Input label="Check-in Time" type="time" value={checkInTime} onChange={setCheckInTime} />
          <Input label="Check-out Time" type="time" value={checkOutTime} onChange={setCheckOutTime} />
        </div>
      </section>

      {/* ── Banking ── */}
      <section className="bg-[#161616] border border-[#252525] rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-zinc-500">account_balance</span>
          Banking Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Account Number" value={bankAccount} onChange={setBankAccount} />
          <Input label="Bank Name" value={bankName} onChange={setBankName} />
          <Input label="IFSC Code" value={ifscCode} onChange={setIfscCode} />
        </div>
      </section>

    </div>
  );
}
