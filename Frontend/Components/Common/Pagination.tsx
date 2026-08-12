"use client";

import React from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    rowsPerPage?: number;
    onPageChange: (page: number) => void;
    description?: string;
}

export default function Pagination({
    currentPage,
    totalPages,
    totalCount,
    rowsPerPage = 10,
    onPageChange,
    description,
}: PaginationProps) {
    if (totalCount === 0) return null;

    const getPageNumbers = () => {
        const range: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                range.push(i);
            }
        } else {
            range.push(1);

            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            if (currentPage <= 2) {
                end = 3;
            }
            if (currentPage >= totalPages - 1) {
                start = totalPages - 2;
            }

            if (start > 2) {
                range.push("...");
            }

            for (let i = start; i <= end; i++) {
                range.push(i);
            }

            if (end < totalPages - 1) {
                range.push("...");
            }

            range.push(totalPages);
        }
        return range;
    };

    const showingFrom = totalCount > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0;
    const showingTo = Math.min(currentPage * rowsPerPage, totalCount);
    const defaultDescription = `Showing ${showingFrom} to ${showingTo} of ${totalCount} entries`;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 border-t border-slate-100 bg-slate-50/20 text-xs font-semibold text-slate-500 w-full rounded-b-2xl">
            <div className="text-slate-400 font-medium">
                {description || defaultDescription}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center gap-1.5 select-none">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        title="Previous Page"
                        className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                        <FiChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {getPageNumbers().map((p, idx) => {
                        if (p === "...") {
                            return (
                                <span
                                    key={`ellipsis-${idx}`}
                                    className="w-8 h-8 flex items-center justify-center text-slate-400 font-medium select-none"
                                >
                                    ...
                                </span>
                            );
                        }

                        const pageNum = p as number;
                        return (
                            <button
                                key={`page-${pageNum}`}
                                onClick={() => onPageChange(pageNum)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold transition-all cursor-pointer ${currentPage === pageNum
                                    ? "bg-[#0B1E48] text-white shadow-xs"
                                    : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                                    }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}

                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        title="Next Page"
                        className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                        <FiChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}
