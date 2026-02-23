"use client";
import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "./WebSocketProvider";

const PRIORITY_STYLE = {
  Urgent: "bg-red-500/15    text-red-400    border-red-500/25",
  High:   "bg-orange-500/15 text-[#ff9900]  border-orange-500/25",
  Normal: "bg-zinc-700/30   text-[#aaa]     border-zinc-600/30",
  Low:    "bg-zinc-800/30   text-zinc-500   border-zinc-700/20",
};

const STATUS_STYLE = {
  Open:       "bg-red-500/15     text-red-400     border-red-500/20",
  Pending:    "bg-orange-500/15  text-[#ff9900]   border-orange-500/20",
  Resolved:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  Closed:     "bg-zinc-700/30    text-[#aaa]      border-zinc-600/30",
};

function FileIcon({ url }) {
  const ext = url.split(".").pop().toLowerCase();
  const isImage = ["png","jpg","jpeg","gif","webp"].includes(ext);
  return isImage ? (
    <a href={url} target="_blank" rel="noreferrer"
      className="block w-16 h-16 rounded-lg overflow-hidden border border-zinc-700/40 hover:border-[#ff9900]/40 transition-all shrink-0">
      <img src={url} alt="" className="w-full h-full object-cover" />
    </a>
  ) : (
    <a href={url} target="_blank" rel="noreferrer"
      className="flex items-center gap-1.5 text-[10px] text-[#aaa] hover:text-[#ff9900] bg-zinc-800/40 border border-zinc-700/30 rounded-lg px-2.5 py-1.5 transition-all shrink-0">
      <span className="material-symbols-outlined text-sm">attach_file</span>
      {url.split("/").pop().slice(13)}
    </a>
  );
}

export default function TicketsView({ user }) {
  const wsCtx = useWebSocket();
  const lastEvent = wsCtx?.lastEvent;

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState([]);
  
  // Navigation states
  // null = list, "new" = create form, "detail" = view a ticket
  const [view, setView] = useState(null); 
  const [activeTicket, setActiveTicket] = useState(null);

  const isAdminOrHR = user.role === "ADMIN" || user.department === "HR" || user.sub_role_dept === "HR";

  async function loadData() {
    setLoading(true);
    const [tRes, uRes] = await Promise.all([
      fetch("/api/tickets").then(r => r.json()),
      fetch("/api/chat/users").then(r => r.json()),
    ]);
    setTickets(tRes.tickets || []);
    setUsersList(uRes.users || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (lastEvent?.type === "erp_sync" && lastEvent.module === "tickets") {
      loadData();
    }
  }, [lastEvent]);

  if (view === "new") {
    return (
      <TicketForm 
        onCancel={() => setView(null)} 
        onSuccess={() => { setView(null); loadData(); }} 
        usersList={usersList} 
      />
    );
  }

  if (view === "detail" && activeTicket) {
    return (
      <TicketDetail 
        ticket={activeTicket} 
        onBack={() => { setView(null); loadData(); }} 
        user={user} 
        isAdminOrHR={isAdminOrHR}
        usersList={usersList} 
      />
    );
  }

  const openTickets = tickets.filter(t => t.status === "Open" || t.status === "Pending");
  const closedTickets = tickets.filter(t => t.status === "Closed" || t.status === "Resolved");

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ff9900] text-2xl">confirmation_number</span>
            Support Tickets
          </h1>
          <p className="text-sm text-[#aaa] mt-0.5">
            Manage your requests and issues here.
          </p>
        </div>
        <button onClick={() => setView("new")}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#ff9900] text-white text-sm font-bold rounded-xl hover:bg-[#e68a00] transition-colors">
          <span className="material-symbols-outlined text-sm">add</span> New Ticket
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#aaa]">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="bg-[#161616] border border-[#252525] rounded-2xl p-8 text-center text-[#aaa]">
          <span className="material-symbols-outlined text-4xl mb-2 opacity-50">inbox</span>
          <p>No tickets found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-bold text-white mt-2">Active Tickets</h2>
          <div className="bg-[#161616] border border-[#252525] rounded-xl overflow-hidden">
            {openTickets.length === 0 ? (
              <div className="p-4 text-sm text-[#aaa]">No active tickets.</div>
            ) : (
              openTickets.map(t => (
                <TicketRow key={t.id} ticket={t} onClick={() => { setActiveTicket(t); setView("detail"); }} />
              ))
            )}
          </div>

          {closedTickets.length > 0 && (
            <>
              <h2 className="text-sm font-bold text-white mt-4">Closed Tickets</h2>
              <div className="bg-[#161616] border border-[#252525] rounded-xl overflow-hidden opacity-75">
                {closedTickets.map(t => (
                  <TicketRow key={t.id} ticket={t} onClick={() => { setActiveTicket(t); setView("detail"); }} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TicketRow({ ticket, onClick }) {
  const ps = PRIORITY_STYLE[ticket.criticality] || PRIORITY_STYLE.Normal;
  const ss = STATUS_STYLE[ticket.status] || STATUS_STYLE.Open;
  
  return (
    <div onClick={onClick} className="flex items-center justify-between p-4 border-b border-[#252525] last:border-0 hover:bg-[#1a1a1a] cursor-pointer transition-colors">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 relative">
           <span className="material-symbols-outlined text-zinc-500">article</span>
           {ticket.reply_count > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#ff9900] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {ticket.reply_count}
              </span>
           )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white">{ticket.subject}</h3>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${ps}`}>{ticket.criticality}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${ss}`}>{ticket.status}</span>
          </div>
          <div className="text-xs text-[#aaa] flex items-center gap-2">
            <span>#{ticket.id.split("-")[1].substring(0,6)}</span>
            <span>•</span>
            <span>Created by {ticket.creator_name}</span>
            <span>•</span>
            <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <span className="material-symbols-outlined text-zinc-600">chevron_right</span>
    </div>
  );
}

function TicketForm({ onCancel, onSuccess, usersList }) {
  const [subject, setSubject] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [referred, setReferred] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  async function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/tickets/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.url) uploaded.push(d.url);
    }
    setAttachments(prev => [...prev, ...uploaded]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    if (!subject.trim() || !desc.trim()) return;
    setSaving(true);
    const r = await fetch("/api/tickets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        description: desc,
        criticality: priority,
        referred_users: referred,
        attachment_urls: attachments,
      })
    });
    if (r.ok) onSuccess();
    setSaving(false);
  }

  function toggleUser(id) {
    setReferred(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <button onClick={onCancel} className="flex items-center gap-1 text-sm text-[#aaa] hover:text-white transition-colors self-start">
        <span className="material-symbols-outlined text-sm">arrow_back</span> Back
      </button>

      <div className="bg-[#161616] border border-[#252525] rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Create New Ticket</h2>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input value={subject} onChange={e => setSubject(e.target.value)} required
            placeholder="Subject summary *"
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#aaa] focus:outline-none focus:border-[#ff9900]/50 transition-all" />

          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} required
            placeholder="Detailed description of the issue or request *"
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#aaa] focus:outline-none focus:border-[#ff9900]/50 transition-all resize-none" />

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-[#aaa] uppercase tracking-wider">Priority</label>
              <div className="flex gap-1">
                {["Urgent","High","Normal","Low"].map((p) => (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${priority === p ? PRIORITY_STYLE[p] : "bg-transparent border-zinc-700/50 text-[#aaa] hover:text-white"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label className="text-[10px] font-semibold text-[#aaa] uppercase tracking-wider">Refer Employees (Optional)</label>
              <div className="relative">
                <div onClick={() => setDropdownOpen(!dropdownOpen)} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-[#aaa] flex items-center justify-between min-h-[34px] cursor-pointer hover:border-zinc-500 transition-colors">
                  <span>{referred.length > 0 ? `${referred.length} selected` : "Select users..."}</span>
                  <span className="material-symbols-outlined text-[16px] text-[#aaa]">{dropdownOpen ? "expand_less" : "expand_more"}</span>
                </div>
                {dropdownOpen && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2 flex flex-col gap-1 z-10 max-h-48 overflow-y-auto shadow-xl">
                    {usersList.map(u => (
                      <label key={u.id} className="flex items-center gap-2 text-xs text-[#aaa] hover:text-white cursor-pointer p-1.5 rounded hover:bg-zinc-800/50">
                        <input type="checkbox" checked={referred.includes(u.id)} onChange={() => toggleUser(u.id)} className="accent-[#ff9900] w-3 h-3" />
                        <span className="truncate flex-1">{u.name}</span>
                        <span className="opacity-50 text-[10px] hidden sm:block">({u.role})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/40 text-[#aaa] hover:text-white hover:border-zinc-600 transition-all">
                <span className="material-symbols-outlined text-sm">attach_file</span>
                {uploading ? "Uploading…" : "Attach File/Photo"}
              </button>
              <input ref={fileRef} type="file" multiple onChange={handleFileChange} className="hidden" />
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((url, i) => (
                  <div key={i} className="relative group">
                    <FileIcon url={url} />
                    <button onClick={() => setAttachments(a => a.filter((_,j) => j !== i))} type="button"
                      className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4 border-t border-[#252525] pt-4">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-[#aaa] hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={!subject.trim() || saving || uploading}
              className="px-6 py-2 bg-[#ff9900] hover:bg-[#e68a00] text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50">
              {saving ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TicketDetail({ ticket, onBack, user, isAdminOrHR, usersList }) {
  const wsCtx = useWebSocket();
  const lastEvent = wsCtx?.lastEvent;

  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyMsg, setReplyMsg] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(ticket.status);
  const fileRef = useRef(null);

  async function loadReplies() {
    const r = await fetch(`/api/tickets/${ticket.id}/replies`);
    if (r.ok) {
      const d = await r.json();
      setReplies(d.replies || []);
    }
    setLoading(false);
  }

  useEffect(() => { loadReplies(); }, []);

  useEffect(() => {
    if (lastEvent?.type === "erp_sync" && lastEvent.module === "tickets") {
      loadReplies();
    }
  }, [lastEvent]);

  async function submitReply(e) {
    e.preventDefault();
    if (!replyMsg.trim() && attachments.length === 0) return;
    setSaving(true);
    const r = await fetch(`/api/tickets/${ticket.id}/replies`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: replyMsg, attachment_urls: attachments })
    });
    if (r.ok) {
      setReplyMsg("");
      setAttachments([]);
      await loadReplies();
    }
    setSaving(false);
  }

  async function updateStatus(newStatus) {
    setStatus(newStatus);
    fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
  }

  async function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/tickets/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.url) uploaded.push(d.url);
    }
    setAttachments(prev => [...prev, ...uploaded]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const ps = PRIORITY_STYLE[ticket.criticality] || PRIORITY_STYLE.Normal;
  const ss = STATUS_STYLE[status] || STATUS_STYLE.Open;
  
  const referredNames = ticket.referred_users?.map(uid => usersList.find(u => u.id === uid)?.name || "Unknown").join(", ");

  const canReply = status === "Open" || status === "Pending";

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 h-[calc(100vh-100px)]">
      <div className="flex items-center justify-between shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#aaa] hover:text-[#ff9900] transition-colors">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Back to List
        </button>
        {isAdminOrHR && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#aaa] uppercase tracking-wider font-semibold">Update Status:</span>
            <select value={status} onChange={e => updateStatus(e.target.value)}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#ff9900]/50 transition-all">
              <option value="Open">Open</option>
              <option value="Pending">Pending</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
        {/* Original Ticket */}
        <div className="bg-[#161616] border border-[#252525] rounded-2xl p-6 shrink-0">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-xs text-[#aaa] mb-1">Ticket #{ticket.id.split("-")[1].substring(0,8)}</div>
              <h2 className="text-xl font-bold text-white mb-2">{ticket.subject}</h2>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${ps}`}>{ticket.criticality}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${ss}`}>{status}</span>
                <span className="text-xs text-[#aaa] ml-2">by <span className="text-white">{ticket.creator_name}</span></span>
                <span className="text-xs text-[#aaa]">• {new Date(ticket.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {ticket.description}
          </div>
          {ticket.attachment_urls?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#252525]">
              {ticket.attachment_urls.map((url, i) => <FileIcon key={i} url={url} />)}
            </div>
          )}
          {referredNames && (
            <div className="mt-4 text-xs text-[#aaa] bg-[#111111] p-2 rounded-lg inline-block border border-[#252525]">
              <strong className="text-zinc-500 mr-2">Referred:</strong> {referredNames}
            </div>
          )}
        </div>

        {/* Replies List */}
        {loading ? (
          <div className="text-center py-6 text-[#aaa] text-sm">Loading thread...</div>
        ) : (
          <div className="flex flex-col gap-4">
            {replies.map(reply => (
               <div key={reply.id} className={`flex ${reply.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[80%] rounded-2xl p-4 border ${reply.sender_id === user.id ? 'bg-[#ff9900]/10 border-[#ff9900]/20 rounded-tr-sm' : 'bg-[#1a1a1a] border-[#252525] rounded-tl-sm'}`}>
                   <div className="flex items-center gap-2 mb-2">
                     <span className="text-xs font-bold text-white">{reply.sender_name}</span>
                     <span className="text-[9px] text-[#aaa] bg-[#111111] px-1.5 py-0.5 rounded">{reply.sender_role}</span>
                     <span className="text-[10px] text-zinc-600 ml-auto">{new Date(reply.created_at).toLocaleString([], {dateStyle:'short', timeStyle:'short'})}</span>
                   </div>
                   {reply.message && <p className="text-sm text-zinc-300 whitespace-pre-wrap mb-2">{reply.message}</p>}
                   {reply.attachment_urls?.length > 0 && (
                     <div className="flex flex-wrap gap-2">
                       {reply.attachment_urls.map((url, i) => <FileIcon key={i} url={url} />)}
                     </div>
                   )}
                 </div>
               </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply Form */}
      {canReply ? (
        <form onSubmit={submitReply} className="bg-[#161616] border border-[#252525] rounded-2xl p-4 shrink-0 mt-auto">
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-2">
              <textarea value={replyMsg} onChange={e => setReplyMsg(e.target.value)} rows={2}
                placeholder="Type your reply here..."
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2 text-sm text-white placeholder:text-[#aaa] focus:outline-none focus:border-[#ff9900]/50 transition-all resize-none" />
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {attachments.map((url, i) => (
                    <div key={i} className="relative group">
                      <FileIcon url={url} />
                      <button onClick={() => setAttachments(a => a.filter((_,j) => j !== i))} type="button"
                        className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 justify-end">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-800/50 border border-zinc-700/40 text-[#aaa] hover:text-[#ff9900] hover:border-[#ff9900]/30 transition-all disabled:opacity-50" title="Attach Files">
                <span className="material-symbols-outlined text-[18px]">attach_file</span>
              </button>
              <input ref={fileRef} type="file" multiple onChange={handleFileChange} className="hidden" />
              
              <button type="submit" disabled={(!replyMsg.trim() && attachments.length===0) || saving || uploading}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#ff9900] hover:bg-[#e68a00] text-white transition-all disabled:opacity-50">
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center text-sm text-[#aaa] shrink-0 mt-auto">
          This ticket is marked as {status}. Replies are disabled.
        </div>
      )}
    </div>
  );
}
