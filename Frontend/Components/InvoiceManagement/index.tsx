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
    FiRefreshCw,
    FiUpload,
    FiUploadCloud,
    FiFileText
} from "react-icons/fi";
import { getInvoiceApi } from "@/api/InvoiceApi/invoiceApi";
import { formatDateDisplay } from "@/lib/format";
import Pagination from "@/Components/Common/Pagination";
import { getExtractionsApi, uploadEmailDocumentsApi } from "@/api/SyncEmail/SyncEmail";
import { uploadBankStatementApi, getSingleExtractionStatusApi } from "@/api/BankStatement/bankStatementApi";
import toast from "react-hot-toast";
import { getVendorApi } from "@/api/Vendor/VendorApi";
import { getUser } from "@/lib/localStore";

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
    documentId?: string;
    documentExtractionId?: number;
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
        documentId: raw.document_id ?? undefined,
        documentExtractionId: raw.document_extraction_id ?? undefined,
    };
}

export default function InvoiceManagement() {
    const user = getUser();
    const isManager = (user?.role || "").toLowerCase() === "manager";
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

    // Upload Invoice Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [uploadVendorName, setUploadVendorName] = useState<string>("");
    const [uploadVendorId, setUploadVendorId] = useState<string>("");
    const [vendorsList, setVendorsList] = useState<any[]>([]);
    const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
    const [dragActive, setDragActive] = useState<boolean>(false);

    const loadVendors = async () => {
        try {
            const res: any = await getVendorApi();
            const list = res?.data || (Array.isArray(res) ? res : []);
            setVendorsList(list);
        } catch (err) {
            console.error("Error loading vendors:", err);
        }
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileSelect = (file: File) => {
        setUploadFile(file);
        if (file.type.startsWith("image/")) {
            setFilePreview(URL.createObjectURL(file));
        } else {
            setFilePreview(null);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const resetUploadForm = () => {
        setUploadFile(null);
        setFilePreview(null);
        setUploadVendorName("");
        setUploadVendorId("");
        setIsUploadingFile(false);
    };

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) {
            toast.error("Please select an invoice file to upload.");
            return;
        }
        if (!uploadVendorName.trim()) {
            toast.error("Please select or type a vendor name.");
            return;
        }

        setIsUploadingFile(true);
        try {
            const payload = {
                files: uploadFile,
                doc_types: "INVOICE",
                vendor_id: uploadVendorId ? parseInt(uploadVendorId) : undefined,
                vendor_name: uploadVendorName.trim(),
            };

            const res = await uploadBankStatementApi(payload);
            const docId = res?.[0]?.document_id || res?.document_id;

            if (docId) {
                const statusInterval = setInterval(async () => {
                    try {
                        const status = await getSingleExtractionStatusApi(docId);
                        if (status?.status === "COMPLETED") {
                            toast.success("Invoice processed successfully!");
                            clearInterval(statusInterval);
                            await fetchInvoiceData();
                            setIsUploadingFile(false);
                            setIsUploadModalOpen(false);
                            resetUploadForm();
                        } else if (status?.status === "FAILED") {
                            toast.error("Invoice processing failed!");
                            clearInterval(statusInterval);
                            setIsUploadingFile(false);
                            setIsUploadModalOpen(false);
                            resetUploadForm();
                        }
                    } catch (err) {
                        console.error("Error polling extraction status:", err);
                        clearInterval(statusInterval);
                        setIsUploadingFile(false);
                    }
                }, 2000);
            } else {
                toast.success("Invoice uploaded successfully!");
                await fetchInvoiceData();
                setIsUploadingFile(false);
                setIsUploadModalOpen(false);
                resetUploadForm();
            }
        } catch (error: any) {
            console.error("Error uploading invoice:", error);
            const msg = error?.response?.data?.detail || "Failed to upload invoice document.";
            toast.error(msg);
            setIsUploadingFile(false);
        }
    };

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


                </div>

                {!isManager && (
                    <div className="flex gap-4">
                        <div className="flex items-center justify-end">
                            <button
                                onClick={() => {
                                    loadVendors();
                                    setIsUploadModalOpen(true);
                                }}
                                className="bg-[#1A56DB] hover:bg-[#1448C4] active:bg-[#0E3A9E] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all border border-blue-700/30 whitespace-nowrap"
                            >
                                <div className="w-4 h-4 flex items-center justify-center rounded bg-white/20 text-white">
                                    <FiUpload className="w-3.5 h-3.5 text-white" />
                                </div>
                                <span>Upload Invoices</span>
                            </button>
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
                )}
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-4 sm:p-5 space-y-4">

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-2xl">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search invoice or vendor..."
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
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 text-left whitespace-nowrap">
                                    Invoice #
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 text-left whitespace-nowrap">
                                    Vendor
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 text-left whitespace-nowrap">
                                    Invoice Date
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 text-left whitespace-nowrap">
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
                                        <td className="py-3.5 px-4 text-left whitespace-nowrap">
                                            <button
                                                className="text-slate-800 font-medium"
                                            >
                                                {inv.invoiceNo}
                                            </button>
                                        </td>

                                        <td className="py-3.5 px-4 text-left font-medium text-slate-800 whitespace-nowrap">
                                            {inv.vendor}
                                        </td>

                                        <td className="py-3.5 px-4 text-left text-slate-600 whitespace-nowrap">
                                            {inv.invoiceDate}
                                        </td>

                                        <td className="py-3.5 px-4 text-left text-slate-600 whitespace-nowrap">
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
                                                <Link
                                                    href={`/invoices/review-extracted?id=${inv.documentId || inv.documentExtractionId || inv.id}`}
                                                    title="View Extracted Details"
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer inline-flex items-center justify-center"
                                                >
                                                    <FiEye className="w-4 h-4" />
                                                </Link>
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

            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl p-6 border border-slate-100 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Upload Invoice
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                                    Select or drop an invoice document and specify the vendor.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsUploadModalOpen(false);
                                    resetUploadForm();
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUploadSubmit} className="space-y-4 text-left">
                            {/* File Upload Dropzone */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Upload Invoice File / Image <span className="text-rose-500">*</span>
                                </label>
                                <div
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${dragActive
                                        ? "border-blue-500 bg-blue-50/50"
                                        : uploadFile
                                            ? "border-emerald-300 bg-emerald-50/30"
                                            : "border-slate-200 hover:border-blue-400 bg-slate-50/50"
                                        }`}
                                >
                                    <input
                                        type="file"
                                        accept=".pdf, .png, .jpg, .jpeg, .webp"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleFileSelect(e.target.files[0]);
                                            }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />

                                    {uploadFile ? (
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            {filePreview ? (
                                                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 shadow-2xs">
                                                    <img src={filePreview} alt="Invoice preview" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                                    <FiFileText className="w-6 h-6" />
                                                </div>
                                            )}
                                            <div className="text-xs font-semibold text-slate-800 break-all px-2">
                                                {uploadFile.name}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">
                                                {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUploadFile(null);
                                                    setFilePreview(null);
                                                }}
                                                className="text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer pt-1"
                                            >
                                                Change File
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center space-y-2 py-2">
                                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                                <FiUploadCloud className="w-6 h-6" />
                                            </div>
                                            <p className="text-xs font-semibold text-slate-700">
                                                <span className="text-[#1A56DB] hover:underline font-bold">Click to upload</span> or drag & drop image/file
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                Supports PDF, PNG, JPG, JPEG, WEBP
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Vendor Select Dropdown */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Select Existing Vendor
                                </label>
                                <select
                                    value={uploadVendorId}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setUploadVendorId(val);
                                        if (val) {
                                            const found = vendorsList.find((v) => String(v.id) === val);
                                            if (found) {
                                                setUploadVendorName(found.vendor_name || "");
                                            }
                                        }
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                    <option value="">-- Choose Vendor Dropdown --</option>
                                    {vendorsList.map((v: any) => (
                                        <option key={v.id} value={v.id}>
                                            {v.vendor_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Vendor Name Text Input */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Vendor Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Type vendor name (e.g. Apex Plumbing Services)"
                                    value={uploadVendorName}
                                    onChange={(e) => setUploadVendorName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    disabled={isUploadingFile}
                                    onClick={() => {
                                        setIsUploadModalOpen(false);
                                        resetUploadForm();
                                    }}
                                    className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploadingFile}
                                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1A56DB] hover:bg-[#1448C4] active:bg-[#0E3A9E] text-white transition-colors cursor-pointer shadow-xs flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isUploadingFile ? (
                                        <>
                                            <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Uploading...</span>
                                        </>
                                    ) : (
                                        <span>Submit</span>
                                    )}
                                </button>
                            </div>
                        </form>
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