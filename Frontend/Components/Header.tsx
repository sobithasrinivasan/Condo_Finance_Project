"use client"

import { getUser, removeUser } from "@/lib/localStore";
import Link from "next/link";
import React from "react";
import toast from "react-hot-toast";
import { usePathname, useRouter } from "next/navigation";

interface HeaderProps {
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Header({ isSidebarCollapsed, setIsSidebarCollapsed }: HeaderProps) {
    const router = useRouter();
    const pathName = usePathname();
    const [user, setUser] = React.useState<any>(null);
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

    const segments = pathName.split("/").filter(Boolean);
    const showBreadcrumbs = pathName !== "/home" && segments.length > 0;

    React.useEffect(() => {
        setUser(getUser());
    }, []);

    return (
        <header className="w-full bg-[#0A1C3B] px-6 py-3 flex items-center justify-between shadow-sm select-none relative">
            <div className="flex items-center gap-34 flex-1">
                <Link href={"/home"} className="text-lg font-medium text-white tracking-wide">
                    Condo Finance
                </Link>
                {showBreadcrumbs && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold font-sans select-none">
                        <Link
                            href="/home"
                            className="hover:text-white text-slate-400 transition-colors capitalize text-[14px]"
                        >
                            home
                        </Link>
                        {segments.map((segment, index) => {
                            const href = "/" + segments.slice(0, index + 1).join("/");
                            const isLast = index === segments.length - 1;
                            const label = segment.replace(/-/g, " ");
                            console.log(isLast, 'label')

                            return (
                                <React.Fragment key={href}>
                                    <span className="text-slate-500 font-normal">/</span>
                                    {isLast ? (
                                        <>
                                            {label === "review extracted" && <>
                                                <Link
                                                    href={"/invoices/gmail-import"}
                                                    className="hover:text-white text-slate-400 transition-colors capitalize text-[14px]"
                                                >
                                                    Gmail Import
                                                </Link>
                                                <span className="text-slate-500 font-normal">/</span>
                                            </>}
                                            <span className="text-white capitalize font-bold text-[14px]">
                                                {label}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Link
                                                href={href}
                                                className="hover:text-white text-slate-400 transition-colors capitalize text-[14px]"
                                            >
                                                {label}
                                            </Link>
                                        </>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="relative">
                <div
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`flex items-center gap-3 ${pathName == "/home" ? "cursor-pointer" : ""} hover:opacity-90 transition-opacity`}
                >
                    <div className="w-9 h-9 rounded-full bg-[#1A56DB] flex items-center justify-center text-white font-bold text-[13px]">
                        {user?.email?.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex flex-col text-left justify-center">
                        <span className="text-sm font-bold text-white leading-tight">
                            {user?.email}
                        </span>
                        <span className="text-[10px] font-bold text-blue-200/80 tracking-wider uppercase mt-0.5 leading-none">
                            {user?.role}
                        </span>
                    </div>
                </div>

                {pathName == "/home" && isDropdownOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40 cursor-default"
                            onClick={() => setIsDropdownOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-100">
                            <button
                                onClick={() => {
                                    setIsDropdownOpen(false);
                                    setIsConfirmOpen(true);
                                }}
                                className="w-full flex items-center gap-2.5 px-4 py-1 text-[13px] font-semibold text-rose-600 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.8"
                                    stroke="currentColor"
                                    className="w-4 h-4"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
                                    />
                                </svg>
                                Logout
                            </button>
                        </div>
                    </>
                )}
            </div>

            {pathName == "/home" && isConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200 text-slate-800">
                        <h3 className="text-base font-bold text-slate-900 mb-2">Confirm Logout</h3>
                        <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
                            Are you sure you want to sign out of your account? Any unsaved changes may be lost.
                        </p>
                        <div className="flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setIsConfirmOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    removeUser();
                                    toast.success("Successfully logged out");
                                    setIsConfirmOpen(false);
                                    router.push("/auth/sign-in");
                                }}
                                className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
