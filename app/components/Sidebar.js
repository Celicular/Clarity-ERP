/* ─────────────────────────────────────────────────────────────────────────────
   app/components/Sidebar.js
   Collapsible role-based sidebar with SPA view switching.
   - Receives navItems from DashboardShell, activeView + onViewChange
   - Bottom section: My Profile + Logout (always visible)
───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect }  from "react";
import { useRouter }            from "next/navigation";

export default function Sidebar({ user, navItems, activeView, onViewChange }) {
  const [collapsed, setCollapsed]       = useState(false);
  const [loggingOut, setLoggingOut]     = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const [chatUnread, setChatUnread]     = useState(0);
  const router = useRouter();

  const WS_PRIMARY  = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
  const WS_FALLBACK = process.env.NEXT_PUBLIC_WS_FALLBACK_URL
    || (typeof window !== "undefined" ? `ws://${window.location.hostname}:3001` : "ws://localhost:3001");

  /* ── Poll overdue follow-ups every 90 s ── */
  useEffect(() => {
    async function checkOverdue() {
      try {
        const res  = await fetch("/api/followups?status=pending&overdue=true&limit=50");
        const data = await res.json();
        setOverdueCount((data.followups || []).length);
      } catch { /* silent */ }
    }
    checkOverdue();
    const iv = setInterval(checkOverdue, 90_000);
    return () => clearInterval(iv);
  }, []);

  /* ── Poll chat unread count every 30 s ── */
  useEffect(() => {
    async function checkUnread() {
      try {
        const res  = await fetch("/api/chat/unread");
        const data = await res.json();
        setChatUnread(data.total || 0);
      } catch { /* silent */ }
    }
    checkUnread();
    const iv = setInterval(checkUnread, 30_000);
    
    // Listen for instant read updates from ChatView
    window.addEventListener("chat:read", checkUnread);

    // Global WS connection for instant unread notifications
    let ws = null;
    async function connectGlobalWS(url = WS_PRIMARY) {
      try {
        const tRes = await fetch("/api/chat/ws-ticket");
        if (!tRes.ok) return;
        const { token } = await tRes.json();
        if (!token) return;

        ws = new WebSocket(`${url}?room=global&token=${encodeURIComponent(token)}`);
        ws.onerror = () => {
          if (url === WS_PRIMARY && WS_FALLBACK !== WS_PRIMARY) {
            console.warn("[Sidebar] localhost WS failed, trying fallback:", WS_FALLBACK);
            ws.close();
            connectGlobalWS(WS_FALLBACK);
          }
        };
        ws.onmessage = (e) => {
          const data = JSON.parse(e.data);
          if (data.type === "global_message") {
            checkUnread();
            window.dispatchEvent(new Event("chat:unread_bump"));
          }
        };
      } catch { /* ignore */ }
    }
    connectGlobalWS();

    return () => {
      clearInterval(iv);
      window.removeEventListener("chat:read", checkUnread);
      if (ws) ws.close();
    };
  }, []);

  /* ── Logout ── */
  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  /* ── Role badge colour ── */
  const roleBadgeClass =
    user.role === "ADMIN"
      ? "bg-purple-500/15 text-purple-400 border-purple-500/20"
      : "bg-blue-500/15 text-blue-400 border-blue-500/20";

  return (
    <aside
      className={`
        relative flex flex-col h-screen
        bg-[#151515] border-r border-[#252525]
        transition-all duration-300 ease-in-out shrink-0
        ${collapsed ? "w-[64px]" : "w-[240px]"}
      `}
    >
      {/* ── Toggle button ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="
          absolute -right-3 top-6 z-10
          size-6 rounded-full
          bg-[#252525] border border-[#333]
          flex items-center justify-center
          text-zinc-500 hover:text-white hover:bg-[#333]
          transition-all
        "
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className="material-symbols-outlined text-[14px]">
          {collapsed ? "chevron_right" : "chevron_left"}
        </span>
      </button>

      {/* ── Logo / brand ── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#252525] overflow-hidden">
        <div className="shrink-0 size-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-white">
          <span className="material-symbols-outlined text-lg">grid_view</span>
        </div>
        {!collapsed && (
          <span className="text-white font-bold text-base tracking-tight whitespace-nowrap">
            Clarity
          </span>
        )}
      </div>

      {/* ── User card ── */}
      {!collapsed && (
        <div className="mx-3 mt-4 p-3 rounded-xl bg-white/3 border border-white/5 flex items-center gap-3 overflow-hidden">
          <div className="shrink-0 size-8 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-white text-xs font-bold">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{user.name}</div>
            <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border ${roleBadgeClass}`}>
              {user.role}
            </span>
          </div>
        </div>
      )}

      {/* ── Collapsed avatar ── */}
      {collapsed && (
        <div className="flex justify-center mt-4">
          <div className="size-8 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-white text-xs font-bold">
            {user.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* ── Overdue follow-up bell ── */}
      <div className={`px-2 mt-3 ${collapsed ? "flex justify-center" : ""}`}>
        <button
          onClick={() => onViewChange("leads")}
          title={overdueCount > 0 ? `${overdueCount} overdue follow-up${overdueCount !== 1 ? "s" : ""}` : "Follow-ups"}
          className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg w-full
            transition-all group
            ${overdueCount > 0
              ? "bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
              : "hover:bg-white/5 border border-transparent"
            }
            ${collapsed ? "justify-center" : ""}
          `}
        >
          <span className={`material-symbols-outlined text-xl shrink-0 ${overdueCount > 0 ? "text-red-400" : "text-zinc-600 group-hover:text-white"}`}>
            notifications
          </span>
          {overdueCount > 0 && (
            <span className="absolute top-1.5 left-7 size-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {overdueCount > 9 ? "9+" : overdueCount}
            </span>
          )}
          {!collapsed && (
            <span className={`text-sm font-medium whitespace-nowrap ${overdueCount > 0 ? "text-red-400" : "text-zinc-500 group-hover:text-white"}`}>
              {overdueCount > 0 ? `${overdueCount} Overdue` : "Follow-Ups"}
            </span>
          )}
        </button>
      </div>

      {/* ── Section label ── */}
      {!collapsed && (
        <p className="mt-4 px-4 text-[10px] uppercase tracking-widest text-zinc-600 font-semibold">
          Navigation
        </p>
      )}

      {/* ── Nav items (SPA view switching) ── */}
      <nav className="flex-1 flex flex-col gap-1 mt-2 px-2 overflow-y-auto overflow-x-hidden">
        {navItems.map((item, idx) => {
          const isActive = activeView === item.id;
          const showSection = !collapsed && item.section &&
            (idx === 0 || navItems[idx-1].section !== item.section);
          return (
            <div key={item.id}>
              {showSection && (
                <p className="mt-3 mb-1 px-2 text-[9px] uppercase tracking-widest text-zinc-700 font-bold">
                  {item.section}
                </p>
              )}
              <button
                onClick={() => onViewChange(item.id)}
                title={collapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg
                  text-sm font-medium transition-all group w-full text-left
                  ${isActive
                    ? "bg-white/8 text-white"
                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                  }
                  ${collapsed ? "justify-center" : ""}
                `}
              >
              <span className={`material-symbols-outlined text-xl shrink-0 ${isActive ? "text-white" : "text-zinc-600 group-hover:text-white"}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="whitespace-nowrap flex-1">{item.label}</span>
              )}
              {/* Chat unread badge on the Chats nav item */}
              {item.id === "chat" && chatUnread > 0 && (
                <span className={`shrink-0 min-w-[18px] h-[18px] rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center px-1 ${collapsed ? "absolute top-1 right-1" : ""}`}>
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              )}
              {isActive && !collapsed && (
                <span className="ml-auto size-1.5 rounded-full bg-blue-400" />
              )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* ── Bottom section: Profile + Logout ── */}
      <div className="mt-auto border-t border-[#252525] px-2 py-3 flex flex-col gap-1">

        {/* My Profile */}
        <button
          onClick={() => onViewChange("profile")}
          title={collapsed ? "My Profile" : undefined}
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg
            text-sm font-medium transition-all group w-full text-left
            ${activeView === "profile"
              ? "bg-white/8 text-white"
              : "text-zinc-500 hover:text-white hover:bg-white/5"
            }
            ${collapsed ? "justify-center" : ""}
          `}
        >
          <span className="material-symbols-outlined text-xl shrink-0 text-zinc-600 group-hover:text-white">
            account_circle
          </span>
          {!collapsed && <span className="whitespace-nowrap">My Profile</span>}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title={collapsed ? "Logout" : undefined}
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg
            text-sm font-medium text-zinc-500
            hover:text-red-400 hover:bg-red-500/5
            transition-all group w-full text-left
            disabled:opacity-50 disabled:cursor-not-allowed
            ${collapsed ? "justify-center" : ""}
          `}
        >
          {loggingOut ? (
            <svg className="animate-spin size-5 shrink-0 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <span className="material-symbols-outlined text-xl shrink-0 text-zinc-600 group-hover:text-red-400">logout</span>
          )}
          {!collapsed && <span className="whitespace-nowrap">{loggingOut ? "Logging out..." : "Logout"}</span>}
        </button>
      </div>
    </aside>
  );
}
