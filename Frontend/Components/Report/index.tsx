"use client";

import React, { useEffect, useState } from "react";
import {
    getAvailableReportsApi,
    getReportPreviewApi,
    generatePdfReportApi,
    generateCsvReportApi
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

export default function Report() {
    const [reportType, setReportType] = useState("Monthly Financial Summary");
    const [period, setPeriod] = useState("2026-06");
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isExportingCsv, setIsExportingCsv] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [previewCache, setPreviewCache] = useState<Record<string, any>>({});

    const [availableReports, setAvailableReports] = useState<ReportItem[]>([
        { id: 1, name: "May 2026 Monthly Report", date: "Jul 14, 2026", status: "READY", report_type: "Monthly Financial Summary", period: "2026-05" },
        { id: 2, name: "Q1 2026 Quarterly Report", date: "Apr 12, 2026", status: "READY", report_type: "Annual Budget Report", period: "2026-03" },
    ]);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const list = await getAvailableReportsApi();
                if (list && Array.isArray(list) && list.length > 0) {
                    const formatted = list.map((item: any) => ({
                        id: item.id,
                        name: `${item.report_type} (${item.period})`,
                        date: new Date(item.created_at || Date.now()).toLocaleDateString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric"
                        }),
                        status: item.status?.toUpperCase() || "READY",
                        report_type: item.report_type,
                        period: item.period,
                        file_url: item.file_url
                    }));
                    setAvailableReports(formatted);
                }
            } catch (err) {
                console.error(err);
            }
        };

        fetchReports();
    }, []);

    useEffect(() => {
        if (isPreviewing) {
            const cacheKey = `${reportType}_${period}`;
            if (previewCache[cacheKey]) {
                setPreviewData(previewCache[cacheKey]);
                return;
            }
            const fetchPreview = async () => {
                try {
                    const data = await getReportPreviewApi(reportType, period);
                    setPreviewData(data);
                    setPreviewCache((prev) => ({ ...prev, [cacheKey]: data }));
                } catch (err) {
                    console.error(err);
                }
            };
            fetchPreview();
        }
    }, [isPreviewing, reportType, period, previewCache]);

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

    const handleGeneratePdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const user = getUser();
            const pdfBlob = await generatePdfReportApi(reportType, period, user?.id);
            const safeName = `${reportType}_${period}`.replace(/[^a-zA-Z0-9_\-]/g, "_");
            const filename = `${safeName}.pdf`;
            downloadBlob(new Blob([pdfBlob], { type: "application/pdf" }), filename);

            const newReport: ReportItem = {
                id: Date.now(),
                name: `${reportType} (${period})`,
                date: new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                }),
                status: "READY",
                report_type: reportType,
                period: period
            };
            setAvailableReports([newReport, ...availableReports]);
            setPreviewCache((prev) => {
                const copy = { ...prev };
                delete copy[`${reportType}_${period}`];
                return copy;
            });
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
        } catch (err) {
            console.error(err);
        } finally {
            setIsExportingCsv(false);
        }
    };

    const handleDeleteReportItem = (id: number) => {
        setAvailableReports((prev) => prev.filter((item) => item.id !== id));
    };

    const handleDownloadPdfItem = async (report: ReportItem) => {
        const rType = report.report_type || reportType;
        const rPeriod = report.period || period;
        try {
            const user = getUser();
            const pdfBlob = await generatePdfReportApi(rType, rPeriod, user?.id);
            const safeName = report.name.replace(/[^a-zA-Z0-9_\-]/g, "_");
            const filename = `${safeName}.pdf`;
            downloadBlob(new Blob([pdfBlob], { type: "application/pdf" }), filename);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDownloadCsvItem = async (report: ReportItem) => {
        const rType = report.report_type || reportType;
        const rPeriod = report.period || period;
        try {
            const csvBlob = await generateCsvReportApi(rType, rPeriod);
            const safeName = report.name.replace(/[^a-zA-Z0-9_\-]/g, "_");
            const filename = `${safeName}.csv`;
            downloadBlob(new Blob([csvBlob], { type: "text/csv" }), filename);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
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
                                            setReportType(e.target.value);
                                            setIsPreviewing(false);
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
                                            setPeriod(e.target.value);
                                            setIsPreviewing(false);
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

                            <button
                                onClick={() => setIsPreviewing(!isPreviewing)}
                                className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all cursor-pointer"
                            >
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
                                        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                                    />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                </svg>
                                {isPreviewing ? "Hide Preview" : "Preview"}
                            </button>
                        </div>

                        <div className="relative min-h-[220px] rounded-2xl border-2 border-dashed border-slate-200/80 bg-slate-50/30 flex items-center justify-center p-6 overflow-hidden">
                            {isPreviewing ? (
                                <div className="w-full space-y-4 animate-fade-in">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                                        <span className="font-bold text-slate-800 text-sm">
                                            {reportType} ({period})
                                        </span>
                                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded">
                                            DRAFT VIEW
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
                                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                            <span className="text-slate-400 block text-[9px]">TOTAL INCOME</span>
                                            <span className="text-base text-slate-800 font-bold mt-1 block">
                                                ${previewData?.total_income !== undefined ? Number(previewData.total_income).toLocaleString() : "0.00"}
                                            </span>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                            <span className="text-slate-400 block text-[9px]">TOTAL EXPENSE</span>
                                            <span className="text-base text-slate-800 font-bold mt-1 block">
                                                ${previewData?.total_expense !== undefined ? Number(previewData.total_expense).toLocaleString() : "0.00"}
                                            </span>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                            <span className="text-slate-400 block text-[9px]">NET CHANGE</span>
                                            <span className="text-base text-[#1A56DB] font-bold mt-1 block">
                                                ${previewData?.net_change !== undefined ? Number(previewData.net_change).toLocaleString() : "0.00"}
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
                                            <span className="uppercase tracking-wider">Financial Overview ({period})</span>
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
                                                    label: "Total Income",
                                                    value: previewData?.total_income !== undefined ? Number(previewData.total_income) : 0,
                                                    color: "bg-[#1A56DB]",
                                                    hoverColor: "hover:bg-blue-700",
                                                },
                                                {
                                                    label: "Total Expense",
                                                    value: previewData?.total_expense !== undefined ? Number(previewData.total_expense) : 0,
                                                    color: "bg-[#00BA9D]",
                                                    hoverColor: "hover:bg-teal-600",
                                                },
                                                {
                                                    label: "Net Change",
                                                    value: previewData?.net_change !== undefined ? Number(previewData.net_change) : 0,
                                                    color: "bg-indigo-600",
                                                    hoverColor: "hover:bg-indigo-700",
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
                                                        <span className="text-[10px] font-bold text-slate-600 mt-2 text-center">
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
                                        Configure your report and click generate to see a visual breakdown of your financial data here.
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
                                        className="cursor-pointer p-3 bg-white border border-slate-200/60 rounded-xl hover:shadow-sm hover:border-slate-300/80 transition-all flex flex-col gap-2"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-800 leading-tight">
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
                                                {/* <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteReportItem(report.id); }}
                                                    className="text-slate-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                                                    title="Delete report"
                                                >
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
                                                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                                        />
                                                    </svg>
                                                </button> */}
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