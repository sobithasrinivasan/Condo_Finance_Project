"use client";

import { LoginPostApi } from "@/api/Login/Login";
import { emailRegex } from "@/lib/regex";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import toast from "react-hot-toast";
import { setUser } from "@/lib/localStore";

export default function SignIn() {

    const [userDetail, setUserDetail] = useState({
        role: "Admin",
        email: "",
        emailError: "",
        password: "",
        passwordError: "",
        roleError: ""
    })
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter()

    const validate = () => {
        let obj = {
            email: false,
            password: false,
            role: false
        }

        if (userDetail.email == "") {
            obj.email = false
            setUserDetail((pre) => ({ ...pre, emailError: "Email is required" }))
        } else {
            if (!emailRegex(userDetail?.email)) {
                obj.email = false
                setUserDetail((pre) => ({ ...pre, emailError: "Email is invalid" }))
            } else {
                obj.email = true
                setUserDetail((pre) => ({ ...pre, emailError: "" }))
            }
        }

        if (userDetail.password == "") {
            obj.password = false
            setUserDetail((pre) => ({ ...pre, passwordError: "Password is required" }))
        } else {
            if (userDetail.password.length < 8) {
                obj.password = false
                setUserDetail((pre) => ({ ...pre, passwordError: "Password must be at least 8 characters long" }))
            } else {
                obj.password = true
                setUserDetail((pre) => ({ ...pre, passwordError: "" }))
            }
        }

        if (userDetail.role == "") {
            obj.role = false
            setUserDetail((pre) => ({ ...pre, roleError: "Role is required" }))
        } else {
            obj.role = true
            setUserDetail((pre) => ({ ...pre, roleError: "" }))
        }

        return Object.values(obj).every((value) => value === true);
    }

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (validate()) {
            let payload = {
                role: userDetail.role,
                email: userDetail.email,
                password_hash: userDetail.password
            };
            setIsLoading(true);
            try {
                const res: any = await LoginPostApi(payload);
                if (res) {
                    toast.success("Successfully signed in!");
                    setUser(res)
                    router.push('/home');
                } else {
                    toast.error("Failed to sign in. Please verify your credentials.");
                }
            } catch (error: any) {
                const errorMsg = error?.response?.data?.detail || error?.message || "Invalid email or password. Please try again.";
                toast.error(`Login failed: ${errorMsg}`);
            } finally {
                setIsLoading(false);
            }
        };
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#F3F6FA] via-[#F8FAFD] to-[#ECF2FA] flex items-center justify-center p-6 md:p-16 relative font-sans overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/5 blur-[120px] pointer-events-none" />

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center relative z-10">
                <div className="flex flex-col justify-center text-left lg:pr-12">
                    <span className="text-xs font-bold tracking-widest text-[#5B6E88] uppercase mb-4">
                        Condo Association Financial Management System
                    </span>
                    <h1 className="text-xl md:text-6xl font-bold tracking-tight text-[#0A1C3A] leading-[1.1] mb-6">
                        Welcome <br />
                        back
                    </h1>
                    <p className="text-sm md:text-base text-slate-500 leading-relaxed max-w-md">
                        Manage association finances, monitor monthly deposits, track expenses, and access financial records with ease.
                    </p>
                </div>

                <div className="flex justify-center lg:justify-end">
                    <div className="w-full max-w-[420px] bg-white rounded-3xl p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100/80">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Sign In
                        </h2>
                        <p className="text-[13px] text-slate-400 mt-1 mb-8">
                            Use your registered work credentials.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold text-[#5B6E88] tracking-wider uppercase mb-2">
                                    ROLE
                                </label>
                                <div className="relative">
                                    <select
                                        value={userDetail.role}
                                        onChange={(e) => setUserDetail((pre) => ({ ...pre, role: e.target.value, roleError: "" }))}
                                        className={`w-full bg-[#ECF2FA] text-slate-800 text-sm rounded-xl border px-4 py-2 pr-10 appearance-none focus:outline-none focus:bg-slate-100/80 focus:border-slate-200 transition-all font-medium cursor-pointer ${userDetail.roleError ? "border-red-500" : "border-transparent"}`}
                                    >
                                        <option value="Admin">Admin</option>
                                        <option value="Manager">Manager</option>
                                    </select>
                                    {userDetail.roleError && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {userDetail.roleError}
                                        </p>
                                    )}
                                    <div className={`absolute right-4 ${userDetail.roleError ? "top-5" : "top-1/2"} -translate-y-1/2 pointer-events-none text-slate-400`}>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="2"
                                            stroke="currentColor"
                                            className="w-4 h-4"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="m19.5 8.25-7.5 7.5-7.5-7.5"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-[#5B6E88] tracking-wider uppercase mb-2">
                                    EMAIL
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="name@example.com"
                                        value={userDetail.email}
                                        onChange={(e) => setUserDetail((pre) => ({ ...pre, email: e.target.value, emailError: "" }))}
                                        className={`${userDetail?.emailError ? "border-red-500" : "border-transparent"} w-full bg-[#ECF2FA] text-slate-800 text-sm rounded-xl border  pl-11 pr-4 py-2 focus:outline-none focus:bg-slate-100/80 focus:border-slate-200 transition-all font-medium placeholder-slate-400`}
                                    />
                                    {userDetail.emailError && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {userDetail.emailError}
                                        </p>
                                    )}
                                    <div className={`absolute left-4 ${userDetail.emailError ? "top-5" : "top-1/2"} -translate-y-1/2 text-slate-400`}>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="1.8"
                                            stroke="currentColor"
                                            className="w-5 h-5"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-[#5B6E88] tracking-wider uppercase mb-2">
                                    PASSWORD
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={userDetail.password}
                                        onChange={(e) => setUserDetail((pre) => ({ ...pre, password: e.target.value, passwordError: "" }))}
                                        className={`${userDetail?.passwordError ? "border-red-500" : "border-transparent"} w-full bg-[#ECF2FA] text-slate-800 text-sm rounded-xl border  pl-11 pr-11 py-2 focus:outline-none focus:bg-slate-100/80 focus:border-slate-200 transition-all font-medium placeholder-slate-400`}
                                    />
                                    {userDetail.passwordError && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {userDetail.passwordError}
                                        </p>
                                    )}
                                    <div className={`absolute left-4 ${userDetail.passwordError ? "top-5" : "top-1/2"} -translate-y-1/2 text-slate-400`}>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="1.8"
                                            stroke="currentColor"
                                            className="w-5 h-5"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                                            />
                                        </svg>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <HiOutlineEye />
                                        ) : (
                                            <HiOutlineEyeOff />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#1347c6] hover:bg-[#002677] active:bg-[#0E3A9E] disabled:bg-blue-800/60 disabled:cursor-not-allowed text-white font-bold text-sm py-2 px-4 rounded-xl transition-all shadow-sm mt-6 cursor-pointer flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Signing In...</span>
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </button>
                        </form>

                        <span className="text-[10px] text-slate-400 text-center mt-6 block">
                            By signing in you agree to internal security and access policy.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
