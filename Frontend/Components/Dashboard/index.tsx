"use client";

import React, { useEffect, useState } from "react";
import BarChart from "./Charts/BarChart";
import DoughnutChart from "./Charts/DoughnutChart";
import ExpenseSummaryChart from "./Charts/ExpenseSummaryChart";
import { getDashboardSummaryApi } from "@/api/Dashboard/DashboardApi";

export default function Dashboard() {
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const data = await getDashboardSummaryApi();
                setSummary(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const kpis = summary?.kpis;

    const stats = [
        { name: "YTD Deposits", value: kpis?.ytd_deposits !== undefined ? `$${Number(kpis.ytd_deposits).toLocaleString()}` : "$96,450", change: "↑ 12.5% vs last year", changeType: "positive" },
        { name: "Expected Deposits", value: kpis?.ytd_deposits !== undefined ? `$${Number(kpis.ytd_deposits).toLocaleString()}` : "$88,000" },
        { name: "Received Deposits", value: kpis?.received_deposits !== undefined ? `$${Number(kpis.received_deposits).toLocaleString()}` : "$82,750", detail: `${kpis?.received_deposits_pct ?? 93.0}%` },
        { name: "Checking Balance", value: kpis?.checking_balance !== undefined ? `$${Number(kpis.checking_balance).toLocaleString()}` : "$43,650" },
        { name: "Money Market Balance", value: "$120,450" },
        { name: "Pending Vendor Payments", value: kpis?.pending_invoices_count !== undefined ? `${kpis.pending_invoices_count}` : "3" },
        { name: "Pending Reconciliation", value: kpis?.pending_reconciliation_count !== undefined ? `${kpis.pending_reconciliation_count}` : "24" },
        { name: "Late HOA Payments", value: kpis?.late_invoices_count !== undefined ? `${kpis.late_invoices_count}` : "2", unit: "Units", badgeColor: "text-red-600" },
    ];

    const apiVendorPayments = summary?.tables?.upcoming_vendor_payments;
    const vendorPayments = apiVendorPayments && apiVendorPayments.length > 0
        ? apiVendorPayments.map((p: any) => ({
            vendor: p.vendor_name,
            date: p.due_date,
            amount: `$${Number(p.amount).toLocaleString()}`,
            status: p.status,
        }))
        : [
            { vendor: "ABC Plumbing", date: "Jul 20, 2026", amount: "$1,250.00", status: "Pending" },
            { vendor: "Elevator Maintenance Co.", date: "Jul 22, 2026", amount: "$2,800.00", status: "Pending" },
            { vendor: "Green Landscaping", date: "Jul 25, 2026", amount: "$950.00", status: "Pending" },
        ];

    const apiReconciliations = summary?.tables?.outstanding_reconciliation;
    const reconciliations = apiReconciliations && apiReconciliations.length > 0
        ? apiReconciliations.map((r: any) => ({
            description: r.matched_entity_type || `ID #${r.id}`,
            date: "Recent",
            amount: r.difference ? `$${Number(r.difference).toLocaleString()}` : "$0.00",
            status: r.status,
        }))
        : [
            { description: "ACH Deposit", date: "Jul 10, 2026", amount: "$2,450.00", status: "Unmatched" },
            { description: "Check #1234", date: "Jul 08, 2026", amount: "$1,125.50", status: "Unmatched" },
            { description: "Amazon Charge", date: "Jul 07, 2026", amount: "$89.99", status: "Unmatched" },
        ];

    const activities = [
        { title: "Invoice from ABC Plumbing imported", date: "Jul 14, 2026 10:30 AM" },
        { title: "Bank statement for June uploaded", date: "Jul 14, 2026 09:15 AM" },
        { title: "Reconciliation completed for May", date: "Jul 13, 2026 04:45 PM" },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat, idx) => (
                    <div
                        key={idx}
                        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-all hover:shadow-[0_4px_25px_rgba(0,0,0,0.04)]"
                    >
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                {stat.name}
                            </span>
                            <div className="flex items-baseline mt-2">
                                <span className={`text-2xl font-bold tracking-tight text-slate-900 ${stat.badgeColor || ""}`}>
                                    {stat.value}
                                </span>
                                {stat.unit && (
                                    <span className="text-xs text-slate-400 font-semibold ml-1">
                                        {stat.unit}
                                    </span>
                                )}
                            </div>
                        </div>
                        {stat.change && (
                            <span className="text-[10px] font-bold text-emerald-500 mt-2 block">
                                {stat.change}
                            </span>
                        )}
                        {stat.detail && (
                            <span className="text-[10px] font-bold text-slate-400 mt-2 block">
                                {stat.detail}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                            Monthly Income vs Expense
                        </h3>
                        <div className="flex gap-3 text-[9px] font-bold text-slate-400">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded bg-[#1A56DB]" /> Income
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded bg-[#00BA9D]" /> Expense
                            </span>
                        </div>
                    </div>
                    <BarChart />
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                        Deposit Collection (YTD)
                    </h3>
                    <DoughnutChart />
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                            Upcoming Vendor Payments
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                                        <th className="pb-2">Vendor</th>
                                        <th className="pb-2">Due Date</th>
                                        <th className="pb-2 text-right">Amount</th>
                                        <th className="pb-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-slate-600 font-medium">
                                    {vendorPayments.map((p: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="py-2.5 truncate max-w-[120px] font-semibold text-slate-700">{p.vendor}</td>
                                            <td className="py-2.5 text-slate-400">{p.date}</td>
                                            <td className="py-2.5 text-right font-bold text-slate-700">{p.amount}</td>
                                            <td className="py-2.5 text-center">
                                                <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200/40 text-[10px] font-bold">
                                                    {p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="text-right pt-4 border-t border-slate-50 mt-4">
                        <a href="#" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                            View All
                        </a>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                            Outstanding Reconciliation
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                                        <th className="pb-2">Description</th>
                                        <th className="pb-2">Date</th>
                                        <th className="pb-2 text-right">Amount</th>
                                        <th className="pb-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-slate-600 font-medium">
                                    {reconciliations.map((r: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="py-2.5 font-semibold text-slate-700">{r.description}</td>
                                            <td className="py-2.5 text-slate-400">{r.date}</td>
                                            <td className="py-2.5 text-right font-bold text-slate-700">{r.amount}</td>
                                            <td className="py-2.5 text-center">
                                                <span className="inline-block px-2 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200/40 text-[10px] font-bold">
                                                    {r.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="text-right pt-4 border-t border-slate-50 mt-4">
                        <a href="#" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                            View All
                        </a>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                        Expense Summary (YTD)
                    </h3>
                    <ExpenseSummaryChart />
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                            Recent Activities
                        </h3>
                        <div className="space-y-4">
                            {activities.map((act, idx) => (
                                <div key={idx} className="flex gap-3 text-xs">
                                    <div className="flex flex-col items-center">
                                        <span className="w-2 h-2 rounded-full border-2 border-slate-300 mt-1 flex-shrink-0" />
                                        {idx !== activities.length - 1 && <span className="w-0.5 h-10 bg-slate-100" />}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-700 leading-tight">
                                            {act.title}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-bold mt-1">
                                            {act.date}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="text-right pt-4 border-t border-slate-50 mt-4">
                        <a href="#" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                            View All
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}