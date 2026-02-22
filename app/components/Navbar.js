"use client";

import Link from "next/link";
import { useState } from "react";
import WebsiteLeadModal from "./WebsiteLeadModal";

export default function Navbar() {
  const [showLeadModal, setShowLeadModal] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#303030] px-6 lg:px-40 py-3 z-50 bg-[#141414]/90 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-4 text-white">
          <div className="size-6 text-white">
            <span className="material-symbols-outlined text-2xl">grid_view</span>
          </div>
          <Link href="/" className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">
            Clarity
          </Link>
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
              <Link
                key={link.label}
                href={link.href}
                className="text-white text-sm font-medium leading-normal hover:text-gray-300 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex gap-2">
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

      <WebsiteLeadModal isOpen={showLeadModal} onClose={() => setShowLeadModal(false)} />
    </>
  );
}
