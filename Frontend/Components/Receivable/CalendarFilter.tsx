"use client";

import React, { useState, useRef, useEffect } from "react";

interface CalendarFilterProps {
    value: string; // YYYY-MM-DD
    onChange: (dateStr: string) => void;
    maxDate?: string; // YYYY-MM-DD (defaults to today)
}

export default function CalendarFilter({ value, onChange, maxDate }: CalendarFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse YYYY-MM-DD safely into Date object (local timezone)
    const parseDate = (dateStr: string) => {
        if (!dateStr) return new Date();
        const [y, m, d] = dateStr.split("-").map(Number);
        return new Date(y, m - 1, d);
    };

    const formatDateToYYYYMMDD = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.split("-").map(Number);
        return `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}/${y}`;
    };

    const getTodayStr = () => {
        const today = new Date();
        return formatDateToYYYYMMDD(today);
    };

    const maxDateStr = maxDate || getTodayStr();

    // View state for month/year navigation in calendar popover
    const initialDate = parseDate(value || getTodayStr());
    const [currentViewDate, setCurrentViewDate] = useState<Date>(
        new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
    );

    // Sync view when value changes
    useEffect(() => {
        const parsed = parseDate(value || getTodayStr());
        setCurrentViewDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }, [value]);

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const viewYear = currentViewDate.getFullYear();
    const viewMonth = currentViewDate.getMonth(); // 0 - 11

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const maxDateParsed = parseDate(maxDateStr);
    const maxYear = maxDateParsed.getFullYear();
    const maxMonth = maxDateParsed.getMonth();

    const isNextMonthDisabled = (viewYear > maxYear) || (viewYear === maxYear && viewMonth >= maxMonth);

    const prevMonth = () => {
        setCurrentViewDate(new Date(viewYear, viewMonth - 1, 1));
    };

    const nextMonth = () => {
        if (isNextMonthDisabled) return;
        const nextMonthDate = new Date(viewYear, viewMonth + 1, 1);
        setCurrentViewDate(nextMonthDate);
    };

    // Calculate grid of days
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    // Build calendar grid days
    const calendarDays = [];

    // Previous month padding days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        const dayNum = daysInPrevMonth - i;
        const d = new Date(viewYear, viewMonth - 1, dayNum);
        const dateStr = formatDateToYYYYMMDD(d);
        calendarDays.push({
            dateStr,
            dayNum,
            isCurrentMonth: false,
            isDisabled: dateStr > maxDateStr,
        });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        const d = new Date(viewYear, viewMonth, dayNum);
        const dateStr = formatDateToYYYYMMDD(d);
        calendarDays.push({
            dateStr,
            dayNum,
            isCurrentMonth: true,
            isDisabled: dateStr > maxDateStr,
        });
    }

    // Next month padding days to fill 35 or 42 cells grid
    const remainingCells = (calendarDays.length > 35 ? 42 : 35) - calendarDays.length;
    for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
        const d = new Date(viewYear, viewMonth + 1, dayNum);
        const dateStr = formatDateToYYYYMMDD(d);
        calendarDays.push({
            dateStr,
            dayNum,
            isCurrentMonth: false,
            isDisabled: dateStr > maxDateStr,
        });
    }

    const handleSelectDay = (dateStr: string, isDisabled: boolean) => {
        if (isDisabled) return; // Prevent selecting future date
        onChange(dateStr);
        setIsOpen(false);
    };

    const handleTodayClick = () => {
        const todayStr = getTodayStr();
        if (todayStr <= maxDateStr) {
            onChange(todayStr);
            setCurrentViewDate(new Date(parseDate(todayStr).getFullYear(), parseDate(todayStr).getMonth(), 1));
            setIsOpen(false);
        }
    };

    const handleClearClick = () => {
        // Fallback/reset to today since empty dates are restricted
        handleTodayClick();
    };

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Input Trigger Button */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white text-slate-800 text-xs rounded-xl border border-slate-200/80 px-4 py-3 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold cursor-pointer shadow-sm hover:border-slate-300"
            >
                <span>{formatDisplayDate(value) || formatDisplayDate(getTodayStr())}</span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.8"
                    stroke="currentColor"
                    className="w-4 h-4 text-slate-400"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                    />
                </svg>
            </div>

            {/* Custom Styled Calendar Dropdown Popover */}
            {isOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 w-72 bg-white rounded-2xl border border-slate-200/90 shadow-xl p-4 transition-all duration-150 animate-in fade-in zoom-in-95">
                    {/* Header: Month Year + Arrows */}
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-slate-800">
                                {monthNames[viewMonth]} {viewYear}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                            <button
                                type="button"
                                onClick={prevMonth}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                                title="Previous Month"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                disabled={isNextMonthDisabled}
                                onClick={nextMonth}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    isNextMonthDisabled
                                        ? "opacity-30 cursor-not-allowed text-slate-300"
                                        : "hover:bg-slate-100 text-slate-600 cursor-pointer"
                                }`}
                                title={isNextMonthDisabled ? "Future month disabled" : "Next Month"}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Weekday Labels */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                            <span key={day} className="text-[11px] font-semibold text-slate-400 py-1">
                                {day}
                            </span>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((cell, idx) => {
                            const isSelected = cell.dateStr === value;
                            const isToday = cell.dateStr === getTodayStr();

                            let cellClass = "h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs font-medium transition-all ";

                            if (cell.isDisabled) {
                                // Future dates disabled styling
                                cellClass += "text-slate-300 cursor-not-allowed opacity-40 select-none";
                            } else if (isSelected) {
                                // Selected date
                                cellClass += "bg-[#1A56DB] text-white font-bold shadow-sm cursor-pointer";
                            } else if (isToday) {
                                // Today's date highlight
                                cellClass += "border border-blue-500 text-blue-600 font-bold hover:bg-blue-50 cursor-pointer";
                            } else if (cell.isCurrentMonth) {
                                // Current month active dates
                                cellClass += "text-slate-700 hover:bg-slate-100 cursor-pointer font-medium";
                            } else {
                                // Other month dates
                                cellClass += "text-slate-300 hover:bg-slate-50 cursor-pointer";
                            }

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    disabled={cell.isDisabled}
                                    onClick={() => handleSelectDay(cell.dateStr, cell.isDisabled)}
                                    className={cellClass}
                                >
                                    {cell.dayNum}
                                </button>
                            );
                        })}
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
                        <button
                            type="button"
                            onClick={handleClearClick}
                            className="text-slate-400 hover:text-slate-600 font-semibold cursor-pointer transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={handleTodayClick}
                            className="text-[#1A56DB] hover:text-blue-700 font-bold cursor-pointer transition-colors"
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
