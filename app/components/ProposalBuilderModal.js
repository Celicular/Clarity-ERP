/* ─────────────────────────────────────────────────────────────────────────────
   app/components/ProposalBuilderModal.js
   Create / Edit a Proposal with dynamic line items, discount, print preview.
───────────────────────────────────────────────────────────────────────────── */
"use client";
import { useState, useRef } from "react";

function fmt(n) { return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const STATUS_STYLE = {
  draft:    { bg: "bg-zinc-700/40",     text: "text-zinc-400",   border: "border-zinc-600/30" },
  sent:     { bg: "bg-blue-500/15",     text: "text-blue-400",   border: "border-blue-500/25" },
  accepted: { bg: "bg-emerald-500/15",  text: "text-emerald-400",border: "border-emerald-500/25" },
  rejected: { bg: "bg-red-500/15",      text: "text-red-400",    border: "border-red-500/25" },
};

/* ── Proposal Builder Modal (create / edit) ── */
export function ProposalBuilderModal({ leadId, existing, onClose, onSaved }) {
  const isEdit  = !!existing;
  const [title, setTitle]       = useState(existing?.title || "Proposal");
  const [items, setItems]       = useState(
    existing?.items?.length ? existing.items.map((it)=>({ ...it }))
    : [{ description: "", qty: 1, unit_price: 0 }]
  );
  const [discount, setDiscount] = useState(existing?.discount_pct || 0);
  const [validity, setValidity] = useState(
    existing?.validity_date ? existing.validity_date.slice(0,10) : ""
  );
  const [notes, setNotes]       = useState(existing?.notes || "");
  const [saving, setSaving]     = useState(false);
  const [preview, setPreview]   = useState(false);

  const subtotal = items.reduce((s, it) => s + Number(it.qty||0)*Number(it.unit_price||0), 0);
  const total    = subtotal * (1 - Number(discount||0)/100);

  /* ── Line-item helpers ── */
  function addRow()         { setItems((p) => [...p, { description:"", qty:1, unit_price:0 }]); }
  function removeRow(i)     { setItems((p) => p.filter((_,idx)=>idx!==i)); }
  function updateRow(i,k,v) { setItems((p) => p.map((it,idx)=>idx===i?{...it,[k]:v}:it)); }

  async function handleSave() {
    setSaving(true);
    try {
      const body = { title, items, discount_pct: discount, validity_date: validity||undefined, notes };
      let res;
      if (isEdit) {
        res = await fetch(`/api/proposals/${existing.id}`, {
          method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)
        });
      } else {
        res = await fetch(`/api/leads/${leadId}/proposals`, {
          method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)
        });
      }
      if (!res.ok) throw new Error((await res.json()).error);
      onSaved?.();
      onClose();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#141414] border border-[#252525] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#252525] shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-400 text-xl">receipt_long</span>
            <h3 className="text-base font-bold text-white">{isEdit ? `Edit — Version ${existing.version}` : "New Proposal"}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreview((v)=>!v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all
                ${preview ? "bg-orange-500/15 border-orange-500/30 text-orange-400" : "bg-[#1a1a1a] border-[#2a2a2a] text-zinc-400 hover:text-white"}`}>
              <span className="material-symbols-outlined text-sm">{preview ? "edit" : "visibility"}</span>
              {preview ? "Edit" : "Preview"}
            </button>
            <button onClick={onClose} className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-all">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!preview ? (
            /* ── EDITOR ── */
            <div className="p-6 flex flex-col gap-5">
              {/* Title + dates */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="label-xs">Proposal Title</label>
                  <input value={title} onChange={(e)=>setTitle(e.target.value)}
                    className="input-base" placeholder="e.g. Web Development Services" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="label-xs">Valid Until</label>
                  <input type="date" value={validity} onChange={(e)=>setValidity(e.target.value)}
                    className="input-base text-zinc-400" />
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label-xs">Line Items</label>
                  <button onClick={addRow} className="flex items-center gap-1 text-[11px] font-semibold text-orange-400 hover:text-orange-300 transition-colors">
                    <span className="material-symbols-outlined text-sm">add</span> Add item
                  </button>
                </div>
                <div className="rounded-xl border border-[#2a2a2a] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#111] border-b border-[#2a2a2a]">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider w-[45%]">Description</th>
                        <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider w-[15%]">Qty</th>
                        <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider w-[20%]">Unit Price</th>
                        <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider w-[15%]">Amount</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a1a1a]">
                      {items.map((it, i) => (
                        <tr key={i} className="bg-[#161616]">
                          <td className="px-2 py-2">
                            <input value={it.description} onChange={(e)=>updateRow(i,"description",e.target.value)}
                              placeholder="Service / item description"
                              className="w-full bg-transparent text-white text-sm placeholder:text-zinc-700 focus:outline-none px-2 py-1.5 rounded-lg hover:bg-white/3 focus:bg-white/5 transition-all" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" value={it.qty} onChange={(e)=>updateRow(i,"qty",e.target.value)} min="0"
                              className="w-full bg-transparent text-white text-sm text-right focus:outline-none px-2 py-1.5 rounded-lg hover:bg-white/3 focus:bg-white/5 transition-all" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" value={it.unit_price} onChange={(e)=>updateRow(i,"unit_price",e.target.value)} min="0"
                              className="w-full bg-transparent text-white text-sm text-right focus:outline-none px-2 py-1.5 rounded-lg hover:bg-white/3 focus:bg-white/5 transition-all" />
                          </td>
                          <td className="px-4 py-2 text-right text-zinc-300 text-sm">
                            {fmt(Number(it.qty||0)*Number(it.unit_price||0))}
                          </td>
                          <td className="px-2 py-2">
                            {items.length > 1 && (
                              <button onClick={()=>removeRow(i)} className="size-6 rounded flex items-center justify-center text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                <span className="material-symbols-outlined text-sm">remove</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals + discount */}
              <div className="flex justify-end">
                <div className="w-64 border border-[#2a2a2a] rounded-xl overflow-hidden">
                  <div className="flex justify-between px-4 py-2 bg-[#161616] border-b border-[#1a1a1a]">
                    <span className="text-xs text-zinc-500">Subtotal</span>
                    <span className="text-xs text-zinc-300">₹{fmt(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 bg-[#161616] border-b border-[#1a1a1a] gap-3">
                    <span className="text-xs text-zinc-500 shrink-0">Discount %</span>
                    <input type="number" value={discount} onChange={(e)=>setDiscount(e.target.value)} min="0" max="100"
                      className="w-16 bg-transparent text-right text-xs text-orange-400 focus:outline-none" />
                  </div>
                  <div className="flex justify-between px-4 py-3 bg-[#1a1a1a]">
                    <span className="text-sm font-bold text-white">Total</span>
                    <span className="text-sm font-bold text-emerald-400">₹{fmt(total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes / Terms */}
              <div className="flex flex-col gap-1">
                <label className="label-xs">Notes / Terms</label>
                <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={3} placeholder="Payment terms, conditions, validity notes…"
                  className="input-base resize-none" />
              </div>
            </div>
          ) : (
            /* ── PREVIEW ── */
            <div id="proposal-print" className="p-8 bg-white text-black">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                  {validity && <p className="text-sm text-gray-500">Valid until: {validity}</p>}
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p className="font-bold text-gray-900 text-base">Quotation</p>
                  <p>Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <table className="w-full mb-6 border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-3 border border-gray-200 font-semibold">Description</th>
                    <th className="text-right p-3 border border-gray-200 font-semibold">Qty</th>
                    <th className="text-right p-3 border border-gray-200 font-semibold">Unit Price</th>
                    <th className="text-right p-3 border border-gray-200 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="p-3 border border-gray-200">{it.description}</td>
                      <td className="p-3 border border-gray-200 text-right">{it.qty}</td>
                      <td className="p-3 border border-gray-200 text-right">₹{fmt(it.unit_price)}</td>
                      <td className="p-3 border border-gray-200 text-right">₹{fmt(Number(it.qty)*Number(it.unit_price))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end mb-6">
                <div className="w-64 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-200"><span>Subtotal</span><span>₹{fmt(subtotal)}</span></div>
                  {discount > 0 && <div className="flex justify-between py-2 border-b border-gray-200 text-red-600"><span>Discount ({discount}%)</span><span>-₹{fmt(subtotal*discount/100)}</span></div>}
                  <div className="flex justify-between py-3 font-bold text-base"><span>Total</span><span>₹{fmt(total)}</span></div>
                </div>
              </div>
              {notes && <div className="border-t border-gray-200 pt-4 text-xs text-gray-600 whitespace-pre-wrap">{notes}</div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#252525] shrink-0 flex items-center justify-between gap-3">
          {preview && (
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-700/50 border border-zinc-600/30 text-zinc-300 hover:text-white text-sm font-semibold transition-all">
              <span className="material-symbols-outlined text-base">print</span> Print / Export
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-400 hover:text-white text-sm font-semibold transition-all">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-40 transition-all flex items-center gap-2">
              {saving ? "Saving…" : isEdit ? "Save New Version" : "Create Proposal"}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .label-xs { font-size:.625rem; font-weight:600; text-transform:uppercase; letter-spacing:.08em; color:#71717a; }
        .input-base { background:#1a1a1a; border:1px solid #2a2a2a; border-radius:.75rem; padding:.625rem .75rem;
                      font-size:.875rem; color:#fff; width:100%; outline:none; transition:border-color .15s; }
        .input-base:focus { border-color:rgba(249,115,22,.4); }
        .input-base::placeholder { color:#3f3f46; }
        @media print {
          body > * { display:none !important; }
          #proposal-print { display:block !important; position:fixed; inset:0; }
        }
      `}</style>
    </div>
  );
}

/* ── Proposals Tab Panel (inside LeadDetailDrawer) ── */
export function ProposalsPanel({ leadId, isAdmin, sessionId }) {
  const [proposals, setProposals] = useState([]);
  const [loaded, setLoaded]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editProposal, setEditProposal] = useState(null);
  const [viewProposal, setViewProposal] = useState(null);
  const [statusChanging, setStatusChanging] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/leads/${leadId}/proposals`);
      const data = await res.json();
      setProposals(data.proposals || []);
    } catch { /* silent */ }
    finally { setLoading(false); setLoaded(true); }
  }

  /* Load on first render */
  if (!loaded && !loading) load();

  async function handleStatus(pid, status) {
    setStatusChanging(pid);
    await fetch(`/api/proposals/${pid}/status`, {
      method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ status })
    });
    await load();
    setStatusChanging(null);
  }

  async function openEdit(p) {
    const res  = await fetch(`/api/proposals/${p.id}`);
    const data = await res.json();
    setEditProposal(data.proposal);
    setBuilderOpen(true);
  }

  if (loading) return <p className="text-sm text-zinc-600 text-center py-8">Loading…</p>;

  return (
    <div className="flex flex-col gap-3">
      <button onClick={() => { setEditProposal(null); setBuilderOpen(true); }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/25
                   text-orange-400 hover:bg-orange-500/20 text-sm font-semibold transition-all w-full justify-center">
        <span className="material-symbols-outlined text-base">add</span> New Proposal
      </button>

      {proposals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-zinc-700">
          <span className="material-symbols-outlined text-3xl">receipt_long</span>
          <p className="text-xs">No proposals yet. Create the first one.</p>
        </div>
      )}

      {proposals.map((p) => {
        const s = STATUS_STYLE[p.status] || STATUS_STYLE.draft;
        return (
          <div key={p.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{p.title}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${s.bg} ${s.text} ${s.border}`}>
                    v{p.version}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize ${s.bg} ${s.text} ${s.border}`}>
                    {p.status}
                  </span>
                </div>
                <div className="text-lg font-bold text-emerald-400 mt-1">₹{Number(p.total).toLocaleString("en-IN",{minimumFractionDigits:2})}</div>
              </div>
              {p.validity_date && (
                <div className="text-[10px] text-zinc-600 text-right shrink-0">
                  <div>Valid until</div>
                  <div className="text-zinc-400">{new Date(p.validity_date).toLocaleDateString()}</div>
                </div>
              )}
            </div>
            <div className="text-[10px] text-zinc-600 mb-3">by {p.created_by_name} · {new Date(p.created_at).toLocaleDateString()}</div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => openEdit(p)}
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all">
                <span className="material-symbols-outlined text-sm">edit</span> Edit
              </button>
              {p.status === "draft" && (
                <button onClick={() => handleStatus(p.id,"sent")} disabled={statusChanging===p.id}
                  className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all">
                  <span className="material-symbols-outlined text-sm">send</span> Mark Sent
                </button>
              )}
              {p.status === "sent" && (
                <>
                  <button onClick={() => handleStatus(p.id,"accepted")} disabled={statusChanging===p.id}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all">
                    <span className="material-symbols-outlined text-sm">thumb_up</span> Accepted
                  </button>
                  <button onClick={() => handleStatus(p.id,"rejected")} disabled={statusChanging===p.id}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all">
                    <span className="material-symbols-outlined text-sm">thumb_down</span> Rejected
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {builderOpen && (
        <ProposalBuilderModal leadId={leadId} existing={editProposal} onClose={() => { setBuilderOpen(false); setEditProposal(null); }} onSaved={load} />
      )}
    </div>
  );
}

/* ── Attachments Tab Panel (inside LeadDetailDrawer) ── */
export function AttachmentsPanel({ leadId, sessionId, isAdmin }) {
  const [attachments, setAttachments] = useState([]);
  const [loaded, setLoaded]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [dragOver, setDragOver]       = useState(false);
  const inputRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/leads/${leadId}/attachments`);
      const data = await res.json();
      setAttachments(data.attachments || []);
    } catch { /* silent */ }
    finally { setLoading(false); setLoaded(true); }
  }
  if (!loaded && !loading) load();

  async function uploadFile(file) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await fetch(`/api/leads/${leadId}/attachments`, { method:"POST", body:fd });
      await load();
    } catch { /* silent */ }
    finally { setUploading(false); }
  }

  function onFileChange(e) { [...e.target.files].forEach(uploadFile); e.target.value=""; }
  function onDrop(e) { e.preventDefault(); setDragOver(false); [...e.dataTransfer.files].forEach(uploadFile); }

  async function deleteAttachment(aid) {
    await fetch(`/api/leads/${leadId}/attachments/${aid}`, { method:"DELETE" });
    await load();
  }

  function fileIcon(mime) {
    if (mime.startsWith("image/"))       return { icon:"image",        color:"text-blue-400" };
    if (mime.includes("pdf"))            return { icon:"picture_as_pdf",color:"text-red-400" };
    if (mime.includes("word") || mime.includes("document")) return { icon:"description", color:"text-blue-400" };
    if (mime.includes("sheet") || mime.includes("excel"))   return { icon:"table_chart",  color:"text-green-400" };
    return { icon:"attach_file", color:"text-zinc-400" };
  }

  function fmtSize(b) {
    if (b < 1024) return `${b} B`;
    if (b < 1024*1024) return `${(b/1024).toFixed(1)} KB`;
    return `${(b/1024/1024).toFixed(1)} MB`;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone */}
      <div
        onDragOver={(e)=>{e.preventDefault();setDragOver(true);}}
        onDragLeave={()=>setDragOver(false)}
        onDrop={onDrop}
        onClick={()=>inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center py-6 gap-2 transition-all
          ${dragOver ? "border-orange-500/60 bg-orange-500/5" : "border-[#2a2a2a] hover:border-[#444] hover:bg-white/2"}`}
      >
        <input ref={inputRef} type="file" multiple className="hidden" onChange={onFileChange} />
        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <svg className="animate-spin size-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
            Uploading…
          </div>
        ) : (
          <>
            <span className="material-symbols-outlined text-zinc-600 text-3xl">upload_file</span>
            <p className="text-xs text-zinc-500">Drag & drop or click to upload</p>
            <p className="text-[10px] text-zinc-700">Any file type · Max 50MB</p>
          </>
        )}
      </div>

      {/* File list */}
      {attachments.length === 0 && !loading && (
        <p className="text-xs text-zinc-700 text-center py-4">No attachments yet.</p>
      )}
      {attachments.map((att) => {
        const fi = fileIcon(att.mime_type);
        const isImage = att.mime_type.startsWith("image/");
        const url = `/uploads/leads/${leadId}/${att.stored_name}`;
        return (
          <div key={att.id} className="flex items-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 group">
            {isImage ? (
              <img src={url} alt={att.filename} className="size-10 rounded-lg object-cover shrink-0 bg-zinc-800" />
            ) : (
              <div className="size-10 rounded-lg bg-[#111] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                <span className={`material-symbols-outlined text-xl ${fi.color}`}>{fi.icon}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{att.filename}</div>
              <div className="text-[10px] text-zinc-600 flex items-center gap-2 mt-0.5">
                <span>{fmtSize(att.file_size)}</span>
                <span>·</span>
                <span>{att.uploaded_by_name}</span>
                <span>·</span>
                <span>{new Date(att.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <a href={url} download={att.filename} title="Download"
                className="size-7 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
                <span className="material-symbols-outlined text-sm">download</span>
              </a>
              {(att.uploaded_by === sessionId || isAdmin) && (
                <button onClick={() => deleteAttachment(att.id)} title="Delete"
                  className="size-7 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
