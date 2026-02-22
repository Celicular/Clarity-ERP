/* ─────────────────────────────────────────────────────────────────────────────
   app/login/page.js  —  Route: '/login'
   Connected to /api/auth/login. Shows error messages, redirects on success.
───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState }    from "react";
import { useRouter }   from "next/navigation";
import Link            from "next/link";

export default function LoginPage() {
  const router = useRouter();

  /* ── State ── */
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  /* ── Submit ── */
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res  = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
        return;
      }

      // Redirect to dashboard — middleware will enforce auth from here
      router.push("/dashboard");
      router.refresh();

    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#141414] flex flex-col items-center justify-center px-4 overflow-hidden">

      {/* ── Background orbs ── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-900/5 rounded-full blur-[100px]" />
      </div>

      {/* ── Subtle grid overlay ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Top nav ── */}
      <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 lg:px-12 py-4 z-10">
        <Link href="/" className="flex items-center gap-2 text-white group">
          <span className="material-symbols-outlined text-xl group-hover:text-gray-300 transition-colors">
            grid_view
          </span>
          <span className="text-base font-bold tracking-tight group-hover:text-gray-300 transition-colors">
            Clarity
          </span>
        </Link>
        <Link
          href="/"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to site
        </Link>
      </nav>

      {/* ── Login card ── */}
      <div className="relative z-10 w-full max-w-[400px]">

        {/* Card outer glow */}
        <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 to-white/0 rounded-2xl blur-[2px] opacity-50" />

        <div className="relative glass-panel rounded-2xl p-8 flex flex-col gap-6">

          {/* Header */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-center size-11 rounded-xl bg-white/5 border border-white/8 mb-2 self-start">
              <span className="material-symbols-outlined text-white/70">lock</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-zinc-500">
              Sign in to your Clarity workspace.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-900/20 border border-red-900/30 text-red-400 text-sm">
              <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
              {error}
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium text-zinc-400 uppercase tracking-wider"
                htmlFor="email"
              >
                Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[18px] pointer-events-none">
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full h-10 pl-10 pr-4 bg-white/5 border border-white/8 rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-medium text-zinc-400 uppercase tracking-wider"
                  htmlFor="password"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[18px] pointer-events-none">
                  lock
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 pl-10 pr-10 bg-white/5 border border-white/8 rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full h-10 rounded-lg bg-white text-black text-sm font-bold hover:bg-gray-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin size-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </>
              )}
            </button>
          </form>

        </div>

        {/* Security note */}
        <p className="mt-4 text-center text-[11px] text-zinc-700 flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-[13px]">shield</span>
          256-bit SSL encryption · SOC 2 Type II certified
        </p>
      </div>

    </div>
  );
}
