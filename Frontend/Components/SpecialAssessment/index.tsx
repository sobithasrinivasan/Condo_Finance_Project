"use client";

import React, { useState, useEffect } from "react";
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
import {
    getSpecialAssessmentSummaryApi,
    getSpecialAssessmentDetailsApi,
    updateSpecialAssessmentApi,
    createSpecialAssessmentApi
} from "@/api/SpecialAssessments/SpecialAssessmentsApi";
import { formatDateDisplay } from "@/lib/format";
import { toast } from "react-hot-toast";
import moment from "moment";

export interface SpecialAssessmentItem {
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

export default function SpecialAssessment() {
    const [assessments, setAssessments] = useState<any[]>([]);
    const [assessmentSummary, setAssessmentSummary] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState<string>("All Status");
    const [timeFilter, setTimeFilter] = useState<string>("All Time");

    const [viewingAssessment, setViewingAssessment] = useState<SpecialAssessmentItem | null>(null);
    const [editingAssessment, setEditingAssessment] = useState<SpecialAssessmentItem | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchSummary = async () => {
        try {
            const summary = await getSpecialAssessmentSummaryApi();
            setAssessmentSummary(summary);
        } catch (error) {
            console.error("Failed to fetch special assessment summary:", error);
        }
    };

    const fetchDetails = async () => {
        try {
            const response = await getSpecialAssessmentDetailsApi({ page_size: 100 });
            if (response && Array.isArray(response.data)) {
                setAssessments(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch special assessments:", error);
        }
    };

    useEffect(() => {
        fetchSummary();
        fetchDetails();
    }, []);

    const filteredAssessments = assessments.filter((item) => {
        let mappedStatus = "Active";
        if (item.status === "Matched" || item.status === "Resolved") {
            mappedStatus = "Completed";
        } else if (item.status === "NeedsReview") {
            mappedStatus = "Active";
        } else {
            mappedStatus = "Upcoming";
        }

        if (statusFilter !== "All Status" && mappedStatus !== statusFilter) {
            return false;
        }

        if (timeFilter !== "All Time" && item.transaction_date) {
            const year = new Date(item.transaction_date).getFullYear().toString();
            if (year !== timeFilter) {
                return false;
            }
        }

        return true;
    });

    const mapToAssessmentItem = (row: any, index: number): SpecialAssessmentItem => {
        const expected = Number(row.monthly_hoa_amount) || 0;
        const amount = Number(row.transaction_amount) || 0;
        let category = "General";
        const desc = (row.transaction_description || "").toLowerCase();
        if (desc.includes("roof")) category = "Roof";
        else if (desc.includes("hvac") || desc.includes("air")) category = "HVAC";
        else if (desc.includes("paint")) category = "Painting";

        let status = "Active";
        if (row.status === "Matched" || row.status === "Resolved") {
            status = "Completed";
        } else if (row.status === "NeedsReview") {
            status = "Active";
        } else {
            status = "Upcoming";
        }

        return {
            id: row.id?.toString(),
            title: row.transaction_description || "Special Assessment",
            createdDate: row.created_at ? formatDateDisplay(row.created_at) : "-",
            reason: row.resolution_notes || row.notes || "One-time assessment fee",
            amount: amount,
            dueDate: row.transaction_date ? formatDateDisplay(row.transaction_date) : "-",
            units: row.unit_number ? `Unit ${row.unit_number}` : "All Units",
            status: status,
            category: category,
        };
    };

    const openEditModal = (row: any, index: number) => {
        setEditingAssessment(mapToAssessmentItem(row, index));
    };

    const openViewModal = (row: any, index: number) => {
        setViewingAssessment(mapToAssessmentItem(row, index));
    };

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
                            {assessmentSummary?.total_active_assessments || 0}
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
                            ${assessmentSummary?.pending_collection}
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
                            ${(assessmentSummary?.collected_ytd || 0)}
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
                            Total Reconciled
                        </span>
                        <div className="text-2xl font-extrabold text-purple-600 tracking-tight">
                            {assessmentSummary?.total_records || 0}
                        </div>
                        <span className="text-xs font-medium text-slate-400 block">
                            Completed projects
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
                                filteredAssessments.map((item, index) => {
                                    const amount = Number(item.amount) || 0;
                                    const formattedAmount = `$${amount.toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                    })}`;

                                    let mappedStatus = "Active";
                                    if (item.assessment_status === "Matched" || item.assessment_status === "Resolved") {
                                        mappedStatus = "Completed";
                                    } else if (item.assessment_status === "NeedsReview") {
                                        mappedStatus = "Active";
                                    } else {
                                        mappedStatus = "Upcoming";
                                    }

                                    const createdDateStr = item.created_at ? formatDateDisplay(item.created_at) : "-";
                                    const dueDateStr = item.due_date ? formatDateDisplay(item.due_date) : "-";

                                    let category = "General";
                                    const desc = (item.transaction_description || "").toLowerCase();
                                    if (desc.includes("roof")) category = "Roof";
                                    else if (desc.includes("hvac") || desc.includes("air")) category = "HVAC";
                                    else if (desc.includes("paint")) category = "Painting";

                                    return (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-slate-50/60 transition-colors"
                                        >
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    {getItemIcon(category)}
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-sm">
                                                            {item.title || "Special Assessment"}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 font-normal">
                                                            Created on {createdDateStr}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-4 px-6 text-slate-700 font-medium max-w-xs">
                                                {item.description || "One-time assessment fee"}
                                            </td>

                                            <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap">
                                                {formattedAmount}
                                            </td>

                                            <td className="py-4 px-6 font-semibold text-slate-700 whitespace-nowrap">
                                                {dueDateStr}
                                            </td>

                                            <td className="py-4 px-6 font-semibold text-slate-700 whitespace-nowrap">
                                                {item.unit_number ? `Unit ${item.unit_number}` : "All Units"}
                                            </td>

                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <span
                                                    className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${mappedStatus === "Active"
                                                        ? "bg-emerald-100/70 text-emerald-700"
                                                        : mappedStatus === "Upcoming"
                                                            ? "bg-blue-100/80 text-blue-700"
                                                            : "bg-slate-100 text-slate-600"
                                                        }`}
                                                >
                                                    {mappedStatus}
                                                </span>
                                            </td>

                                            <td className="py-4 px-6 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openViewModal(item, index)}
                                                        title="View Details"
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <FiEye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(item, index)}
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
                                <tr key="no-data">
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
                    onCreate={async (newItem) => {
                        try {
                            let backendStatus = "Active";
                            if (newItem.status === "Upcoming") {
                                backendStatus = "Pending";
                            }

                            const formattedDueDate = moment(newItem.dueDate, ["MMM D, YYYY", "YYYY-MM-DD", "MM/DD/YYYY"]).format("YYYY-MM-DD");

                            await createSpecialAssessmentApi({
                                title: newItem.title,
                                description: newItem.reason,
                                amount: Number(newItem.amount),
                                due_date: formattedDueDate,
                                status: backendStatus,
                            });

                            toast.success("Special assessment created successfully!");
                            fetchSummary();
                            fetchDetails();
                        } catch (error: any) {
                            const errMsg = error?.response?.data?.message || error?.response?.data?.detail || "Failed to create special assessment.";
                            toast.error(errMsg);
                            console.error("Create assessment failed:", error);
                            throw error;
                        }
                    }}
                />
            )}

            {editingAssessment && (
                <SpecialAssessmentEditModel
                    isOpen={Boolean(editingAssessment)}
                    onClose={() => setEditingAssessment(null)}
                    assessment={editingAssessment}
                    onSave={async (updated) => {
                        try {
                            let backendStatus = "NeedsReview";
                            if (updated.status === "Completed") {
                                backendStatus = "Matched";
                            } else if (updated.status === "Active") {
                                backendStatus = "NeedsReview";
                            } else if (updated.status === "Upcoming") {
                                backendStatus = "Unresolved";
                            }

                            if (updated.id) {
                                await updateSpecialAssessmentApi(updated.id, {
                                    status: backendStatus,
                                    resolution_notes: updated.reason || "",
                                });
                                toast.success("Special assessment updated successfully!");
                                fetchSummary();
                                fetchDetails();
                            }
                        } catch (error) {
                            toast.error("Failed to update special assessment. Please try again.");
                            console.error("Failed to update special assessment:", error);
                            throw error;
                        }
                    }}
                />
            )}
        </div>
    );
}
