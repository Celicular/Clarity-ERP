/* ─────────────────────────────────────────────────────────────────────────────
   app/components/UsersView.js
   Admin-only: User Management panel.
   - Filterable user table (search, role, status)
   - Create user modal
   - Edit user modal (name, email, role, status, sub-role, sub-sub-role)
   - Delete confirmation
   - Admin password reset
   - Manage Sub-Roles modal: full CRUD for sub-roles + sub-sub-roles (cascaded)
───────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Reusable input field ── */
function UInput({ label, value, onChange, type = "text", placeholder = "", disabled = false, required = false }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-400">
        {label} {required && <span className="text-orange-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5
          text-sm text-white placeholder:text-zinc-600
          focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20
          transition-all ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      />
    </div>
  );
}

/* ── Reusable select ── */
function USelect({ label, value, onChange, options, disabled = false }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white
                   focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all
                   ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ── Spinner ── */
function Spinner() {
  return (
    <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

/* ── Role badge ── */
function RoleBadge({ role }) {
  return (
    <span className={`
      inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border
      ${role === "ADMIN"
        ? "bg-purple-500/15 text-purple-400 border-purple-500/20"
        : "bg-blue-500/15 text-blue-400 border-blue-500/20"
      }
    `}>
      {role}
    </span>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }) {
  return (
    <span className={`
      inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border
      ${status === "Active"
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
      }
    `}>
      <span className={`size-1.5 rounded-full ${status === "Active" ? "bg-emerald-400" : "bg-zinc-500"}`} />
      {status}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────────────────── */
export default function UsersView({ user: currentUser }) {
  /* ── User list state ── */
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [filterRole, setFilterRole]     = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  /* ── Sub-role data ── */
  const [subRoles, setSubRoles]         = useState([]); // [{id, department, name}]
  const [subSubRoles, setSubSubRoles]   = useState([]); // [{id, sub_role_id, name}]

  /* ── User modals ── */
  const [modal, setModal]     = useState(null); // "create" | "edit" | "delete" | "reset-pw" | "manage-sub-roles"
  const [selected, setSelected] = useState(null);

  /* ── Create/Edit form ── */
  const [formName, setFormName]         = useState("");
  const [formEmail, setFormEmail]       = useState("");
  const [formRole, setFormRole]         = useState("EMPLOYEE");
  const [formStatus, setFormStatus]     = useState("Active");
  const [formPassword, setFormPassword] = useState("");
  const [formSubRole, setFormSubRole]   = useState("");     // sub_role_id
  const [formSubSubRole, setFormSubSubRole] = useState(""); // sub_sub_role_id
  const [newPw, setNewPw]               = useState("");

  const [saving, setSaving]       = useState(false);
  const [modalError, setModalError] = useState("");
  const [toast, setToast]         = useState("");

  /* ── Manage Sub-Roles modal state ── */
  const [srTab, setSrTab]                 = useState("sub-roles"); // "sub-roles" | "sub-sub-roles"
  const [srDept, setSrDept]               = useState("Development");
  const [srName, setSrName]               = useState("");
  const [srSaving, setSrSaving]           = useState(false);
  const [srError, setSrError]             = useState("");
  // Sub-sub-roles form
  const [ssrParent, setSsrParent]         = useState(""); // sub_role_id
  const [ssrName, setSsrName]             = useState("");
  // Edit state (inline)
  const [editSrId, setEditSrId]           = useState(null);
  const [editSrDept, setEditSrDept]       = useState("");
  const [editSrName, setEditSrName]       = useState("");
  const [editSsrId, setEditSsrId]         = useState(null);
  const [editSsrName, setEditSsrName]     = useState("");

  /* ── Fetch all users ── */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filterRole)   p.set("role",   filterRole);
      if (filterStatus) p.set("status", filterStatus);
      if (search)       p.set("search", search);
      const res  = await fetch(`/api/users?${p}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filterRole, filterStatus, search]);

  /* ── Fetch sub-roles + sub-sub-roles ── */
  const fetchSubRoles = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/sub-roles").then((r) => r.json()),
        fetch("/api/sub-sub-roles").then((r) => r.json()),
      ]);
      setSubRoles(r1.subRoles || []);
      setSubSubRoles(r2.subSubRoles || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchSubRoles(); }, [fetchSubRoles]);

  /* ── Toast helper ── */
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  /* ── Cascading: sub-sub-roles filtered by selected sub-role ── */
  const filteredSubSubRoles = formSubRole
    ? subSubRoles.filter((s) => s.sub_role_id === formSubRole)
    : [];

  /* ── Open modals ── */
  function openCreate() {
    setFormName(""); setFormEmail(""); setFormRole("EMPLOYEE");
    setFormPassword(""); setModalError("");
    setFormSubRole(""); setFormSubSubRole("");
    setModal("create");
  }

  function openEdit(u) {
    setSelected(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormStatus(u.status);
    setFormSubRole(u.sub_role_id || "");
    setFormSubSubRole(u.sub_sub_role_id || "");
    setModalError("");
    setModal("edit");
  }

  function openDelete(u)  { setSelected(u); setModal("delete"); }
  function openResetPw(u) { setSelected(u); setNewPw(""); setModalError(""); setModal("reset-pw"); }

  function openManageSubRoles() {
    setSrTab("sub-roles"); setSrDept("Development"); setSrName("");
    setSsrParent(""); setSsrName("");
    setSrError(""); setEditSrId(null); setEditSsrId(null);
    setModal("manage-sub-roles");
  }

  function closeModal() {
    setModal(null); setSelected(null); setSaving(false); setModalError("");
    setEditSrId(null); setEditSsrId(null);
  }

  /* ── Create user ── */
  async function handleCreate() {
    if (!formName || !formEmail || !formPassword) {
      setModalError("Name, email, and password are required.");
      return;
    }
    setSaving(true); setModalError("");
    try {
      const res  = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, email: formEmail, password: formPassword, role: formRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      closeModal(); fetchUsers(); showToast("User created.");
    } catch (e) { setModalError(e.message); }
    finally { setSaving(false); }
  }

  /* ── Update user (name/email/role/status + sub-role assignment) ── */
  async function handleUpdate() {
    setSaving(true); setModalError("");
    try {
      // 1. Core user fields
      const r1 = await fetch(`/api/users/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, email: formEmail, role: formRole, status: formStatus }),
      });
      const d1 = await r1.json();
      if (!r1.ok) throw new Error(d1.error);

      // 2. Sub-role assignment (always call to sync)
      const r2 = await fetch(`/api/users/${selected.id}/assign-sub-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sub_role_id:     formSubRole     || null,
          sub_sub_role_id: formSubSubRole  || null,
        }),
      });
      const d2 = await r2.json();
      if (!r2.ok) throw new Error(d2.error);

      closeModal(); fetchUsers(); showToast("User updated.");
    } catch (e) { setModalError(e.message); }
    finally { setSaving(false); }
  }

  /* ── Delete user ── */
  async function handleDelete() {
    setSaving(true);
    try {
      const res  = await fetch(`/api/users/${selected.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      closeModal(); fetchUsers(); showToast("User deleted.");
    } catch (e) { setModalError(e.message); }
    finally { setSaving(false); }
  }

  /* ── Reset password ── */
  async function handleResetPw() {
    if (!newPw || newPw.length < 6) { setModalError("Password must be at least 6 characters."); return; }
    setSaving(true); setModalError("");
    try {
      const res  = await fetch(`/api/users/${selected.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      closeModal(); showToast("Password reset. User will re-onboard on next login.");
    } catch (e) { setModalError(e.message); }
    finally { setSaving(false); }
  }

  /* ── Quick toggle active/inactive ── */
  async function toggleStatus(u) {
    const next = u.status === "Active" ? "Inactive" : "Active";
    try {
      await fetch(`/api/users/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      fetchUsers();
      showToast(`${u.name} ${next === "Active" ? "activated" : "deactivated"}.`);
    } catch { /* silent */ }
  }

  /* ═══════════════════════════════════════════════════════════════
     Manage Sub-Roles — CRUD handlers
  ═══════════════════════════════════════════════════════════════ */
  const DEPTS = ["Development", "Sales", "HR", "Finance"];

  /* Create sub-role */
  async function handleCreateSubRole() {
    if (!srName.trim()) { setSrError("Sub-role name is required."); return; }
    setSrSaving(true); setSrError("");
    try {
      const res  = await fetch("/api/sub-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department: srDept, name: srName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSrName("");
      await fetchSubRoles();
      showToast("Sub-role created.");
    } catch (e) { setSrError(e.message); }
    finally { setSrSaving(false); }
  }

  /* Save edited sub-role */
  async function handleSaveSubRole(id) {
    setSrSaving(true); setSrError("");
    try {
      const res  = await fetch(`/api/sub-roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department: editSrDept, name: editSrName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditSrId(null);
      await fetchSubRoles();
      showToast("Sub-role updated.");
    } catch (e) { setSrError(e.message); }
    finally { setSrSaving(false); }
  }

  /* Delete sub-role */
  async function handleDeleteSubRole(id) {
    setSrSaving(true); setSrError("");
    try {
      const res  = await fetch(`/api/sub-roles/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchSubRoles();
      showToast("Sub-role deleted.");
    } catch (e) { setSrError(e.message); }
    finally { setSrSaving(false); }
  }

  /* Create sub-sub-role */
  async function handleCreateSubSubRole() {
    if (!ssrParent) { setSrError("Select a parent sub-role."); return; }
    if (!ssrName.trim()) { setSrError("Sub-sub-role name is required."); return; }
    setSrSaving(true); setSrError("");
    try {
      const res  = await fetch("/api/sub-sub-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub_role_id: ssrParent, name: ssrName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSsrName("");
      await fetchSubRoles();
      showToast("Sub-sub-role created.");
    } catch (e) { setSrError(e.message); }
    finally { setSrSaving(false); }
  }

  /* Save edited sub-sub-role */
  async function handleSaveSubSubRole(id) {
    setSrSaving(true); setSrError("");
    try {
      const res  = await fetch(`/api/sub-sub-roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editSsrName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditSsrId(null);
      await fetchSubRoles();
      showToast("Sub-sub-role updated.");
    } catch (e) { setSrError(e.message); }
    finally { setSrSaving(false); }
  }

  /* Delete sub-sub-role */
  async function handleDeleteSubSubRole(id) {
    setSrSaving(true); setSrError("");
    try {
      const res  = await fetch(`/api/sub-sub-roles/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchSubRoles();
      showToast("Sub-sub-role deleted.");
    } catch (e) { setSrError(e.message); }
    finally { setSrSaving(false); }
  }

  /* ─────────────────────── Render ─────────────────────── */
  return (
    <div className="flex flex-col gap-6">

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-xl flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400">manage_accounts</span>
            User Management
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">Create, edit, and manage all user accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Manage Sub-Roles button */}
          <button
            onClick={openManageSubRoles}
            className="px-4 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-orange-500/40
                       text-zinc-400 hover:text-orange-400 text-sm font-semibold transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">category</span>
            Manage Sub-Roles
          </button>
          <button
            onClick={openCreate}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold
                       transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            Add User
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-2.5
                       text-sm text-white placeholder:text-zinc-600
                       focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white
                     focus:outline-none focus:border-blue-500/50 transition-all min-w-[140px]"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="EMPLOYEE">Employee</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white
                     focus:outline-none focus:border-blue-500/50 transition-all min-w-[140px]"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* ── User table ── */}
      <div className="bg-[#161616] border border-[#252525] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-zinc-500">
            <Spinner /> <span className="text-sm">Loading users…</span>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="material-symbols-outlined text-zinc-700 text-4xl">group_off</span>
            <p className="text-sm text-zinc-600">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#252525]">
                  <th className="text-left text-xs font-semibold text-zinc-500 px-5 py-3">User</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Role</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Department</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Sub-Role</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">Last Login</th>
                  <th className="text-right text-xs font-semibold text-zinc-500 px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr
                    key={u.id}
                    className={`transition-colors hover:bg-white/2 ${i < users.length - 1 ? "border-b border-[#1e1e1e]" : ""}`}
                  >
                    {/* User */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium">{u.name}</div>
                          <div className="text-xs text-zinc-500">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-4 py-3.5">
                      <RoleBadge role={u.role} />
                    </td>

                    {/* Status — clickable toggle */}
                    <td className="px-4 py-3.5">
                      {u.id === currentUser.id ? (
                        <StatusBadge status={u.status} />
                      ) : (
                        <button
                          onClick={() => toggleStatus(u)}
                          title="Toggle active/inactive"
                          className="hover:opacity-80 transition-opacity"
                        >
                          <StatusBadge status={u.status} />
                        </button>
                      )}
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3.5 text-zinc-400 text-xs">
                      {u.department || <span className="text-zinc-700">—</span>}
                    </td>

                    {/* Sub-Role */}
                    <td className="px-4 py-3.5 text-xs">
                      {u.sub_role_name ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-orange-300 font-medium">{u.sub_role_name}</span>
                          {u.sub_sub_role_name && (
                            <span className="text-zinc-500">{u.sub_sub_role_name}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </td>

                    {/* Last login */}
                    <td className="px-4 py-3.5 text-zinc-500 text-xs">
                      {u.last_login
                        ? new Date(u.last_login).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
                        : <span className="text-zinc-700">Never</span>
                      }
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          title="Edit user"
                          className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={() => openResetPw(u)}
                          title="Reset password"
                          className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-orange-400 hover:bg-orange-500/8 transition-all"
                        >
                          <span className="material-symbols-outlined text-base">lock_reset</span>
                        </button>
                        {u.id !== currentUser.id && (
                          <button
                            onClick={() => openDelete(u)}
                            title="Delete user"
                            className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/8 transition-all"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Summary ── */}
      {!loading && users.length > 0 && (
        <p className="text-xs text-zinc-600">
          {users.length} user{users.length !== 1 ? "s" : ""} •{" "}
          {users.filter((u) => u.status === "Active").length} active •{" "}
          {users.filter((u) => u.role === "ADMIN").length} admin{users.filter((u) => u.role === "ADMIN").length !== 1 ? "s" : ""}
        </p>
      )}

      {/* ════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full bg-[#141414] border border-[#252525] rounded-2xl shadow-2xl overflow-hidden
                          ${modal === "manage-sub-roles" ? "max-w-2xl" : "max-w-md"}`}>

            {/* ── Create Modal ── */}
            {modal === "create" && (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-[#252525] flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400 text-xl">person_add</span>
                    Create New User
                  </h3>
                  <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
                <div className="px-6 py-5 flex flex-col gap-4">
                  {modalError && (
                    <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">error</span> {modalError}
                    </div>
                  )}
                  <UInput label="Full Name" value={formName} onChange={setFormName} required placeholder="e.g. John Doe" />
                  <UInput label="Email" type="email" value={formEmail} onChange={setFormEmail} required placeholder="john@company.com" />
                  <UInput label="Initial Password" type="password" value={formPassword} onChange={setFormPassword} required placeholder="Min 6 characters" />
                  <USelect label="Role" value={formRole} onChange={setFormRole} options={[
                    { value: "EMPLOYEE", label: "Employee" },
                    { value: "ADMIN",    label: "Admin" },
                  ]} />
                  <div className="flex gap-3 pt-2">
                    <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-zinc-400 hover:text-white text-sm font-semibold transition-all">
                      Cancel
                    </button>
                    <button onClick={handleCreate} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                      {saving ? <Spinner /> : <span className="material-symbols-outlined text-base">check</span>}
                      {saving ? "Creating…" : "Create User"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Edit Modal ── */}
            {modal === "edit" && selected && (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-[#252525] flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400 text-xl">edit</span>
                    Edit User
                  </h3>
                  <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
                <div className="px-6 py-5 flex flex-col gap-4">
                  {modalError && (
                    <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">error</span> {modalError}
                    </div>
                  )}
                  <UInput label="Full Name" value={formName} onChange={setFormName} required />
                  <UInput label="Email" type="email" value={formEmail} onChange={setFormEmail} required />
                  <USelect label="Role" value={formRole} onChange={setFormRole} options={[
                    { value: "EMPLOYEE", label: "Employee" },
                    { value: "ADMIN",    label: "Admin" },
                  ]} />
                  <USelect label="Status" value={formStatus} onChange={setFormStatus} options={[
                    { value: "Active",   label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                  ]} />

                  {/* Sub-role cascade */}
                  <div className="border-t border-[#252525] pt-4 flex flex-col gap-3">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sub-Role Assignment</p>
                    {/* Sub-role dropdown */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-zinc-400">Sub-Role</label>
                      <select
                        value={formSubRole}
                        onChange={(e) => { setFormSubRole(e.target.value); setFormSubSubRole(""); }}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white
                                   focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                      >
                        <option value="">— None —</option>
                        {subRoles.map((sr) => (
                          <option key={sr.id} value={sr.id}>{sr.department} › {sr.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sub-sub-role dropdown — only shown when a sub-role is selected */}
                    {formSubRole && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-zinc-400">Sub-Sub-Role</label>
                        <select
                          value={formSubSubRole}
                          onChange={(e) => setFormSubSubRole(e.target.value)}
                          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white
                                     focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                        >
                          <option value="">— None —</option>
                          {filteredSubSubRoles.map((ssr) => (
                            <option key={ssr.id} value={ssr.id}>{ssr.name}</option>
                          ))}
                        </select>
                        {filteredSubSubRoles.length === 0 && (
                          <p className="text-xs text-zinc-600">No sub-sub-roles for this sub-role yet.</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-zinc-400 hover:text-white text-sm font-semibold transition-all">
                      Cancel
                    </button>
                    <button onClick={handleUpdate} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                      {saving ? <Spinner /> : <span className="material-symbols-outlined text-base">save</span>}
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Delete Modal ── */}
            {modal === "delete" && selected && (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-[#252525] flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-400 text-xl">delete</span>
                    Delete User
                  </h3>
                  <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
                <div className="px-6 py-5 flex flex-col gap-4">
                  {modalError && (
                    <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">error</span> {modalError}
                    </div>
                  )}
                  <p className="text-sm text-zinc-400">
                    Are you sure you want to delete <span className="text-white font-semibold">{selected.name}</span>?
                    This will permanently remove their account and all associated data.
                  </p>
                  <div className="flex gap-3 pt-2">
                    <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-zinc-400 hover:text-white text-sm font-semibold transition-all">
                      Cancel
                    </button>
                    <button onClick={handleDelete} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                      {saving ? <Spinner /> : <span className="material-symbols-outlined text-base">delete</span>}
                      {saving ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Reset Password Modal ── */}
            {modal === "reset-pw" && selected && (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-[#252525] flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-400 text-xl">lock_reset</span>
                    Reset Password
                  </h3>
                  <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
                <div className="px-6 py-5 flex flex-col gap-4">
                  {modalError && (
                    <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">error</span> {modalError}
                    </div>
                  )}
                  <p className="text-sm text-zinc-400">
                    Set a new password for <span className="text-white font-semibold">{selected.name}</span>.
                    They will be prompted to change it on next login.
                  </p>
                  <UInput label="New Password" type="password" value={newPw} onChange={setNewPw} required placeholder="Min 6 characters" />
                  <div className="flex gap-3 pt-2">
                    <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-zinc-400 hover:text-white text-sm font-semibold transition-all">
                      Cancel
                    </button>
                    <button onClick={handleResetPw} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                      {saving ? <Spinner /> : <span className="material-symbols-outlined text-base">lock_reset</span>}
                      {saving ? "Resetting…" : "Reset Password"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ════════════════════════════════════════════════
                Manage Sub-Roles Modal
            ════════════════════════════════════════════════ */}
            {modal === "manage-sub-roles" && (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-[#252525] flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-400 text-xl">category</span>
                    Manage Sub-Roles
                  </h3>
                  <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#252525]">
                  {[
                    { key: "sub-roles",     label: "Sub-Roles" },
                    { key: "sub-sub-roles", label: "Sub-Sub-Roles" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => { setSrTab(tab.key); setSrError(""); setEditSrId(null); setEditSsrId(null); }}
                      className={`flex-1 py-3 text-sm font-semibold transition-all
                        ${srTab === tab.key
                          ? "text-orange-400 border-b-2 border-orange-400 -mb-px"
                          : "text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="px-6 py-5 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
                  {srError && (
                    <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">error</span> {srError}
                    </div>
                  )}

                  {/* ── Sub-Roles tab ── */}
                  {srTab === "sub-roles" && (
                    <>
                      {/* Create form */}
                      <div className="flex gap-2 items-end">
                        <div className="flex flex-col gap-1.5 w-36 shrink-0">
                          <label className="text-xs font-medium text-zinc-400">Department</label>
                          <select
                            value={srDept}
                            onChange={(e) => setSrDept(e.target.value)}
                            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white
                                       focus:outline-none focus:border-blue-500/50 transition-all"
                          >
                            {DEPTS.map((d) => <option key={d}>{d}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1">
                          <label className="text-xs font-medium text-zinc-400">Sub-Role Name</label>
                          <input
                            value={srName}
                            onChange={(e) => setSrName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreateSubRole()}
                            placeholder="e.g. Frontend Lead"
                            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600
                                       focus:outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                        <button
                          onClick={handleCreateSubRole}
                          disabled={srSaving}
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold
                                     disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0"
                        >
                          {srSaving ? <Spinner /> : <span className="material-symbols-outlined text-base">add</span>}
                          Add
                        </button>
                      </div>

                      {/* List */}
                      <div className="flex flex-col gap-1">
                        {subRoles.length === 0 && (
                          <p className="text-sm text-zinc-600 text-center py-6">No sub-roles yet.</p>
                        )}
                        {subRoles.map((sr) => (
                          <div
                            key={sr.id}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-[#252525]"
                          >
                            {editSrId === sr.id ? (
                              /* Inline edit row */
                              <>
                                <select
                                  value={editSrDept}
                                  onChange={(e) => setEditSrDept(e.target.value)}
                                  className="bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white w-32 focus:outline-none"
                                >
                                  {DEPTS.map((d) => <option key={d}>{d}</option>)}
                                </select>
                                <input
                                  value={editSrName}
                                  onChange={(e) => setEditSrName(e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && handleSaveSubRole(sr.id)}
                                  className="flex-1 bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white focus:outline-none"
                                />
                                <button
                                  onClick={() => handleSaveSubRole(sr.id)}
                                  className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                  title="Save"
                                >
                                  <span className="material-symbols-outlined text-base">check</span>
                                </button>
                                <button
                                  onClick={() => setEditSrId(null)}
                                  className="text-zinc-500 hover:text-white transition-colors"
                                  title="Cancel"
                                >
                                  <span className="material-symbols-outlined text-base">close</span>
                                </button>
                              </>
                            ) : (
                              /* Display row */
                              <>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400 shrink-0">
                                  {sr.department}
                                </span>
                                <span className="flex-1 text-sm text-white">{sr.name}</span>
                                <button
                                  onClick={() => { setEditSrId(sr.id); setEditSrDept(sr.department); setEditSrName(sr.name); setSrError(""); }}
                                  className="size-7 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all"
                                  title="Edit"
                                >
                                  <span className="material-symbols-outlined text-sm">edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteSubRole(sr.id)}
                                  className="size-7 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                  title="Delete"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* ── Sub-Sub-Roles tab ── */}
                  {srTab === "sub-sub-roles" && (
                    <>
                      {/* Create form */}
                      <div className="flex gap-2 items-end">
                        <div className="flex flex-col gap-1.5 w-44 shrink-0">
                          <label className="text-xs font-medium text-zinc-400">Parent Sub-Role</label>
                          <select
                            value={ssrParent}
                            onChange={(e) => setSsrParent(e.target.value)}
                            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white
                                       focus:outline-none focus:border-blue-500/50 transition-all"
                          >
                            <option value="">Select sub-role…</option>
                            {subRoles.map((sr) => (
                              <option key={sr.id} value={sr.id}>{sr.department} › {sr.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1">
                          <label className="text-xs font-medium text-zinc-400">Sub-Sub-Role Name</label>
                          <input
                            value={ssrName}
                            onChange={(e) => setSsrName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreateSubSubRole()}
                            placeholder="e.g. Junior"
                            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600
                                       focus:outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                        <button
                          onClick={handleCreateSubSubRole}
                          disabled={srSaving}
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold
                                     disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0"
                        >
                          {srSaving ? <Spinner /> : <span className="material-symbols-outlined text-base">add</span>}
                          Add
                        </button>
                      </div>

                      {/* List — grouped by parent sub-role */}
                      <div className="flex flex-col gap-3">
                        {subRoles.length === 0 && (
                          <p className="text-sm text-zinc-600 text-center py-6">Create sub-roles first.</p>
                        )}
                        {subRoles.map((sr) => {
                          const children = subSubRoles.filter((s) => s.sub_role_id === sr.id);
                          if (children.length === 0) return null;
                          return (
                            <div key={sr.id}>
                              <p className="text-xs font-semibold text-zinc-500 mb-1.5">
                                {sr.department} › {sr.name}
                              </p>
                              <div className="flex flex-col gap-1">
                                {children.map((ssr) => (
                                  <div
                                    key={ssr.id}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#252525]"
                                  >
                                    {editSsrId === ssr.id ? (
                                      /* Inline edit */
                                      <>
                                        <input
                                          value={editSsrName}
                                          onChange={(e) => setEditSsrName(e.target.value)}
                                          onKeyDown={(e) => e.key === "Enter" && handleSaveSubSubRole(ssr.id)}
                                          className="flex-1 bg-[#111] border border-[#333] rounded px-2 py-1 text-xs text-white focus:outline-none"
                                        />
                                        <button
                                          onClick={() => handleSaveSubSubRole(ssr.id)}
                                          className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                          title="Save"
                                        >
                                          <span className="material-symbols-outlined text-base">check</span>
                                        </button>
                                        <button
                                          onClick={() => setEditSsrId(null)}
                                          className="text-zinc-500 hover:text-white transition-colors"
                                          title="Cancel"
                                        >
                                          <span className="material-symbols-outlined text-base">close</span>
                                        </button>
                                      </>
                                    ) : (
                                      /* Display */
                                      <>
                                        <span className="flex-1 text-sm text-white">{ssr.name}</span>
                                        <button
                                          onClick={() => { setEditSsrId(ssr.id); setEditSsrName(ssr.name); setSrError(""); }}
                                          className="size-7 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all"
                                          title="Edit"
                                        >
                                          <span className="material-symbols-outlined text-sm">edit</span>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSubSubRole(ssr.id)}
                                          className="size-7 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                          title="Delete"
                                        >
                                          <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {subRoles.length > 0 && subSubRoles.length === 0 && (
                          <p className="text-sm text-zinc-600 text-center py-4">No sub-sub-roles yet.</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
