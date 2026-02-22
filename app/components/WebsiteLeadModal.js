"use client";

import { useState } from "react";

function OInput({ label, value, onChange, type = "text", required = false, placeholder = "" }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-medium text-zinc-400">
        {label} {required && <span className="text-orange-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5
                   text-sm text-[#aaa] placeholder:text-zinc-600 w-full
                   focus:outline-none focus:border-[#ff9900]/50 focus:ring-1 focus:ring-[#ff9900]/20
                   transition-all"
      />
    </div>
  );
}

function OSelect({ label, value, onChange, options, required = false }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs font-medium text-zinc-400">
        {label} {required && <span className="text-orange-400">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5
                   text-sm text-[#aaa] w-full
                   focus:outline-none focus:border-[#ff9900]/50 focus:ring-1 focus:ring-[#ff9900]/20
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

export default function WebsiteLeadModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requirement, setRequirement] = useState("");
  const [people, setPeople] = useState("");
  const [budget, setBudget] = useState("");

  if (!isOpen) return null;

  async function handleSubmit() {
    setError("");

    if (!name || !email) {
      setError("Name and Email are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/website-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          company,
          email,
          phone,
          requirement,
          people: people ? parseInt(people, 10) : null,
          budget,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        // Reset form
        setName("");
        setCompany("");
        setEmail("");
        setPhone("");
        setRequirement("");
        setPeople("");
        setBudget("");
      }, 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-[#141414] border border-[#252525] rounded-2xl shadow-[0_0_50px_rgba(255,153,0,0.05)] overflow-hidden relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-[#ff9900] transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            Get Started with Clarity
          </h2>
          <p className="text-sm text-[#aaa] mt-1">
            Let us know your requirements and our team will get back to you shortly.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-8 mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}
        {success && (
          <div className="mx-8 mb-4 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            Thank you! Your request has been received.
          </div>
        )}

        {/* Content */}
        {!success && (
          <div className="px-8 pb-8 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <OInput label="Full Name" value={name} onChange={setName} required placeholder="John Doe" />
              <OInput label="Company Name" value={company} onChange={setCompany} placeholder="Acme Corp" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <OInput label="Email" type="email" value={email} onChange={setEmail} required placeholder="john@example.com" />
              <OInput label="Phone Number" value={phone} onChange={setPhone} placeholder="+1 234 567 890" />
            </div>

            <OSelect
              label="Primary Requirement"
              value={requirement}
              onChange={setRequirement}
              options={["CRM & Sales", "Project Management", "Finance & Billing", "HR & Leaves", "All-in-One OS"]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <OInput label="Team Size" type="number" value={people} onChange={setPeople} placeholder="e.g. 50" />
              <OSelect
                label="Budget Horizon"
                value={budget}
                onChange={setBudget}
                options={["Under $5k", "$5k - $20k", "$20k - $50k", "$50k+"]}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !name || !email}
              className="mt-4 w-full py-3.5 rounded-xl bg-[#2a2a2a] hover:bg-[#ff9900]/20 border border-[#444] hover:border-[#ff9900]/50 text-[#aaa] hover:text-[#ff9900] text-sm font-bold
                         disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <span className="material-symbols-outlined text-base">send</span>
              )}
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
