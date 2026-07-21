"use client";

import React, { useState } from "react";
import {
    FiEye,
    FiMoreVertical,
    FiPlus,
    FiCalendar,
    FiChevronLeft,
    FiChevronRight,
    FiEdit2,
} from "react-icons/fi";
import {
    LuTrendingUp,
    LuFileText,
    LuCircleDollarSign,
    LuCalendarDays,
    LuWrench,
    LuSnowflake,
    LuPaintbrush,
} from "react-icons/lu";

import SpecialAssessmentViewModel, { SpecialAssessmentDetail } from "@/Models/SpecialAssessmentModel/SpecialAssessmentViewModel";
import SpecialAssessmentCreateModel from "@/Models/SpecialAssessmentModel/SpecialAssessmentCreateModel";
import SpecialAssessmentEditModel from "@/Models/SpecialAssessmentModel/SpecialAssessmentEditModel";

export interface SpecialAssessmentItem {
    id: string;
    title: string;
    createdDate: string;
    reason: string;
    amount: number;
    dueDate: string;
    units: string;
    status: "Active" | "Upcoming" | "Completed";
    category: "Roof" | "HVAC" | "Painting" | "General";
}

const initialAssessments: SpecialAssessmentItem[] = [
    {
        id: "1",
        title: "Roof Repair",
        createdDate: "Jul 10, 2026",
        reason: "Structural maintenance of building roof",
        amount: 5000.0,
        dueDate: "Aug 15, 2026",
        units: "8 / 8 Units",
        status: "Active",
        category: "Roof",
    },
    {
        id: "2",
        title: "HVAC Upgrade",
        createdDate: "Jul 15, 2026",
        reason: "Upgrade common area HVAC system",
        amount: 3200.0,
        dueDate: "Sep 01, 2026",
        units: "8 / 8 Units",
        status: "Active",
        category: "HVAC",
    },
    {
        id: "3",
        title: "Exterior Painting",
        createdDate: "Jul 20, 2026",
        reason: "Annual exterior painting project",
        amount: 2000.0,
        dueDate: "Oct 01, 2026",
        units: "8 / 8 Units",
        status: "Upcoming",
        category: "Painting",
    },
];

export default function SpecialAssessment() {
    const [assessments, setAssessments] = useState<SpecialAssessmentItem[]>(initialAssessments);
    const [statusFilter, setStatusFilter] = useState<string>("All Status");
    const [timeFilter, setTimeFilter] = useState<string>("All Time");

    const [viewingAssessment, setViewingAssessment] = useState<SpecialAssessmentItem | null>(null);
    const [editingAssessment, setEditingAssessment] = useState<SpecialAssessmentItem | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const filteredAssessments = assessments.filter((item) => {
        if (statusFilter !== "All Status" && item.status !== statusFilter) {
            return false;
        }
        return true;
    });

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
        <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6 font-sans text-slate-800">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Special Assessments
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                    Manage one-time special assessments and track payment status by unit.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-13 h-13 rounded-2xl bg-blue-50/80 text-[#0B46AD] flex items-center justify-center flex-shrink-0">
                        <LuFileText className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-slate-500 tracking-tight block">
                            Total Active Assessments
                        </span>
                        <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            {assessments.filter((a) => a.status === "Active").length}
                        </div>
                        <span className="text-xs font-medium text-slate-400 block">
                            Active projects
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-13 h-13 rounded-2xl bg-amber-50/80 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <LuCircleDollarSign className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-slate-500 tracking-tight block">
                            Pending Collection
                        </span>
                        <div className="text-2xl font-extrabold text-amber-600 tracking-tight">
                            $5,000.00
                        </div>
                        <span className="text-xs font-medium text-slate-400 block">
                            Across all assessments
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-13 h-13 rounded-2xl bg-emerald-50/80 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <LuTrendingUp className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-slate-500 tracking-tight block">
                            Collected (YTD)
                        </span>
                        <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
                            $3,200.00
                        </div>
                        <span className="text-xs font-medium text-slate-400 block">
                            From special assessments
                        </span>
                    </div>
                </div>

                <div className="bg-[#FFFFFF] rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-13 h-13 rounded-2xl bg-purple-50/80 text-purple-600 flex items-center justify-center flex-shrink-0">
                        <LuCalendarDays className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-slate-500 tracking-tight block">
                            Upcoming Due Date
                        </span>
                        <div className="text-xl font-extrabold text-purple-600 tracking-tight">
                            Sep 01, 2026
                        </div>
                        <span className="text-xs font-medium text-slate-400 block">
                            HVAC Upgrade
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-6 pb-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                            Assessments
                        </h2>
                        <p className="text-xs text-slate-500 font-normal">
                            List of all special assessments with their summary status.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
                        >
                            <option value="All Status">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Upcoming">Upcoming</option>
                            <option value="Completed">Completed</option>
                        </select>

                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs">
                            <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                            <select
                                value={timeFilter}
                                onChange={(e) => setTimeFilter(e.target.value)}
                                className="bg-transparent focus:outline-hidden cursor-pointer"
                            >
                                <option value="All Time">All Time</option>
                                <option value="2026">2026</option>
                                <option value="2025">2025</option>
                            </select>
                        </div>

                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-[#0B46AD] hover:bg-[#093C96] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                            <FiPlus className="w-4 h-4 stroke-[3]" />
                            <span>New Assessment</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                                <th className="py-3.5 px-6">ASSESSMENT</th>
                                <th className="py-3.5 px-6">REASON</th>
                                <th className="py-3.5 px-6">AMOUNT</th>
                                <th className="py-3.5 px-6">DUE DATE</th>
                                <th className="py-3.5 px-6">UNITS</th>
                                <th className="py-3.5 px-6">STATUS</th>
                                <th className="py-3.5 px-6 text-center">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredAssessments.length > 0 ? (
                                filteredAssessments.map((item) => {
                                    const formattedAmount = `$${item.amount.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                    })}`;

                                    return (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-slate-50/60 transition-colors"
                                        >
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    {getItemIcon(item.category)}
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-sm">
                                                            {item.title}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 font-normal">
                                                            Created on {item.createdDate}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-4 px-6 text-slate-700 font-medium max-w-xs">
                                                {item.reason}
                                            </td>

                                            <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap">
                                                {formattedAmount}
                                            </td>

                                            <td className="py-4 px-6 font-semibold text-slate-700 whitespace-nowrap">
                                                {item.dueDate}
                                            </td>

                                            <td className="py-4 px-6 font-semibold text-slate-700 whitespace-nowrap">
                                                {item.units}
                                            </td>

                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <span
                                                    className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${item.status === "Active"
                                                        ? "bg-emerald-100/80 text-emerald-700"
                                                        : item.status === "Upcoming"
                                                            ? "bg-blue-100/80 text-blue-700"
                                                            : "bg-slate-100 text-slate-600"
                                                        }`}
                                                >
                                                    {item.status}
                                                </span>
                                            </td>

                                            <td className="py-4 px-6 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setViewingAssessment(item)}
                                                        title="View Details"
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <FiEye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingAssessment(item)}
                                                        title="Edit Assessment"
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <FiEdit2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="py-12 text-center text-slate-400 font-medium"
                                    >
                                        No special assessments found matching status filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 px-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>
                        Showing 1 to {filteredAssessments.length} of {filteredAssessments.length} entries
                    </span>

                    <div className="flex items-center gap-1.5">
                        <button
                            disabled
                            className="p-2 text-slate-300 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-not-allowed"
                        >
                            <FiChevronLeft className="w-4 h-4" />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center bg-[#0B46AD] text-white font-bold rounded-lg shadow-2xs">
                            1
                        </button>
                        <button
                            disabled
                            className="p-2 text-slate-300 hover:bg-slate-50 border border-slate-200 rounded-lg cursor-not-allowed"
                        >
                            <FiChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {viewingAssessment && (
                <SpecialAssessmentViewModel
                    isOpen={Boolean(viewingAssessment)}
                    onClose={() => setViewingAssessment(null)}
                    assessment={viewingAssessment}
                />
            )}

            {isCreateModalOpen && (
                <SpecialAssessmentCreateModel
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={(newItem) => {
                        setAssessments((prev) => [newItem as SpecialAssessmentItem, ...prev]);
                        setIsCreateModalOpen(false);
                    }}
                />
            )}

            {editingAssessment && (
                <SpecialAssessmentEditModel
                    isOpen={Boolean(editingAssessment)}
                    onClose={() => setEditingAssessment(null)}
                    assessment={editingAssessment}
                    onSave={(updated) => {
                        setAssessments((prev) =>
                            prev.map((a) => (a.id === updated.id ? ({ ...a, ...updated } as SpecialAssessmentItem) : a))
                        );
                        setEditingAssessment(null);
                    }}
                />
            )}
        </div>
    );
}
