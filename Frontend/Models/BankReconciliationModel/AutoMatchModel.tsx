"use client";

import React, { useState, useEffect } from "react";
import { FiX, FiInfo, FiCheck } from "react-icons/fi";
import { LuWand } from "react-icons/lu";
import { reconcileStatementApi } from "@/api/BankReconciliation/BankReconciliationApi";

export interface AutoMatchModelProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete?: (matchedCount: number) => void;
    unreconciledCount?: number;
    statementIds?: number[];
}

export default function AutoMatchModel({
    isOpen,
    onClose,
    onComplete,
    unreconciledCount = 24,
    statementIds = []
}: AutoMatchModelProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [progress, setProgress] = useState(0);
    const [matchedCount, setMatchedCount] = useState(0);
    const [remainingCount, setRemainingCount] = useState(unreconciledCount);
    const [apiSuccess, setApiSuccess] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setProgress(0);
            setMatchedCount(0);
            setRemainingCount(unreconciledCount);
            setApiSuccess(false);
            setApiError(null);
        }
    }, [isOpen, unreconciledCount]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (step === 2) {
            setProgress(0);
            let currentProgress = 0;
            interval = setInterval(() => {
                if (apiError) {
                    clearInterval(interval);
                    return;
                }

                if (apiSuccess) {
                    currentProgress = 100;
                } else {
                    if (currentProgress < 90) {
                        currentProgress += 10;
                    }
                }
                setProgress(currentProgress);

                const currentMatched = Math.min(18, Math.floor((currentProgress / 100) * 18));
                setMatchedCount(currentMatched);
                setRemainingCount(unreconciledCount - currentMatched);

                if (currentProgress >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setStep(3);
                    }, 400);
                }
            }, 300);
        }
        return () => clearInterval(interval);
    }, [step, unreconciledCount, apiSuccess, apiError]);

    if (!isOpen) return null;

    const handleStartMatch = async () => {
        setStep(2);
        setApiSuccess(false);
        setApiError(null);
        try {
            await reconcileStatementApi({ bank_statement_ids: statementIds });
            setApiSuccess(true);
            if (onComplete) {
                onComplete(18);
            }
        } catch (error) {
            console.error("Auto-match failed:", error);
            setApiError("Failed to auto-match transactions.");
            setStep(1);
        }
    };

    const handleViewSuggested = () => {
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                onClick={onClose}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            />

            <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 text-[#0B46AD] rounded-xl flex items-center justify-center flex-shrink-0">
                                    <LuWand className="w-5 h-5 text-[#0B46AD]" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                                    Auto Match Transactions
                                </h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                            The system will automatically compare all unreconciled bank transactions with invoices and deposits using date, amount, and vendor name.
                        </p>

                        <div className="bg-blue-50/70 border border-blue-100/90 rounded-xl p-3.5 flex items-center gap-3">
                            <div className="p-1 bg-blue-100 text-[#0B46AD] rounded-full flex-shrink-0">
                                <FiInfo className="w-4 h-4 text-[#0B46AD]" />
                            </div>
                            <span className="font-semibold text-blue-900 text-xs sm:text-sm">
                                Unreconciled Transactions: {unreconciledCount}
                            </span>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleStartMatch}
                                className="px-6 py-2.5 bg-[#0B46AD] hover:bg-[#093C96] active:bg-[#072F77] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
                            >
                                Start Auto Match
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                                Auto Match in Progress
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-500 font-normal">
                                Please wait while we analyze and match transactions...
                            </p>
                        </div>

                        <div className="space-y-3 py-2">
                            <div className="flex items-center gap-4">
                                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                                    <div
                                        className="bg-[#0B46AD] h-full rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className="font-bold text-slate-800 text-xs sm:text-sm min-w-[36px] text-right">
                                    {progress}%
                                </span>
                            </div>

                            <div className="text-xs font-semibold text-slate-600 pt-1">
                                Matched: <span className="text-slate-900 font-bold">{matchedCount}</span>
                                &nbsp;&nbsp;|&nbsp;&nbsp;
                                Remaining: <span className="text-slate-900 font-bold">{remainingCount}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                                    <FiCheck className="w-6 h-6 stroke-[3]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                                        Auto Match Completed
                                    </h3>
                                    <p className="text-xs text-slate-500 font-normal">
                                        Auto match completed successfully.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4 space-y-1">
                            <h4 className="font-bold text-emerald-900 text-sm">
                                5 matches found
                            </h4>
                            <p className="text-xs sm:text-sm text-emerald-700 font-medium">
                                6 transactions still require review.
                            </p>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                            <button
                                onClick={handleViewSuggested}
                                className="px-6 py-2.5 bg-[#0B46AD] hover:bg-[#093C96] active:bg-[#072F77] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
                            >
                                View Suggested Matches
                            </button>
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
