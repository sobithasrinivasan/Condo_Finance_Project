"use client";

import React from "react";
import { FiAlertTriangle, FiX } from "react-icons/fi";
import { SystemUser } from "@/Components/UserManagement";

interface UserDeleteModelProps {
    isOpen?: boolean;
    onClose?: () => void;
    user?: SystemUser | null;
    onDelete?: (userId: string) => void;
}

export default function UserDeleteModel({
    isOpen = true,
    onClose,
    user,
    onDelete,
}: UserDeleteModelProps) {
    if (!isOpen || !user) return null;

    const handleDelete = () => {
        if (onDelete) {
            onDelete(user.id);
        }
        if (onClose) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans text-slate-800">
            <div
                onClick={onClose}
                className="fixed inset-0 cursor-default"
            />
            <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col p-6 text-center space-y-4">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Close Modal"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                )}

                <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto flex-shrink-0">
                    <FiAlertTriangle className="w-7 h-7" />
                </div>

                <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-slate-900">
                        Delete User Account?
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                        Are you sure you want to delete <span className="font-bold text-slate-800">{user.name}</span> ({user.email})? This action cannot be undone.
                    </p>
                </div>

                <div className="flex justify-center items-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer"
                    >
                        Delete User
                    </button>
                </div>
            </div>
        </div>
    );
}
