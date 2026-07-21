"use client";

import React from "react";
import {
    FiX,
    FiDownload,
    FiFileText,
    FiUpload,
    FiCheck,
    FiUserCheck,
    FiCheckCircle,
    FiLayers
} from "react-icons/fi";
import { LuWand } from "react-icons/lu";

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    title: string;
    type: "upload" | "ocr" | "suggested" | "manual" | "invoice" | "completed";
    details: { label: string; value: string }[];
}

export interface AuditModelProps {
    isOpen: boolean;
    onClose: () => void;
    transaction?: {
        title: string;
        reference: string;
        amount: string;
    } | null;
}

export default function AuditModel({ isOpen, onClose, transaction }: AuditModelProps) {
    if (!isOpen) return null;

    const txTitle = transaction?.title || "ABC Plumbing";
    const txRef = transaction?.reference || "CP-7854";
    const txAmount = transaction?.amount || "-$1,250.00";

    const auditHistory: AuditLogEntry[] = [
        {
            id: "log-1",
            timestamp: "Jul 15, 2026 10:15 AM",
            title: "Bank Statement Uploaded",
            type: "upload",
            details: [
                { label: "Statement", value: "June 2026 Statement.pdf" },
                { label: "By", value: "John Smith" }
            ]
        },
        {
            id: "log-2",
            timestamp: "Jul 15, 2026 10:16 AM",
            title: "OCR Completed",
            type: "ocr",
            details: [
                { label: "Extracted Amount", value: txAmount },
                { label: "Confidence", value: "98%" }
            ]
        },
        {
            id: "log-3",
            timestamp: "Jul 15, 2026 10:17 AM",
            title: "Auto Match Suggested",
            type: "suggested",
            details: [
                { label: "Matched Invoice", value: "INV-1008" },
                { label: "Reason", value: "Vendor + Amount + Date matched" }
            ]
        },
        {
            id: "log-4",
            timestamp: "Jul 15, 2026 10:18 AM",
            title: "Match Confirmed (Manual)",
            type: "manual",
            details: [
                { label: "By", value: "John Smith" },
                { label: "Status", value: "Matched" }
            ]
        },
        {
            id: "log-5",
            timestamp: "Jul 15, 2026 10:19 AM",
            title: "Invoice Updated",
            type: "invoice",
            details: [
                { label: "Status Changed", value: "Approved → Paid" }
            ]
        },
        {
            id: "log-6",
            timestamp: "Jul 15, 2026 10:20 AM",
            title: "Reconciliation Completed",
            type: "completed",
            details: [
                { label: "By", value: "John Smith" }
            ]
        }
    ];

    const getIcon = (type: AuditLogEntry["type"]) => {
        switch (type) {
            case "upload":
                return <FiUpload className="w-4 h-4 text-white" />;
            case "ocr":
                return <FiCheck className="w-4 h-4 text-white stroke-[3]" />;
            case "suggested":
                return <LuWand className="w-4 h-4 text-white" />;
            case "manual":
                return <FiUserCheck className="w-4 h-4 text-white" />;
            case "invoice":
                return <FiFileText className="w-4 h-4 text-white" />;
            case "completed":
                return <FiCheckCircle className="w-4 h-4 text-white" />;
            default:
                return <FiLayers className="w-4 h-4 text-white" />;
        }
    };

    const getIconBg = (type: AuditLogEntry["type"]) => {
        switch (type) {
            case "upload":
                return "bg-blue-600";
            case "ocr":
                return "bg-emerald-600";
            case "suggested":
                return "bg-[#0B1E48]";
            case "manual":
                return "bg-amber-500";
            case "invoice":
                return "bg-slate-700";
            case "completed":
                return "bg-indigo-600";
            default:
                return "bg-blue-600";
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                onClick={onClose}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            />

            {/* Slide-over Panel */}
            <div className="fixed inset-y-0 right-0 max-w-lg w-full bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full z-10 animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
                    <h2 className="text-xl font-bold text-[#0B1E48] tracking-tight">
                        Audit History
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Top Transaction Banner */}
                    <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 flex items-start gap-3.5">
                        <div className="p-2.5 bg-blue-100/90 text-[#0B1E48] rounded-xl flex items-center justify-center flex-shrink-0">
                            <FiFileText className="w-5 h-5 text-[#0B1E48]" />
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="font-bold text-slate-900 text-sm">
                                Transaction: {txTitle}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Reference: {txRef} &nbsp;|&nbsp; Amount: {txAmount}
                            </p>
                        </div>
                    </div>

                    {/* Timeline Container */}
                    <div className="relative pl-3 space-y-6 pt-2">
                        {/* Vertical connecting line */}
                        <div className="absolute left-6 top-5 bottom-5 w-0.5 bg-slate-200/90" />

                        {auditHistory.map((entry) => (
                            <div key={entry.id} className="relative flex items-start gap-4 group">
                                {/* Icon Node */}
                                <div className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full ${getIconBg(entry.type)} flex items-center justify-center shadow-2xs flex-shrink-0 mt-0.5`}>
                                    {getIcon(entry.type)}
                                </div>

                                {/* Content Details */}
                                <div className="space-y-1 pt-0.5 flex-1">
                                    <div className="text-xs font-semibold text-slate-400">
                                        {entry.timestamp}
                                    </div>
                                    <div className="font-bold text-slate-900 text-sm leading-snug">
                                        {entry.title}
                                    </div>
                                    <div className="space-y-0.5 pt-0.5 text-xs text-slate-600 font-normal">
                                        {entry.details.map((detail, idx) => (
                                            <div key={idx}>
                                                <span className="text-slate-500">{detail.label}:</span>{" "}
                                                <span className="font-semibold text-slate-800">{detail.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-4 flex-shrink-0">
                    <button
                        onClick={() => alert("Audit log downloaded successfully!")}
                        className="flex items-center gap-2 border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 text-blue-700 font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                    >
                        <FiDownload className="w-4 h-4 text-blue-700" />
                        <span>Download Audit Log</span>
                    </button>

                    <button
                        onClick={onClose}
                        className="border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs py-2.5 px-5 rounded-xl transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
