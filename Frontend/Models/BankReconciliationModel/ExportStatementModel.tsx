"use client";

import React, { useState } from "react";
import { FiX, FiCalendar, FiFileText, FiCheck } from "react-icons/fi";

export interface ExportStatementModelProps {
    isOpen: boolean;
    onClose: () => void;
    onExport?: (data: {
        format: string;
        sections: string[];
        dateRange: string;
    }) => void;
}

export default function ExportStatementModel({
    isOpen,
    onClose,
    onExport
}: ExportStatementModelProps) {
    const [selectedFormat, setSelectedFormat] = useState<"pdf" | "excel" | "csv">("pdf");
    const [includedSections, setIncludedSections] = useState<{ [key: string]: boolean }>({
        matched: true,
        unmatched: true,
        manuallyResolved: true,
        auditHistory: false
    });
    const [dateRange, setDateRange] = useState("Jun 01, 2026 - Jun 30, 2026");

    if (!isOpen) return null;

    const toggleSection = (key: string) => {
        setIncludedSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleExport = () => {
        if (onExport) {
            const activeSections = Object.keys(includedSections).filter(k => includedSections[k]);
            onExport({
                format: selectedFormat,
                sections: activeSections,
                dateRange
            });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                onClick={onClose}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            />

            <div className="relative z-10 w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-[#0B1E48] rounded-xl flex items-center justify-center flex-shrink-0">
                            <FiFileText className="w-5 h-5 text-[#0B1E48]" />
                        </div>
                        <h3 className="text-lg font-bold text-[#0B1E48] tracking-tight">
                            Export Reconciliation Report
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-800 tracking-wide">
                        Select format
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        <label
                            onClick={() => setSelectedFormat("pdf")}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs sm:text-sm font-semibold cursor-pointer transition-all ${selectedFormat === "pdf"
                                ? "border-blue-600 bg-blue-50/40 text-slate-900"
                                : "border-slate-200 hover:border-slate-300 text-slate-700"
                                }`}
                        >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${selectedFormat === "pdf" ? "border-blue-600 bg-blue-600" : "border-slate-300"
                                }`}>
                                {selectedFormat === "pdf" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span>PDF (Recommended)</span>
                        </label>

                        <label
                            onClick={() => setSelectedFormat("excel")}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs sm:text-sm font-semibold cursor-pointer transition-all ${selectedFormat === "excel"
                                ? "border-blue-600 bg-blue-50/40 text-slate-900"
                                : "border-slate-200 hover:border-slate-300 text-slate-700"
                                }`}
                        >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${selectedFormat === "excel" ? "border-blue-600 bg-blue-600" : "border-slate-300"
                                }`}>
                                {selectedFormat === "excel" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span>Excel (.xlsx)</span>
                        </label>

                        <label
                            onClick={() => setSelectedFormat("csv")}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs sm:text-sm font-semibold cursor-pointer transition-all ${selectedFormat === "csv"
                                ? "border-blue-600 bg-blue-50/40 text-slate-900"
                                : "border-slate-200 hover:border-slate-300 text-slate-700"
                                }`}
                        >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${selectedFormat === "csv" ? "border-blue-600 bg-blue-600" : "border-slate-300"
                                }`}>
                                {selectedFormat === "csv" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span>CSV (.csv)</span>
                        </label>
                    </div>
                </div>

                <div className="space-y-3 pt-1">
                    <label className="block text-xs font-bold text-slate-800 tracking-wide">
                        Include in report
                    </label>
                    <div className="space-y-2.5 text-xs sm:text-sm font-semibold text-slate-800">
                        <div
                            onClick={() => toggleSection("matched")}
                            className="flex items-center gap-3 cursor-pointer select-none"
                        >
                            <div className={`w-4 h-4 rounded-xs border flex items-center justify-center flex-shrink-0 transition-colors ${includedSections.matched
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-slate-300 bg-white"
                                }`}>
                                {includedSections.matched && <FiCheck className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span>Matched Transactions</span>
                        </div>

                        <div
                            onClick={() => toggleSection("unmatched")}
                            className="flex items-center gap-3 cursor-pointer select-none"
                        >
                            <div className={`w-4 h-4 rounded-xs border flex items-center justify-center flex-shrink-0 transition-colors ${includedSections.unmatched
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-slate-300 bg-white"
                                }`}>
                                {includedSections.unmatched && <FiCheck className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span>Unmatched Transactions</span>
                        </div>

                        <div
                            onClick={() => toggleSection("manuallyResolved")}
                            className="flex items-center gap-3 cursor-pointer select-none"
                        >
                            <div className={`w-4 h-4 rounded-xs border flex items-center justify-center flex-shrink-0 transition-colors ${includedSections.manuallyResolved
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-slate-300 bg-white"
                                }`}>
                                {includedSections.manuallyResolved && <FiCheck className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span>Manually Resolved Transactions</span>
                        </div>

                        <div
                            onClick={() => toggleSection("auditHistory")}
                            className="flex items-center gap-3 cursor-pointer select-none"
                        >
                            <div className={`w-4 h-4 rounded-xs border flex items-center justify-center flex-shrink-0 transition-colors ${includedSections.auditHistory
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-slate-300 bg-white"
                                }`}>
                                {includedSections.auditHistory && <FiCheck className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="text-slate-600 font-medium">Audit History</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 pt-1">
                    <label className="block text-xs font-bold text-slate-800 tracking-wide">
                        Date Range
                    </label>
                    <div className="border border-slate-300 bg-white rounded-xl p-3 flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-800 hover:border-slate-400 transition-colors cursor-pointer">
                        <div className="flex items-center gap-2.5">
                            <FiCalendar className="w-4 h-4 text-slate-600" />
                            <span>{dateRange}</span>
                        </div>
                        <FiCalendar className="w-4 h-4 text-slate-600" />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 border border-slate-300 hover:bg-slate-50 text-[#1E3A8A] font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-6 py-2.5 bg-[#0B46AD] hover:bg-[#093C96] active:bg-[#072F77] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                        Export
                    </button>
                </div>
            </div>
        </div>
    );
}
