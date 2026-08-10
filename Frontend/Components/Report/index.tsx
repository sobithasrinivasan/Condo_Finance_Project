"use client";

import React, { startTransition, useEffect, useState } from "react";
import {
    getAvailableReportsApi,
    getReportPreviewApi,
    generatePdfReportApi,
    generateCsvReportApi,
    deleteReportApi
} from "@/api/Reports/ReportsApi";
import { getUser } from "@/lib/localStore";

interface ReportItem {
    id: number;
    name: string;
    date: string;
    status: "READY" | "GENERATING";
    report_type?: string;
    period?: string;
    file_url?: string;
}

interface AvailableReportApiItem {
    id: number;
    report_type: string;
    report_name?: string;
    period: string;
    status?: string;
    file_url?: string;
    created_at?: string;
}

interface PreviewData {
    report_type: string;
    period: string;
    total_income: number | string;
    total_expense: number | string;
    net_change: number | string;
    ai_summary?: string | null;
}

const MONTH_NAMES: Record<string, string> = {
    "01": "January",
    "02": "February",
    "03": "March",
    "04": "April",
    "05": "May",
    "06": "June",
    "07": "July",
    "08": "August",
    "09": "September",
    "10": "October",
    "11": "November",
    "12": "December",
};

const LOADING_MESSAGES = [
    "Calculating financials...",
    "Crunching up the numbers...",
    "Gathering AI executive insights...",
    "Drafting executive summary...",
    "Finalizing report visualization...",
];

const formatPeriodToMonthYear = (periodStr: string): string => {
    if (!periodStr) {
        return "";
    }
    const parts = periodStr.split("-");
    if (parts.length === 2 && MONTH_NAMES[parts[1]]) {
        return `${MONTH_NAMES[parts[1]]} ${parts[0]}`;
    }
    return periodStr;
};

const formatTimestampDDMMYYYY = (dateStr?: string): string => {
    if (!dateStr) {
        return "";
    }
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) {
        return "";
    }

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${day}/${month}/${year}, ${hours}:${minutes}`;
};

export default function Report() {
    const [reportType, setReportType] = useState("Monthly Financial Summary");
    const [period, setPeriod] = useState("2026-06");
    const [isPreviewing, setIsPreviewing] = useState(true);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isSelectingFromAvailable, setIsSelectingFromAvailable] = useState(false);
    const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isExportingCsv, setIsExportingCsv] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [previewCache, setPreviewCache] = useState<Record<string, PreviewData>>({});

    const [availableReports, setAvailableReports] = useState<ReportItem[]>([]);

    // Cycling random loading message effect (1.5s per message while loading)
    useEffect(() => {
        if (!isLoadingPreview) {
            return;
        }

        const interval = setInterval(() => {
            setLoadingMsgIdx((prev) => {
                let next = Math.floor(Math.random() * LOADING_MESSAGES.length);
                while (next === prev && LOADING_MESSAGES.length > 1) {
                    next = Math.floor(Math.random() * LOADING_MESSAGES.length);
                }
                return next;
            });
        }, 1500);

        return () => clearInterval(interval);
    }, [isLoadingPreview]);

    const formatAvailableReports = (list: AvailableReportApiItem[]): ReportItem[] => {
        return list.map((item) => {
            let rawType = item.report_type || "Financial Report";
            rawType = rawType.replace(/\s*\([\w\s-]+\)\s*/g, "").trim();

            const periodStr = item.period || "";
            const monthYear = formatPeriodToMonthYear(periodStr);
            const displayName = monthYear ? `${rawType} (${monthYear})` : rawType;

            return {
                id: item.id,
                name: displayName,
                date: formatTimestampDDMMYYYY(item.created_at),
                status: item.status?.toUpperCase() === "GENERATING" ? "GENERATING" : "READY",
                report_type: rawType,
                period: periodStr,
                file_url: item.file_url
            };
        });
    };

    const refreshReports = async () => {
        try {
            const list = await getAvailableReportsApi();
            const formatted = Array.isArray(list)
                ? formatAvailableReports(list as AvailableReportApiItem[])
                : [];
            startTransition(() => {
                setAvailableReports(formatted);
            });
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const loadReports = async () => {
            try {
                const list = await getAvailableReportsApi();
                if (!isMounted) {
                    return;
                }

                const formatted = Array.isArray(list)
                    ? formatAvailableReports(list as AvailableReportApiItem[])
                    : [];

                startTransition(() => {
                    setAvailableReports(formatted);
                });
            } catch (err) {
                console.error(err);
            }
        };

        void loadReports();

        return () => {
            isMounted = false;
        };
    }, []);

    // Auto-fetch preview: Instant for Available Reports selection, 2s equalizer animation for new dropdown selections
    useEffect(() => {
        if (!isPreviewing) {
            return;
        }

        let isMounted = true;
        const cacheKey = `${reportType}_${period}`;

        // INSTANT preview update when selecting from Available Reports sidebar
        if (isSelectingFromAvailable) {
            const fetchInstant = async () => {
                try {
                    let data = previewCache[cacheKey];
                    if (!data) {
                        data = (await getReportPreviewApi(reportType, period)) as PreviewData;
                    }
                    if (!isMounted) return;
                    startTransition(() => {
                        setPreviewData(data);
                        setPreviewCache((prev) => ({ ...prev, [cacheKey]: data }));
                        setIsLoadingPreview(false);
                        setIsSelectingFromAvailable(false);
                    });
                } catch (err) {
                    console.error(err);
                    if (isMounted) {
                        setIsLoadingPreview(false);
                        setIsSelectingFromAvailable(false);
                    }
                }
            };
            void fetchInstant();
            return;
        }

        // LOADING equalizer animation for NEW dropdown selections
        setIsLoadingPreview(true);
        setLoadingMsgIdx(Math.floor(Math.random() * LOADING_MESSAGES.length));

        const startTime = Date.now();

        const fetchWithLoading = async () => {
            try {
                let data = previewCache[cacheKey];
                if (!data) {
                    data = (await getReportPreviewApi(reportType, period)) as PreviewData;
                }

                const elapsed = Date.now() - startTime;
                const minDelay = 2000; // Minimum 2s calm loading screen
                const remainingDelay = Math.max(0, minDelay - elapsed);

                setTimeout(async () => {
                    if (!isMounted) return;
                    startTransition(() => {
                        setPreviewData(data);
                        setPreviewCache((prev) => ({ ...prev, [cacheKey]: data }));
                        setIsLoadingPreview(false);
                    });
                    await refreshReports();
                }, remainingDelay);
            } catch (err) {
                console.error(err);
                if (isMounted) {
                    setIsLoadingPreview(false);
                }
            }
        };

        void fetchWithLoading();

        return () => {
            isMounted = false;
        };
    }, [isPreviewing, reportType, period]);

    const downloadBlob = (data: Blob, filename: string) => {
        const url = window.URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const handleSelectAvailableReport = (report: ReportItem) => {
        let cleanType = report.report_type || reportType;
        cleanType = cleanType.replace(/\s*\([\w\s-]+\)\s*/g, "").trim();

        setIsSelectingFromAvailable(true);
        setReportType(cleanType);
        if (report.period) {
            setPeriod(report.period);
        }
        setIsPreviewing(true);
    };

    const handleGeneratePdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const user = getUser();
            const pdfBlob = await generatePdfReportApi(reportType, period, user?.id);
            const safeName = `${reportType}_${period}`.replace(/[^a-zA-Z0-9_\-]/g, "_");
            const filename = `${safeName}.pdf`;
            downloadBlob(new Blob([pdfBlob], { type: "application/pdf" }), filename);
            setPreviewCache((prev) => {
                const copy = { ...prev };
                delete copy[`${reportType}_${period}`];
                return copy;
            });
            await refreshReports();
        } catch (err) {
            console.error(err);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleExportCsv = async () => {
        setIsExportingCsv(true);
        try {
            const csvBlob = await generateCsvReportApi(reportType, period);
            const safeName = `${reportType}_${period}`.replace(/[^a-zA-Z0-9_\-]/g, "_");
            const filename = `${safeName}.csv`;
            downloadBlob(new Blob([csvBlob], { type: "text/csv" }), filename);
            setPreviewCache((prev) => {
                const copy = { ...prev };
                delete copy[`${reportType}_${period}`];
                return copy;
            });
            await refreshReports();
        } catch (err) {
            console.error(err);
        } finally {
            setIsExportingCsv(false);
        }
    };

    const handleDownloadPdfItem = async (report: ReportItem) => {
        let cleanType = report.report_type || reportType;
        cleanType = cleanType.replace(/\s*\([\w\s-]+\)\s*/g, "").trim();
        const rPeriod = report.period || period;
        try {
            const user = getUser();
            const pdfBlob = await generatePdfReportApi(cleanType, rPeriod, user?.id);
            const safeName = `${cleanType}_${rPeriod}`.replace(/[^a-zA-Z0-9_\-]/g, "_");
            const filename = `${safeName}.pdf`;
            downloadBlob(new Blob([pdfBlob], { type: "application/pdf" }), filename);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDownloadCsvItem = async (report: ReportItem) => {
        let cleanType = report.report_type || reportType;
        cleanType = cleanType.replace(/\s*\([\w\s-]+\)\s*/g, "").trim();
        const rPeriod = report.period || period;
        try {
            const csvBlob = await generateCsvReportApi(cleanType, rPeriod);
            const safeName = `${cleanType}_${rPeriod}`.replace(/[^a-zA-Z0-9_\-]/g, "_");
            const filename = `${safeName}.csv`;
            downloadBlob(new Blob([csvBlob], { type: "text/csv" }), filename);
        } catch (err) {
            console.error(err);
        }
    };

    const netChangeVal = previewData?.net_change !== undefined ? Number(previewData.net_change) : 0;
    const netChangeColorClass =
        netChangeVal < 0
            ? "text-red-600"
            : netChangeVal > 0
            ? "text-emerald-600"
            : "text-[#1A56DB]";

    const getNetChangeBarColors = (val: number) => {
        if (val < 0) return { color: "bg-red-600", hoverColor: "hover:bg-red-700" };
        if (val > 0) return { color: "bg-emerald-600", hoverColor: "hover:bg-emerald-700" };
        return { color: "bg-[#1A56DB]", hoverColor: "hover:bg-blue-700" };
    };

    const getMetricLabels = (rType: string) => {
        const clean = rType.split("(")[0].trim().toLowerCase();
        if (clean.includes("delinquency") || clean.includes("delinquent")) {
            return { income: "EXPECTED DUES", expense: "OVERDUE DUES", net: "COLLECTED DUES" };
        }
        if (clean.includes("reserve")) {
            return { income: "RESERVE BALANCE", expense: "CAPITAL EXPENSES", net: "RESERVE NET POSITION" };
        }
        if (clean.includes("annual") || clean.includes("budget")) {
            return { income: "YTD REVENUE", expense: "YTD EXPENSES", net: "ANNUAL VARIANCE" };
        }
        return { income: "TOTAL INCOME", expense: "TOTAL EXPENSE", net: "NET CHANGE" };
    };

    const labels = getMetricLabels(reportType);

    return (
        <div className="space-y-6">
            <style jsx>{`
                @keyframes barGlide {
                    0%, 100% { height: 14px; }
                    50% { height: 42px; }
                }
                .bar-anim-1 { animation: barGlide 1.1s ease-in-out infinite 0ms; }
                .bar-anim-2 { animation: barGlide 1.1s ease-in-out infinite 280ms; }
                .bar-anim-3 { animation: barGlide 1.1s ease-in-out infinite 560ms; }
            `}</style>

            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                    Report
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                    Generate, view, and export financial and administrative reports for the condo association.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#1A56DB]/10 flex items-center justify-center text-[#1A56DB] flex-shrink-0">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
                                    stroke="currentColor"
                                    className="w-4 h-4"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.625c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0 1 3 18.75v-5.625ZM18 14.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v4.625c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0 1 18 18.75v-4.625ZM10.5 7.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.625c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V7.125Z"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                                Report Configuration
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Select Report Type
                                </label>
                                <div className="relative">
                                    <select
                                        value={reportType}
                                        onChange={(e) => {
                                            setIsSelectingFromAvailable(false);
                                            setReportType(e.target.value);
                                            setIsPreviewing(true);
                                        }}
                                        className="w-full bg-white text-slate-700 text-xs rounded-xl border border-slate-200 px-4 py-3 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium cursor-pointer"
                                    >
                                        <option value="Monthly Financial Summary">Monthly Financial Summary</option>
                                        <option value="Annual Budget Report">Annual Budget Report</option>
                                        <option value="Reserve Fund Analysis">Reserve Fund Analysis</option>
                                        <option value="Delinquency Report">Delinquency Report</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="2"
                                            stroke="currentColor"
                                            className="w-4 h-4"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="m19.5 8.25-7.5 7.5-7.5-7.5"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Select Period
                                </label>
                                <div className="relative">
                                    <select
                                        value={period}
                                        onChange={(e) => {
                                            setIsSelectingFromAvailable(false);
                                            setPeriod(e.target.value);
                                            setIsPreviewing(true);
                                        }}
                                        className="w-full bg-white text-slate-700 text-xs rounded-xl border border-slate-200 px-4 py-3 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium cursor-pointer"
                                    >
                                        <option value="2026-06">2026-06 (June 2026)</option>
                                        <option value="2026-05">2026-05 (May 2026)</option>
                                        <option value="2026-04">2026-04 (April 2026)</option>
                                        <option value="2026-03">2026-03 (March 2026)</option>
                                        <option value="2026-02">2026-02 (February 2026)</option>
                                        <option value="2026-01">2026-01 (January 2026)</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="1.8"
                                            stroke="currentColor"
                                            className="w-4 h-4"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleGeneratePdf}
                                disabled={isGeneratingPdf}
                                className="flex items-center gap-2 bg-[#1A56DB] hover:bg-[#1448C4] active:bg-[#0E3A9E] text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGeneratingPdf ? (
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2"
                                        stroke="currentColor"
                                        className="w-3.5 h-3.5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                                        />
                                    </svg>
                                )}
                                Generate PDF
                            </button>

                            <button
                                onClick={handleExportCsv}
                                disabled={isExportingCsv}
                                className="flex items-center gap-2 bg-[#065F46] hover:bg-[#047857] text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                            >
                                {isExportingCsv ? (
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2"
                                        stroke="currentColor"
                                        className="w-3.5 h-3.5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75c.621 0 1.125.504 1.125 1.125v12.75c0 .621-.504 1.125-1.125 1.125H5.625c-.621 0-1.125-.504-1.125-1.125V5.625c0-.621.504-1.125 1.125-1.125Z"
                                        />
                                    </svg>
                                )}
                                Export CSV
                            </button>
                        </div>

                        <div className="relative min-h-[260px] rounded-2xl border-2 border-dashed border-slate-200/80 bg-slate-50/30 flex items-center justify-center p-6 overflow-hidden">
                            {isLoadingPreview ? (
                                <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-fade-in">
                                    {/* 3 Animated Blue Bars (Equalizer Wave) */}
                                    <div className="flex items-end justify-center gap-2.5 h-12">
                                        <span className="w-2.5 bg-[#1A56DB] rounded-full bar-anim-1 shadow-sm" />
                                        <span className="w-2.5 bg-[#1A56DB] rounded-full bar-anim-2 shadow-sm" />
                                        <span className="w-2.5 bg-[#1A56DB] rounded-full bar-anim-3 shadow-sm" />
                                    </div>

                                    {/* Calm Cursive / Italic Cycling Messages */}
                                    <p className="font-serif italic text-sm text-[#1A56DB] font-medium tracking-wide transition-all duration-500 animate-pulse">
                                        "{LOADING_MESSAGES[loadingMsgIdx]}"
                                    </p>
                                </div>
                            ) : isPreviewing && previewData ? (
                                <div className="w-full space-y-4 animate-fade-in">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                                        <span className="font-bold text-slate-800 text-sm">
                                            {reportType} ({formatPeriodToMonthYear(period)})
                                        </span>
                                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded">
                                            LIVE VIEW
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
                                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                            <span className="text-slate-400 block text-[9px] uppercase">{labels.income}</span>
                                            <span className="text-base text-slate-800 font-bold mt-1 block">
                                                ${previewData?.total_income !== undefined ? Number(previewData.total_income).toLocaleString() : "0.00"}
                                            </span>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                            <span className="text-slate-400 block text-[9px] uppercase">{labels.expense}</span>
                                            <span className="text-base text-slate-800 font-bold mt-1 block">
                                                ${previewData?.total_expense !== undefined ? Number(previewData.total_expense).toLocaleString() : "0.00"}
                                            </span>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                            <span className="text-slate-400 block text-[9px] uppercase">{labels.net}</span>
                                            <span className={`text-base font-bold mt-1 block ${netChangeColorClass}`}>
                                                ${netChangeVal < 0 ? `-${Math.abs(netChangeVal).toLocaleString()}` : netChangeVal.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    {previewData?.ai_summary && (
                                        <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-4 rounded-xl border border-blue-100 shadow-sm">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                                                    Financial Executive Story
                                                </h4>
                                            </div>
                                            <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                                {previewData.ai_summary}
                                            </p>
                                        </div>
                                    )}
                                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                                            <span className="uppercase tracking-wider">Financial Overview ({formatPeriodToMonthYear(period)})</span>
                                            <span className="text-[10px] text-slate-400 font-semibold">Hover bars for values</span>
                                        </div>

                                        <div className="h-44 flex items-end justify-around gap-6 pt-6 pb-2 border-b border-slate-200 relative">
                                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                                                <div className="border-b border-dashed border-slate-400 w-full" />
                                                <div className="border-b border-dashed border-slate-400 w-full" />
                                                <div className="border-b border-dashed border-slate-400 w-full" />
                                                <div className="border-b border-dashed border-slate-400 w-full" />
                                            </div>

                                            {[
                                                {
                                                    label: labels.income,
                                                    value: previewData?.total_income !== undefined ? Number(previewData.total_income) : 0,
                                                    color: "bg-[#1A56DB]",
                                                    hoverColor: "hover:bg-blue-700",
                                                },
                                                {
                                                    label: labels.expense,
                                                    value: previewData?.total_expense !== undefined ? Number(previewData.total_expense) : 0,
                                                    color: "bg-[#00BA9D]",
                                                    hoverColor: "hover:bg-teal-600",
                                                },
                                                {
                                                    label: labels.net,
                                                    value: netChangeVal,
                                                    ...getNetChangeBarColors(netChangeVal),
                                                },
                                            ].map((bar, idx) => {
                                                const maxValue = Math.max(
                                                    Math.abs(Number(previewData?.total_income || 0)),
                                                    Math.abs(Number(previewData?.total_expense || 0)),
                                                    Math.abs(Number(previewData?.net_change || 0)),
                                                    100
                                                );
                                                const heightPercent = Math.min(Math.max((Math.abs(bar.value) / maxValue) * 100, 4), 100);

                                                return (
                                                    <div key={idx} className="group relative flex flex-col items-center h-full justify-end flex-1 z-10">
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-20">
                                                            ${bar.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </div>
                                                        <div
                                                            className={`w-12 rounded-t-lg ${bar.color} ${bar.hoverColor} transition-all duration-700 ease-out shadow-sm cursor-pointer`}
                                                            style={{ height: `${heightPercent}%` }}
                                                        />
                                                        <span className="text-[10px] font-bold text-slate-600 mt-2 text-center truncate max-w-[100px]">
                                                            {bar.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center max-w-xs space-y-1.5">
                                    <span className="block font-bold text-slate-700 text-xs">
                                        Data Visualization Preview
                                    </span>
                                    <span className="block text-[10px] text-slate-400 leading-normal">
                                        Select any report configuration to automatically update your live financial breakdown.
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[350px]">
                        <div>
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                    Available Reports
                                </h3>
                            </div>

                            <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                                {availableReports.map((report) => (
                                    <div
                                        key={report.id}
                                        onClick={() => handleSelectAvailableReport(report)}
                                        className="cursor-pointer p-3 bg-white border border-slate-200/60 rounded-xl hover:shadow-md hover:border-blue-400 transition-all flex flex-col gap-2 group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">
                                                    {report.name}
                                                </h4>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1">
                                                    Generated {report.date}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded leading-none">
                                                    {report.status}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 text-[10px] font-bold text-blue-600 pt-0.5 border-t border-slate-50 mt-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDownloadPdfItem(report); }}
                                                className="flex items-center gap-1 hover:text-blue-800 cursor-pointer"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    strokeWidth="2.5"
                                                    stroke="currentColor"
                                                    className="w-3 h-3"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                                                    />
                                                </svg>
                                                PDF
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDownloadCsvItem(report); }}
                                                className="flex items-center gap-1 hover:text-blue-800 cursor-pointer"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    strokeWidth="2.5"
                                                    stroke="currentColor"
                                                    className="w-3 h-3"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                                                    />
                                                </svg>
                                                CSV
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
