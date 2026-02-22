import Link from "next/link";

export default function SolutionsPage() {
  return (
    <div className="relative flex w-full flex-col bg-[#141414] min-h-screen font-sans">
      
      {/* ─── Header / Navbar ──────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#303030] px-6 lg:px-40 py-3 z-50 bg-[#141414]/90 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-4 text-white">
          <div className="size-6 text-white">
            <span className="material-symbols-outlined text-2xl">grid_view</span>
          </div>
          <Link href="/" className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Clarity</Link>
        </div>

        <div className="hidden lg:flex flex-1 justify-end gap-8">
          <div className="flex items-center gap-9">
            {[
              { label: "Features", href: "/features" },
              { label: "Solutions", href: "/solutions" },
              { label: "Pricing", href: "/solutions#pricing" },
              { label: "About", href: "/about" },
            ].map((link) => (
              <Link key={link.label} className="text-white text-sm font-medium leading-normal hover:text-gray-300 transition-colors" href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex gap-2">
            <Link href="/login" className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-[#303030] hover:bg-[#404040] transition-colors text-white text-sm font-bold leading-normal tracking-[0.015em]">
              Log In
            </Link>
            <Link href="/login" className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-white text-black hover:bg-gray-200 transition-colors text-sm font-bold leading-normal tracking-[0.015em]">
              <span className="truncate">Get Started</span>
            </Link>
          </div>
        </div>
        <div className="lg:hidden text-white">
          <span className="material-symbols-outlined">menu</span>
        </div>
      </header>

      {/* ─── Hero Section ─────────────────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center justify-center px-4 pt-32 pb-20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[128px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto gap-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest backdrop-blur-sm shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            Solutions
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1.1]">
            <span className="text-gradient">Automate the</span><br />
            <span className="text-gradient">Impossible Tasks</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
            Eliminate operational overhead instantly. Discover exactly how our unified tools scale from startups to global enterprises.
          </p>
        </div>
      </div>

      {/* ─── Immersive Solutions Marquee / Cards ──────────────────────────────── */}
      <section className="relative w-full overflow-hidden bg-[#1f1f1f] border-y border-[#303030] py-24 z-10">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="layout-container px-6 lg:px-40 flex flex-col gap-16 relative z-10">
          
          {/* Solution Segment 1 */}
          <div className="flex flex-col md:flex-row items-center gap-12 group">
            <div className="flex-1 w-full relative h-[300px]">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-600/20 to-blue-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-700" />
              <div className="relative glass-panel w-full h-full rounded-2xl border border-white/10 flex items-center justify-center p-8 bg-[#1a1a1a] shadow-2xl">
                <div className="light-sweep" />
                <div className="flex flex-col gap-6 w-full">
                   <div className="h-6 w-1/3 bg-cyan-500/20 rounded border border-cyan-500/40" />
                   <div className="h-6 w-1/2 bg-blue-500/20 rounded border border-blue-500/40" />
                   <div className="h-6 w-full bg-[#2a2a2a] rounded animate-pulse" />
                   <div className="h-6 w-5/6 bg-[#2a2a2a] rounded animate-pulse delay-75" />
                </div>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 text-cyan-400 mb-4">
                <span className="material-symbols-outlined text-3xl">all_inclusive</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">Unified Operations</h3>
              <p className="text-zinc-400 leading-relaxed text-lg">
                For the rapidly scaling enterprise, bringing fragmented data into a single operating model stops revenue leaks and removes duplicate work. A true source of truth.
              </p>
            </div>
          </div>

          {/* Solution Segment 2 */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-12 group">
            <div className="flex-1 w-full relative h-[300px]">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600/20 to-teal-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-700" />
              <div className="relative glass-panel w-full h-full rounded-2xl border border-white/10 flex p-8 bg-[#1a1a1a] shadow-2xl items-end justify-between">
                <div className="light-sweep" style={{ animationDelay: "1s" }} />
                {[45, 70, 50, 90, 60, 100].map((h, i) => (
                  <div key={i} className="w-[14%] rounded-t-lg bg-gradient-to-t from-emerald-500/10 to-emerald-400/80 shadow-[0_0_15px_rgba(52,211,153,0.3)] transition-all hover:scale-x-110" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 text-emerald-400 mb-4">
                <span className="material-symbols-outlined text-3xl">monitoring</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">Live Predictive Analytics</h3>
              <p className="text-zinc-400 leading-relaxed text-lg">
                Don't look at last week's reports. Our algorithms analyze deal velocity, employee chat sentiment, and project completion curves to predict exactly where you stand right now.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ─── Pricing Section ──────────────────────────────────────────────────── */}
      <section id="pricing" className="relative z-10 w-full px-6 lg:px-40 py-32 bg-[#141414]">
        <div className="flex w-full flex-col items-center mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-widest backdrop-blur-sm mb-6">
            Pricing
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white">Simple, Transparent Pricing</h2>
          <p className="text-zinc-400 mt-4 text-lg">Invest in absolute clarity. Cancel anytime.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
          
          {/* Starter Tier */}
          <div className="glass-panel flex flex-col p-8 rounded-2xl border border-white/5 bg-[#1a1a1a]/50">
            <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
            <div className="text-zinc-500 text-sm mb-6 pb-6 border-b border-[#2e2e2e]">Perfect for small teams finding their footing.</div>
            <div className="mb-6">
              <span className="text-5xl font-black text-white">$49</span>
              <span className="text-zinc-500 font-medium">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 text-sm text-zinc-300">
              <li className="flex gap-3"><span className="material-symbols-outlined text-sm text-zinc-500">check_circle</span> Up to 5 team members</li>
              <li className="flex gap-3"><span className="material-symbols-outlined text-sm text-zinc-500">check_circle</span> Basic CRM tracking</li>
              <li className="flex gap-3"><span className="material-symbols-outlined text-sm text-zinc-500">check_circle</span> 10 GB Secure Storage</li>
              <li className="flex gap-3"><span className="material-symbols-outlined text-sm text-zinc-500">check_circle</span> Core Chat Module</li>
            </ul>
            <button className="mt-auto w-full py-3 rounded-lg border border-[#303030] text-white hover:bg-[#303030] transition-colors font-bold">Start Free Trial</button>
          </div>

          {/* Pro Tier - Glowing and Elevated */}
          <div className="relative glass-panel flex flex-col p-8 rounded-2xl border border-blue-500/40 bg-[#1a1a1a] shadow-[0_0_50px_rgba(59,130,246,0.15)] transform scale-[1.02] lg:scale-[1.05] z-20">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-[10px] uppercase tracking-widest font-bold px-4 py-1 rounded-full shadow-lg shadow-blue-500/30">
              Most Popular
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Professional</h3>
            <div className="text-zinc-500 text-sm mb-6 pb-6 border-b border-[#2e2e2e]">For rapidly scaling operations and heavy workflows.</div>
            <div className="mb-6">
              <span className="text-5xl font-black text-white">$149</span>
              <span className="text-zinc-500 font-medium">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 text-sm text-zinc-300">
              <li className="flex gap-3"><span className="material-symbols-outlined text-sm text-blue-400">check_circle</span> Everything in Starter</li>
              <li className="flex gap-3"><span className="material-symbols-outlined text-sm text-blue-400">check_circle</span> Up to 25 team members</li>
              <li className="flex gap-3"><span className="material-symbols-outlined text-sm text-blue-400">check_circle</span> Advanced AI Predictors</li>
              <li className="flex gap-3"><span className="material-symbols-outlined text-sm text-blue-400">check_circle</span> Automated Meeting Generation</li>
              <li className="flex gap-3"><span className="material-symbols-outlined text-sm text-blue-400">check_circle</span> Finance & Project Automation</li>
            </ul>
            <button className="mt-auto w-full py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-bold shadow-lg shadow-blue-600/20">Get Full Access</button>
          </div>

          {/* Enterprise Tier */}
          <div className="glass-panel flex flex-col p-8 rounded-2xl border border-white/5 bg-[#1a1a1a]/50">
            <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
            <div className="text-zinc-500 text-sm mb-6 pb-6 border-b border-[#2e2e2e]">Maximized security bounds and unlimited scale.</div>
            <div className="mb-6">
              <span className="text-5xl font-black text-white">Custom</span>
            </div>
            <ul className="space-y-4 mb-8 text-sm text-zinc-300">
              <li className="flex gap-3"><span className="material-symbols-outlined text-sm text-zinc-500">check_circle</span> Everything in Pro</li>
              <li className="flex gap-3"><span className="material-symbols-outlined text-sm text-zinc-500">check_circle</span> Unlimited team members</li>
              <li className="flex gap-3"><span className="material-symbols-outlined text-sm text-zinc-500">check_circle</span> Dedicated Success Manager</li>
              <li className="flex gap-3"><span className="material-symbols-outlined text-sm text-zinc-500">check_circle</span> On-Premise Audit Logs</li>
            </ul>
            <button className="mt-auto w-full py-3 rounded-lg border border-[#303030] text-white hover:bg-[#303030] transition-colors font-bold">Contact Sales</button>
          </div>

        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="mt-auto py-8 border-t border-[#252525] flex flex-col md:flex-row justify-between items-center text-zinc-600 text-sm px-6 lg:px-40 bg-[#141414]">
        <p>© 2024 Clarity OS. All rights reserved.</p>
      </footer>
    </div>
  );
}
