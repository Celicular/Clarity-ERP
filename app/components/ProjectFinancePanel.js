/* ─────────────────────────────────────────────────────────────────────────────
   app/components/ProjectFinancePanel.js
   Tabbed finance view: Invoices | Payments | Expenses | Ledger
   Fixes:
     • PaymentsTab — record actual payments with method + reference
     • ExpensesTab — optional "also create invoice" toggle
     • InvoicesTab — printable invoice modal with clean print CSS
───────────────────────────────────────────────────────────────────────────── */
"use client";
import { useState, useEffect } from "react";

const fmt = (n) => Number(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});

const INV_STATUS = {
  draft:   "bg-zinc-700/40  text-zinc-400  border-zinc-600/30",
  sent:    "bg-blue-500/15  text-blue-400  border-blue-500/25",
  partial: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  paid:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
};

/* ── Print invoice in a new window (avoids dark CRM CSS bleeding into print) ── */
function printInvoice(inv) {
  const f = (n) => Number(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
  const items = (inv.items || []).map(it => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee">${it.description}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${it.qty}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">&#8377;${f(it.unit_price)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600">&#8377;${f(Number(it.qty)*Number(it.unit_price))}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${inv.invoice_number}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:sans-serif;color:#111;background:#fff;padding:40px}
    h1{font-size:28px;font-weight:700;margin-bottom:4px}
    .meta{font-size:13px;color:#666}
    table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}
    th{text-align:left;padding:8px 0;border-bottom:2px solid #ddd;font-weight:600;font-size:12px;text-transform:uppercase;color:#555}
    th:not(:first-child){text-align:right}
    .totals{margin-top:16px;display:flex;justify-content:flex-end}
    .totals-inner{min-width:220px;font-size:14px}
    .totals-row{display:flex;justify-content:space-between;padding:4px 0;color:#555}
    .totals-total{display:flex;justify-content:space-between;padding:8px 0;margin-top:4px;border-top:2px solid #ddd;font-weight:700;font-size:16px;color:#111}
    .notes{margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:13px;color:#666}
    @media print{body{padding:20px}}
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
    <div><h1>INVOICE</h1><p class="meta">${inv.invoice_number}</p></div>
    <div style="text-align:right;font-size:13px;color:#666">
      ${inv.due_date ? `<p>Due: ${new Date(inv.due_date).toLocaleDateString()}</p>` : ""}
      <p>Status: <strong style="text-transform:capitalize">${inv.status}</strong></p>
    </div>
  </div>
  <table><thead><tr>
    <th>Description</th><th style="text-align:right;width:60px">Qty</th>
    <th style="text-align:right;width:100px">Unit Price</th>
    <th style="text-align:right;width:100px">Amount</th>
  </tr></thead><tbody>${items}</tbody></table>
  <div class="totals"><div class="totals-inner">
    <div class="totals-row"><span>Subtotal</span><span>&#8377;${f(inv.subtotal)}</span></div>
    ${Number(inv.tax_pct)>0?`<div class="totals-row"><span>Tax (${inv.tax_pct}%)</span><span>&#8377;${f(Number(inv.subtotal)*Number(inv.tax_pct)/100)}</span></div>`:""}
    ${Number(inv.discount_pct)>0?`<div class="totals-row"><span>Discount (${inv.discount_pct}%)</span><span>-&#8377;${f(Number(inv.subtotal)*Number(inv.discount_pct)/100)}</span></div>`:""}
    <div class="totals-total"><span>Total</span><span>&#8377;${f(inv.total)}</span></div>
    ${Number(inv.paid_amount)>0?`<div class="totals-row" style="color:#16a34a"><span>Paid</span><span>&#8377;${f(inv.paid_amount)}</span></div>`:""}
  </div></div>
  ${inv.notes?`<div class="notes"><strong>Notes</strong><p style="margin-top:4px">${inv.notes}</p></div>`:""}
  <script>window.onload=()=>{window.print();}<\/script>
  </body></html>`;

  const w = window.open("", "_blank", "width=800,height=700");
  w.document.write(html);
  w.document.close();
}

/* ── Invoices sub-tab ── */
function InvoicesTab({ projectId }) {
  const [invoices, setInvoices]   = useState([]);
  const [creating, setCreating]   = useState(false);
  const [items, setItems]         = useState([{ description:"", qty:1, unit_price:0 }]);
  const [tax, setTax]             = useState(0);
  const [disc, setDisc]           = useState(0);
  const [dueDate, setDueDate]     = useState("");
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);

  async function load() {
    const r = await fetch(`/api/projects/${projectId}/invoices`);
    const d = await r.json();
    setInvoices(d.invoices || []);
  }
  useEffect(() => { load(); }, [projectId]);

  function updItem(i,k,v) { setItems((p) => p.map((it,idx)=>idx===i?{...it,[k]:v}:it)); }
  const subtotal = items.reduce((s,it)=>s+Number(it.qty||1)*Number(it.unit_price||0),0);
  const total    = subtotal*(1+Number(tax)/100)*(1-Number(disc)/100);

  async function create() {
    setSaving(true);
    await fetch(`/api/projects/${projectId}/invoices`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ items, tax_pct:tax, discount_pct:disc, due_date:dueDate||undefined, notes:notes||undefined })
    });
    setCreating(false); setItems([{description:"",qty:1,unit_price:0}]); setTax(0); setDisc(0);
    await load(); setSaving(false);
  }

  async function updateStatus(iid, status) {
    await fetch(`/api/invoices/${iid}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status}) });
    await load();
  }

  /* Fetch full invoice with items then print in new window */
  async function openPrint(inv) {
    const r = await fetch(`/api/invoices/${inv.id}`);
    const d = await r.json();
    printInvoice(d.invoice || inv);
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={()=>setCreating(v=>!v)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 text-sm font-semibold transition-all w-fit">
        <span className="material-symbols-outlined text-base">add</span> New Invoice
      </button>

      {creating && (
        <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-5 flex flex-col gap-4">
          {/* Line items */}
          <div className="rounded-xl border border-[#2a2a2a] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#111] border-b border-[#2a2a2a]">
                <tr>
                  {["Description","Qty","Unit Price","Amount",""].map((h)=>(
                    <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-zinc-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {items.map((it,i)=>(
                  <tr key={i} className="bg-[#161616]">
                    <td className="px-2 py-1.5"><input value={it.description} onChange={(e)=>updItem(i,"description",e.target.value)} placeholder="Item…" className="w-full bg-transparent text-white text-sm focus:outline-none px-1" /></td>
                    <td className="px-2 py-1.5 w-16"><input type="number" value={it.qty} onChange={(e)=>updItem(i,"qty",e.target.value)} className="w-full bg-transparent text-white text-sm text-right focus:outline-none" /></td>
                    <td className="px-2 py-1.5 w-24"><input type="number" value={it.unit_price} onChange={(e)=>updItem(i,"unit_price",e.target.value)} className="w-full bg-transparent text-white text-sm text-right focus:outline-none" /></td>
                    <td className="px-3 py-1.5 text-right text-zinc-400 text-xs">₹{fmt(Number(it.qty)*Number(it.unit_price))}</td>
                    <td className="px-1 py-1.5 w-6">
                      {items.length>1 && <button onClick={()=>setItems(p=>p.filter((_,idx)=>idx!==i))} className="text-zinc-700 hover:text-red-400 transition-colors"><span className="material-symbols-outlined text-sm">remove</span></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={()=>setItems(p=>[...p,{description:"",qty:1,unit_price:0}])} className="text-xs text-orange-400 hover:text-orange-300 transition-colors self-start">+ Add line</button>

          <div className="flex justify-end gap-8 text-sm">
            <div className="flex flex-col gap-1 text-right">
              <div className="text-zinc-500">Subtotal: <span className="text-white">₹{fmt(subtotal)}</span></div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-zinc-500">Tax %</span>
                <input type="number" value={tax} onChange={(e)=>setTax(e.target.value)} className="w-14 bg-[#111] border border-[#333] rounded px-2 py-0.5 text-xs text-orange-400 text-right focus:outline-none" />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-zinc-500">Disc %</span>
                <input type="number" value={disc} onChange={(e)=>setDisc(e.target.value)} className="w-14 bg-[#111] border border-[#333] rounded px-2 py-0.5 text-xs text-orange-400 text-right focus:outline-none" />
              </div>
              <div className="text-white font-bold text-base mt-1">Total: ₹{fmt(total)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Due Date</label>
              <input type="date" value={dueDate} onChange={(e)=>setDueDate(e.target.value)} className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-zinc-400 focus:outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Notes</label>
              <input value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Payment terms…" className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-700 focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={()=>setCreating(false)} className="px-4 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-400 text-sm font-semibold">Cancel</button>
            <button onClick={create} disabled={saving} className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold disabled:opacity-40 transition-all">{saving?"Creating…":"Create Invoice"}</button>
          </div>
        </div>
      )}

      {invoices.map((inv) => {
        const ss = INV_STATUS[inv.status] || INV_STATUS.draft;
        const remaining = Number(inv.total) - Number(inv.paid_amount||0);
        return (
          <div key={inv.id} className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{inv.invoice_number}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize ${ss}`}>{inv.status}</span>
                </div>
                <div className="text-lg font-bold text-white mt-0.5">₹{fmt(inv.total)}</div>
                {Number(inv.paid_amount)>0 && <div className="text-sm text-emerald-400">₹{fmt(inv.paid_amount)} paid · ₹{fmt(remaining)} outstanding</div>}
              </div>
              <div className="flex gap-1.5 flex-wrap justify-end items-center">
                {/* Print button */}
                <button onClick={() => openPrint(inv)} title="Print / PDF"
                  className="size-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
                  <span className="material-symbols-outlined text-sm">print</span>
                </button>
                {inv.status==="draft"   && <button onClick={()=>updateStatus(inv.id,"sent")}    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all">Mark Sent</button>}
                {inv.status==="sent"    && <button onClick={()=>updateStatus(inv.id,"partial")}  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 transition-all">Mark Partial</button>}
                {inv.status!=="paid"    && <button onClick={()=>updateStatus(inv.id,"paid")}     className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 transition-all">Mark Paid</button>}
              </div>
            </div>
            {inv.due_date && <div className="text-[10px] text-zinc-600">Due: {new Date(inv.due_date).toLocaleDateString()}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ── Payments sub-tab — record actual money received ── */
function PaymentsTab({ projectId }) {
  const [invoices, setInvoices]   = useState([]);
  const [payments, setPayments]   = useState([]);
  const [invId, setInvId]         = useState("");
  const [amount, setAmount]       = useState("");
  const [method, setMethod]       = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn]       = useState(new Date().toISOString().slice(0,10));
  const [saving, setSaving]       = useState(false);

  async function load() {
    const [invRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/invoices`).then(r=>r.json()),
    ]);
    const invs = invRes.invoices || [];
    setInvoices(invs.filter(i => i.status !== "paid"));

    /* Load payments for all invoices */
    const allPayments = [];
    for (const inv of invs) {
      try {
        const r = await fetch(`/api/invoices/${inv.id}/payments`);
        const d = await r.json();
        (d.payments || []).forEach(p => allPayments.push({ ...p, invoice_number: inv.invoice_number }));
      } catch {}
    }
    allPayments.sort((a,b) => new Date(b.paid_on) - new Date(a.paid_on));
    setPayments(allPayments);
  }
  useEffect(() => { load(); }, [projectId]);

  async function record() {
    if (!invId || !amount) return;
    setSaving(true);
    await fetch(`/api/invoices/${invId}/payments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, method, reference: reference || undefined, paid_at: paidOn }),
    });
    setAmount(""); setReference(""); await load(); setSaving(false);
  }

  const METHOD_LABELS = {
    bank_transfer: "Bank Transfer", upi: "UPI", cash: "Cash",
    cheque: "Cheque", card: "Card", other: "Other",
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Record payment form */}
      <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-5 flex flex-col gap-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400 text-base">payments</span>
          Record Money Received
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {/* Invoice selector */}
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Invoice *</label>
            <select value={invId} onChange={(e) => setInvId(e.target.value)}
              className="bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all">
              <option value="">Select invoice…</option>
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} — ₹{fmt(Number(inv.total) - Number(inv.paid_amount||0))} outstanding
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Amount Received *</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
              className="bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all" />
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Date Received</label>
            <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)}
              className="bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/50 transition-all" />
          </div>

          {/* Method */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Payment Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}
              className="bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all">
              {Object.entries(METHOD_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Reference / UTR */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Reference / UTR No.</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / cheque no. / txn ID"
              className="bg-[#111] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all" />
          </div>
        </div>

        <button onClick={record} disabled={!invId || !amount || saving}
          className="px-5 py-2.5 rounded-xl bg-emerald-500/80 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-40 transition-all self-start flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {saving ? "Recording…" : "Record Payment"}
        </button>
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-bold text-white">Payment History</div>
          {payments.map((p) => (
            <div key={p.id} className="flex items-center gap-4 bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">₹{fmt(p.amount)}</div>
                <div className="text-[10px] text-zinc-600 mt-0.5">
                  {p.invoice_number} · {METHOD_LABELS[p.method] || p.method}
                  {p.reference && <span> · <span className="text-zinc-500">{p.reference}</span></span>}
                </div>
              </div>
              <div className="text-xs text-zinc-600 shrink-0">
                {new Date(p.paid_at || p.paid_on).toLocaleDateString()}
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                received
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Expenses sub-tab ── */
function ExpensesTab({ projectId }) {
  const [expenses, setExpenses]     = useState([]);
  const [total, setTotal]           = useState(0);
  const [category, setCategory]     = useState("other");
  const [desc, setDesc]             = useState("");
  const [amount, setAmount]         = useState("");
  const [date, setDate]             = useState(new Date().toISOString().slice(0,10));
  const [createInvoice, setCreateInvoice] = useState(false); // auto-invoice toggle
  const [saving, setSaving]         = useState(false);

  async function load() {
    const r = await fetch(`/api/projects/${projectId}/expenses`);
    const d = await r.json();
    setExpenses(d.expenses||[]); setTotal(d.total_expenses||0);
  }
  useEffect(() => { load(); }, [projectId]);

  async function add() {
    if (!desc||!amount) return;
    setSaving(true);
    await fetch(`/api/projects/${projectId}/expenses`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ category, description:desc, amount, expense_date:date })
    });

    /* Optionally auto-create a draft invoice for this expense */
    if (createInvoice) {
      await fetch(`/api/projects/${projectId}/invoices`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          items: [{ description: `${category.charAt(0).toUpperCase()+category.slice(1)} expense: ${desc}`, qty: 1, unit_price: Number(amount) }],
          tax_pct: 0, discount_pct: 0,
          notes: `Auto-generated from expense logged on ${date}`,
        }),
      });
    }

    setDesc(""); setAmount(""); await load(); setSaving(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4 flex flex-col gap-3">
        <div className="grid grid-cols-4 gap-2">
          <select value={category} onChange={(e)=>setCategory(e.target.value)} className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            {["tools","outsourcing","services","hosting","travel","other"].map(c=><option key={c}>{c}</option>)}
          </select>
          <input value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Description *" className="col-span-2 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none" />
          <input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Amount" className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none" />
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-zinc-400 focus:outline-none" />

          {/* Auto-invoice toggle */}
          <label className="flex items-center gap-2 cursor-pointer ml-auto">
            <div onClick={() => setCreateInvoice(v => !v)}
              className={`relative w-9 h-5 rounded-full transition-all ${createInvoice ? "bg-blue-500" : "bg-zinc-700"}`}>
              <div className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${createInvoice ? "left-4" : "left-0.5"}`} />
            </div>
            <span className="text-xs text-zinc-400 select-none">Auto-create invoice</span>
          </label>

          <button onClick={add} disabled={!desc||!amount||saving} className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold disabled:opacity-40 transition-all">Log Expense</button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm"><span className="text-zinc-500">Total Expenses:</span><span className="font-bold text-red-400">₹{fmt(total)}</span></div>
      <div className="flex flex-col gap-2">
        {expenses.map((e)=>(
          <div key={e.id} className="flex items-center gap-4 bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3 text-sm">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 capitalize shrink-0">{e.category}</span>
            <span className="text-zinc-300 flex-1 truncate">{e.description}</span>
            <span className="text-red-400 font-bold shrink-0">₹{fmt(e.amount)}</span>
            <span className="text-zinc-700 text-xs shrink-0">{new Date(e.expense_date).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Ledger sub-tab ── */
function LedgerTab({ projectId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`/api/projects/${projectId}/ledger`).then(r=>r.json()).then(d=>setData(d));
  }, [projectId]);
  if (!data) return <div className="text-zinc-600 text-sm text-center py-8">Loading ledger…</div>;
  const { ledger=[], summary={} } = data;
  const TYPE_STYLE = { invoice:"text-blue-400", payment:"text-emerald-400", expense:"text-red-400" };
  const TYPE_SIGN  = { invoice:"+", payment:"+", expense:"-" };
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Invoiced",    value:`₹${fmt(summary.invoiced)}`,    color:"text-blue-400" },
          { label:"Received",    value:`₹${fmt(summary.received)}`,    color:"text-emerald-400" },
          { label:"Outstanding", value:`₹${fmt(summary.outstanding)}`, color:"text-amber-400" },
          { label:"Net Profit",  value:`₹${fmt(summary.net)}`,         color:Number(summary.net)>=0?"text-emerald-400":"text-red-400" },
        ].map(row=>(
          <div key={row.label} className="bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3">
            <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">{row.label}</div>
            <div className={`text-lg font-bold ${row.color}`}>{row.value}</div>
          </div>
        ))}
      </div>
      <div className="bg-[#161616] border border-[#252525] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#111] border-b border-[#2a2a2a]">
            <tr>{["Date","Type","Reference","Amount","Actor"].map(h=>(
              <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {ledger.map((row,i)=>(
              <tr key={i} className="hover:bg-white/2 transition-colors">
                <td className="px-4 py-2.5 text-zinc-500 text-xs">{new Date(row.date).toLocaleDateString()}</td>
                <td className="px-4 py-2.5"><span className={`text-[10px] font-bold uppercase ${TYPE_STYLE[row.type]||"text-zinc-400"}`}>{row.type}</span></td>
                <td className="px-4 py-2.5 text-zinc-400 text-xs">{row.ref}</td>
                <td className={`px-4 py-2.5 font-bold text-sm ${TYPE_STYLE[row.type]||"text-zinc-400"}`}>{TYPE_SIGN[row.type]}₹{fmt(row.amount)}</td>
                <td className="px-4 py-2.5 text-zinc-600 text-xs">{row.actor}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {ledger.length===0 && <div className="text-center text-zinc-700 text-sm py-8">No transactions yet.</div>}
      </div>
    </div>
  );
}

/* ════════════ Main ════════════ */
export default function ProjectFinancePanel({ projectId, user }) {
  const [tab, setTab] = useState("invoices");
  const TABS = [
    { id:"invoices", label:"Invoices",  icon:"receipt_long" },
    { id:"payments", label:"Payments",  icon:"payments"     },
    { id:"expenses", label:"Expenses",  icon:"receipt"      },
    { id:"ledger",   label:"Ledger",    icon:"account_balance" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 border-b border-[#252525] pb-0">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 mr-2 text-[11px] font-semibold border-b-2 transition-all -mb-px
              ${tab===t.id?"border-blue-500 text-blue-400":"border-transparent text-zinc-600 hover:text-zinc-400"}`}>
            <span className="material-symbols-outlined text-sm">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      <div>
        {tab==="invoices" && <InvoicesTab projectId={projectId} />}
        {tab==="payments" && <PaymentsTab projectId={projectId} />}
        {tab==="expenses" && <ExpensesTab projectId={projectId} />}
        {tab==="ledger"   && <LedgerTab   projectId={projectId} />}
      </div>
    </div>
  );
}
