import Link from "next/link";

export default function AboutPage() {
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
      <div className="relative flex flex-col items-center justify-center px-4 pt-40 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[128px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto gap-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest backdrop-blur-sm shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            Our Story
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1.1]">
            <span className="text-gradient">We Built What We</span><br />
            <span className="text-gradient">Couldn't Find</span>
          </h1>
        </div>
      </div>

      {/* ─── Narrative Section ────────────────────────────────────────────────── */}
      <section className="relative z-10 w-full px-6 lg:px-40 py-16 flex flex-col items-center">
        <div className="max-w-3xl space-y-12 text-xl leading-relaxed text-zinc-400 font-medium">
          <p className="first-letter:text-7xl first-letter:font-black first-letter:text-white first-letter:mr-3 first-letter:float-left">
            It started with a spreadsheet that grew too large. Then a CRM that was too complicated. Then a project management tool that didn't talk to the CRM. Before long, we had twelve disconnected tabs open just to run a single operation. The friction was agonizing.
          </p>

          <p>
            We realized that modern businesses were suffering from <strong className="text-emerald-400">Software Sprawl</strong>. Companies were spending more time moving data between systems than actually acting on the data itself.
          </p>

          <p>
            So, we threw it all away. We locked ourselves in a room and built a completely unified, single-source-of-truth operating system from the ground up. We designed an interface so fluid and an infrastructure so robust that it felt less like software, and more like an extension of the mind.
          </p>

          <div className="glass-panel p-8 rounded-2xl border border-white/5 my-16 bg-[#1a1a1a] shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
             <div className="text-2xl text-white font-bold mb-4">"Absolute Clarity is the absence of friction."</div>
             <div className="font-mono text-emerald-500 text-sm tracking-widest">— The Clarity Team</div>
          </div>

          <p>
            Today, Clarity OS powers the backend of thousands of elite organizations globally. We maintain our core philosophy: no disjointed tools, no manual data entry, no unnecessary clicks. Just absolute, unadulterated performance.
          </p>
        </div>
      </section>

      {/* ─── Footer with Easter Egg ───────────────────────────────────────────── */}
      <footer className="mt-auto pt-8 pb-4 border-t border-[#252525] flex flex-col items-center gap-8 px-6 lg:px-40 bg-[#141414]">
        <div className="w-full flex flex-col md:flex-row justify-between items-center text-zinc-600 text-sm">
          <p>© 2024 Clarity OS. All rights reserved.</p>
        </div>

        {/* Hidden Easter Egg - Blends perfectly into #141414 background until highlighted */}
        <div className="text-[#141414] selection:bg-purple-500 selection:text-white mt-12 cursor-text text-xs tracking-widest font-mono select-all text-center">
            made by celi.. with love ❤️
        </div>
      </footer>
    </div>
  );
}
