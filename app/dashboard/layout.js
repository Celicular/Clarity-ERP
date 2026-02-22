/* ─────────────────────────────────────────────────────────────────────────────
   app/dashboard/layout.js
   Server Component — reads JWT session, passes user data to client components.
───────────────────────────────────────────────────────────────────────────── */
import { redirect }   from "next/navigation";
import { getSession }  from "../../lib/auth";
import DashboardShell  from "./DashboardShell";

export default async function DashboardLayout() {
  const session = await getSession();
  if (!session) redirect("/login");

  /* Pass the full session so sub_role_dept (department) reaches DashboardShell
     and all child components (ProjectWorkspaceView, etc.) correctly. */
  const user = {
    id:                session.id,
    name:              session.name,
    email:             session.email,
    role:              session.role,
    first_login:       session.first_login,
    profile_completed: session.profile_completed,
    sub_role_dept:     session.sub_role_dept  || null,   // "Development" | "Sales" | "Finance" | "HR" | null
    sub_role_name:     session.sub_role_name  || null,   // e.g. "Senior Developer"
  };

  return <DashboardShell user={user} />;
}
