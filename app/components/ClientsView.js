/* ─────────────────────────────────────────────────────────────────────────────
   app/components/ClientsView.js
   Client Database — list with search/filter, slide-in profile drawer
   with editable info, contacts, tags, and notes.
───────────────────────────────────────────────────────────────────────────── */
"use client";
import { useState, useEffect, useCallback } from "react";

/* ── Tiny spinner ── */
function Spin() {
  return (
    <svg className="animate-spin size-4 inline" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
    </svg>
  );
}

const INDUSTRIES = ["Technology","Finance","Healthcare","Education","Retail","Manufacturing","Real Estate","Media","Other"];

/* ── Coloured tag pill ── */
function Tag({ label, onRemove }) {
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">
      {label}
      {onRemove && (
        <button onClick={onRemove} className="text-orange-500/60 hover:text-orange-300 transition-colors leading-none">×</button>
      )}
    </span>
  );
}

/* ── Client card (grid) ── */
function ClientCard({ client, onClick }) {
  const initials = client.name.slice(0,2).toUpperCase();
  return (
    <div onClick={() => onClick(client)} className="bg-[#161616] border border-[#252525] rounded-2xl p-5 cursor-pointer
                  hover:border-zinc-600/50 hover:bg-[#1a1a1a] transition-all group">
      <div className="flex items-start gap-3 mb-3">
        <div className="size-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-orange-500/20
                        flex items-center justify-center text-white font-bold text-sm shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold truncate group-hover:text-orange-400 transition-colors">{client.name}</div>
          {client.industry && <div className="text-[11px] text-zinc-500">{client.industry}</div>}
        </div>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0
          ${client.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-700/40 text-zinc-500 border-zinc-600/25"}`}>
          {client.status}
        </span>
      </div>

      {/* Primary contact */}
      {client.primary_contact && (
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
          <span className="material-symbols-outlined text-zinc-700 text-sm">person</span>
          {client.primary_contact.name}
          {client.primary_contact.role && <span className="text-zinc-700">· {client.primary_contact.role}</span>}
        </div>
      )}

      {/* Contact info */}
      <div className="flex flex-col gap-0.5">
        {client.email && (
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 truncate">
            <span className="material-symbols-outlined text-zinc-700 text-sm">mail</span>{client.email}
          </div>
        )}
        {client.phone && (
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
            <span className="material-symbols-outlined text-zinc-700 text-sm">call</span>{client.phone}
          </div>
        )}
      </div>

      {/* Tags */}
      {client.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {client.tags.slice(0,3).map((t) => <Tag key={t} label={t} />)}
          {client.tags.length > 3 && <span className="text-[10px] text-zinc-600">+{client.tags.length-3}</span>}
        </div>
      )}
    </div>
  );
}

/* ── Client Profile Drawer ── */
function ClientProfileDrawer({ clientId, onClose, onUpdate }) {
  const [client, setClient]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);

  /* form fields */
  const [fName, setFName]         = useState("");
  const [fIndustry, setFIndustry] = useState("");
  const [fWebsite, setFWebsite]   = useState("");
  const [fPhone, setFPhone]       = useState("");
  const [fEmail, setFEmail]       = useState("");
  const [fAddress, setFAddress]   = useState("");
  const [fNotes, setFNotes]       = useState("");
  const [fTags, setFTags]         = useState([]);
  const [fStatus, setFStatus]     = useState("active");
  const [tagInput, setTagInput]   = useState("");

  /* contacts */
  const [contacts, setContacts]   = useState([]);
  const [addingContact, setAddingContact] = useState(false);
  const [cName, setCName]         = useState("");
  const [cRole, setCRole]         = useState("");
  const [cEmail, setCEmail]       = useState("");
  const [cPhone, setCPhone]       = useState("");
  const [cPrimary, setCPrimary]   = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/clients/${clientId}`);
      const data = await res.json();
      const c    = data.client;
      setClient(c);
      setContacts(c.contacts || []);
      setFName(c.name || ""); setFIndustry(c.industry || ""); setFWebsite(c.website || "");
      setFPhone(c.phone || ""); setFEmail(c.email || ""); setFAddress(c.address || "");
      setFNotes(c.notes || ""); setFTags(c.tags || []); setFStatus(c.status || "active");
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { if (clientId) load(); }, [clientId]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/clients/${clientId}`, {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name:fName, industry:fIndustry, website:fWebsite, phone:fPhone,
          email:fEmail, address:fAddress, notes:fNotes, tags:fTags, status:fStatus })
      });
      setEditing(false); await load(); onUpdate?.();
    } catch { /* silent */ }
    finally { setSaving(false); }
  }

  async function addContact() {
    if (!cName.trim()) return;
    await fetch(`/api/clients/${clientId}/contacts`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ name:cName, role:cRole, email:cEmail, phone:cPhone, is_primary:cPrimary })
    });
    setCName(""); setCRole(""); setCEmail(""); setCPhone(""); setCPrimary(false);
    setAddingContact(false); await load(); onUpdate?.();
  }

  async function deleteContact(cid) {
    await fetch(`/api/clients/${clientId}/contacts/${cid}`, { method:"DELETE" });
    await load(); onUpdate?.();
  }

  function addTag(e) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().replace(/,$/,"");
      if (!fTags.includes(tag)) setFTags((t) => [...t, tag]);
      setTagInput("");
    }
  }

  if (!clientId) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-10 w-full max-w-[500px] h-full bg-[#141414] border-l border-[#252525] flex flex-col shadow-2xl overflow-hidden" style={{animation:"slideInRight .2s ease"}}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#252525] shrink-0">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-400 text-xl">business</span>
            Client Profile
          </h3>
          <div className="flex items-center gap-1.5">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all">
                <span className="material-symbols-outlined text-base">edit</span>
              </button>
            ) : (
              <button onClick={() => setEditing(false)} className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
            <button onClick={onClose} className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all">
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 gap-2"><Spin /> Loading…</div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

            {/* ── Client info ── */}
            {!editing ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="size-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-purple-500/20 border border-orange-500/20 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {client?.name?.slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-bold text-lg leading-tight">{client?.name}</div>
                    {client?.industry && <div className="text-zinc-500 text-sm">{client.industry}</div>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  {client?.email   && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-zinc-600 text-sm">mail</span>{client.email}</div>}
                  {client?.phone   && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-zinc-600 text-sm">call</span>{client.phone}</div>}
                  {client?.website && <div className="flex items-center gap-1.5 col-span-2"><span className="material-symbols-outlined text-zinc-600 text-sm">link</span><a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 truncate">{client.website}</a></div>}
                  {client?.address && <div className="flex items-start gap-1.5 col-span-2"><span className="material-symbols-outlined text-zinc-600 text-sm">location_on</span>{client.address}</div>}
                </div>
                {client?.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">{client.tags.map((t) => <Tag key={t} label={t} />)}</div>
                )}
                {client?.notes && (
                  <p className="text-xs text-zinc-500 bg-white/3 rounded-lg px-3 py-2 border border-white/5 whitespace-pre-wrap">{client.notes}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {[
                  { label:"Company Name", val:fName, set:setFName, ph:"Company name" },
                  { label:"Email",        val:fEmail, set:setFEmail, ph:"contact@company.com" },
                  { label:"Phone",        val:fPhone, set:setFPhone, ph:"+91 xxxx" },
                  { label:"Website",      val:fWebsite, set:setFWebsite, ph:"https://..." },
                  { label:"Address",      val:fAddress, set:setFAddress, ph:"Full address" },
                ].map(({ label, val, set, ph }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>
                    <input value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
                      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Industry</label>
                    <select value={fIndustry} onChange={(e) => setFIndustry(e.target.value)}
                      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all">
                      <option value="">—</option>
                      {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Status</label>
                    <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}
                      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                {/* Tags */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-1">{fTags.map((t) => <Tag key={t} label={t} onRemove={() => setFTags((tg) => tg.filter((x)=>x!==t))} />)}</div>
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="Type tag + Enter"
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Notes</label>
                  <textarea value={fNotes} onChange={(e) => setFNotes(e.target.value)} rows={2} placeholder="Internal notes…"
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all resize-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-400 hover:text-white text-sm font-semibold transition-all">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                    {saving ? <Spin /> : <span className="material-symbols-outlined text-base">save</span>}
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Contacts ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Contacts</h4>
                <button onClick={() => setAddingContact((v)=>!v)} className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-orange-400 transition-colors">
                  <span className="material-symbols-outlined text-sm">{addingContact ? "close" : "add"}</span>
                  {addingContact ? "Cancel" : "Add"}
                </button>
              </div>

              {addingContact && (
                <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 mb-3 flex flex-col gap-2">
                  {[
                    { ph:"Name *", val:cName, set:setCName },
                    { ph:"Role (e.g. CEO)", val:cRole, set:setCRole },
                    { ph:"Email", val:cEmail, set:setCEmail },
                    { ph:"Phone", val:cPhone, set:setCPhone },
                  ].map(({ph,val,set}) => (
                    <input key={ph} value={val} onChange={(e)=>set(e.target.value)} placeholder={ph}
                      className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all" />
                  ))}
                  <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                    <input type="checkbox" checked={cPrimary} onChange={(e)=>setCPrimary(e.target.checked)} className="accent-orange-500" />
                    Primary contact
                  </label>
                  <button onClick={addContact} disabled={!cName.trim()}
                    className="py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-40 transition-all">
                    Add Contact
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {contacts.length === 0 && <p className="text-xs text-zinc-700">No contacts yet.</p>}
                {contacts.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3 group">
                    <div className="size-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{c.name}</span>
                        {c.is_primary && <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20">Primary</span>}
                      </div>
                      <div className="text-[10px] text-zinc-600">
                        {[c.role, c.email, c.phone].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <button onClick={() => deleteContact(c.id)}
                      className="size-6 rounded flex items-center justify-center text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Main ClientsView
════════════════════════════════════════════════════════════════════════════ */
export default function ClientsView({ user }) {
  const isAdmin = user.role === "ADMIN";
  const [clients, setClients]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [drawerClientId, setDrawerClientId] = useState(null);
  const [addOpen, setAddOpen]       = useState(false);

  /* Add form */
  const [aName, setAName]       = useState("");
  const [aIndustry, setAIndustry] = useState("");
  const [aEmail, setAEmail]     = useState("");
  const [aPhone, setAPhone]     = useState("");
  const [aSaving, setASaving]   = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search)        p.set("search", search);
      if (filterStatus)  p.set("status", filterStatus);
      if (filterIndustry) p.set("industry", filterIndustry);
      const res  = await fetch(`/api/clients?${p}`);
      const data = await res.json();
      setClients(data.clients || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [search, filterStatus, filterIndustry]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  async function handleAdd() {
    if (!aName.trim()) return;
    setASaving(true);
    try {
      await fetch("/api/clients", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name:aName, industry:aIndustry||undefined, email:aEmail||undefined, phone:aPhone||undefined })
      });
      setAddOpen(false); setAName(""); setAIndustry(""); setAEmail(""); setAPhone("");
      fetchClients();
    } catch { /* silent */ }
    finally { setASaving(false); }
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Confirmed clients and key contacts.</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold transition-all">
          <span className="material-symbols-outlined text-base">add</span>Add Client
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-lg">search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients…"
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-orange-500/50 transition-all">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={filterIndustry} onChange={(e) => setFilterIndustry(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-zinc-400 focus:outline-none focus:border-orange-500/50 transition-all">
          <option value="">All Industries</option>
          {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
        </select>
        <span className="text-xs text-zinc-600">{clients.length} clients</span>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-600 gap-2"><Spin /> Loading…</div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-600">
          <span className="material-symbols-outlined text-4xl">business</span>
          <p className="text-sm">No clients yet. Add your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto pb-4">
          {clients.map((c) => (
            <ClientCard key={c.id} client={c} onClick={(cl) => setDrawerClientId(cl.id)} />
          ))}
        </div>
      )}

      {/* ── Add client modal ── */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#141414] border border-[#252525] rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-400 text-xl">business</span>
              <h3 className="text-base font-bold text-white">Add Client</h3>
            </div>
            {[
              { label:"Company / Client Name *", val:aName, set:setAName, ph:"Acme Corp" },
              { label:"Email", val:aEmail, set:setAEmail, ph:"contact@acme.com" },
              { label:"Phone", val:aPhone, set:setAPhone, ph:"+91 xxxx" },
            ].map(({label,val,set,ph}) => (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>
                <input value={val} onChange={(e)=>set(e.target.value)} placeholder={ph}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-all" />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Industry</label>
              <select value={aIndustry} onChange={(e)=>setAIndustry(e.target.value)}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all">
                <option value="">—</option>
                {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setAddOpen(false)} className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-400 hover:text-white text-sm font-semibold transition-all">Cancel</button>
              <button onClick={handleAdd} disabled={!aName.trim() || aSaving}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                {aSaving ? <Spin /> : null}
                {aSaving ? "Adding…" : "Add Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile drawer ── */}
      {drawerClientId && (
        <ClientProfileDrawer clientId={drawerClientId} onClose={() => setDrawerClientId(null)} onUpdate={fetchClients} />
      )}
    </div>
  );
}
