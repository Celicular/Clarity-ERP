"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

function fmt(n) { return parseFloat(n || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" }); }

export default function PrintPayslip() {
  const { id } = useParams();
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(true);

  // Expose this to NEXT_PUBLIC in env or fallback
  const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Company Name";

  useEffect(() => {
    fetch(`/api/payslips/${id}`)
      .then((r) => r.json())
      .then((d) => setSlip(d.payslip))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (slip) {
      setTimeout(() => {
        window.print();
      }, 700);
    }
  }, [slip]);

  if (loading) return <div className="p-10 text-center text-black font-serif bg-white min-h-screen">Loading document...</div>;
  if (!slip) return <div className="p-10 text-center text-red-500 font-serif bg-white min-h-screen">Document not found.</div>;

  return (
    <div className="min-h-screen bg-white text-black p-8 font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4; margin: 15mm 20mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
        .tbl-border, .tbl-border th, .tbl-border td { border: 1px solid #000; border-collapse: collapse; }
      `}} />
      
      <div className="max-w-[800px] mx-auto bg-white">
        
        {/* Header - Strictly Corporate */}
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold uppercase tracking-widest text-black mb-1">{COMPANY_NAME}</h1>
          <h2 className="text-lg font-semibold uppercase tracking-widest text-[#333]">Payslip</h2>
          <p className="text-sm mt-2 text-[#555]">
            For the period: <span className="font-semibold text-black">{new Date(slip.pay_period_start).toLocaleDateString("en-IN", { month: "short", year: "numeric", day: "numeric" })}</span> to <span className="font-semibold text-black">{new Date(slip.pay_period_end).toLocaleDateString("en-IN", { month: "short", year: "numeric", day: "numeric" })}</span>
          </p>
        </div>

        {/* Employee Details Grid */}
        <table className="w-full text-sm mb-8 tbl-border">
          <tbody>
            <tr>
              <td className="p-2 bg-gray-100 font-semibold w-1/4">Employee Name</td>
              <td className="p-2 w-1/4">{slip.employee_name}</td>
              <td className="p-2 bg-gray-100 font-semibold w-1/4">Department</td>
              <td className="p-2 w-1/4">{slip.department || "-"}</td>
            </tr>
            <tr>
              <td className="p-2 bg-gray-100 font-semibold">Designation</td>
              <td className="p-2">{slip.designation || "Employee"}</td>
              <td className="p-2 bg-gray-100 font-semibold">Pay Date</td>
              <td className="p-2">{slip.payment_date ? new Date(slip.payment_date).toLocaleDateString("en-IN") : "-"}</td>
            </tr>
            <tr>
              <td className="p-2 bg-gray-100 font-semibold">Payment Mode</td>
              <td className="p-2">{slip.payment_mode || "-"}</td>
              <td className="p-2 bg-gray-100 font-semibold">Status</td>
              <td className="p-2 uppercase font-bold">{slip.status}</td>
            </tr>
          </tbody>
        </table>

        {/* Earnings & Deductions Split Table */}
        <div className="flex border border-black mb-8">
          
          {/* Earnings Column */}
          <div className="w-1/2 border-r border-black flex flex-col">
            <div className="bg-gray-200 p-2 font-bold uppercase text-sm text-center border-b border-black">
              Earnings
            </div>
            <div className="flex-1 p-4">
              <div className="flex justify-between mb-2"><span>Basic Pay</span><span>{fmt(slip.basic_pay)}</span></div>
              <div className="flex justify-between mb-2"><span>House Rent Allowance</span><span>{fmt(slip.hra)}</span></div>
              <div className="flex justify-between mb-2"><span>Travel Allowance</span><span>{fmt(slip.travel_allowance)}</span></div>
              <div className="flex justify-between mb-2"><span>Other Additions</span><span>{fmt(slip.other_additions)}</span></div>
            </div>
            <div className="p-3 border-t border-black bg-gray-100 flex justify-between font-bold">
              <span>Gross Earnings</span>
              <span>{fmt(slip.gross_pay)}</span>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-gray-200 p-2 font-bold uppercase text-sm text-center border-b border-black">
              Deductions
            </div>
            <div className="flex-1 p-4">
              <div className="flex justify-between mb-2"><span>Provident Fund (PF)</span><span>{fmt(slip.pf_deduction)}</span></div>
              <div className="flex justify-between mb-2"><span>Tax / TDS</span><span>{fmt(slip.tax_deduction)}</span></div>
              <div className="flex justify-between mb-2"><span>Other Deductions</span><span>{fmt(slip.other_deductions)}</span></div>
            </div>
            <div className="p-3 border-t border-black bg-gray-100 flex justify-between font-bold">
              <span>Total Deductions</span>
              <span>{fmt(slip.total_deductions)}</span>
            </div>
          </div>
          
        </div>

        {/* Net Pay Grand Total */}
        <div className="flex justify-between items-center p-4 border-2 border-black bg-gray-100 mb-8">
          <span className="font-bold uppercase tracking-widest text-[#333]">Net Salary Payable</span>
          <span className="text-2xl font-bold">{fmt(slip.net_pay)}</span>
        </div>

        {/* Remarks / Footer */}
        {slip.notes && (
          <div className="mb-12 text-sm">
            <p className="font-bold underline mb-1">Remarks:</p>
            <p className="text-[#333] italic">{slip.notes}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="flex justify-between items-end mt-16 pt-8 text-sm font-semibold text-[#555]">
          <div className="text-center">
            <div className="border-t border-black w-48 mb-2"></div>
            Employer Signature
          </div>
          <div className="text-center">
            <div className="border-t border-black w-48 mb-2"></div>
            Employee Signature
          </div>
        </div>
        
        <p className="text-center text-xs mt-12 text-[#999] italic">This is a computer-generated document.</p>

        {/* Print Button */}
        <div className="mt-8 text-center no-print">
          <button onClick={() => window.print()} 
            className="px-6 py-2 bg-black text-white text-sm font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors">
            Print Document
          </button>
        </div>

      </div>
    </div>
  );
}
