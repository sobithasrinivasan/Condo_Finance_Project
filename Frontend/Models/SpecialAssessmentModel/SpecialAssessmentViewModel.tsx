"use client";

import React from "react";
import { FiX } from "react-icons/fi";
import { LuFileText, LuWrench, LuSnowflake, LuPaintbrush } from "react-icons/lu";

export interface SpecialAssessmentDetail {
    id: string;
    title: string;
    createdDate: string;
    reason: string;
    amount: number;
    dueDate: string;
    units: string;
    status: "Active" | "Upcoming" | "Completed" | string;
    category: "Roof" | "HVAC" | "Painting" | "General" | string;
}

interface SpecialAssessmentViewModelProps {
    isOpen?: boolean;
    onClose?: () => void;
    assessment?: SpecialAssessmentDetail | null;
}

export default function SpecialAssessmentViewModel({
    isOpen = true,
    onClose,
    assessment,
}: SpecialAssessmentViewModelProps) {
    if (!isOpen || !assessment) return null;

    const getItemIcon = (category: string) => {
        switch (category) {
            case "Roof":
                return (
                    <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <LuWrench className="w-5 h-5" />
                    </div>
                );
            case "HVAC":
                return (
                    <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-[#0B46AD] flex items-center justify-center flex-shrink-0">
                        <LuSnowflake className="w-5 h-5" />
                    </div>
                );
            case "Painting":
                return (
                    <div className="w-10 h-10 rounded-xl bg-purple-100/70 text-purple-600 flex items-center justify-center flex-shrink-0">
                        <LuPaintbrush className="w-5 h-5" />
                    </div>
                );
            default:
                return (
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                        <LuFileText className="w-5 h-5" />
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans text-slate-800">
            <div
                onClick={onClose}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-300 cursor-default"
            />

            <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-10">
                <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-200/80">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white flex-shrink-0">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                            Assessment Details
                        </h2>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Close Drawer"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {getItemIcon(assessment.category)}
                                <div>
                                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                                        {assessment.title}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Created on {assessment.createdDate}
                                    </p>
                                </div>
                            </div>
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    assessment.status === "Active"
                                        ? "bg-emerald-100/80 text-emerald-700"
                                        : assessment.status === "Upcoming"
                                        ? "bg-blue-100/80 text-blue-700"
                                        : "bg-slate-100 text-slate-600"
                                }`}
                            >
                                {assessment.status}
                            </span>
                        </div>

                        <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-4 space-y-3">
                            <div>
                                <span className="text-slate-400 text-xs block mb-0.5">Description / Reason</span>
                                <span className="font-semibold text-slate-800 text-sm">
                                    {assessment.reason}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                                <div>
                                    <span className="text-slate-400 text-xs block mb-0.5">Total Assessment Amount</span>
                                    <span className="font-bold text-slate-900 text-base sm:text-lg">
                                        ${assessment.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs block mb-0.5">Due Date</span>
                                    <span className="font-bold text-slate-900 text-sm">
                                        {assessment.dueDate}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-900 text-sm">Target Units</h4>
                            <div className="bg-white border border-slate-200/80 rounded-xl p-4 text-xs space-y-2.5">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Assigned Units</span>
                                    <span className="font-bold text-slate-900">{assessment.units}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">Per Unit Charge</span>
                                    <span className="font-bold text-emerald-600">
                                        ${(assessment.amount / 8).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end p-4 px-6 border-t border-slate-100 bg-white flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
