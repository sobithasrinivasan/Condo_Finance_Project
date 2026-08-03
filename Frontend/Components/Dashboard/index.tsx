"use client";

import React, { useEffect, useState } from "react";
import BarChart from "./Charts/BarChart";
import DoughnutChart from "./Charts/DoughnutChart";
import ExpenseSummaryChart from "./Charts/ExpenseSummaryChart";
import { getDashboardSummaryApi, getDashboardActivitiesApi } from "@/api/Dashboard/DashboardApi";

interface DashboardKpis {
    ytd_deposits: number | string;
    expected_deposits: number | string;
    received_deposits: number | string;
    received_deposits_pct: number;
    checking_balance: number | string;
    money_market_balance: number | string;
    pending_invoices_count: number;
    pending_reconciliation_count: number;
    late_invoices_count: number;
}

interface MonthlyIncomeExpenseItem {
    txn_month: string;
    total_income: number | string;
    total_expense: number | string;
}

interface DepositCollectionYtd {
    expected: number | string;
    collected: number | string;
    pending: number | string;
    collection_pct: number;
}

interface ExpenseSummaryItem {
    category: string;
    total_amount: number | string;
    pct: number;
}

interface VendorPaymentItem {
    vendor_name: string;
    due_date: string;
    amount: number | string;
    status: string;
}

interface ReconciliationItem {
    id: number;
    matched_entity_type?: string;
    status: string;
    difference?: number | string | null;
    transaction_date?: string;
}

interface DashboardSummaryResponse {
    kpis: DashboardKpis;
    charts: {
        monthly_income_expense: MonthlyIncomeExpenseItem[];
        deposit_collection_ytd: DepositCollectionYtd;
        expense_summary_ytd: ExpenseSummaryItem[];
    };
    tables: {
        upcoming_vendor_payments: VendorPaymentItem[];
        outstanding_reconciliation: ReconciliationItem[];
    };
}

interface ActivityItem {
    id?: string | number;
    title: string;
    description?: string | null;
    status?: string;
    created_at?: string;
    activity_type?: string;
}

const formatCurrency = (value: number | string | undefined, fallback: string) => {
    if (value === undefined || value === null) {
        return fallback;
    }
    return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const formatDate = (value: string | undefined, fallback: string) => {
    if (!value) {
        return fallback;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return fallback;
    }

    return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    });
};

const EmptyTableRow = ({ colSpan, message }: { colSpan: number; message: string }) => (
    <tr>
        <td colSpan={colSpan} className="py-6 text-center text-xs font-semibold text-slate-400">
            {message}
        </td>
    </tr>
);

const StatusBadge = ({ status, tone }: { status: string; tone: "amber" | "orange" }) => (
    <span
        className={`inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${
            tone === "amber"
                ? "border-amber-200/40 bg-amber-50 text-amber-600"
                : "border-orange-200/40 bg-orange-50 text-orange-600"
        }`}
    >
        {status}
    </span>
);

export default function Dashboard() {
    const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [summaryData, activityData] = await Promise.all([
                    getDashboardSummaryApi(),
                    getDashboardActivitiesApi(),
                ]);
                setSummary(summaryData);
                setActivities(activityData);
            } catch (err) {
                console.error(err);
                setError("Failed to load dashboard data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        void fetchDashboardData();
    }, []);

    const kpis = summary?.kpis;
    const depositCollection = summary?.charts?.deposit_collection_ytd;
    const monthlyIncomeExpense = summary?.charts?.monthly_income_expense || [];
    const expenseSummary = summary?.charts?.expense_summary_ytd || [];

    const stats = [
        {
            name: "YTD Deposits",
            value: formatCurrency(kpis?.ytd_deposits, "$0"),
            detail: kpis ? `${Number(kpis.received_deposits_pct || 0).toFixed(2)}% collected` : undefined,
        },
        {
            name: "Expected Deposits",
            value: formatCurrency(kpis?.expected_deposits, "$0"),
        },
        {
            name: "Received Deposits",
            value: formatCurrency(kpis?.received_deposits, "$0"),
            detail: kpis ? `${Number(kpis.received_deposits_pct || 0).toFixed(2)}%` : undefined,
        },
        {
            name: "Checking Balance",
            value: formatCurrency(kpis?.checking_balance, "$0"),
        },
        {
            name: "Money Market Balance",
            value: formatCurrency(kpis?.money_market_balance, "$0"),
        },
        {
            name: "Pending Vendor Payments",
            value: kpis?.pending_invoices_count !== undefined ? `${kpis.pending_invoices_count}` : "0",
        },
        {
            name: "Pending Reconciliation",
            value: kpis?.pending_reconciliation_count !== undefined ? `${kpis.pending_reconciliation_count}` : "0",
        },
        {
            name: "Late HOA Payments",
            value: kpis?.late_invoices_count !== undefined ? `${kpis.late_invoices_count}` : "0",
            unit: "Units",
            badgeColor: "text-red-600",
        },
    ];

    const vendorPayments = (summary?.tables?.upcoming_vendor_payments || []).map((payment) => ({
        vendor: payment.vendor_name,
        date: formatDate(payment.due_date, "Pending"),
        amount: formatCurrency(payment.amount, "$0"),
        status: payment.status,
    }));

    const reconciliations = (summary?.tables?.outstanding_reconciliation || []).map((item) => ({
        description: item.matched_entity_type || `ID #${item.id}`,
        date: formatDate(item.transaction_date, "Recent"),
        amount: formatCurrency(item.difference || 0, "$0.00"),
        status: item.status,
    }));

    const displayActivities = activities.map((activity) => ({
        title: activity.title,
        date: formatDate(activity.created_at, "Recent"),
    }));

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                    <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                    <span className="text-xs font-bold uppercase tracking-wider">Loading dashboard...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm font-semibold text-slate-700">{error}</p>
                <button
                    onClick={() => {
                        setLoading(true);
                        window.location.reload();
                    }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div
                        key={stat.name}
                        className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_25px_rgba(0,0,0,0.04)]"
                    >
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                {stat.name}
                            </span>
                            <div className="mt-2 flex items-baseline">
                                <span className={`text-2xl font-bold tracking-tight text-slate-900 ${stat.badgeColor || ""}`}>
                                    {stat.value}
                                </span>
                                {stat.unit && (
                                    <span className="ml-1 text-xs font-semibold text-slate-400">
                                        {stat.unit}
                                    </span>
                                )}
                            </div>
                        </div>
                        {stat.detail && (
                            <span className="mt-2 block text-[10px] font-bold text-slate-400">
                                {stat.detail}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                            Monthly Income vs Expense
                        </h3>
                        <div className="flex gap-3 text-[9px] font-bold text-slate-400">
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded bg-[#1A56DB]" /> Income
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded bg-[#00BA9D]" /> Expense
                            </span>
                        </div>
                    </div>
                    <BarChart data={monthlyIncomeExpense} />
                </div>

                <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                        Deposit Collection (YTD)
                    </h3>
                    <DoughnutChart
                        collected={depositCollection?.collected}
                        pending={depositCollection?.pending}
                        collectionPct={depositCollection?.collection_pct}
                    />
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                    <div>
                        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-800">
                            Upcoming Vendor Payments
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
                                        <th className="pb-2">Vendor</th>
                                        <th className="pb-2">Due Date</th>
                                        <th className="pb-2 text-right">Amount</th>
                                        <th className="pb-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-medium text-slate-600">
                                    {vendorPayments.length > 0 ? (
                                        vendorPayments.map((payment, index) => (
                                            <tr key={`${payment.vendor}-${index}`}>
                                                <td className="max-w-[120px] truncate py-2.5 font-semibold text-slate-700">{payment.vendor}</td>
                                                <td className="py-2.5 text-slate-400">{payment.date}</td>
                                                <td className="py-2.5 text-right font-bold text-slate-700">{payment.amount}</td>
                                                <td className="py-2.5 text-center">
                                                    <StatusBadge status={payment.status} tone="amber" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <EmptyTableRow colSpan={4} message="No upcoming vendor payments." />
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="mt-4 border-t border-slate-50 pt-4 text-right">
                        <a href="#" className="text-xs font-bold text-blue-600 transition-colors hover:text-blue-700">
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
                    <ExpenseSummaryChart data={expenseSummary}/>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
                            Recent Activities
                        </h3>
                        <div className="space-y-4">
                            {displayActivities.length > 0 ? (
                                displayActivities.map((activity, index) => (
                                    <div key={`${activity.title}-${index}`} className="flex gap-3 text-xs">
                                        <div className="flex flex-col items-center">
                                            <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full border-2 border-slate-300" />
                                            {index !== displayActivities.length - 1 && <span className="h-10 w-0.5 bg-slate-100" />}
                                        </div>
                                        <div>
                                            <p className="leading-tight font-semibold text-slate-700">
                                                {activity.title}
                                            </p>
                                            <p className="mt-1 text-[10px] font-bold text-slate-400">
                                                {activity.date}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="py-6 text-center text-xs font-semibold text-slate-400">
                                    No recent activities.
                                </p>
                            )}
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
