"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { invoiceApi, leaseApi } from "@/lib/api";

/**
 * Lease Statement Page (A4, print-optimized)
 * - Renders a professional statement layout using real backend data from
 *   /finance/payment-reconciliation/lease-statement/{lease_id}/
 * - Server-calculated running balance and opening balance are displayed
 * - Includes print styles to produce A4 portrait output and a Download PDF button placeholder
 */

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount || 0)
    .replace("ZAR", "R");

const formatDate = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
};

export default function LeaseStatementPage() {
  const router = useRouter();
  const params = useParams();
  const leaseId = useMemo(() => {
    const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
    return id ? parseInt(String(id)) : NaN;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statement, setStatement] = useState<any | null>(null);
  const [lease, setLease] = useState<any | null>(null);
  const [start, setStart] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [end, setEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Load lease meta and statement
  useEffect(() => {
    const load = async () => {
      if (!leaseId || Number.isNaN(leaseId)) return;
      try {
        setLoading(true);
        const [leaseData, statementData] = await Promise.all([
          leaseApi.getLease(String(leaseId)),
          invoiceApi.getLeaseStatement(leaseId, start, end),
        ]);
        setLease(leaseData);
        setStatement(statementData);
      } catch (e: any) {
        setError(e?.message || "Failed to load statement");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [leaseId, start, end]);

  // Derived header blocks
  const tenantBlock = useMemo(() => {
    if (!statement?.tenant) return null;
    return {
      name: statement.tenant.name,
      addressLines: [statement?.property?.address || ""].filter(Boolean),
    };
  }, [statement]);

  const companyBlock = useMemo(() => {
    const c = statement?.company || {};
    return {
      name: c.name || "",
      regNo: c.registration || "",
      vatNo: c.vat || "",
      addressLines: [c.address || ""].filter(Boolean),
      email: c.email || "",
      phone: c.phone || "",
    };
  }, [statement]);

  const printPage = () => {
    window.print();
  };

  if (!leaseId || Number.isNaN(leaseId)) {
    return (
      <DashboardLayout title="Lease Statement">
        <div className="p-6">Invalid lease id</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Lease Statement">
      <div className="p-4 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="px-3 py-2 border rounded">Back</button>
          <div className="text-sm opacity-70">Lease #{leaseId}</div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="border rounded px-2 py-1" />
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="border rounded px-2 py-1" />
          <button onClick={printPage} className="px-3 py-2 bg-blue-600 text-white rounded">Print</button>
        </div>
      </div>

      {loading ? (
        <div className="p-6">Loading…</div>
      ) : error ? (
        <div className="p-6 text-red-600">{error}</div>
      ) : !statement ? (
        <div className="p-6">No statement data</div>
      ) : (
        <div className="w-full flex justify-center">
          <div className="bg-white shadow print:shadow-none w-[210mm] min-h-[297mm] p-[14mm] print:p-[12mm] text-black">
            {/* Header: Left Tenant, Right Company */}
            <div className="flex justify-between">
              <div className="w-1/2 pr-6">
                <div className="font-semibold text-[14px] leading-tight">{tenantBlock?.name}</div>
                <div className="text-[12px] whitespace-pre-line opacity-80">
                  {tenantBlock?.addressLines.join("\n")}
                </div>
              </div>
              <div className="w-1/2 text-right">
                <div className="font-semibold text-[14px] leading-tight">{companyBlock.name}</div>
                {companyBlock.regNo && (
                  <div className="text-[11px]">Reg: {companyBlock.regNo}</div>
                )}
                {companyBlock.vatNo && (
                  <div className="text-[11px]">VAT: {companyBlock.vatNo}</div>
                )}
                {companyBlock.addressLines.length > 0 && (
                  <div className="text-[11px] whitespace-pre-line">{companyBlock.addressLines.join("\n")}</div>
                )}
                {(companyBlock.email || companyBlock.phone) && (
                  <div className="text-[11px]">
                    {companyBlock.email}
                    {companyBlock.email && companyBlock.phone ? " • " : ""}
                    {companyBlock.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Title & metadata */}
            <div className="mt-6">
              <div className="text-[22px] tracking-wide font-bold">STATEMENT</div>
              <div className="mt-1 text-[12px] space-y-0.5">
                <div>Payment reference: {statement?.lease?.id}</div>
                <div>Property: {statement?.property?.name}</div>
                <div>
                  Statement period: {formatDate(statement?.statement_period?.start_date)} to {formatDate(statement?.statement_period?.end_date)}
                </div>
              </div>
            </div>

            {/* Transactions table */}
            <div className="mt-6">
              <table className="w-full text-[12px] border-collapse">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="py-2">Date</th>
                    <th className="py-2">Ref no</th>
                    <th className="py-2">Description</th>
                    <th className="py-2">Method</th>
                    <th className="py-2 text-right">Debit</th>
                    <th className="py-2 text-right">Credit</th>
                    <th className="py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening balance row */}
                  <tr className="border-b">
                    <td className="py-2">{formatDate(statement.statement_period.start_date)}</td>
                    <td className="py-2"></td>
                    <td className="py-2 font-semibold">Opening balance</td>
                    <td className="py-2"></td>
                    <td className="py-2 text-right"></td>
                    <td className="py-2 text-right"></td>
                    <td className="py-2 text-right">{formatCurrency(statement.summary.opening_balance)}</td>
                  </tr>
                  {statement.transactions.map((t: any, i: number) => {
                    const debit = Number(t.charges || 0) + Number(t.adjustments || 0) > 0 ? Number(t.charges || 0) + Number(t.adjustments || 0) : 0;
                    const credit = Number(t.payments || 0) > 0 ? Number(t.payments || 0) : 0;
                    return (
                      <tr key={i} className={i % 2 === 0 ? "bg-black/0" : "bg-black/5"}>
                        <td className="py-2 align-top">{formatDate(t.date)}</td>
                        <td className="py-2 align-top">{t.reference || ''}</td>
                        <td className="py-2 align-top">{t.description}</td>
                        <td className="py-2 align-top">{t.payment_method || ''}</td>
                        <td className="py-2 text-right align-top">{debit ? formatCurrency(debit) : ''}</td>
                        <td className="py-2 text-right align-top">{credit ? formatCurrency(credit) : ''}</td>
                        <td className="py-2 text-right align-top">{formatCurrency(Number(t.balance || 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 text-right">
              <div className="text-[16px] font-bold">Balance due on {formatDate(statement.statement_period.end_date)}: {formatCurrency(statement.summary.closing_balance)}</div>
              {statement?.deposit?.held !== undefined && (
                <div className="text-[12px] mt-1">Damage deposit balance: {formatCurrency(statement.deposit.held - (statement.deposit.deductions || 0))}</div>
              )}
              <div className="text-[11px] opacity-70">(After a monthly administrative & advisory fee)</div>
            </div>

            {/* Ways to Pay */}
            <div className="mt-10 grid grid-cols-2 gap-6">
              <div>
                <div className="font-semibold text-[13px] mb-1">Direct Deposit</div>
                <div className="text-[11px] whitespace-pre-line">
                  {statement.bank_details || ""}
                </div>
              </div>
              <div>
                <div className="font-semibold text-[13px] mb-1">At any of these stores</div>
                <div className="text-[11px] opacity-80">Use your Bill Payment Reference at participating retailers.</div>
              </div>
            </div>

            {/* Footer note */}
            <div className="mt-8 text-center text-[12px] font-extrabold">
              Please quote this Bill Payment Reference: {statement?.lease?.id}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print\:hidden { display: none !important; }
          .print\:shadow-none { box-shadow: none !important; }
          .w-\[210mm\] { width: 210mm !important; }
          .min-h-\[297mm\] { min-height: 297mm !important; }
          .print\:p-\[12mm\] { padding: 12mm !important; }
          .w-\[210mm\], .w-\[210mm\] * { visibility: visible; }
          @page { size: A4 portrait; margin: 12mm; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </DashboardLayout>
  );
}


