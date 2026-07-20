"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
    FiRefreshCw,
    FiSettings,
    FiCheckCircle,
    FiMail,
    FiEye,
    FiFileText,
    FiCopy,
    FiUserX,
    FiAlertTriangle,
    FiChevronRight,
    FiArrowLeft
} from "react-icons/fi";

interface EmailActivityItem {
    id: string;
    subject: string;
    from: string;
    receivedOn: string;
    status: "Extracted" | "Duplicate" | "Vendor Missing" | "OCR Failed";
}

export default function GmailInvoice() {
    const [selectedTab, setSelectedTab] = useState<string>("All");
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    // Initial emails list matching screenshot
    const initialEmails: EmailActivityItem[] = [
        {
            id: "1",
            subject: "Invoice INV-1001 from ABC Plumbing",
            from: "billing@abcplumbing.com",
            receivedOn: "Jul 14, 2026 10:25 AM",
            status: "Extracted",
        },
        {
            id: "2",
            subject: "Monthly Service Invoice",
            from: "accounts@elevatorco.com",
            receivedOn: "Jul 14, 2026 10:20 AM",
            status: "Extracted",
        },
        {
            id: "3",
            subject: "Landscaping Services - July",
            from: "invoices@greenlandscaping.com",
            receivedOn: "Jul 14, 2026 10:15 AM",
            status: "Duplicate",
        },
        {
            id: "4",
            subject: "Security Services Invoice",
            from: "billing@secureguard.com",
            receivedOn: "Jul 14, 2026 10:10 AM",
            status: "Vendor Missing",
        },
        {
            id: "5",
            subject: "Waste Management Bill",
            from: "billing@citywaste.com",
            receivedOn: "Jul 14, 2026 10:05 AM",
            status: "OCR Failed",
        },
    ];

    const [emails] = useState<EmailActivityItem[]>(initialEmails);

    const filteredEmails = emails.filter((item) => {
        if (selectedTab === "All") return true;
        if (selectedTab === "Invoices") return item.status === "Extracted";
        if (selectedTab === "Processing") return false;
        if (selectedTab === "Completed") return item.status === "Extracted";
        if (selectedTab === "Failed") return item.status === "OCR Failed" || item.status === "Vendor Missing";
        return true;
    });

    const handleSync = () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
        }, 1200);
    };

    return (
        <div className="space-y-6 font-sans text-slate-800 pb-12">
            {/* Top Breadcrumb Header */}
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">

                    <Link href="/invoices" className="hover:text-blue-600 transition-colors">
                        Invoices
                    </Link>
                    <FiChevronRight className="w-3 h-3 text-slate-300" />
                    <span className="text-[#1A56DB]">Gmail Invoice Import</span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B1E48]">
                            Gmail Invoice Import
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                            Automatically scan and ingest vendor invoices from your connected Gmail account.
                        </p>
                    </div>

                    {/* Top Action Buttons matching screenshot */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="bg-[#0B1E48] hover:bg-[#132B68] active:bg-[#071330] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all border border-[#132B68] whitespace-nowrap"
                        >
                            <FiRefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                            <span>Sync Gmail</span>
                        </button>

                        {/* <button
                            onClick={() => alert("Configure Filters modal open")}
                            className="bg-white border-2 border-[#1A56DB] text-[#1A56DB] hover:bg-blue-50/80 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-2xs flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
                        >
                            <FiSettings className="w-4 h-4" />
                            <span>Configure Filters</span>
                        </button> */}
                    </div>
                </div>
            </div>

            {/* Top 4 KPI Metric Cards Row matching screenshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric Card 1: Last Synced */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        LAST SYNCED
                    </span>
                    <div className="text-xl font-bold text-slate-900 tracking-tight">
                        Jul 14, 2026
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                        <FiCheckCircle className="w-3.5 h-3.5" />
                        <span>10:30 AM (Success)</span>
                    </div>
                </div>

                {/* Metric Card 2: Emails Scanned */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        EMAILS SCANNED
                    </span>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">
                        35
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                        This sync
                    </div>
                </div>

                {/* Metric Card 3: Invoices Found */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        INVOICES FOUND
                    </span>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">
                        12
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                        Attachments detected
                    </div>
                </div>

                {/* Metric Card 4: Processing Status */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        PROCESSING STATUS
                    </span>
                    <div className="text-xl font-bold text-emerald-600 tracking-tight">
                        Completed
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                        OCR extraction finished
                    </div>
                </div>
            </div>

            {/* Import Summary Section matching screenshot */}
            {/* <div className="space-y-3">
                <h2 className="text-base font-bold text-slate-900">
                    Import Summary
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#EBFDF2] border border-[#BBF7D0] rounded-2xl p-5 flex items-center justify-between shadow-2xs">
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-emerald-700 block">
                                Successfully Extracted
                            </span>
                            <span className="text-3xl font-extrabold text-emerald-800">
                                10
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-white/80 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
                            <FiFileText className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-5 flex items-center justify-between shadow-2xs">
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-amber-700 block">
                                Duplicates Found
                            </span>
                            <span className="text-3xl font-extrabold text-amber-800">
                                1
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-white/80 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                            <FiCopy className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-5 flex items-center justify-between shadow-2xs">
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-orange-700 block">
                                Vendor Missing
                            </span>
                            <span className="text-3xl font-extrabold text-orange-800">
                                1
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-white/80 border border-orange-200 flex items-center justify-center text-orange-600 shadow-2xs">
                            <FiUserX className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl p-5 flex items-center justify-between shadow-2xs">
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-rose-700 block">
                                OCR Failed
                            </span>
                            <span className="text-3xl font-extrabold text-rose-800">
                                1
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-white/80 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
                            <FiAlertTriangle className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div> */}

            {/* Recent Email Activity Main Data Table Section */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-5 space-y-4">
                {/* Header & Filter Pills */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-base sm:text-lg font-bold text-[#0B1E48]">
                        Recent Email Activity
                    </h2>

                    {/* Tabs Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { name: "All", count: 35 },
                            { name: "Invoices", count: 12 },
                            { name: "Processing", count: 0 },
                            { name: "Completed", count: 12 },
                            { name: "Failed", count: 1 },
                        ].map((tab) => {
                            const isActive = selectedTab === tab.name;
                            return (
                                <button
                                    key={tab.name}
                                    onClick={() => setSelectedTab(tab.name)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${isActive
                                        ? "bg-[#0B1E48] text-white shadow-xs"
                                        : "bg-[#F1F5F9] text-slate-600 hover:bg-slate-200/80 border border-slate-200/60"
                                        }`}
                                >
                                    <span>{tab.name}</span>
                                    <span
                                        className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${isActive
                                            ? "bg-[#1D3B82] text-white"
                                            : "bg-slate-200 text-slate-600"
                                            }`}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200/70 bg-white">
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                    EMAIL SUBJECT
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                    FROM
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                    RECEIVED ON
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                    STATUS
                                </th>
                                <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap">
                                    ACTIONS
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                            {filteredEmails.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-slate-400">
                                        No email activity found for this filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredEmails.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-slate-50/80 transition-colors"
                                    >
                                        {/* EMAIL SUBJECT with Mail Icon */}
                                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60">
                                                    <FiMail className="w-4 h-4" />
                                                </div>
                                                <span>{item.subject}</span>
                                            </div>
                                        </td>

                                        {/* FROM */}
                                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-sans">
                                            {item.from}
                                        </td>

                                        {/* RECEIVED ON */}
                                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                                            {item.receivedOn}
                                        </td>

                                        {/* STATUS */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            {item.status === "Extracted" && (
                                                <span className="bg-[#DCFCE7] text-[#16A34A] text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200/60 inline-flex items-center justify-center">
                                                    Extracted
                                                </span>
                                            )}
                                            {item.status === "Duplicate" && (
                                                <span className="bg-[#FEF3C7] text-[#D97706] text-xs font-semibold px-3 py-1 rounded-full border border-amber-200/60 inline-flex items-center justify-center">
                                                    Duplicate
                                                </span>
                                            )}
                                            {item.status === "Vendor Missing" && (
                                                <span className="bg-[#FFEDD5] text-[#EA580C] text-xs font-semibold px-3 py-1 rounded-full border border-orange-200/60 inline-flex items-center justify-center">
                                                    Vendor Missing
                                                </span>
                                            )}
                                            {item.status === "OCR Failed" && (
                                                <span className="bg-[#FFE4E6] text-[#E11D48] text-xs font-semibold px-3 py-1 rounded-full border border-rose-200/60 inline-flex items-center justify-center">
                                                    OCR Failed
                                                </span>
                                            )}
                                        </td>

                                        {/* ACTIONS */}
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            <Link
                                                href="/invoices/review-extracted"
                                                title="View Extracted Invoice Details"
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer inline-block"
                                            >
                                                <FiEye className="w-4 h-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Bottom Footer Actions matching screenshot */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
                    <button
                        onClick={() => alert("Showing all emails...")}
                        className="bg-white border-2 border-[#1A56DB] text-[#1A56DB] hover:bg-blue-50/80 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl cursor-pointer transition-colors shadow-2xs"
                    >
                        View All Emails
                    </button>

                    <Link
                        href="/invoices/review-extracted"
                        className="bg-[#1A56DB] hover:bg-[#1448C4] active:bg-[#0E3A9E] text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all shadow-xs flex items-center gap-2"
                    >
                        <span>Review Extracted Invoices (10)</span>
                    </Link>
                </div>

            </div>
        </div>
    );
}
