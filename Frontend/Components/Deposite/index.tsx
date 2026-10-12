"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
    FiEye,
    FiEdit2,
    FiSearch,
    FiFilter,
    FiChevronLeft,
    FiChevronRight,
    FiInfo,
    FiX,
    FiCheckCircle,
    FiCalendar,
    FiDollarSign,
    FiPlus,
} from "react-icons/fi";
import { LuCalendarDays, LuWallet, LuCircleAlert, LuLandmark } from "react-icons/lu";
import DepositeViewModel from "@/Models/DepositeModel/DepositeViewModel";
import DepositeEditModel from "@/Models/DepositeModel/DepositeEditModel";
import { getDepositDetailsApi, getDepositSummaryApi, updateDepositApi } from "@/api/Deposits/DepositeApi";

export interface UnitDeposit {
    id: string;
    unitNumber: string;
    badgeColor: "blue" | "sky";
    ownerName: string;
    expected: number;
    received: number;
    dateReceived: string;
    balance: number;
    status: "Paid" | "Late" | "Partial" | "Early" | "OnTime" | string;
    paymentMethod?: string;
    referenceNumber?: string;
    recordedBy?: string;
    recordedOn?: string;
    month?: string;
    notes?: string;
}

export default function Deposits() {
    const [deposits, setDeposits] = useState<any[]>([]);
    const [selectedMonth, setSelectedMonth] = useState("July 2026");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"All" | "Paid" | "Late" | "Partial">("All");

    const [viewingDeposit, setViewingDeposit] = useState<UnitDeposit | null>(null);
    const [editingDeposit, setEditingDeposit] = useState<UnitDeposit | null>(null);

    const [depositSummary, setDepositSummary] = useState<any>(null);

    const getMonthYearParams = (monthStr: string) => {
        const parts = monthStr.split(" ");
        if (parts.length === 2) {
            const monthsMap: { [key: string]: number } = {
                January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
                July: 7, August: 8, September: 9, October: 10, November: 11, December: 12
            };
            return {
                deposit_month: monthsMap[parts[0]],
                deposit_year: parseInt(parts[1]),
            };
        }
        return {};
    };

    const fetchDepositSummary = async (params?: { deposit_month?: number; deposit_year?: number }) => {
        try {
            const result = await getDepositSummaryApi(params);
            setDepositSummary(result);
        } catch (error) {
            console.error("Failed to fetch deposit summary:", error);
        }
    };

    const fetchAllDeposits = async (params?: { deposit_month?: number; deposit_year?: number }) => {
        try {
            const response = await getDepositDetailsApi({ ...params, page_size: 100 });
            if (response && Array.isArray(response.data)) {
                setDeposits(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch deposits:", error);
        }
    }

    useEffect(() => {
        const params = getMonthYearParams(selectedMonth);
        fetchDepositSummary(params);
        fetchAllDeposits(params);
    }, [selectedMonth]);

    const filteredDeposits = deposits?.filter((dep) => {
        const matchesSearch =
            (dep.owner_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (dep.unit_number || "").includes(searchQuery);
        const isPaid = dep.payment_status === "Paid" || dep.payment_status === "OnTime" || dep.payment_status === "Early";
        const matchesStatus =
            statusFilter === "All" ||
            (statusFilter === "Paid" && isPaid) ||
            (statusFilter === "Late" && dep.payment_status === "Late") ||
            (statusFilter === "Partial" && dep.payment_status === "Partial");
        return matchesSearch && matchesStatus;
    });

    const mapToUnitDeposit = (row: any, index: number): UnitDeposit => {
        const expected = Number(row.monthly_hoa_amount) || 0;
        const received = Number(row.transaction_amount) || 0;
        let dateReceived = "-";
        if (row.transaction_date && received > 0) {
            const date = new Date(row.transaction_date);
            if (!isNaN(date.getTime())) {
                dateReceived = date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                });
            }
        }
        return {
            id: row.id?.toString(),
            unitNumber: row.unit_number || "",
            badgeColor: index % 2 === 0 ? "blue" : "sky",
            ownerName: row.owner_name || "",
            expected,
            received,
            dateReceived,
            balance: Math.max(0, expected - received),
            status: row.payment_status || "Late",
            paymentMethod: "Bank Transfer",
            referenceNumber: row.bank_transaction_id?.toString() || "",
            notes: row.resolution_notes || row.notes || "",
            month: selectedMonth,
        };
    };

    const openEditModal = (row: any, index: number) => {
        const mapped = mapToUnitDeposit(row, index);
        setEditingDeposit(mapped);
    };

    const openViewModal = (row: any, index: number) => {
        setViewingDeposit(mapToUnitDeposit(row, index));
    };

    return (
        <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50/80 flex items-center justify-center text-[#0B46AD] flex-shrink-0">
                        <LuCalendarDays className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-500 tracking-tight block">
                            Total Expected ({selectedMonth})
                        </span>
                        <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            ${depositSummary?.total_expected.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-xs font-medium text-slate-400 block">
                            From 8 Units
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50/80 flex items-center justify-center text-emerald-600 flex-shrink-0">
                        <LuWallet className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-500 tracking-tight block">
                            Total Received
                        </span>
                        <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
                            ${depositSummary?.total_received.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-xs font-medium text-slate-400 block">
                            86.7% of expected
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-14 h-14 rounded-2xl bg-rose-50/80 flex items-center justify-center text-rose-600 flex-shrink-0">
                        <LuCircleAlert className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-500 tracking-tight block">
                            Outstanding Balance
                        </span>
                        <div className="text-2xl font-extrabold text-rose-600 tracking-tight">
                            ${depositSummary?.outstanding_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-xs font-medium text-slate-400 block">
                            From 3 Units
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-6 pb-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                            Unit Deposits Overview
                        </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                            <span>Month:</span>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
                            >
                                <option value="July 2026">July 2026</option>
                                <option value="June 2026">June 2026</option>
                                <option value="May 2026">May 2026</option>
                                <option value="April 2026">April 2026</option>
                            </select>
                        </div>

                        <div className="relative">
                            <FiSearch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search unit or owner..."
                                className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500 w-44 sm:w-56 transition-all"
                            />
                        </div>

                        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
                            {(["All", "Paid", "Late", "Partial"] as const).map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === st
                                        ? "bg-white text-slate-900 shadow-2xs"
                                        : "text-slate-500 hover:text-slate-800"
                                        }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                                <th className="py-3.5 px-6">UNIT</th>
                                <th className="py-3.5 px-6">OWNER</th>
                                <th className="py-3.5 px-6">EXPECTED</th>
                                <th className="py-3.5 px-6">RECEIVED</th>
                                <th className="py-3.5 px-6">DATE RECEIVED</th>
                                <th className="py-3.5 px-6">BALANCE</th>
                                <th className="py-3.5 px-6 text-center">STATUS</th>
                                <th className="py-3.5 px-6 text-center">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredDeposits.length > 0 ? (
                                filteredDeposits.map((dep, index) => {
                                    const expected = Number(dep.monthly_hoa_amount) || 0;
                                    const received = Number(dep.transaction_amount) || 0;
                                    const balance = Math.max(0, expected - received);
                                    const formattedExpected = `$${expected.toFixed(2)}`;
                                    const formattedReceived = `$${received.toFixed(2)}`;
                                    const formattedBalance = `$${balance.toFixed(2)}`;

                                    let dateReceivedStr = "-";
                                    if (dep.transaction_date && received > 0) {
                                        const date = new Date(dep.transaction_date);
                                        if (!isNaN(date.getTime())) {
                                            dateReceivedStr = date.toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            });
                                        }
                                    }

                                    const isPaidStatus = dep.payment_status === "Paid" || dep.payment_status === "OnTime" || dep.payment_status === "Early";

                                    return (
                                        <tr
                                            key={dep.id}
                                            className="hover:bg-slate-50/60 transition-colors"
                                        >
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded font-bold text-xs text-white ${index % 2 === 0
                                                        ? "bg-[#0B46AD]"
                                                        : "bg-sky-500"
                                                        }`}
                                                >
                                                    {dep.unit_number}
                                                </span>
                                            </td>

                                            <td className="py-4 px-6 font-semibold text-slate-800 whitespace-nowrap">
                                                {dep.owner_name}
                                            </td>

                                            <td className="py-4 px-6 font-bold text-slate-800 whitespace-nowrap">
                                                {formattedExpected}
                                            </td>

                                            <td
                                                className={`py-4 px-6 font-bold whitespace-nowrap ${isPaidStatus
                                                    ? "text-emerald-600"
                                                    : dep.payment_status === "Late"
                                                        ? "text-rose-600"
                                                        : "text-amber-600"
                                                    }`}
                                            >
                                                {formattedReceived}
                                            </td>

                                            <td className="py-4 px-6 text-slate-600 font-medium whitespace-nowrap">
                                                {dateReceivedStr}
                                            </td>

                                            <td
                                                className={`py-4 px-6 font-bold whitespace-nowrap ${balance > 0
                                                    ? dep.payment_status === "Late"
                                                        ? "text-rose-600"
                                                        : "text-amber-600"
                                                    : "text-slate-800"
                                                    }`}
                                            >
                                                {formattedBalance}
                                            </td>

                                            <td className="py-4 px-6 text-center whitespace-nowrap">
                                                <span
                                                    className={`inline-block px-3.5 py-1 rounded-full text-xs font-bold ${isPaidStatus
                                                        ? "bg-emerald-100/70 text-emerald-700"
                                                        : dep.payment_status === "Late"
                                                            ? "bg-rose-100/70 text-rose-700"
                                                            : "bg-amber-100/70 text-amber-700"
                                                        }`}
                                                >
                                                    {dep.payment_status}
                                                </span>
                                            </td>

                                            <td className="py-4 px-6 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openViewModal(dep, index)}
                                                        title="View Details"
                                                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <FiEye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(dep, index)}
                                                        title="Edit Deposit"
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
                                        colSpan={8}
                                        className="py-12 text-center text-slate-400 font-medium"
                                    >
                                        No deposits match your search criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 px-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>
                        Showing 1-{filteredDeposits.length} of {filteredDeposits.length} Units
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

            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 flex items-center gap-3 text-xs text-blue-900 font-medium shadow-2xs">
                <FiInfo className="w-5 h-5 text-[#0B46AD] flex-shrink-0" />
                <span>
                    Track monthly HOA deposits for each unit and monitor payment status.
                </span>
            </div>

            {viewingDeposit && (
                <DepositeViewModel
                    isOpen={Boolean(viewingDeposit)}
                    onClose={() => setViewingDeposit(null)}
                    deposit={viewingDeposit}
                />
            )}

            {editingDeposit && (
                <DepositeEditModel
                    isOpen={Boolean(editingDeposit)}
                    onClose={() => setEditingDeposit(null)}
                    deposit={editingDeposit}
                    onSave={async (updated) => {
                        try {
                            if (updated.id) {
                                await updateDepositApi(updated.id, {
                                    status: updated.status,
                                    resolution_notes: updated.notes || "",
                                });
                                toast.success("Deposit updated successfully!");
                                const params = getMonthYearParams(selectedMonth);
                                fetchDepositSummary(params);
                                fetchAllDeposits(params);
                            }
                        } catch (error) {
                            toast.error("Failed to update deposit. Please try again.");
                            console.error("Failed to update deposit:", error);
                            throw error;
                        }
                    }}
                />
            )}
        </div>
    );
}
