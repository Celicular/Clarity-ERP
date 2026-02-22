"use client";

import { useState } from "react";

export default function PasswordReentryModal({ isOpen, onClose, onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) {
      setError("Password is required");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        onSuccess();
        setPassword("");
      } else {
        setError(data.error || "Invalid password. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    setPassword("");
    setError("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="glass-card w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-fade-in-up border border-white/10"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
            <span className="material-symbols-outlined text-xl">shield_lock</span>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Restricted Area</h3>
            <p className="text-xs text-zinc-400">Re-enter password to continue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="Enter your password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all font-mono"
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-lg border border-white/10 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                "Unlock"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
