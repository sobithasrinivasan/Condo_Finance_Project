"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import InvoiceModel from "@/Models/InvoiceModel";
import {
    FiSearch,
    FiFilter,
    FiSliders,
    FiEye,
    FiX,
    FiCheckCircle,
    FiMail,
    FiRefreshCw
} from "react-icons/fi";
import { getInvoiceApi } from "@/api/InvoiceApi/invoiceApi";
import { formatDateDisplay } from "@/lib/format";
import Pagination from "@/Components/Common/Pagination";

interface InvoiceItem {
    id: string;
    invoiceNo: string;
    vendor: string;
    invoiceDate: string;
    dueDate: string;
    amount: string;
    numericAmount: number;
    status: "Pending" | "Approved" | "Paid" | "Rejected" | "Duplicate";
    daysLeft: string;
    daysLeftNum: number;
    daysLeftType: "warning" | "success" | "danger";
    description?: string;
    category?: string;
    gmailSubject?: string;
    documentUrl?: string;
}

function mapApiToInvoiceItem(raw: any): InvoiceItem {
    const daysLeftNum: number = raw.days_left ?? 0;

    let daysLeftType: "warning" | "success" | "danger" = "warning";
    if (daysLeftNum <= 0) {
        daysLeftType = "danger";
    } else if (daysLeftNum > 10) {
        daysLeftType = "success";
    }

    const daysLeftLabel =
        daysLeftNum < 0
            ? `${Math.abs(daysLeftNum)} days overdue`
            : daysLeftNum === 0
                ? "Due today"
                : `${daysLeftNum} days`;

    const rawAmount = parseFloat(raw.amount ?? 0);
    const formattedAmount = `$${rawAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

    const statusMap: Record<string, InvoiceItem["status"]> = {
        Pending: "Pending",
        Approved: "Approved",
        Paid: "Paid",
        Rejected: "Rejected",
        Duplicate: "Duplicate",
    };

    return {
        id: String(raw.id),
        invoiceNo: raw.invoice_number ?? `INV-${raw.id}`,
        vendor: raw.vendor_name ?? `Vendor #${raw.vendor_id}`,
        invoiceDate: formatDateDisplay(raw.invoice_date),
        dueDate: raw.due_date ? formatDateDisplay(raw.due_date) : "—",
        amount: formattedAmount,
        numericAmount: rawAmount,
        status: statusMap[raw.status] ?? "Pending",
        daysLeft: daysLeftLabel,
        daysLeftNum,
        daysLeftType,
        category: raw.source ?? undefined,
        gmailSubject: raw.gmail_message_id ?? undefined,
        documentUrl: raw.document_url ?? undefined,
    };
}

export default function InvoiceManagement() {
    const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
    const [selectedTab, setSelectedTab] = useState<string>("All");
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);
    const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>("All");
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isGmailModalOpen, setIsGmailModalOpen] = useState<boolean>(false);
    const [isImporting, setIsImporting] = useState<boolean>(false);
    const [importedSuccessCount, setImportedSuccessCount] = useState<number | null>(null);
    const [totalCount, setTotalCount] = useState<number>(0);

    const fetchInvoiceData = async () => {
        try {
            const result: any = await getInvoiceApi();
            const rows: any[] = result?.data ?? [];
            setInvoices(rows.map(mapApiToInvoiceItem));
            setTotalCount(result?.pagination?.total ?? rows.length);
        } catch (error) {
            console.error("Error fetching invoice data:", error);
        }
    };

    useEffect(() => {
        fetchInvoiceData();
    }, []);

    const counts = {
        All: totalCount,
        Pending: invoices.filter((i) => i.status === "Pending").length,
        Approved: invoices.filter((i) => i.status === "Approved").length,
        Paid: invoices.filter((i) => i.status === "Paid").length,
        Rejected: invoices.filter((i) => i.status === "Rejected").length,
        Duplicate: invoices.filter((i) => i.status === "Duplicate").length,
    };

    const filteredInvoices = invoices.filter((inv) => {
        const matchesTab = selectedTab === "All" ? true : inv.status === selectedTab;
        const matchesSearch =
            inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.amount.includes(searchTerm) ||
            inv.status.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesVendor =
            selectedVendorFilter === "All" ? true : inv.vendor === selectedVendorFilter;

        return matchesTab && matchesSearch && matchesVendor;
    });

    const rowsPerPage = 10;
    const paginatedInvoices = filteredInvoices.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );
    const totalPages = Math.ceil(filteredInvoices.length / rowsPerPage);

    const handleGmailImport = () => {
        setIsImporting(true);
        setImportedSuccessCount(null);
        setTimeout(() => {
            setIsImporting(false);
            setImportedSuccessCount(1);
        }, 1500);
    };

    const handleStatusChange = (id: string, newStatus: InvoiceItem["status"]) => {
        setInvoices(
            invoices.map((inv) => (inv.id === id ? { ...inv, status: newStatus } : inv))
        );
        setOpenMenuId(null);
    };

    const uniqueVendors = Array.from(new Set(invoices.map((inv) => inv.vendor)));

    console.log(selectedInvoice, 'selectedInvoice')

    return (
        <div className="space-y-6 font-sans text-slate-800 pb-10">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#0B1E48] uppercase whitespace-nowrap">
                        INVOICE MANAGEMENT
                    </h1>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {(["All", "Pending", "Approved", "Paid", "Rejected", "Duplicate"] as const).map(
                            (tab) => {
                                const isActive = selectedTab === tab;
                                const count = counts[tab];

                                return (
                                    <button
                                        key={tab}
                                        onClick={() => {
                                            setSelectedTab(tab);
                                            setCurrentPage(1);
                                        }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${isActive
                                            ? "bg-[#0B1E48] text-white shadow-xs"
                                            : "bg-[#F1F5F9] text-slate-600 hover:bg-slate-200/80 border border-slate-200/60"
                                            }`}
                                    >
                                        <span>{tab}</span>
                                        <span
                                            className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${isActive
                                                ? "bg-[#1D3B82] text-white"
                                                : "bg-slate-200 text-slate-600"
                                                }`}
                                        >
                                            {count}
                                        </span>
                                    </button>
                                );
                            }
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end">
                    <Link
                        href="/invoices/gmail-import"
                        className="bg-[#1A56DB] hover:bg-[#1448C4] active:bg-[#0E3A9E] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all border border-blue-700/30 whitespace-nowrap"
                    >
                        <div className="w-4 h-4 flex items-center justify-center rounded bg-white/20 text-white">
                            <FiMail className="w-3.5 h-3.5" />
                        </div>
                        <span>Import from Gmail</span>
                    </Link>
                </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-4 sm:p-5 space-y-4">

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-2xl">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search invoices..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full"
                            >
                                <FiX className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${showFilterPanel
                                ? "bg-blue-50 border-blue-300 text-blue-700"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                        >
                            <FiFilter className="w-3.5 h-3.5" />
                            <span>Filters</span>
                        </button>

                        <button
                            onClick={() => setSelectedVendorFilter("All")}
                            title="Reset Sort & View"
                            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                        >
                            <FiSliders className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {showFilterPanel && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-4 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-600">Filter Vendor:</span>
                            <select
                                value={selectedVendorFilter}
                                onChange={(e) => setSelectedVendorFilter(e.target.value)}
                                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 shadow-2xs"
                            >
                                <option value="All">All Vendors</option>
                                {uniqueVendors.map((v) => (
                                    <option key={v} value={v}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {(selectedVendorFilter !== "All" || searchTerm) && (
                            <button
                                onClick={() => {
                                    setSelectedVendorFilter("All");
                                    setSearchTerm("");
                                }}
                                className="text-blue-600 hover:underline text-xs font-semibold cursor-pointer"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200/70 bg-white">
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 text-center whitespace-nowrap">
                                    Invoice #
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 text-left whitespace-nowrap">
                                    Vendor
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 text-center whitespace-nowrap">
                                    Invoice Date
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 text-center whitespace-nowrap">
                                    Due Date
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 text-right whitespace-nowrap">
                                    Amount
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 text-center whitespace-nowrap">
                                    Status
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 text-center whitespace-nowrap">
                                    Days Left
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 text-center whitespace-nowrap">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-10 text-slate-400">
                                        No invoices found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedInvoices.map((inv) => (
                                    <tr
                                        key={inv.id}
                                        className="hover:bg-slate-50/80 transition-colors group"
                                    >
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            <button
                                                onClick={() => setSelectedInvoice(inv)}
                                                className="text-[#1A56DB] hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                                            >
                                                {inv.invoiceNo}
                                            </button>
                                        </td>

                                        <td className="py-3.5 px-4 text-left font-medium text-slate-800 whitespace-nowrap">
                                            {inv.vendor}
                                        </td>

                                        <td className="py-3.5 px-4 text-center text-slate-600 whitespace-nowrap">
                                            {inv.invoiceDate}
                                        </td>

                                        <td className="py-3.5 px-4 text-center text-slate-600 whitespace-nowrap">
                                            {inv.dueDate}
                                        </td>

                                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                                            {inv.amount}
                                        </td>

                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            {inv.status === "Pending" && (
                                                <span className="bg-[#FEF3C7] text-[#D97706] text-xs font-semibold px-3 py-1 rounded-full border border-amber-200/60 inline-flex items-center justify-center min-w-[80px]">
                                                    Pending
                                                </span>
                                            )}
                                            {inv.status === "Approved" && (
                                                <span className="bg-[#DCFCE7] text-[#16A34A] text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200/60 inline-flex items-center justify-center min-w-[80px]">
                                                    Approved
                                                </span>
                                            )}
                                            {inv.status === "Paid" && (
                                                <span className="bg-[#EFF6FF] text-[#2563EB] text-xs font-semibold px-3 py-1 rounded-full border border-blue-200/60 inline-flex items-center justify-center min-w-[80px]">
                                                    Paid
                                                </span>
                                            )}
                                            {inv.status === "Duplicate" && (
                                                <span className="bg-[#FFE4E6] text-[#E11D48] text-xs font-semibold px-3 py-1 rounded-full border border-rose-200/60 inline-flex items-center justify-center min-w-[80px]">
                                                    Duplicate
                                                </span>
                                            )}
                                            {inv.status === "Rejected" && (
                                                <span className="bg-[#FEE2E2] text-[#DC2626] text-xs font-semibold px-3 py-1 rounded-full border border-red-200/60 inline-flex items-center justify-center min-w-[80px]">
                                                    Rejected
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            {inv.daysLeftType === "warning" ? (
                                                <span className="bg-[#FFEDD5] text-[#EA580C] text-xs font-medium px-3 py-1 rounded-full border border-orange-200/60 inline-flex items-center justify-center min-w-[75px]">
                                                    {inv.daysLeft}
                                                </span>
                                            ) : inv.daysLeftType === "success" ? (
                                                <span className="bg-[#DCFCE7] text-[#16A34A] text-xs font-medium px-3 py-1 rounded-full border border-emerald-200/60 inline-flex items-center justify-center min-w-[75px]">
                                                    {inv.daysLeft}
                                                </span>
                                            ) : (
                                                <span className="bg-[#FEE2E2] text-[#DC2626] text-xs font-medium px-3 py-1 rounded-full border border-red-200/60 inline-flex items-center justify-center min-w-[75px]">
                                                    {inv.daysLeft}
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-4 text-center whitespace-nowrap relative">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => setSelectedInvoice(inv)}
                                                    title="View Invoice"
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                                >
                                                    <FiEye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalCount={filteredInvoices.length}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setCurrentPage}
                    description={`Showing ${filteredInvoices.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to ${Math.min(currentPage * rowsPerPage, filteredInvoices.length)} of ${filteredInvoices.length} invoices`}
                />

            </div>

            {isGmailModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-blue-50 text-[#1A56DB]">
                                    <FiMail className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">
                                        Import Invoices from Gmail
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Connected: admin@condofinance.com
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsGmailModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                                <FiX className="w-4 h-4" />
                            </button>
                        </div>

                        {importedSuccessCount !== null ? (
                            <div className="text-center py-4 space-y-3">
                                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                                    <FiCheckCircle className="w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm">
                                    Successfully Synced!
                                </h4>
                                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                    Imported <span className="font-bold text-slate-800">1 new invoice</span> from your Gmail inbox attachments into your condo financial workflow.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4 text-xs text-slate-600">
                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                                    <div className="flex justify-between font-semibold text-slate-700">
                                        <span>Gmail Sync Status</span>
                                        <span className="text-emerald-600 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                                            Active Rule
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        Automatically parses attached PDFs and invoice images matching standard vendor keywords.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setIsGmailModalOpen(false)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                            >
                                Close
                            </button>
                            {importedSuccessCount === null && (
                                <button
                                    onClick={handleGmailImport}
                                    disabled={isImporting}
                                    className="px-4 py-2 rounded-xl bg-[#1A56DB] hover:bg-[#1448C4] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                                >
                                    {isImporting ? (
                                        <>
                                            <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            Scanning Gmail...
                                        </>
                                    ) : (
                                        <>
                                            <FiMail className="w-3.5 h-3.5" />
                                            Fetch Invoices Now
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {selectedInvoice && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <InvoiceModel
                        invoice={{
                            id: selectedInvoice.id,
                            vendor: selectedInvoice.vendor,
                            invoiceNo: selectedInvoice.invoiceNo,
                            invoiceDate: selectedInvoice.invoiceDate,
                            dueDate: selectedInvoice.dueDate,
                            amount: selectedInvoice.amount,
                            status: selectedInvoice.status,
                            paymentTerms: "Net 15",
                            category: selectedInvoice.category || "Maintenance",
                            documentUrl: selectedInvoice.documentUrl
                        }}
                        onClose={() => setSelectedInvoice(null)}
                        onApprove={(id) => {
                            if (id) handleStatusChange(id, "Approved");
                            setSelectedInvoice(null);
                        }}
                        onMarkAsPaid={(id) => {
                            if (id) handleStatusChange(id, "Paid");
                            setSelectedInvoice(null);
                        }}
                        onReject={(id) => {
                            if (id) handleStatusChange(id, "Rejected");
                            setSelectedInvoice(null);
                        }}
                    />
                </div>
            )}
        </div>
    );
}