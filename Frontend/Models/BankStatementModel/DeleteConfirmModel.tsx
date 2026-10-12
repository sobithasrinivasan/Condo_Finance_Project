"use client";

import React from "react";
import { FiAlertTriangle, FiTrash2, FiX } from "react-icons/fi";

interface DeleteConfirmModelProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    filename: string;
}

export default function DeleteConfirmModel({ isOpen, onClose, onConfirm, filename }: DeleteConfirmModelProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 font-sans">
            <div className="bg-white rounded-2xl max-w-sm w-full shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-red-50 text-[#E11D48]">
                            <FiTrash2 className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">Delete Statement</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <FiX className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200/60 rounded-xl">
                        <FiAlertTriangle className="w-5 h-5 text-[#E11D48] shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-900">
                                Are you sure you want to delete this statement?
                            </p>
                            <p className="text-xs text-slate-500">
                                This will permanently remove{" "}
                                <span className="font-bold text-slate-800">{filename}</span>{" "}
                                and all its associated transactions. This action cannot be undone.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="px-4 py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                        >
                            <FiTrash2 className="w-3.5 h-3.5" />
                            Delete Statement
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
