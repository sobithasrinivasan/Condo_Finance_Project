"use client";

import Header from "@/Components/Header";
import Sidebar from "@/Components/Sidebar";
import { usePathname } from "next/navigation";
import React from "react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathName = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [association, setAssociation] = React.useState<any>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedAssociation");
      if (stored) {
        setAssociation(JSON.parse(stored));
      } else {
        setAssociation({
          name: "Bayshore Condominium",
          address: "123 Bayshore Ave, Miami, FL",
          established: "2015"
        });
      }
    }
  }, [pathName]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-50">
      <Header
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      />
      <div className="flex flex-1 overflow-hidden">
        {pathName != "/home" && (
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
          />
        )}
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          {pathName !== "/home" && association && (
            <div className="w-full bg-white border-b border-slate-200/80 px-6 py-2 flex items-center justify-between shadow-xs select-none animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0 border border-slate-200/60">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4.5 h-4.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h18v18H3V3Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 tracking-tight leading-tight">
                    {association.name}
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {association.address}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-2 py-0.5 bg-slate-50 rounded border border-slate-200/60 w-fit">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                  Est
                </span>
                <span className="text-[10px] font-bold text-slate-800 bg-white border border-slate-200/80 px-1.5 py-0.5 rounded font-sans">
                  {association.established}
                </span>
              </div>
            </div>
          )}
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
