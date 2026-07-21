"use client";

import React, { useState } from "react";
import Link from "next/link";
import InvoiceModel from "@/Models/InvoiceModel";
import {
    FiSearch,
    FiFilter,
    FiSliders,
    FiEye,
    FiMoreVertical,
    FiMail,
    FiX,
    FiCheckCircle,
    FiDownload,
    FiCalendar,
    FiDollarSign,
    FiUser,
    FiFileText,
    FiArrowRight,
    FiRefreshCw
} from "react-icons/fi";

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
}

export default function InvoiceManagement() {
    const initialInvoices: InvoiceItem[] = [
        {
            id: "1",
            invoiceNo: "INV-1001",
            vendor: "ABC Plumbing",
            invoiceDate: "Jul 10, 2026",
            dueDate: "Jul 25, 2026",
            amount: "$1,250.00",
            numericAmount: 1250,
            status: "Pending",
            daysLeft: "11 days",
            daysLeftNum: 11,
            daysLeftType: "warning",
            description: "Emergency pipe leak repair & valve replacement on Floor 4",
            category: "Plumbing Maintenance",
            gmailSubject: "Invoice #INV-1001 - ABC Plumbing Service"
        },
        {
            id: "2",
            invoiceNo: "INV-1002",
            vendor: "Elevator Maintenance Co.",
            invoiceDate: "Jul 09, 2026",
            dueDate: "Jul 24, 2026",
            amount: "$2,800.00",
            numericAmount: 2800,
            status: "Approved",
            daysLeft: "10 days",
            daysLeftNum: 10,
            daysLeftType: "warning",
            description: "Monthly elevator preventive maintenance & safety inspection",
            category: "Elevator & Lift Maintenance",
            gmailSubject: "Monthly Maintenance Invoice INV-1002"
        },
        {
            id: "3",
            invoiceNo: "INV-1003",
            vendor: "Green Landscaping",
            invoiceDate: "Jul 08, 2026",
            dueDate: "Jul 23, 2026",
            amount: "$950.00",
            numericAmount: 950,
            status: "Paid",
            daysLeft: "9 days",
            daysLeftNum: 9,
            daysLeftType: "success",
            description: "Courtyard lawn mowing, hedge trimming & irrigation check",
            category: "Groundskeeping & Lawn",
            gmailSubject: "Green Landscaping - Invoice INV-1003"
        },
        {
            id: "4",
            invoiceNo: "INV-1004",
            vendor: "Secure Guard Services",
            invoiceDate: "Jul 07, 2026",
            dueDate: "Jul 22, 2026",
            amount: "$1,100.00",
            numericAmount: 1100,
            status: "Pending",
            daysLeft: "8 days",
            daysLeftNum: 8,
            daysLeftType: "warning",
            description: "Night shift security guard staffing for main gate (2 weeks)",
            category: "Building Security",
            gmailSubject: "Security Guard Invoice INV-1004"
        },
        {
            id: "5",
            invoiceNo: "INV-1005",
            vendor: "City Waste Management",
            invoiceDate: "Jul 06, 2026",
            dueDate: "Jul 21, 2026",
            amount: "$320.00",
            numericAmount: 320,
            status: "Duplicate",
            daysLeft: "7 days",
            daysLeftNum: 7,
            daysLeftType: "success",
            description: "Bi-weekly trash pickup & recycling bin dumpsters",
            category: "Waste Disposal",
            gmailSubject: "City Waste Billing - INV-1005 (Duplicate detected)"
        },
        {
            id: "6",
            invoiceNo: "INV-1006",
            vendor: "Apex HVAC Solutions",
            invoiceDate: "Jul 05, 2026",
            dueDate: "Jul 20, 2026",
            amount: "$3,450.00",
            numericAmount: 3450,
            status: "Pending",
            daysLeft: "6 days",
            daysLeftNum: 6,
            daysLeftType: "warning",
            description: "Chiller unit capacitor replacement and refrigerant top-up",
            category: "HVAC & Climate Control",
            gmailSubject: "HVAC Service Invoice #INV-1006"
        },
        {
            id: "7",
            invoiceNo: "INV-1007",
            vendor: "Sparkle Clean Janitorial",
            invoiceDate: "Jul 04, 2026",
            dueDate: "Jul 19, 2026",
            amount: "$1,850.00",
            numericAmount: 1850,
            status: "Approved",
            daysLeft: "5 days",
            daysLeftNum: 5,
            daysLeftType: "warning",
            description: "Lobby marble floor polishing and common area deep cleaning",
            category: "Janitorial & Cleaning",
            gmailSubject: "Sparkle Clean Billing INV-1007"
        },
        {
            id: "8",
            invoiceNo: "INV-1008",
            vendor: "Metro Electric Co.",
            invoiceDate: "Jul 03, 2026",
            dueDate: "Jul 18, 2026",
            amount: "$780.00",
            numericAmount: 780,
            status: "Paid",
            daysLeft: "4 days",
            daysLeftNum: 4,
            daysLeftType: "success",
            description: "Parking garage LED light fixture replacement",
            category: "Electrical Maintenance",
            gmailSubject: "Metro Electric Invoice INV-1008"
        },
        {
            id: "9",
            invoiceNo: "INV-1009",
            vendor: "Shield Fire Protection",
            invoiceDate: "Jul 02, 2026",
            dueDate: "Jul 17, 2026",
            amount: "$1,400.00",
            numericAmount: 1400,
            status: "Rejected",
            daysLeft: "3 days",
            daysLeftNum: 3,
            daysLeftType: "danger",
            description: "Annual fire extinguisher pressure test & certification",
            category: "Safety & Compliance",
            gmailSubject: "Shield Fire Safety Invoice INV-1009"
        },
    ];

    const [invoices, setInvoices] = useState<InvoiceItem[]>(initialInvoices);
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

    const counts = {
        All: 125,
        Pending: 18,
        Approved: 28,
        Paid: 45,
        Rejected: 5,
        Duplicate: 4,
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

    const handleGmailImport = () => {
        setIsImporting(true);
        setImportedSuccessCount(null);
        setTimeout(() => {
            const newInvoice: InvoiceItem = {
                id: String(Date.now()),
                invoiceNo: `INV-${Math.floor(1006 + Math.random() * 900)}`,
                vendor: "CloudSync IT Services",
                invoiceDate: "Jul 15, 2026",
                dueDate: "Jul 30, 2026",
                amount: "$450.00",
                numericAmount: 450,
                status: "Pending",
                daysLeft: "15 days",
                daysLeftNum: 15,
                daysLeftType: "warning",
                description: "Monthly Wi-Fi router maintenance & lobby fiber broadband",
                category: "IT & Telecom",
                gmailSubject: "Invoice from CloudSync IT Services - INV-1010"
            };

            setInvoices([newInvoice, ...invoices]);
            setIsImporting(false);
            setImportedSuccessCount(3);
        }, 1500);
    };

    const handleStatusChange = (id: string, newStatus: InvoiceItem["status"]) => {
        setInvoices(
            invoices.map((inv) => (inv.id === id ? { ...inv, status: newStatus } : inv))
        );
        setOpenMenuId(null);
    };

    const uniqueVendors = Array.from(new Set(initialInvoices.map((inv) => inv.vendor)));

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
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                    Invoice #
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                    Vendor
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                    Invoice Date
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                    Due Date
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                    Amount
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                                    Status
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
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
                                filteredInvoices.map((inv) => (
                                    <tr
                                        key={inv.id}
                                        className="hover:bg-slate-50/80 transition-colors group"
                                    >
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <button
                                                onClick={() => setSelectedInvoice(inv)}
                                                className="text-[#1A56DB] hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                                            >
                                                {inv.invoiceNo}
                                            </button>
                                        </td>

                                        <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                                            {inv.vendor}
                                        </td>

                                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                                            {inv.invoiceDate}
                                        </td>

                                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                                            {inv.dueDate}
                                        </td>

                                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                                            {inv.amount}
                                        </td>

                                        <td className="py-3.5 px-4 whitespace-nowrap">
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

                                        <td className="py-3.5 px-4 whitespace-nowrap">
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

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <span className="text-xs text-slate-400 font-medium">
                        Showing 1 to {filteredInvoices.length} of 125 invoices
                    </span>

                    <div className="flex items-center gap-1">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs"
                        >
                            &lt;
                        </button>

                        <button
                            onClick={() => setCurrentPage(1)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs cursor-pointer shadow-2xs ${currentPage === 1
                                ? "bg-[#0B1E48] text-white"
                                : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                        >
                            1
                        </button>

                        <button
                            onClick={() => setCurrentPage(2)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold cursor-pointer ${currentPage === 2
                                ? "bg-[#0B1E48] text-white"
                                : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                        >
                            2
                        </button>

                        <button
                            onClick={() => setCurrentPage(3)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold cursor-pointer ${currentPage === 3
                                ? "bg-[#0B1E48] text-white"
                                : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                        >
                            3
                        </button>

                        <span className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs font-bold">
                            ...
                        </span>

                        <button
                            onClick={() => setCurrentPage(25)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold cursor-pointer ${currentPage === 25
                                ? "bg-[#0B1E48] text-white"
                                : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                        >
                            25
                        </button>

                        <button
                            onClick={() => setCurrentPage((p) => p + 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer text-xs"
                        >
                            &gt;
                        </button>
                    </div>
                </div>

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
                                        Automatically parses attached PDFs and invoice images matching standard vendor keywords (e.g. Plumbing, HVAC, Elevator, Landscaping).
                                    </p>
                                </div>

                                <div className="border border-slate-100 rounded-xl p-3 space-y-2">
                                    <span className="font-semibold text-slate-700">
                                        Recent Inbox Highlights:
                                    </span>
                                    <ul className="space-y-1.5 text-[11px]">
                                        <li className="flex items-center justify-between text-slate-600">
                                            <span className="truncate max-w-[240px]">
                                                • Invoice #INV-1010 CloudSync IT Services
                                            </span>
                                            <span className="text-blue-600 font-semibold">New</span>
                                        </li>
                                    </ul>
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