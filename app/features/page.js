"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./features.css"; 
import Navbar from "../components/Navbar"; 

function TypewriterHeading() {
  const [charIndex, setCharIndex] = useState(0);
  const line1 = "ENGINEERED";
  const line2 = "FOR ";
  const line3 = "PERFECTION";
  const totalChars = line1.length + line2.length + line3.length;

  useEffect(() => {
    if (charIndex < totalChars) {
      // Vary typing speed slightly for realism (30ms - 80ms)
      const timer = setTimeout(() => {
        setCharIndex((c) => c + 1);
      }, Math.random() * 50 + 30);
      return () => clearTimeout(timer);
    }
  }, [charIndex, totalChars]);

  const currentLine1 = line1.slice(0, Math.max(0, charIndex));
  const currentLine2 = line2.slice(0, Math.max(0, charIndex - line1.length));
  const currentLine3 = line3.slice(0, Math.max(0, charIndex - line1.length - line2.length));

  return (
    <h1 className="text-white text-6xl md:text-8xl lg:text-[10rem] font-extrabold leading-none uppercase mb-12 tracking-tighter min-h-[2em] lg:min-h-[2.2em]">
      {currentLine1}
      {charIndex >= line1.length && <br />}
      {currentLine2}
      <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10">
        {currentLine3}
      </span>
      <span
        className={`inline-block w-[0.05em] h-[0.75em] bg-[#1152d4] ml-2 md:ml-4 ${charIndex === totalChars ? "animate-pulse" : ""}`}
      ></span>
    </h1>
  );
}

export default function FeaturesPage() {
  const sectionRefs = useRef([]);

  useEffect(() => {
    const observerCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    };

    const observerOptions = {
      root: null,
      rootMargin: "0px",
      threshold: 0.15,
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const addToRefs = (el) => {
    if (el && !sectionRefs.current.includes(el)) {
      sectionRefs.current.push(el);
    }
  };

  return (
    <div className="relative flex w-full flex-col bg-[#050505] min-h-screen font-sans selection:bg-[#1152d4]/30 selection:text-white overflow-x-hidden text-slate-300">
      
      {/* ─── Header / Navbar (Imported from components) ───────────────── */}
      <Navbar />

      {/* ─── Sidebar (Architect's Handbook style) ───────────────────────── */}
      <aside className="fixed left-0 top-[60px] h-[calc(100vh-60px)] w-72 bg-[#0a0a0a] border-r border-white/5 pt-12 pb-12 px-6 z-40 hidden xl:block overflow-y-auto custom-scrollbar">
        <div className="space-y-10">
          <section>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-4">Core Modules</p>
            <nav className="flex flex-col gap-1">
              <a className="group flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white transition-all border-l-2 border-transparent hover:border-white/20" href="#real-time-chat">
                <span className="material-symbols-outlined text-sm">forum</span> Real-Time Comms
              </a>
              <a className="group flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white transition-all border-l-2 border-transparent hover:border-white/20" href="#intelligent-meetings">
                <span className="material-symbols-outlined text-sm">video_camera_front</span> Intelligent Meetings
              </a>
              <a className="group flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white transition-all border-l-2 border-transparent hover:border-white/20" href="#unified-workspace">
                <span className="material-symbols-outlined text-sm">view_kanban</span> Unified Workspace
              </a>
              <a className="group flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white transition-all border-l-2 border-transparent hover:border-white/20" href="#command-center">
                <span className="material-symbols-outlined text-sm">admin_panel_settings</span> Command Matrix
              </a>
            </nav>
          </section>
          <section>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-4">Integrations</p>
            <nav className="flex flex-col gap-1">
              <a className="group flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white transition-all border-l-2 border-transparent hover:border-white/20" href="#websockets-api">
                <span className="material-symbols-outlined text-sm">api</span> WebSockets API
              </a>
              <a className="group flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white transition-all border-l-2 border-transparent hover:border-white/20" href="#google-meet-sync">
                <span className="material-symbols-outlined text-sm">calendar_month</span> Google Meet Sync
              </a>
              <a className="group flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white transition-all border-l-2 border-transparent hover:border-white/20" href="#payroll-engine">
                <span className="material-symbols-outlined text-sm">receipt_long</span> Payroll Engine
              </a>
            </nav>
          </section>
          <section>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-4">System Metrics</p>
            <div className="space-y-4 px-3">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-500">LATENCY</span>
                <span className="text-[#1152d4]">0.02ms</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-500">UPTIME</span>
                <span className="text-green-500">99.999%</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-500">VERSION</span>
                <span className="text-white">CRM_V2_STABLE</span>
              </div>
            </div>
          </section>
        </div>
      </aside>

      {/* ─── Main Content (Architect's Handbook) ───────────────────────── */}
      <main className="xl:ml-72 blueprint-grid">
        <section className="min-h-[90vh] flex items-center justify-center relative px-8 border-b border-white/5 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,rgba(0,0,0,0)_80%)]">
          <div className="max-w-5xl w-full py-20">
            <div className="inline-block border border-[#1152d4]/30 bg-[#1152d4]/5 px-4 py-1 mb-8">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1152d4]">System Identification: CLARITY_CRM_01</span>
            </div>
            <TypewriterHeading />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-white/10 pt-12">
              <div>
                <p className="text-xl text-slate-400 font-light leading-relaxed">
                  The definitive operating system for high-performance enterprise teams. 
                  A unified workspace designed to eliminate communication silos, optimize meetings, and streamline HR directly from the core.
                </p>
              </div>
              <div className="font-mono text-sm leading-relaxed text-slate-500 border-l border-white/5 pl-8">
                [ARCHITECTURE_OVERVIEW]<br/>
                &gt; Real-Time Comms: WebSocket Data Sync<br/>
                &gt; Video Network: WebRTC Media Mesh<br/>
                &gt; Data Persistence: Unified Postgres Ledger<br/>
                &gt; Execution Environment: Next.js Server Components
              </div>
            </div>
          </div>
        </section>

        {/* ─── Module 01: Real-Time Chat ───────────────────────── */}
        <section className="py-32 px-8 md:px-16 border-b border-white/5 reveal-on-scroll" id="real-time-chat" ref={addToRefs}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              <div className="lg:col-span-3">
                <div className="sticky top-32">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] block mb-2 text-[#1152d4]">Module 01</span>
                  <h2 className="text-white font-extrabold tracking-tight text-3xl mb-6">Real-Time Comms</h2>
                  <div className="space-y-6">
                    <div className="p-4 glass-card border-l-2 border-[#1152d4]">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[9px] mb-2">Protocol Status</p>
                      <p className="font-mono text-sm leading-relaxed text-xs text-green-400">NOMINAL / SOCKETS ACTIVE</p>
                    </div>
                    <div className="p-4 glass-card">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[9px] mb-2">Core Contributors</p>
                      <p className="font-mono text-sm leading-relaxed text-xs text-slate-400">Comm Eng, Platform Team</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-9">
                <div className="prose prose-invert max-w-none">
                  <p className="text-2xl text-slate-300 font-light mb-12 leading-relaxed">
                    Our communication layer represents the culmination of optimized data routing. 
                    It serves as the system's autonomic nervous system, ensuring that every message, read receipt, 
                    and live typing status is propagated across your organization with absolute precision.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
                    <div className="space-y-12">
                      <div>
                        <h3 className="text-white font-extrabold tracking-tight text-lg uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#1152d4] text-base">forum</span>
                          Chat Topology
                        </h3>
                        <p className="text-slate-400 mb-6 leading-relaxed">
                          Clarity utilizes an event-driven architecture. High-performance Socket servers handle live user connections, maintaining a singular source of truth for chat threads, context actions, and offline delivery queues.
                        </p>
                        <div className="bg-black border border-white/10 p-6 rounded-lg font-mono text-[11px] text-[#1152d4]/80 overflow-x-auto whitespace-pre leading-tight text-sm leading-relaxed">
                          [ GLOBAL_MESSAGE_BUS ]{"\n"}
                             |{"\n"}
                             +--- [ NODE_A: CHAT_SVC ] --- [ USER_01 ]{"\n"}
                             |                             [ USER_02 ]{"\n"}
                             +--- [ NODE_B: SYNC_SVC ] --- [ READ_A ]{"\n"}
                                                           [ READ_B ]
                        </div>
                      </div>
                      <div>
                        <h3 className="text-white font-extrabold tracking-tight text-lg uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#1152d4] text-base">quick_reference_all</span>
                          Context Actions
                        </h3>
                        <p className="text-slate-400 mb-4 leading-relaxed">
                          Instantly manage conversational states with built-in context menus and persistent real-time acknowledgment arrays.
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded">
                            <span className="material-symbols-outlined text-sm text-slate-500">code</span>
                            <span className="font-mono text-sm leading-relaxed text-xs">EVENT: ws://chat/msg_broadcast</span>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded">
                            <span className="material-symbols-outlined text-sm text-slate-500">code</span>
                            <span className="font-mono text-sm leading-relaxed text-xs">EVENT: ws://chat/read_receipt</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-12">
                      <div>
                        <h3 className="text-white font-extrabold tracking-tight text-lg uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#1152d4] text-base">security</span>
                          Delivery Protocols
                        </h3>
                        <div className="space-y-4">
                          <div className="border-b border-white/5 pb-4">
                            <p className="font-mono text-sm leading-relaxed text-white text-xs mb-1">Single Session Lock</p>
                            <p className="text-xs text-slate-500">WebSockets validate dynamic tokens upon connection. Concurrent sign-ins automatically detach legacy sockets and preserve the modern session.</p>
                          </div>
                          <div className="border-b border-white/5 pb-4">
                            <p className="font-mono text-sm leading-relaxed text-white text-xs mb-1">State Verification</p>
                            <p className="text-xs text-slate-500">Database triggers handle payload storage while active channels immediately flush updates to client caches natively.</p>
                          </div>
                        </div>
                      </div>
                      <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[#1152d4]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex justify-between items-start mb-12">
                          <div>
                            <h4 className="font-bold text-white uppercase tracking-tighter">Socket Visualizer</h4>
                            <p className="text-[10px] text-slate-500 font-mono text-sm leading-relaxed">LIVE_CONNECTION_MONITOR</p>
                          </div>
                          <span className="material-symbols-outlined text-[#1152d4]">sensors</span>
                        </div>
                        <div className="aspect-square flex items-center justify-center relative">
                          <div className="size-32 rounded-full border border-[#1152d4]/20 bg-[#1152d4]/5 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#1152d4] text-4xl">dynamic_feed</span>
                          </div>
                          <div className="absolute inset-0 border border-white/5 rounded-full animate-[spin_12s_linear_infinite]" style={{ borderStyle: "dashed" }}></div>
                          <div className="absolute inset-4 border border-white/5 rounded-full animate-[spin_8s_linear_infinite_reverse]" style={{ borderStyle: "dotted" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Module 02: Intelligent Meetings ───────────────────────── */}
        <section className="py-32 px-8 md:px-16 border-b border-white/5 bg-[#0a0a0a]/30 reveal-on-scroll" id="intelligent-meetings" ref={addToRefs}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              <div className="lg:col-span-3">
                <div className="sticky top-32">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] block mb-2 text-purple-400">Module 02</span>
                  <h2 className="text-white font-extrabold tracking-tight text-3xl mb-6">Media Matrix</h2>
                  <div className="space-y-6">
                    <div className="p-4 glass-card border-l-2 border-purple-500">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[9px] mb-2">Engine Version</p>
                      <p className="font-mono text-sm leading-relaxed text-xs text-purple-400">WEBRTC_STREAMING_V1</p>
                    </div>
                    <div className="p-4 glass-card">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[9px] mb-2">Jitter Latency</p>
                      <p className="font-mono text-sm leading-relaxed text-xs text-slate-400">&lt; 40ms AUDIO AVG</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-9">
                <div className="prose prose-invert max-w-none">
                  <p className="text-2xl text-slate-300 font-light mb-12 leading-relaxed">
                    A comprehensive meeting engine seamlessly integrated directly into the workspace core. 
                    This module doesn't just schedule events; it provides high-definition audio/video pipelines, 
                    desktop streaming, and automatic Google Meet token generation.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
                    <div className="space-y-12">
                      <div>
                        <h3 className="text-white font-extrabold tracking-tight text-lg uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-purple-400 text-base">video_camera_front</span>
                          Streaming Architecture
                        </h3>
                        <p className="text-slate-400 mb-6 leading-relaxed">
                          Our architecture utilizes a specialized WebRTC mesh network approach. Distinct peer connections map complex multiplexing tasks (webcam, screen share, microphone) natively across modern browsers.
                        </p>
                        <div className="bg-black border border-white/10 p-6 rounded-lg font-mono text-[11px] text-purple-400/80 overflow-x-auto whitespace-pre leading-tight text-sm leading-relaxed">
                          CALL_INIT (WebRTC_Offer){"\n"}
                             |{"\n"}
                           [ SIGNALING_NODE ]{"\n"}
                             |{"\n"}
                           [ LOCAL_STREAM ] --- [ VIDEO_TRACK ]{"\n"}
                             |              +-- [ AUDIO_TRACK ]{"\n"}
                             |              +-- [ SCREEN_DATA ]{"\n"}
                           [ PEER_CONNECTION ]{"\n"}
                             |{"\n"}
                          REMOTE_RENDER (Media_Element)
                        </div>
                      </div>
                    </div>
                    <div className="space-y-12">
                      <div>
                        <h3 className="text-white font-extrabold tracking-tight text-lg uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-purple-400 text-base">verified</span>
                          Session Governance
                        </h3>
                        <div className="space-y-4">
                          <div className="border-b border-white/5 pb-4">
                            <p className="font-mono text-sm leading-relaxed text-white text-xs mb-1">Automated Integration</p>
                            <p className="text-xs text-slate-500">Google OAuth2 automates Meet linkage directly within the CRM, bypassing restrictive legacy authentication limitations entirely.</p>
                          </div>
                          <div className="border-b border-white/5 pb-4">
                            <p className="font-mono text-sm leading-relaxed text-white text-xs mb-1">Administrative Remarks</p>
                            <p className="text-xs text-slate-500">Restricted feedback nodes allow superiors to annotate recorded meeting evaluations privately.</p>
                          </div>
                        </div>
                      </div>
                      <div className="glass-card p-6 rounded-2xl">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-white font-extrabold tracking-tight text-sm font-medium text-white/80">Active Call Quality</h3>
                          <div className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono">CONNECTION_SECURE</div>
                        </div>
                        <div className="h-48 flex items-end gap-2 px-2 pb-2 border-b border-l border-white/10">
                          <div className="w-full bg-white/5 h-[30%]"></div>
                          <div className="w-full bg-white/5 h-[45%]"></div>
                          <div className="w-full bg-white/5 h-[40%]"></div>
                          <div className="w-full bg-gradient-to-t from-purple-500/20 to-purple-500/60 h-[75%] animate-pulse"></div>
                          <div className="w-full border border-dashed border-white/10 h-[90%] opacity-50"></div>
                        </div>
                        <div className="mt-4 p-3 bg-white/5 rounded font-mono text-sm leading-relaxed text-[10px] text-slate-400 italic">
                          "Connection Quality: 99.8% based on current bandwidth optimization."
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Module 03: Unified Workspace ───────────────────────── */}
        <section className="py-32 px-8 md:px-16 border-b border-white/5 reveal-on-scroll" id="unified-workspace" ref={addToRefs}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              <div className="lg:col-span-3">
                <div className="sticky top-32">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] block mb-2 text-emerald-400">Module 03</span>
                  <h2 className="text-white font-extrabold tracking-tight text-3xl mb-6">Unified Workspace</h2>
                  <div className="space-y-6">
                    <div className="p-4 glass-card border-l-2 border-emerald-500">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[9px] mb-2">Compliance</p>
                      <p className="font-mono text-sm leading-relaxed text-xs text-emerald-400">PROJECTS / NOTES / TASKS</p>
                    </div>
                    <div className="p-4 glass-card">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[9px] mb-2">Data Integrity</p>
                      <p className="font-mono text-sm leading-relaxed text-xs text-slate-400">ACID_COMPLIANT_DB</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-9">
                <div className="prose prose-invert max-w-none">
                  <p className="text-2xl text-slate-300 font-light mb-12 leading-relaxed">
                    Organization is not merely a feature; it is the fundamental core. Our workspace structures guarantee an environment 
                    where every Note, Project, and Module is instantly accessible, properly tracked, and flawlessly assigned.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
                    <div className="space-y-12">
                      <div>
                        <h3 className="text-white font-extrabold tracking-tight text-lg uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-400 text-base">view_kanban</span>
                          Productivity Matrix
                        </h3>
                        <p className="text-slate-400 mb-6 leading-relaxed">
                          Your business components exist seamlessly mapped across three primary states: Relational Datastores, Secured Next.js APIs (In-Transit), and highly interactive React Context states (In-Use).
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/5 p-4 border border-white/10 rounded">
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[8px] mb-1">Notes</p>
                            <p className="font-mono text-sm leading-relaxed text-[10px] text-white">Elevated / Admin Tracking</p>
                          </div>
                          <div className="bg-white/5 p-4 border border-white/10 rounded">
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[8px] mb-1">Projects</p>
                            <p className="font-mono text-sm leading-relaxed text-[10px] text-white">Milestones & Deadlines</p>
                          </div>
                          <div className="bg-white/5 p-4 border border-white/10 rounded">
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[8px] mb-1">Tasks</p>
                            <p className="font-mono text-sm leading-relaxed text-[10px] text-white">Sub-role Delegation</p>
                          </div>
                          <div className="bg-white/5 p-4 border border-white/10 rounded">
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[8px] mb-1">Roles</p>
                            <p className="font-mono text-sm leading-relaxed text-[10px] text-white">Granular Entitlements</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-12">
                      <div>
                        <h3 className="text-white font-extrabold tracking-tight text-lg uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-400 text-base">admin_panel_settings</span>
                          Role-Based Access Control
                        </h3>
                        <p className="text-slate-400 mb-6 leading-relaxed">
                          Intelligent policies map privileges out to infinite sub-role depths recursively. The Admin dashboard can instantly edit and modify exact system capabilities in real-time.
                        </p>
                        <div className="bg-black border border-white/10 p-6 rounded-lg font-mono text-sm leading-relaxed text-[11px] text-emerald-400/80 leading-relaxed whitespace-pre">
                          &gt; POLICY_ENGINE: EVALUATING{"\n"}
                          &gt; FETCHING_SUBROLE_HIERARCHY... [OK]{"\n"}
                          &gt; ASSIGNING_FINANCE_DEPT_ACCESS... [DONE]{"\n"}
                          &gt; PROPAGATING_ELEVATED_NOTES... [DONE]{"\n"}
                          &gt; STATUS: WORKSPACE_READY
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Command Matrix (HR/Admin) ───────────────────────── */}
        <section className="py-32 px-8 md:px-16 border-b border-white/5 bg-[#0a0a0a]/20 reveal-on-scroll" id="command-center" ref={addToRefs}>
          <div className="max-w-7xl mx-auto">
            <div className="mb-20 text-center max-w-3xl mx-auto">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-4 block">Central Orchestration</span>
              <h2 className="text-white font-extrabold tracking-tight text-5xl md:text-7xl mb-8 uppercase tracking-tighter">HR Matrix</h2>
              <p className="text-xl text-slate-400 font-light">
                The single pane of glass for total administrative control. Full observability into employee metrics, payroll data, attendance, and roles.
              </p>
            </div>
            <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <div className="bg-black/40 border-b border-white/10 p-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="size-2.5 rounded-full bg-red-500/30"></div>
                  <div className="size-2.5 rounded-full bg-yellow-500/30"></div>
                  <div className="size-2.5 rounded-full bg-green-500/30"></div>
                </div>
                <div className="font-mono text-sm leading-relaxed text-[10px] text-slate-500">CLARITY_PAYROLL_CONSOLE_V1.5</div>
              </div>
              <div className="grid grid-cols-12 h-[600px]">
                <div className="col-span-2 border-r border-white/5 bg-black/20 p-4 hidden md:block">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[8px] mb-6">Departments</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-green-500">
                      <span className="size-1.5 rounded-full bg-green-500 animate-pulse"></span> HR_DEPT
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-green-500">
                      <span className="size-1.5 rounded-full bg-green-500 animate-pulse"></span> FINANCE_DEPT
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-yellow-500">
                      <span className="size-1.5 rounded-full bg-yellow-500"></span> DEV_DEPT
                    </div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-10 p-8 flex flex-col gap-8">
                  <div className="flex-1 rounded-lg border border-white/5 bg-black/40 overflow-hidden relative">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCKckVejbErRlB8A8G5GQ1E-vuYsXpVba0XEOFoUk0jZKBHPhOR1QJBJEGf7I170Kk3ZG9z8eha_0k9fuWSE_XtUlPZyvhMcgMnSGzpv63Y6qiIPrbMhQUkrD1VqbaZSxbCo5OGffcAtqozkZB-fltUIQdqZVKHrqh0p5VJ_v6xs6SEWtLgAT_13p-2_pl_FhWnLVGlChavQMCoZZ_LKAZM8Tu90L6n36jgbb9_fpBj2rSSyT49QBmYjOaefWTm425hpjgv8_4EN8g')", backgroundSize: "cover" }}></div>
                    <div className="absolute top-4 left-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[10px]">Employee Overview</p>
                      <p className="text-white text-lg font-bold">142 Active Employees Managed</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-8">
                    <div className="p-4 border border-white/5 bg-black/20 rounded">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[8px] mb-2">Processed Payroll</p>
                      <p className="text-2xl font-mono text-white">240K <span className="text-[10px] text-slate-500">/ MO</span></p>
                    </div>
                    <div className="p-4 border border-white/5 bg-black/20 rounded">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[8px] mb-2">System Uptime</p>
                      <p className="text-2xl font-mono text-white">99.9%</p>
                    </div>
                    <div className="p-4 border border-white/5 bg-black/20 rounded">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[8px] mb-2">Meeting Hours</p>
                      <p className="text-2xl font-mono text-white">12.4K</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Integration 01: WebSockets API ───────────────────────── */}
        <section className="py-32 px-8 md:px-16 border-b border-white/5 bg-[#0a0a0a]/30 reveal-on-scroll" id="websockets-api" ref={addToRefs}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              <div className="lg:col-span-3">
                <div className="sticky top-32">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] block mb-2 text-cyan-400">Integration 01</span>
                  <h2 className="text-white font-extrabold tracking-tight text-3xl mb-6">WebSockets API</h2>
                  <div className="space-y-6">
                    <div className="p-4 glass-card border-l-2 border-cyan-500">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[9px] mb-2">Protocol Stack</p>
                      <p className="font-mono text-sm leading-relaxed text-xs text-cyan-400">WSS / TLS 1.3</p>
                    </div>
                    <div className="p-4 glass-card">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[9px] mb-2">Event Throughput</p>
                      <p className="font-mono text-sm leading-relaxed text-xs text-slate-400">10k+ MSG/SEC</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-9">
                <div className="prose prose-invert max-w-none">
                  <p className="text-2xl text-slate-300 font-light mb-12 leading-relaxed">
                    Expose the native event pipeline of the CRM directly to your internal custom applications. Connect clients and sync data continuously without HTTP polling overhead.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
                    <div className="space-y-12">
                      <div>
                        <h3 className="text-white font-extrabold tracking-tight text-lg uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-cyan-400 text-base">leak_add</span>
                          Live Data Hook
                        </h3>
                        <p className="text-slate-400 mb-6 leading-relaxed">
                          Subscribe to standard event emitters built natively into the CRM. From typing indicators to new task assignments, your custom systems can mirror CRM states effortlessly.
                        </p>
                        <div className="bg-black border border-white/10 p-6 rounded-lg font-mono text-[11px] text-cyan-400/80 overflow-x-auto whitespace-pre leading-tight text-sm leading-relaxed">
                          // Example Socket.IO Intercept{"\n"}
                          socket.on('task_assigned', (data) ={">"} {"{"}{"\n"}
                          &nbsp;&nbsp;console.log(`Task ${"$"}{"{"}data.id{"}"} bound to ${"$"}{"{"}data.user_id{"}"}`);{"\n"}
                          &nbsp;&nbsp;syncLocalDatabase(data);{"\n"}
                          {"}"});
                        </div>
                      </div>
                    </div>
                    <div className="space-y-12">
                      <div>
                        <h3 className="text-white font-extrabold tracking-tight text-lg uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-cyan-400 text-base">code_blocks</span>
                          Payload Standards
                        </h3>
                        <div className="space-y-4">
                          <div className="border-b border-white/5 pb-4">
                            <p className="font-mono text-sm leading-relaxed text-white text-xs mb-1">Standardized JSON</p>
                            <p className="text-xs text-slate-500">All inbound and outbound payloads adhere to strictly typed schemas ensuring interoperability.</p>
                          </div>
                          <div className="border-b border-white/5 pb-4">
                            <p className="font-mono text-sm leading-relaxed text-white text-xs mb-1">Guaranteed Delivery</p>
                            <p className="text-xs text-slate-500">Dropped connections are instantly queued and flushed upon successful reconnection using message caching logs.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Integration 02: Google Meet Sync ───────────────────────── */}
        <section className="py-32 px-8 md:px-16 border-b border-white/5 reveal-on-scroll" id="google-meet-sync" ref={addToRefs}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              <div className="lg:col-span-3">
                <div className="sticky top-32">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] block mb-2 text-orange-400">Integration 02</span>
                  <h2 className="text-white font-extrabold tracking-tight text-3xl mb-6">Google Meet Sync</h2>
                  <div className="space-y-6">
                    <div className="p-4 glass-card border-l-2 border-orange-500">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[9px] mb-2">Auth Mechanism</p>
                      <p className="font-mono text-sm leading-relaxed text-xs text-orange-400">GCP SERVICE ACCT</p>
                    </div>
                    <div className="p-4 glass-card">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[9px] mb-2">Scope Target</p>
                      <p className="font-mono text-sm leading-relaxed text-xs text-slate-400">CALENDAR_EVENTS</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-9">
                <div className="prose prose-invert max-w-none">
                  <p className="text-2xl text-slate-300 font-light mb-12 leading-relaxed">
                    Automate conferencing logic entirely. The CRM securely provisions Google Meet credentials, creating calendar blocks and instant join links directly from your project dashboards.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
                    <div className="space-y-12">
                      <div>
                        <h3 className="text-white font-extrabold tracking-tight text-lg uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-orange-400 text-base">calendar_month</span>
                          Automatic Provisioning
                        </h3>
                        <p className="text-slate-400 mb-6 leading-relaxed">
                          We utilize specialized GCP Service Accounts using Domain-Wide Delegation to forcefully inject meeting schedules across employee calendars without manual OAuth flows natively.
                        </p>
                        <div className="bg-black border border-white/10 p-6 rounded-lg font-mono text-[11px] text-orange-400/80 overflow-x-auto whitespace-pre leading-tight text-sm leading-relaxed">
                          &gt; REQUEST: CREATE_MEETING{"\n"}
                          &gt; ASSUMING_IDENTITY: admin@domain.com{"\n"}
                          &gt; MINTING_CONFERENCE_DATA... [OK]{"\n"}
                          &gt; GOOGLE_MEET_URL: meet.google.com/xyz-ab...{"\n"}
                          &gt; DB_WRITE: SUCCESS
                        </div>
                      </div>
                    </div>
                    <div className="space-y-12">
                      <div>
                        <h3 className="text-white font-extrabold tracking-tight text-lg uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-orange-400 text-base">privacy_tip</span>
                          Credential Security
                        </h3>
                        <div className="space-y-4">
                          <div className="border-b border-white/5 pb-4">
                            <p className="font-mono text-sm leading-relaxed text-white text-xs mb-1">Encrypted Service Keys</p>
                            <p className="text-xs text-slate-500">GCP JSON tokens remain insulated server-side within Next.js API boundaries and never touch the client.</p>
                          </div>
                          <div className="border-b border-white/5 pb-4">
                            <p className="font-mono text-sm leading-relaxed text-white text-xs mb-1">Timezone Abstraction</p>
                            <p className="text-xs text-slate-500">Dates are automatically coerced between user timezones and ISO 8601 UTC server states flawlessly.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Integration 03: Payroll Engine ───────────────────────── */}
        <section className="py-32 px-8 md:px-16 border-b border-white/5 bg-[#0a0a0a]/20 reveal-on-scroll" id="payroll-engine" ref={addToRefs}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              <div className="lg:col-span-3">
                <div className="sticky top-32">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] block mb-2 text-pink-400">Integration 03</span>
                  <h2 className="text-white font-extrabold tracking-tight text-3xl mb-6">Payroll Engine</h2>
                  <div className="space-y-6">
                    <div className="p-4 glass-card border-l-2 border-pink-500">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[9px] mb-2">Print Standard</p>
                      <p className="font-mono text-sm leading-relaxed text-xs text-pink-400">A4_HI_RES_PDF</p>
                    </div>
                    <div className="p-4 glass-card">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 text-[9px] mb-2">Calculation Base</p>
                      <p className="font-mono text-sm leading-relaxed text-xs text-slate-400">ATTENDANCE_LOG</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-9">
                <div className="prose prose-invert max-w-none">
                  <p className="text-2xl text-slate-300 font-light mb-12 leading-relaxed">
                    Translate continuous attendance statistics into formalized financial receipts. The payroll engine provides highly stylized, print-ready document pipelines that handle the math so your HR department doesn't have to.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
                    <div className="space-y-12">
                      <div>
                        <h3 className="text-white font-extrabold tracking-tight text-lg uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-pink-400 text-base">calculate</span>
                          Automated Computations
                        </h3>
                        <p className="text-slate-400 mb-6 leading-relaxed">
                          Employee daily login records and active hours are compiled synchronously against set salary variables. Allowances, basic pay, and reductions are merged instantly.
                        </p>
                        <div className="bg-black border border-white/10 p-6 rounded-lg font-mono text-[11px] text-pink-400/80 overflow-x-auto whitespace-pre leading-tight text-sm leading-relaxed">
                          [ PAYROLL_CALCULATOR ]{"\n"}
                           + ACTIVE_DAYS: 22{"\n"}
                           + BASIC_RATE: $450/Day{"\n"}
                           + MEAL_ALLOWANCE: $300{"\n"}
                           --------------------------------{"\n"}
                           = GROSS_TOTAL: $10,200{"\n"}
                           &gt; DISPATCHING_PDF_GENERATOR...
                        </div>
                      </div>
                    </div>
                    <div className="space-y-12">
                      <div>
                        <h3 className="text-white font-extrabold tracking-tight text-lg uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-pink-400 text-base">picture_as_pdf</span>
                          Print Ready Dispatch
                        </h3>
                        <div className="space-y-4">
                          <div className="border-b border-white/5 pb-4">
                            <p className="font-mono text-sm leading-relaxed text-white text-xs mb-1">Tailwind Print Utilities</p>
                            <p className="text-xs text-slate-500">Payslips hide the main CRM wrapper and enforce strict physical page layout rules upon Ctrl+P interaction.</p>
                          </div>
                          <div className="border-b border-white/5 pb-4">
                            <p className="font-mono text-sm leading-relaxed text-white text-xs mb-1">Company Branding</p>
                            <p className="text-xs text-slate-500">Easily swap logo variables globally (using reliable Cloudinary links) to maintain corporate presence on formal financial documents.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Deep Capabilities Index ───────────────────────── */}
        <section className="py-32 px-8 md:px-16 bg-black reveal-on-scroll" ref={addToRefs}>
          <div className="max-w-7xl mx-auto">
            <h2 className="text-white font-extrabold tracking-tight text-3xl mb-12 flex items-center gap-4">
              <span className="material-symbols-outlined text-[#1152d4]">analytics</span>
              Application Integrations Index
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-white/10">
              <div className="p-8 border-r border-b border-white/10 group hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-slate-500 mb-6 group-hover:text-[#1152d4] transition-colors">admin_panel_settings</span>
                <h4 className="text-sm font-bold text-white mb-2">Role-Based Entitlements</h4>
                <p className="text-xs text-slate-500 font-mono text-sm leading-relaxed">Recursive dynamic sub-role assignments securely partitioning employee access schemas.</p>
              </div>
              <div className="p-8 border-r border-b border-white/10 group hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-slate-500 mb-6 group-hover:text-[#1152d4] transition-colors">vpn_key</span>
                <h4 className="text-sm font-bold text-white mb-2">Single-Session Execution</h4>
                <p className="text-xs text-slate-500 font-mono text-sm leading-relaxed">A specialized middleware wrapper ensuring users naturally retain explicit solo-session tokens globally.</p>
              </div>
              <div className="p-8 border-r border-b border-white/10 group hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-slate-500 mb-6 group-hover:text-[#1152d4] transition-colors">video_call</span>
                <h4 className="text-sm font-bold text-white mb-2">Instant Meet Gen</h4>
                <p className="text-xs text-slate-500 font-mono text-sm leading-relaxed">Integrated Google OAuth 2.0 workflows minting Google Meet URLs efficiently with one click.</p>
              </div>
              <div className="p-8 border-b border-white/10 group hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-slate-500 mb-6 group-hover:text-[#1152d4] transition-colors">forum</span>
                <h4 className="text-sm font-bold text-white mb-2">Contextual Workflows</h4>
                <p className="text-xs text-slate-500 font-mono text-sm leading-relaxed">Interactive chat systems enhanced by quick contextual options for deletion, editing or replying.</p>
              </div>
              <div className="p-8 border-r border-white/10 group hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-slate-500 mb-6 group-hover:text-[#1152d4] transition-colors">badge</span>
                <h4 className="text-sm font-bold text-white mb-2">HR Intelligence Hub</h4>
                <p className="text-xs text-slate-500 font-mono text-sm leading-relaxed">Direct manipulation interfaces mapping finance and HR roles comprehensively.</p>
              </div>
              <div className="p-8 border-r border-white/10 group hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-slate-500 mb-6 group-hover:text-[#1152d4] transition-colors">push_pin</span>
                <h4 className="text-sm font-bold text-white mb-2">Elevated Note Flags</h4>
                <p className="text-xs text-slate-500 font-mono text-sm leading-relaxed">Decoupled data sets enabling urgent items to explicitly alert assigned personnel.</p>
              </div>
              <div className="p-8 border-r border-white/10 group hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-slate-500 mb-6 group-hover:text-[#1152d4] transition-colors">event_note</span>
                <h4 className="text-sm font-bold text-white mb-2">Global Attendance Ledger</h4>
                <p className="text-xs text-slate-500 font-mono text-sm leading-relaxed">Check in and out actions are permanently synchronized with payroll and attendance computations natively.</p>
              </div>
              <div className="p-8 group hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-slate-500 mb-6 group-hover:text-[#1152d4] transition-colors">receipt_long</span>
                <h4 className="text-sm font-bold text-white mb-2">Payslip Dispatch</h4>
                <p className="text-xs text-slate-500 font-mono text-sm leading-relaxed">Generate PDF and printable transactional receipts linking cleanly built payroll components together.</p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ─── Footer (Kept from original Next.js CRM) ────────────────────────── */}
      <footer className="mt-auto z-50 py-8 border-t border-[#252525] flex flex-col items-center gap-8 px-6 lg:px-40 bg-[#050505] relative">
        <div className="w-full flex flex-col md:flex-row justify-between items-center text-zinc-600 text-sm">
          <p>© 2024 Clarity OS. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            {["Privacy", "Terms", "Twitter", "LinkedIn"].map((link) => (
              <a key={link} className="hover:text-zinc-400 transition-colors" href="#">{link}</a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}
