"use client";

import React, { useState, useEffect } from "react";
import { FiX } from "react-icons/fi";
import { SystemUser } from "@/Components/UserManagement";
import { updateUserApi } from "@/api/UsersApi/userApi";
import toast from "react-hot-toast";

interface UserEditModelProps {
    isOpen?: boolean;
    onClose?: () => void;
    user?: SystemUser | null;
    onSave?: (updatedUser: SystemUser) => void;
}

export default function UserEditModel({
    isOpen = true,
    onClose,
    user,
    onSave,
}: UserEditModelProps) {
    if (!isOpen || !user) return null;

    const [name, setName] = useState(user.name || "");
    const [email, setEmail] = useState(user.email || "");
    const [role, setRole] = useState<"Admin" | "Treasurer" | "Board Member">(user.role || "Board Member");
    const [status, setStatus] = useState<"Active" | "Pending" | "Inactive">(user.status || "Active");
    const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || "+1 (555) 123-4567");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setEmail(user.email || "");
            setRole(user.role || "Board Member");
            setStatus(user.status || "Active");
            setPhoneNumber(user.phoneNumber || "+1 (555) 123-4567");
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) return;

        const initials = name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();

        const updated: SystemUser = {
            ...user,
            name,
            initials: initials || user.initials,
            email,
            role,
            status,
        };

        try {
            setIsLoading(true);
            const response = await updateUserApi(user.id, {
                name,
                email,
                role,
                status,
            });
            const updatedUser = response?.data || response || updated;
            if (onSave) {
                onSave(updatedUser);
            }
            if (onClose) {
                onClose();
            }
        } catch (error: any) {
            console.error("Failed to update user:", error);
            const errorMessage = error?.response?.data?.message || error?.message || "Failed to update user.";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans text-slate-800">
            <div
                onClick={onClose}
                className="fixed inset-0 cursor-default"
            />
            <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        Edit System User
                    </h2>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Close Modal"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
                    <div>
                        <label className="block text-slate-700 font-semibold mb-1.5">
                            Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                    </div>

                    <div>
                        <label className="block text-slate-700 font-semibold mb-1.5">
                            Email Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1.5">
                                User Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as any)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                            >
                                <option value="Admin">Admin</option>
                                <option value="Treasurer">Treasurer</option>
                                <option value="Board Member">Board Member</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-slate-700 font-semibold mb-1.5">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                            >
                                <option value="Active">Active</option>
                                <option value="Pending">Pending</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {/* <div>
                        <label className="block text-slate-700 font-semibold mb-1.5">
                            Phone Number
                        </label>
                        <input
                            type="text"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                    </div> */}

                    <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-5 py-2.5 bg-[#0B46AD] hover:bg-[#093C96] disabled:bg-[#0B46AD]/60 text-white font-bold rounded-xl text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Saving...</span>
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
