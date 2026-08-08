"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    FiRefreshCw,
    FiCheckCircle,
    FiMail,
    FiEye,
    FiChevronRight
} from "react-icons/fi";
import { SyncEmailApi, getGmailInvoicesApi, uploadEmailDocumentsApi, getExtractionsApi } from "@/api/SyncEmail/SyncEmail";
import toast from "react-hot-toast";

interface EmailActivityItem {
    id: string;
    subject: string;
    from: string;
    receivedOn: string;
    status: "Extracted" | "Duplicate" | "Vendor Missing" | "OCR Failed" | "Processing" | "Unprocessed";
    document?: string;
    document_id?: string;
}

export default function GmailInvoice() {
    const [selectedTab, setSelectedTab] = useState<string>("All");
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [emails, setEmails] = useState<EmailActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [lastSynced, setLastSynced] = useState<string>("Jul 14, 2026 10:30 AM");

    const [gmailInvoices, setGmailInvoices] = useState<any[]>([]);

    const fetchEmails = async (isSilent: boolean = false) => {
        if (!isSilent) setIsLoading(true);
        try {
            let gmailData = gmailInvoices;
            let extractionData;

            if (isSilent) {
                extractionData = await getExtractionsApi();
            } else {
                const [gData, eData] = await Promise.all([
                    getGmailInvoicesApi(),
                    getExtractionsApi()
                ]);
                gmailData = gData || [];
                setGmailInvoices(gmailData);
                extractionData = eData;
            }

            const extractions = Array.isArray(extractionData) ? extractionData : [];

            if (Array.isArray(gmailData)) {
                const extGroups: Record<string, any[]> = {};
                extractions.forEach((ext: any) => {
                    const vendorKey = (ext.vendor_name || "").toLowerCase().trim();
                    if (!extGroups[vendorKey]) {
                        extGroups[vendorKey] = [];
                    }
                    extGroups[vendorKey].push(ext);
                });

                const vendorIngestCounts: Record<string, number> = {};

                const mapped: EmailActivityItem[] = gmailData.map((item: any, idx: number) => {
                    const dateStr = item.received_date ? new Date(item.received_date).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    }) : "—";

                    const vendorKey = (item.vendor_name || "").toLowerCase().trim();
                    const extList = extGroups[vendorKey] || [];
                    const matchIdx = vendorIngestCounts[vendorKey] || 0;
                    vendorIngestCounts[vendorKey] = matchIdx + 1;
                    const match = extList[matchIdx];

                    let status: EmailActivityItem["status"] = "Unprocessed";
                    if (match) {
                        if (match.status === "Completed" || match.status === "Approved") {
                            status = "Extracted";
                        } else if (match.status === "FAILED" || match.status === "Failed" || match.status === "Rejected") {
                            status = "OCR Failed";
                        } else {
                            status = "Processing";
                        }
                    }

                    return {
                        id: String(item.vendor_id || idx),
                        subject: item.subject || "Gmail Invoice Import",
                        from: item.from_email || "",
                        receivedOn: dateStr,
                        status: status,
                        document: item.document,
                        document_id: match?.document_id || ""
                    };
                });
                setEmails(mapped);
            }
        } catch (error) {
            console.error("Failed to fetch gmail invoices:", error);
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEmails();
    }, []);

    useEffect(() => {
        const hasProcessing = emails.some((e) => e.status === "Processing");
        if (hasProcessing) {
            const interval = setInterval(() => {
                fetchEmails(true);
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [emails]);

    const filteredEmails = emails.filter((item) => {
        if (selectedTab === "All") return true;
        if (selectedTab === "Invoices") return item.status === "Extracted";
        if (selectedTab === "Processing") return item.status === "Processing";
        if (selectedTab === "Completed") return item.status === "Extracted";
        if (selectedTab === "Failed") return item.status === "OCR Failed" || item.status === "Vendor Missing";
        return true;
    });

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const data = await SyncEmailApi();
            toast.success(
                `Sync completed! Scanned ${data?.messages_found ?? 0} messages, processed ${data?.new_processed ?? 0} new files.`
            );
            const now = new Date();
            setLastSynced(now.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            }));

            setIsLoading(true);
            const [gmailInvoices, existingExtractions] = await Promise.all([
                getGmailInvoicesApi(),
                getExtractionsApi()
            ]);

            const extractions = Array.isArray(existingExtractions) ? existingExtractions : [];

            if (Array.isArray(gmailInvoices) && gmailInvoices.length > 0) {
                const extGroups: Record<string, any[]> = {};
                extractions.forEach((ext: any) => {
                    const vendorKey = (ext.vendor_name || "").toLowerCase().trim();
                    if (!extGroups[vendorKey]) {
                        extGroups[vendorKey] = [];
                    }
                    extGroups[vendorKey].push(ext);
                });

                const vendorIngestCounts: Record<string, number> = {};
                const newlyListed = gmailInvoices.filter((item: any) => {
                    const vendorKey = (item.vendor_name || "").toLowerCase().trim();
                    const extList = extGroups[vendorKey] || [];
                    const matchIdx = vendorIngestCounts[vendorKey] || 0;
                    vendorIngestCounts[vendorKey] = matchIdx + 1;

                    const match = extList[matchIdx];
                    return !match;
                });

                console.log(newlyListed, 'newlyListed', extGroups)

                if (newlyListed.length > 0) {
                    const docsToUpload = newlyListed.map((item: any) => ({
                        doc_type: item.doc_type,
                        vendor_id: item.vendor_id || null,
                        vendor_name: item.vendor_name || null,
                        document: item.document
                    }));

                    toast.loading("Triggering extraction for new documents...", { id: "trigger-extraction" });
                    await uploadEmailDocumentsApi({ documents: docsToUpload });
                    toast.success("Extraction triggered successfully!", { id: "trigger-extraction" });
                } else {
                    toast.success("All invoices are already up to date.");
                }

                await fetchEmails();
            } else {
                setEmails([]);
            }
        } catch (error: any) {
            const errMsg = error?.response?.data?.detail || error?.message || "An error occurred during sync.";
            toast.error(`Sync failed: ${errMsg}`, { id: "trigger-extraction" });
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-6 font-sans text-slate-800 pb-12">
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

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="bg-[#0B1E48] hover:bg-[#132B68] active:bg-[#071330] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all border border-[#132B68] whitespace-nowrap"
                        >
                            <FiRefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                            <span>{isSyncing ? "Syncing..." : "Sync Gmail"}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        LAST SYNCED
                    </span>
                    <div className="text-xl font-bold text-slate-900 tracking-tight">
                        {lastSynced.split(" ")[0]} {lastSynced.split(" ")[1]} {lastSynced.split(" ")[2]}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                        <FiCheckCircle className="w-3.5 h-3.5" />
                        <span>{lastSynced.split(" ").slice(3).join(" ")} (Success)</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        EMAILS SCANNED
                    </span>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">
                        {emails.length}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                        This sync
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        INVOICES FOUND
                    </span>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight">
                        {emails.filter(e => e.status === "Extracted").length}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                        Attachments detected
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        PROCESSING STATUS
                    </span>
                    <div className="text-xl font-bold text-emerald-600 tracking-tight">
                        {isSyncing ? "Processing..." : "Completed"}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                        OCR extraction finished
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-base sm:text-lg font-bold text-[#0B1E48]">
                        Recent Email Activity
                    </h2>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { name: "All", count: emails.length },
                            { name: "Invoices", count: emails.filter(e => e.status === "Extracted").length },
                            { name: "Processing", count: emails.filter(e => e.status === "Processing").length },
                            { name: "Completed", count: emails.filter(e => e.status === "Extracted").length },
                            { name: "Failed", count: emails.filter(e => e.status === "OCR Failed" || e.status === "Vendor Missing").length },
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
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-slate-400">
                                        Loading activity...
                                    </td>
                                </tr>
                            ) : filteredEmails.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-slate-400">
                                        No email activity found for this filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredEmails.map((item, ind: number) => (
                                    <tr
                                        key={ind}
                                        className="hover:bg-slate-50/80 transition-colors"
                                    >
                                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60">
                                                    <FiMail className="w-4 h-4" />
                                                </div>
                                                <span>{item.subject}</span>
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-sans">
                                            {item.from}
                                        </td>

                                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                                            {item.receivedOn}
                                        </td>

                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            {item.status === "Extracted" && (
                                                <span className="bg-[#DCFCE7] text-[#16A34A] text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200/60 inline-flex items-center justify-center">
                                                    Extracted
                                                </span>
                                            )}
                                            {item.status === "Processing" && (
                                                <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200/60 inline-flex items-center justify-center animate-pulse">
                                                    Processing
                                                </span>
                                            )}
                                            {item.status === "Unprocessed" && (
                                                <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1 rounded-full border border-slate-200 inline-flex items-center justify-center">
                                                    Unprocessed
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

                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            {item.document_id ? (
                                                <Link
                                                    href={`/invoices/review-extracted?id=${item.document_id}`}
                                                    title="View Extracted Invoice Details"
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer inline-block"
                                                >
                                                    <FiEye className="w-4 h-4" />
                                                </Link>
                                            ) : (
                                                <span
                                                    title="Not yet extracted"
                                                    className="p-1.5 rounded-lg text-slate-300 cursor-not-allowed inline-block"
                                                >
                                                    <FiEye className="w-4 h-4" />
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
                    <button
                        onClick={() => fetchEmails()}
                        className="bg-white border-2 border-[#1A56DB] text-[#1A56DB] hover:bg-blue-50/80 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl cursor-pointer transition-colors shadow-2xs"
                    >
                        Refresh List
                    </button>

                    <Link
                        href={`/invoices/review-extracted?id=${filteredEmails[0]?.document_id}`}
                        className="bg-[#1A56DB] hover:bg-[#1448C4] active:bg-[#0E3A9E] text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all shadow-xs flex items-center gap-2"
                    >
                        <span>Review Extracted Invoices ({emails.filter(e => e.status === "Extracted").length})</span>
                    </Link>
                </div>

            </div>
        </div>
    );
}
