"use client";

import React, { useState } from "react";

interface ReportItem {
    id: number;
    name: string;
    date: string;
    status: "READY" | "GENERATING";
}

export default function Report() {
    const [reportType, setReportType] = useState("Monthly Financial Summary");
    const [period, setPeriod] = useState("June 2026");
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isExportingCsv, setIsExportingCsv] = useState(false);

    const [availableReports, setAvailableReports] = useState<ReportItem[]>([
        { id: 1, name: "May 2026 Monthly Report", date: "Jul 14, 2026", status: "READY" },
        { id: 2, name: "Q1 2026 Quarterly Report", date: "Apr 12, 2026", status: "READY" },
        { id: 3, name: "April 2026 Monthly Report", date: "May 05, 2026", status: "READY" },
        { id: 4, name: "Annual Audit 2025", date: "Jan 20, 2026", status: "READY" },
    ]);

    const handleGeneratePdf = () => {
        setIsGeneratingPdf(true);
        setTimeout(() => {
            setIsGeneratingPdf(false);
            const newReport: ReportItem = {
                id: Date.now(),
                name: `${reportType} (${period})`,
                date: new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                }),
                status: "READY",
            };
            setAvailableReports([newReport, ...availableReports]);
            alert("PDF report generated and added to Available Reports!");
        }, 1200);
    };

    const handleExportCsv = () => {
        setIsExportingCsv(true);
        setTimeout(() => {
            setIsExportingCsv(false);
            alert("CSV data exported successfully!");
        }, 1000);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                    Report
                </h1>        <p className="text-xs text-slate-400 mt-1">
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
                                        <option value="June 2026">June 2026</option>
                                        <option value="May 2026">May 2026</option>
                                        <option value="April 2026">April 2026</option>
                                        <option value="Q1 2026">Q1 2026</option>
                                        <option value="Full Year 2025">Full Year 2025</option>
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
                                            <span className="text-slate-400 block text-[9px]">INCOME YTD</span>
                                            <span className="text-base text-slate-800 font-bold mt-1 block">$24,500.00</span>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                            <span className="text-slate-400 block text-[9px]">EXPENSES YTD</span>
                                            <span className="text-base text-slate-800 font-bold mt-1 block">$17,124.00</span>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                            <span className="text-slate-400 block text-[9px]">NET RESERVES</span>
                                            <span className="text-base text-[#1A56DB] font-bold mt-1 block">$7,376.00</span>
                                        </div>
                                    </div>
                                    <div className="h-28 bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-end justify-between gap-1.5">
                                        <div className="bg-[#1A56DB] w-full rounded-t" style={{ height: "60%" }} />
                                        <div className="bg-[#00BA9D] w-full rounded-t" style={{ height: "45%" }} />
                                        <div className="bg-[#1A56DB] w-full rounded-t" style={{ height: "80%" }} />
                                        <div className="bg-[#00BA9D] w-full rounded-t" style={{ height: "55%" }} />
                                        <div className="bg-[#1A56DB] w-full rounded-t" style={{ height: "70%" }} />
                                        <div className="bg-[#00BA9D] w-full rounded-t" style={{ height: "35%" }} />
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
                                <a
                                    href="#"
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 tracking-wide"
                                >
                                    View All
                                </a>
                            </div>

                            <div className="space-y-3.5">
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
                                            <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded leading-none">
                                                {report.status}
                                            </span>
                                        </div>

                                        <div className="flex gap-4 text-[10px] font-bold text-blue-600 pt-0.5 border-t border-slate-50 mt-1">
                                            <button className="flex items-center gap-1 hover:text-blue-800 cursor-pointer">
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
                                            <button className="flex items-center gap-1 hover:text-blue-800 cursor-pointer">
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

                        <div className="bg-[#EFF6FF] border border-blue-100 rounded-xl p-4 mt-6 flex gap-3 text-xs">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
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
                                        d="m11.25 11.25.041-.02a.75.75 0 1 1 .512 1.35h-.487v1.912a1.5 1.5 0 1 1-3 0V12.75H8.25a.75.75 0 0 1 0-1.5h.078a2.25 2.25 0 0 1 2.922-2.922V8.25a.75.75 0 0 1 1.5 0v.078a2.25 2.25 0 0 1-.041 2.922Z"
                                    />
                                </svg>
                            </div>
                            <div className="space-y-1.5">
                                <p className="font-bold text-blue-900 leading-tight">Automated Scheduling</p>
                                <p className="text-[10px] text-blue-700 leading-normal font-semibold">
                                    Monthly reports are automatically generated on the 1st of every month at 2:00 AM UTC.
                                </p>
                                <button className="text-[10px] font-bold text-blue-600 hover:text-blue-800 tracking-wide uppercase block pt-1 cursor-pointer">
                                    Configure Schedule
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Total Reports Run
                    </span>
                    <div className="flex items-baseline justify-between mt-3">
                        <span className="text-2xl font-bold text-slate-800">128</span>
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded">
                            ↑ 12%
                        </span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Storage Used
                    </span>
                    <div className="flex items-baseline justify-between mt-3">
                        <span className="text-2xl font-bold text-slate-800">42.5 MB</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                            of 1 GB limit
                        </span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Most Common Export
                    </span>
                    <div className="flex items-baseline justify-between mt-3">
                        <span className="text-2xl font-bold text-slate-800">PDF Format</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                            82% of users
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}