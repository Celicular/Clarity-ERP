/* ─────────────────────────────────────────────────────────────────────────────
   app/dashboard/DashboardShell.js
   Client Component — SPA architecture.
   Manages activeView state, renders Sidebar + the matching content panel.
   Shows OnboardingModal for employees on first login.
   Sales sub-role users default to SalesDashboardView.
───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState }            from "react";
import Sidebar               from "../components/Sidebar";
import { WebSocketProvider } from "../components/WebSocketProvider";
import OnboardingModal       from "../components/OnboardingModal";
import DashboardHome         from "../components/DashboardHome";
import TimeTracker           from "../components/TimeTracker";
import ProfileView           from "../components/ProfileView";
import UsersView             from "../components/UsersView";
import LeavesView            from "../components/LeavesView";
import MeetingsView          from "../components/MeetingsView";
import PayslipsView          from "../components/PayslipsView";
import NotesView             from "../components/NotesView";
import LeadsView             from "../components/LeadsView";
import ClientsView           from "../components/ClientsView";
import SalesDashboardView    from "../components/SalesDashboardView";
import ProjectsView          from "../components/ProjectsView";
import DeveloperProfileView  from "../components/DeveloperProfileView";
import BugReportView         from "../components/BugReportView";
import ChatView              from "../components/ChatView";
import AuditLogsView         from "../components/AuditLogsView";
import PasswordReentryModal  from "../components/PasswordReentryModal";
import TicketsView           from "../components/TicketsView";
import WebmailView           from "../components/WebmailView";

/* ── View registry ── */
const VIEW_COMPONENTS = {
  dashboard:       DashboardHome,
  "sales-dash":    SalesDashboardView,
  "time-tracker":  TimeTracker,
  profile:         ProfileView,
  users:           UsersView,
  leaves:          LeavesView,
  meetings:        MeetingsView,
  payslips:        PayslipsView,
  notes:           NotesView,
  leads:           LeadsView,
  clients:         ClientsView,
  projects:        ProjectsView,
  "dev-profile":   DeveloperProfileView,
  "bug-reports":   BugReportView,
  "chat":          ChatView,
  "audit-logs":    AuditLogsView,
  "tickets":       TicketsView,
  "webmail":       WebmailView,
};

/* ── Role-based navigation ── */
const NAV_ITEMS = {
  ADMIN: [
    { id: "dashboard",   label: "Dashboard",       icon: "dashboard" },
    { id: "users",       label: "Users",            icon: "manage_accounts" },
    { id: "sales-dash",  label: "Sales Dashboard",  icon: "bar_chart",     section: "Sales" },
    { id: "leads",       label: "Leads",            icon: "leaderboard" },
    { id: "clients",     label: "Clients",          icon: "business" },
    { id: "projects",    label: "Projects",         icon: "rocket_launch", section: "Development" },
    { id: "leaves",      label: "Leaves",           icon: "event_busy",    section: "HR" },
    { id: "meetings",    label: "Meetings",         icon: "groups" },
    { id: "payslips",    label: "Payroll",          icon: "payments" },
    { id: "notes",       label: "Notes",            icon: "sticky_note_2" },
    { id: "audit-logs",  label: "Audit Logs",       icon: "shield",        section: "Admin Tools" },
    { id: "tickets",     label: "Tickets",          icon: "confirmation_number", section: "Admin Tools" },
    { id: "chat",        label: "Chats",            icon: "forum",         section: "Personal" },
    { id: "webmail",     label: "Webmail",          icon: "mail",          section: "Personal" },
  ],
  EMPLOYEE: [
    { id: "dashboard",    label: "Dashboard",       icon: "dashboard" },
    { id: "time-tracker", label: "Time Tracker",    icon: "schedule" },
    { id: "sales-dash",   label: "Sales Dashboard", icon: "bar_chart",     section: "Sales" },
    { id: "leads",        label: "Leads",           icon: "leaderboard" },
    { id: "clients",      label: "Clients",         icon: "business" },
    { id: "projects",     label: "Projects",        icon: "rocket_launch", section: "Development" },
    { id: "dev-profile",  label: "Dev Profile",     icon: "engineering" },
    { id: "leaves",       label: "My Leaves",       icon: "event_busy",    section: "HR" },
    { id: "meetings",     label: "Meetings",        icon: "groups" },
    { id: "payslips",     label: "Payslips",        icon: "payments" },
    { id: "notes",        label: "Notes",           icon: "sticky_note_2" },
    { id: "tickets",      label: "Support Tickets", icon: "confirmation_number" },
    { id: "webmail",      label: "Webmail",         icon: "mail",          section: "Personal" },
  ],
};

/* ── Department helpers — use sub_role_dept from JWT (e.g. "Development", "Sales", "Finance", "HR") ── */
function dept(u)          { return (u.sub_role_dept || ""); }
function isDevRole(u)     { return dept(u) === "Development"; }
function isFinanceRole(u) { return dept(u) === "Finance"; }
function isSalesRole(u)   { return dept(u) === "Sales"; }

/* ── Nav items filtered strictly by department ── */
function getNavItems(user) {
  const base = NAV_ITEMS[user.role] ?? NAV_ITEMS.EMPLOYEE;
  if (user.role === "ADMIN") return base;

  /* Shared personal tabs — every employee sees these regardless of department */
  const shared = [
    { id: "leaves",      label: "My Leaves",    icon: "event_busy",    section: "Personal" },
    { id: "meetings",    label: "Meetings",      icon: "groups" },
    { id: "payslips",    label: "Payslips",      icon: "payments" },
    { id: "notes",       label: "Notes",         icon: "sticky_note_2" },
    { id: "bug-reports", label: "Bug Reports",   icon: "bug_report" },
    { id: "tickets",     label: "Support Tickets", icon: "confirmation_number", section: "Support" },
    { id: "chat",        label: "Chats",         icon: "forum" },
    { id: "webmail",     label: "Webmail",       icon: "mail",          section: "Personal" },
  ];

  if (isDevRole(user)) return [
    { id: "projects",    label: "Projects",    icon: "rocket_launch", section: "Work" },
    { id: "dev-profile", label: "Dev Profile", icon: "engineering" },
    ...shared,
  ];
  if (isFinanceRole(user)) return [
    { id: "projects", label: "Projects", icon: "rocket_launch", section: "Work" },
    { id: "payslips", label: "Payroll",  icon: "payments",      section: "Finance" },
    { id: "clients",  label: "Clients",  icon: "business" },
    ...shared,
  ];
  if (isSalesRole(user)) return [
    { id: "sales-dash", label: "Sales Dashboard", icon: "bar_chart",    section: "Sales" },
    { id: "leads",      label: "Leads",            icon: "leaderboard" },
    { id: "clients",    label: "Clients",          icon: "business" },
    ...shared,
  ];
  /* HR or unassigned — full employee nav */
  return base;
}


export default function DashboardShell({ user }) {
  /* Default view by sub-role */
  function getDefaultView() {
    if (isDevRole(user))     return "projects";
    if (isFinanceRole(user)) return "projects";
    if (isSalesRole(user))   return "sales-dash";
    return "dashboard";
  }
  const [activeView, setActiveView]         = useState(getDefaultView());
  const isEmployee      = user.role === "EMPLOYEE";
  const needsOnboarding = isEmployee && user.first_login === true;
  const [showOnboarding, setShowOnboarding] = useState(needsOnboarding);
  
  // State for Audit Logs conditional view
  const [showPwdModal, setShowPwdModal]     = useState(false);
  const [pendingView, setPendingView]       = useState(null);

  const navItems   = getNavItems(user);
  const ActiveView = VIEW_COMPONENTS[activeView] || DashboardHome;

  function handleOnboardingComplete() {
    setShowOnboarding(false);
    window.location.reload();
  }

  function handleViewChange(newView) {
    if (newView === "audit-logs") {
      setPendingView(newView);
      setShowPwdModal(true);
    } else {
      setActiveView(newView);
    }
  }

  function handlePwdSuccess() {
    setShowPwdModal(false);
    if (pendingView) {
      setActiveView(pendingView);
      setPendingView(null);
    }
  }

  function handlePwdCancel() {
    setShowPwdModal(false);
    setPendingView(null);
  }

  return (
    <WebSocketProvider>
      <div className="flex h-screen bg-[#111111] overflow-hidden">

        {/* Onboarding overlay — employees only */}
        {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}

        {/* Password Re-entry Modal */}
        <PasswordReentryModal 
          isOpen={showPwdModal} 
          onClose={handlePwdCancel} 
          onSuccess={handlePwdSuccess} 
        />

        {/* Sidebar */}
        <Sidebar
          user={user}
          navItems={navItems}
          activeView={activeView}
          onViewChange={handleViewChange}
        />

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-auto">
          <div className="flex-1 p-8">
            <ActiveView user={user} onViewChange={setActiveView} />
          </div>
        </main>

      </div>
    </WebSocketProvider>
  );
}
