/* ─────────────────────────────────────────────────────────────────────────────
   app/components/HomePage.js
   Full homepage component — routed at '/' via app/page.js
───────────────────────────────────────────────────────────────────────────── */
"use client";

import Link from "next/link";
import { useState } from "react";
import WebsiteLeadModal from "./WebsiteLeadModal";

export default function HomePage() {
  const [showLeadModal, setShowLeadModal] = useState(false);

  return (
    <div className="relative flex w-full flex-col bg-[#141414]">

      {/* ─── Header / Navbar ──────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#303030] px-6 lg:px-40 py-3 z-50 bg-[#141414]/90 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-4 text-white">
          <div className="size-6 text-white">
            <span className="material-symbols-outlined text-2xl">grid_view</span>
          </div>
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Clarity</h2>
        </div>

        {/* Desktop Nav */}
        <div className="hidden lg:flex flex-1 justify-end gap-8">
          <div className="flex items-center gap-9">
            {[
              { label: "Features", href: "/features" },
              { label: "Solutions", href: "/solutions" },
              { label: "Pricing", href: "/solutions#pricing" },
              { label: "About", href: "/about" },
            ].map((link) => (
              <Link key={link.label} href={link.href} className="text-white text-sm font-medium leading-normal hover:text-gray-300 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex gap-2">
            {/* Use Link styled as a button — avoids invalid <a><button> nesting */}
            <Link
              href="/login"
              className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-[#303030] hover:bg-[#404040] transition-colors text-white text-sm font-bold leading-normal tracking-[0.015em]"
            >
              Log In
            </Link>
            <button
              onClick={() => setShowLeadModal(true)}
              className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-[#aaa] text-black hover:bg-[#ff9900] hover:text-white transition-colors text-sm font-bold leading-normal tracking-[0.015em]"
            >
              <span className="truncate">Get Started</span>
            </button>
          </div>
        </div>

        {/* Mobile Hamburger */}
        <div className="lg:hidden text-white">
          <span className="material-symbols-outlined">menu</span>
        </div>
      </header>

      {/* ─── Hero Section ─────────────────────────────────────────────────────── */}
      <div className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[128px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto gap-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#303030]/50 border border-[#474747] backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-gray-300">v2.0 is live</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1.1]">
            <span className="text-gradient">From Chaos to</span><br />
            <span className="text-gradient">Absolute Clarity</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl leading-relaxed">
            Experience the transformation from scattered tools to a unified operating system. The last workspace you will ever need.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <button
              onClick={() => setShowLeadModal(true)}
              className="flex items-center justify-center h-12 px-8 rounded-lg bg-[#aaa] text-black text-base font-bold hover:bg-[#ff9900] hover:text-white transition-all transform hover:scale-105"
            >
              Start for free
            </button>
            <button className="flex items-center justify-center h-12 px-8 rounded-lg bg-[#303030] text-white border border-[#474747] text-base font-medium hover:bg-[#404040] transition-all group">
              <span>See how it works</span>
              <span className="material-symbols-outlined ml-2 text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 animate-bounce">
          <span className="text-xs uppercase tracking-widest text-gray-500">Scroll</span>
          <span className="material-symbols-outlined text-gray-500">expand_more</span>
        </div>
      </div>

      {/* ─── The Problem Section ──────────────────────────────────────────────── */}
      <section className="relative z-10 w-full bg-[#141414] py-24 overflow-hidden">

        {/* Subtle ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-900/5 rounded-full blur-[120px]" />
        </div>

        <div className="layout-container px-6 lg:px-40 flex flex-col md:flex-row items-center gap-16 relative z-10">

          {/* Left: text */}
          <div className="flex-1 flex flex-col gap-6 max-w-lg">
            <div className="inline-flex self-start items-center gap-2 px-3 py-1 rounded border border-red-900/30 bg-red-900/10 text-red-400 text-xs font-bold uppercase tracking-wider">
              The Problem
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white/40 blur-[0.5px]">
              Scattered Tools. <br />
              <span className="text-white/30">Manual Transitions.</span>
            </h2>
            <p className="text-zinc-500 text-lg leading-relaxed max-w-md">
              Your data is fragmented across dozens of disconnected apps. Every
              hour, your team wastes precious time moving data between
              incompatible systems manually.
            </p>

            {/* Pain points — visual chips */}
            <div className="flex flex-col gap-3 mt-2">
              {[
                { icon: "database", label: "Data Silos", desc: "Information trapped in separate apps" },
                { icon: "layers_clear", label: "Lost Context", desc: "No single source of truth" },
                { icon: "hourglass_empty", label: "Slow Workflows", desc: "Hours lost to manual data entry" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4 p-3 rounded-lg bg-red-950/20 border border-red-900/15 group hover:border-red-900/30 transition-colors">
                  <div className="flex items-center justify-center size-9 rounded-lg bg-red-900/20 text-red-500 shrink-0">
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-red-400">{item.label}</div>
                    <div className="text-xs text-zinc-600">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: redesigned "app chaos" visual */}
          <div className="flex-1 w-full h-[480px] relative">
            <div className="relative w-full h-full">

              {/* Central "no connection" hub */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 size-16 rounded-full bg-[#1a1a1a] border-2 border-dashed border-red-900/40 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500/60 text-2xl">link_off</span>
              </div>

              {/* Dashed connector lines (SVG) */}
              <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <line x1="50%" y1="50%" x2="15%" y2="18%" stroke="rgba(239,68,68,0.12)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="50%" y1="50%" x2="82%" y2="22%" stroke="rgba(239,68,68,0.12)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="50%" y1="50%" x2="10%" y2="72%" stroke="rgba(239,68,68,0.12)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="50%" y1="50%" x2="85%" y2="68%" stroke="rgba(239,68,68,0.12)" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="50%" y1="50%" x2="50%" y2="88%" stroke="rgba(239,68,68,0.12)" strokeWidth="1" strokeDasharray="4 4" />
              </svg>

              {/* Fragment app cards — scattered around the hub */}

              {/* CRM — top left */}
              <div className="absolute top-[8%] left-[4%] w-[155px] bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl p-3 opacity-70 hover:opacity-100 transition-opacity animate-float" style={{ animationDuration: "7s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-7 rounded-md bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <span className="material-symbols-outlined text-sm">contacts</span>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-300">CRM</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-[#2e2e2e] rounded" />
                  <div className="h-1.5 w-3/4 bg-[#2e2e2e] rounded" />
                  <div className="h-1.5 w-5/6 bg-[#2e2e2e] rounded" />
                </div>
                <div className="mt-2 text-[10px] text-purple-400/60 font-mono">1,248 records</div>
              </div>

              {/* Email — top right */}
              <div className="absolute top-[5%] right-[5%] w-[148px] bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl p-3 opacity-65 hover:opacity-100 transition-opacity animate-float-delayed" style={{ animationDuration: "9s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-7 rounded-md bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <span className="material-symbols-outlined text-sm">mail</span>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-300">Email</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="size-4 rounded-full bg-[#2e2e2e] shrink-0" />
                    <div className="h-1.5 flex-1 bg-[#2e2e2e] rounded" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-4 rounded-full bg-[#2e2e2e] shrink-0" />
                    <div className="h-1.5 flex-1 bg-[#2e2e2e] rounded" />
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-blue-400/60 font-mono">47 unread</div>
              </div>

              {/* Spreadsheet — middle left */}
              <div className="absolute top-[40%] left-[0%] w-[160px] bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl p-3 opacity-60 hover:opacity-100 transition-opacity animate-float" style={{ animationDuration: "11s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-7 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <span className="material-symbols-outlined text-sm">table_chart</span>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-300">Sheets</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="h-3 bg-[#2a2a2a] rounded-sm border border-[#333]" />
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-emerald-400/60 font-mono">+320 rows</div>
              </div>

              {/* Chat — middle right */}
              <div className="absolute top-[38%] right-[2%] w-[150px] bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl p-3 opacity-65 hover:opacity-100 transition-opacity animate-float-delayed" style={{ animationDuration: "8s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-7 rounded-md bg-orange-500/20 flex items-center justify-center text-orange-400">
                    <span className="material-symbols-outlined text-sm">chat_bubble</span>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-300">Slack</span>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-1.5 items-start">
                    <div className="size-4 rounded-full bg-[#2e2e2e] shrink-0 mt-0.5" />
                    <div className="flex-1 bg-[#2a2a2a] rounded-lg h-5" />
                  </div>
                  <div className="flex gap-1.5 items-start justify-end">
                    <div className="flex-1 bg-orange-500/10 rounded-lg h-5" />
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-orange-400/60 font-mono">12 channels</div>
              </div>

              {/* Tasks / PM — bottom center */}
              <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2 w-[165px] bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl p-3 opacity-70 hover:opacity-100 transition-opacity animate-float" style={{ animationDuration: "10s" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-7 rounded-md bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <span className="material-symbols-outlined text-sm">task_alt</span>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-300">Project Tool</span>
                </div>
                <div className="space-y-1.5">
                  {["In Progress", "Blocked", "To Do"].map((s, i) => (
                    <div key={s} className="flex items-center justify-between">
                      <div className="h-1.5 w-2/3 bg-[#2e2e2e] rounded" />
                      <div className={`text-[9px] font-bold ${i === 0 ? "text-blue-400/70" : i === 1 ? "text-red-400/70" : "text-zinc-600"}`}>{s}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Manual transfer badge — floating warning */}
              <div className="absolute top-[68%] left-[28%] z-30 animate-pulse-slow">
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-red-950/50 border border-red-900/30 rounded-lg backdrop-blur-sm">
                  <span className="material-symbols-outlined text-red-500 text-sm">sync_problem</span>
                  <span className="text-[10px] font-semibold text-red-400">Manual copy-paste</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ─── Gradient Divider ─────────────────────────────────────────────────── */}
      <div className="w-full h-24 bg-gradient-to-b from-[#141414] to-[#1f1f1f] flex justify-center items-center">
        <div className="h-full w-[1px] bg-gradient-to-b from-transparent via-[#474747] to-transparent" />
      </div>

      {/* ─── The Solution Section ─────────────────────────────────────────────── */}
      <section className="relative z-20 w-full bg-[#1f1f1f] py-24 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="layout-container px-6 lg:px-40 flex flex-col md:flex-row-reverse items-center gap-16 relative z-10">
          <div className="flex-1 flex flex-col gap-6 max-w-lg">
            <div className="inline-flex self-start items-center gap-2 px-3 py-1 rounded border border-blue-900/30 bg-blue-900/10 text-blue-400 text-xs font-bold uppercase tracking-wider">
              The Solution
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
              Unified Data. <br />
              <span className="text-blue-400">Automated Flows.</span>
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed max-w-md">
              Clarity brings everything into a single, automated workflow. Set rules once and let the system handle the rest. One source of truth for all your business metrics.
            </p>
            <ul className="space-y-4 mt-2">
              {[
                "Real-time sync across all departments",
                "Automated reporting & analytics",
                "Zero manual data entry",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="mt-1 flex items-center justify-center size-5 rounded-full bg-blue-500/20 text-blue-400">
                    <span className="material-symbols-outlined text-sm">check</span>
                  </div>
                  <span className="text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
            <button className="mt-4 w-fit flex items-center gap-2 text-white font-semibold border-b border-blue-500 pb-1 hover:text-blue-400 transition-colors">
              Explore the OS
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <div className="flex-1 w-full h-[500px] flex items-center justify-center relative group">
            <div className="glass-panel w-full max-w-md rounded-xl p-6 relative overflow-hidden transform transition-all duration-700 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(59,130,246,0.15)]">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/50">
                    <span className="material-symbols-outlined text-lg">dataset</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Main Dashboard</div>
                    <div className="text-xs text-slate-400">Updated just now</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="size-2 rounded-full bg-green-500" />
                  <div className="size-2 rounded-full bg-slate-600" />
                  <div className="size-2 rounded-full bg-slate-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: "Total Revenue", value: "$124,500", change: "+12.5%" },
                  { label: "Active Users", value: "3,240", change: "+5.2%" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/5 rounded-lg p-4 border border-white/5 hover:bg-white/10 transition-colors cursor-default">
                    <div className="text-xs text-slate-400 mb-1">{stat.label}</div>
                    <div className="text-xl font-bold text-white">{stat.value}</div>
                    <div className="text-xs text-green-400 mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">trending_up</span>
                      {stat.change}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/5 h-32 flex items-end justify-between gap-2">
                {[40, 60, 30, 80, 50, 90, 65].map((h, i) => (
                  <div
                    key={i}
                    className={`w-full rounded-t-sm transition-all duration-300 ${i === 5 ? "relative group/bar" : ""}`}
                    style={{ height: `${h}%`, background: `rgba(59,130,246,${0.2 + i * 0.1})` }}
                  >
                    {i === 5 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity">Peak</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -right-4 top-20 animate-pulse-slow">
              <div className="bg-[#1f1f1f] border border-[#333] rounded-lg p-3 shadow-xl flex items-center gap-3">
                <div className="size-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                </div>
                <div className="text-xs font-medium text-white">Sync Complete</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Operating Experience Section ─────────────────────────────────────── */}
      <section className="relative w-full bg-[#141414] py-24 lg:py-32">
        <div className="layout-container px-6 lg:px-40 flex flex-col items-center">
          <div className="text-center mb-24 max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Operating Experience</h2>
            <p className="text-zinc-400 text-lg">
              Powerful modules designed for the modern enterprise. Seamlessly integrated to provide a comprehensive view of your business health.
            </p>
          </div>

          <div className="w-full flex flex-col gap-24 lg:gap-32">

            {/* ── Card 1: Lead Engine ─────────────────────────────────────────── */}
            <div className="sticky top-24 z-10 w-full min-h-[60vh] flex flex-col lg:flex-row items-center gap-12 p-8 lg:p-12 rounded-2xl bg-[#1a1a1a] border border-[#333]">
              <div className="flex-1 flex flex-col gap-6">
                <div className="flex items-center gap-3 text-purple-400 mb-2">
                  <span className="material-symbols-outlined">psychology</span>
                  <span className="text-sm font-bold uppercase tracking-wider">AI-Driven</span>
                </div>
                <h3 className="text-3xl lg:text-4xl font-bold text-white">Lead Engine</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Predictive lead scoring that prioritizes your outreach. Let AI analyze interactions and surface high-intent prospects automatically.
                </p>
                <div className="mt-4 flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold text-white">1,248</span>
                    <span className="text-sm text-zinc-500">Active Leads</span>
                  </div>
                  <div className="w-px bg-zinc-700" />
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold text-purple-400">+24%</span>
                    <span className="text-sm text-zinc-500">Conversion Rate</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000" />
                <div className="glass-panel relative w-full rounded-xl p-6 border border-white/10 overflow-hidden">
                  <div className="light-sweep" />
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                        <span className="material-symbols-outlined">bolt</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">Lead Scoring</div>
                        <div className="text-xs text-zinc-400">Live Analysis</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs font-bold">ACTIVE</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: "Acme Corp", plan: "Enterprise Plan", score: "98%", color: "text-green-400" },
                      { name: "Stark Ind.", plan: "Pro Plan", score: "92%", color: "text-green-400" },
                      { name: "Wayne Ent.", plan: "Basic Plan", score: "65%", color: "text-yellow-400", dim: true },
                    ].map((lead) => (
                      <div key={lead.name} className={`flex items-center justify-between p-3 rounded bg-white/5 border border-white/5 ${lead.dim ? "opacity-60" : ""}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-700" />
                          <div>
                            <div className="text-sm text-white">{lead.name}</div>
                            <div className="text-xs text-zinc-500">{lead.plan}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${lead.color}`}>{lead.score}</div>
                          <div className="text-xs text-zinc-500">Score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card 2: Finance Intelligence ────────────────────────────────── */}
            <div className="sticky top-28 z-20 w-full min-h-[60vh] flex flex-col lg:flex-row-reverse items-center gap-12 p-8 lg:p-12 rounded-2xl bg-[#1a1a1a] border border-[#333] shadow-2xl">
              <div className="flex-1 flex flex-col gap-6">
                <div className="flex items-center gap-3 text-emerald-400 mb-2">
                  <span className="material-symbols-outlined">payments</span>
                  <span className="text-sm font-bold uppercase tracking-wider">Real-time Analytics</span>
                </div>
                <h3 className="text-3xl lg:text-4xl font-bold text-white">Finance Intelligence</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Gain complete visibility into your cash flow. Track revenue, expenses, and burn rate in real-time with automated reconciliation.
                </p>
                <div className="mt-4">
                  <button className="flex items-center gap-2 text-white border-b border-emerald-500 pb-1 hover:text-emerald-400 transition-colors">
                    View Financial Reports
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 w-full relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000" />
                <div className="glass-panel relative w-full rounded-xl p-6 border border-white/10 overflow-hidden flex flex-col justify-between h-[300px]">
                  <div className="light-sweep" style={{ animationDelay: "1s" }} />
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Total Revenue</div>
                      <div className="text-4xl font-bold text-white tracking-tight">$2.4M</div>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded text-emerald-400 text-xs font-bold">
                      <span className="material-symbols-outlined text-sm">trending_up</span>
                      +12.4%
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-2 h-32 mt-auto">
                    {[30, 45, 35, 60, 50, 75, 65].map((h, i) => (
                      <div key={i} className="w-full rounded-t hover:h-auto transition-all" style={{ height: `${h}%`, background: `rgba(16,185,129,${0.2 + i * 0.1})`, boxShadow: i === 5 ? "0 0 15px rgba(16,185,129,0.5)" : "none" }} />
                    ))}
                  </div>
                </div>
                <div className="absolute -right-4 -top-4 glass-card p-3 rounded-lg border border-white/10 animate-float">
                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-white">Live Data Feed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card 3: Project Management ───────────────────────────────────── */}
            <div className="sticky top-32 z-30 w-full min-h-[60vh] flex flex-col lg:flex-row items-center gap-12 p-8 lg:p-12 rounded-2xl bg-[#1a1a1a] border border-[#333] shadow-2xl">
              <div className="flex-1 flex flex-col gap-6">
                <div className="flex items-center gap-3 text-blue-400 mb-2">
                  <span className="material-symbols-outlined">rocket_launch</span>
                  <span className="text-sm font-bold uppercase tracking-wider">Project Control</span>
                </div>
                <h3 className="text-3xl lg:text-4xl font-bold text-white">Project Management</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Keep every initiative on track. Monitor health, allocate resources, and predict bottlenecks before they impact delivery.
                </p>
                <div className="mt-4 flex gap-8">
                  <div>
                    <div className="text-3xl font-bold text-white mb-1">14</div>
                    <div className="text-sm text-zinc-500">Active Projects</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-400 mb-1">92%</div>
                    <div className="text-sm text-zinc-500">Health Score</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000" />
                <div className="glass-panel relative w-full rounded-xl p-6 border border-white/10 overflow-hidden">
                  <div className="light-sweep" style={{ animationDelay: "2s" }} />
                  <div className="space-y-4">
                    {[
                      { name: "Q3 Marketing Campaign", status: "On Track", statusClass: "bg-blue-500/20 text-blue-300", barClass: "bg-blue-500", barWidth: "75%", due: "Due in 4 days", pct: "75% Complete" },
                      { name: "App v2.0 Launch", status: "At Risk", statusClass: "bg-orange-500/20 text-orange-300", barClass: "bg-orange-500", barWidth: "45%", due: "Due tomorrow", pct: "45% Complete" },
                      { name: "Infrastructure Migration", status: "Completed", statusClass: "bg-green-500/20 text-green-300", barClass: "bg-green-500", barWidth: "100%", due: "Delivered yesterday", pct: "100% Complete", dim: true },
                    ].map((project) => (
                      <div key={project.name} className={`bg-white/5 rounded-lg p-4 border border-white/5 ${project.dim ? "opacity-80" : ""}`}>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-bold text-white">{project.name}</span>
                          <span className={`text-xs px-2 py-1 rounded ${project.statusClass}`}>{project.status}</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-2">
                          <div className={`${project.barClass} h-1.5 rounded-full`} style={{ width: project.barWidth }} />
                        </div>
                        <div className="flex justify-between text-xs text-zinc-500">
                          <span>{project.due}</span>
                          <span>{project.pct}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── CTA Section + Footer ─────────────────────────────────────────────── */}
      <section className="border-t border-[#303030] bg-[#141414] py-20 px-6 lg:px-40">
        <div className="layout-container mx-auto flex flex-col items-center text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to find Clarity?</h2>
          <p className="text-zinc-400 mb-10 text-lg">
            Join thousands of businesses streamlining their operations today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button
              onClick={() => setShowLeadModal(true)}
              className="flex min-w-[200px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-[#aaa] text-black text-base font-bold hover:bg-[#ff9900] hover:text-white transition-colors"
            >
              Get Started for Free
            </button>
            <button className="flex min-w-[200px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-[#1f1f1f] border border-[#303030] text-white text-base font-bold hover:bg-[#303030] transition-colors">
              Book a Demo
            </button>
          </div>
        </div>

        <footer className="mt-20 pt-8 border-t border-[#252525] flex flex-col md:flex-row justify-between items-center text-zinc-600 text-sm">
          <p>© 2024 Clarity OS. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            {["Privacy", "Terms", "Twitter", "LinkedIn"].map((link) => (
              <a key={link} className="hover:text-zinc-400 transition-colors" href="#">{link}</a>
            ))}
          </div>
        </footer>
      </section>

      <WebsiteLeadModal isOpen={showLeadModal} onClose={() => setShowLeadModal(false)} />
    </div>
  );
}
