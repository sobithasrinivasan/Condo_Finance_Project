import React, { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { emailRegex } from '@/lib/regex'

type AdduserModelProps = {
    setIsAddUserOpen: any
    handleAddUser: any
    newUserName: any
    setNewUserName: any
    newUserEmail: any
    setNewUserEmail: any
    newUserRole: any
    setNewUserRole: any
}

export default function AddUserModel({ setIsAddUserOpen, handleAddUser, newUserName, setNewUserName, newUserEmail, setNewUserEmail, newUserRole, setNewUserRole }: AdduserModelProps) {
    const [nameError, setNameError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const validate = () => {
        let isValid = true;

        if (!newUserName || !newUserName.trim()) {
            setNameError("Full name is required");
            isValid = false;
        } else if (newUserName.trim().length < 2) {
            setNameError("Full name must be at least 2 characters long");
            isValid = false;
        } else {
            setNameError("");
        }

        if (!newUserEmail || !newUserEmail.trim()) {
            setEmailError("Email is required");
            isValid = false;
        } else if (!emailRegex(newUserEmail.trim())) {
            setEmailError("Email is invalid");
            isValid = false;
        } else {
            setEmailError("");
        }

        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            try {
                setIsLoading(true);
                await handleAddUser(e);
            } catch (error) {
                console.error("Failed to add user:", error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div
                onClick={() => setIsAddUserOpen(false)}
                className="fixed inset-0 cursor-default"
            />
            <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Add System User
                    </h2>
                    <button
                        onClick={() => setIsAddUserOpen(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
                    <div>
                        <label className="block text-slate-700 font-semibold mb-1.5">
                            Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={newUserName}
                            onChange={(e) => {
                                setNewUserName(e.target.value);
                                setNameError("");
                            }}
                            placeholder="e.g. Sarah Connor"
                            className={`w-full border ${nameError ? "border-red-500 focus:ring-red-500" : "border-slate-200 focus:ring-blue-500"} rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 bg-white`}
                        />
                        {nameError && (
                            <p className="text-red-500 text-xs mt-1 font-semibold">
                                {nameError}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-slate-700 font-semibold mb-1.5">
                            Email Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => {
                                setNewUserEmail(e.target.value);
                                setEmailError("");
                            }}
                            placeholder="sarah@condo.com"
                            className={`w-full border ${emailError ? "border-red-500 focus:ring-red-500" : "border-slate-200 focus:ring-blue-500"} rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 bg-white`}
                        />
                        {emailError && (
                            <p className="text-red-500 text-xs mt-1 font-semibold">
                                {emailError}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-slate-700 font-semibold mb-1.5">
                            Assign Role
                        </label>
                        <select
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value as any)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                        >
                            <option value="Board Member">Board Member</option>
                            <option value="Treasurer">Treasurer</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>

                    <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsAddUserOpen(false)}
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
                                    <span>Adding...</span>
                                </>
                            ) : (
                                "Add User"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
