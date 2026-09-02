import calendar
from datetime import date, datetime
import re

MONTH_MAP = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]


def format_period_display(period_start: any, period_end: any = None) -> str:
    """
    Given a period_start date and optional period_end date, formats them into a clean string like:
    - 'September 2026' (if single month)
    - 'September 2026 to December 2026' (if multi-month range)
    """
    if not period_start:
        now = datetime.now()
        return f"{MONTH_NAMES[now.month]} {now.year}"

    if isinstance(period_start, str):
        _, _, display = parse_period_input(period_start)
        return display

    if isinstance(period_start, (datetime, date)):
        s_display = f"{MONTH_NAMES[period_start.month]} {period_start.year}"
        if not period_end or not isinstance(period_end, (datetime, date)):
            return s_display
        if period_start.year == period_end.year and period_start.month == period_end.month:
            return s_display
        e_display = f"{MONTH_NAMES[period_end.month]} {period_end.year}"
        return f"{s_display} to {e_display}"

    return str(period_start)


def parse_period_input(period_str: str) -> tuple[str, str, str]:
    """
    Parses any period string (e.g. '2026-09', 'September 2026', 'september 2026 to december 2026', '2026-09 to 2026-12', '2026')
    into (start_date_iso, end_date_iso, display_string).
    """
    raw = str(period_str or "").strip()
    if not raw:
        now = datetime.now()
        start = date(now.year, now.month, 1)
        _, last_day = calendar.monthrange(now.year, now.month)
        end = date(now.year, now.month, last_day)
        display = f"{MONTH_NAMES[now.month]} {now.year}"
        return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"), display

    # Check for range separators like ' to ', ' - ', ' through ', ' until '
    parts = re.split(r"\s+(?:to|-|through|until)\s+", raw, flags=re.IGNORECASE)
    if len(parts) == 2:
        s1, _, d1 = parse_single_period_chunk(parts[0])
        _, e2, d2 = parse_single_period_chunk(parts[1])
        display = f"{d1} to {d2}"
        return s1, e2, display

    return parse_single_period_chunk(raw)


def parse_single_period_chunk(p: str) -> tuple[str, str, str]:
    p = p.strip()

    # Case 1: YYYY-MM or YYYY-MM-DD
    m_iso = re.match(r"^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$", p)
    if m_iso:
        year = int(m_iso.group(1))
        month = int(m_iso.group(2))
        month = min(max(month, 1), 12)
        _, last_day = calendar.monthrange(year, month)
        start = date(year, month, 1)
        end = date(year, month, last_day)
        display = f"{MONTH_NAMES[month]} {year}"
        return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"), display

    # Case 2: Month YYYY (e.g. September 2026, sep 2026)
    m_month_year = re.match(r"^([a-zA-Z]+)\s*[-/,\s]?\s*(\d{4})$", p)
    if m_month_year:
        m_str = m_month_year.group(1).lower()
        year = int(m_month_year.group(2))
        if m_str in MONTH_MAP:
            month = MONTH_MAP[m_str]
            _, last_day = calendar.monthrange(year, month)
            start = date(year, month, 1)
            end = date(year, month, last_day)
            display = f"{MONTH_NAMES[month]} {year}"
            return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"), display

    # Case 3: YYYY Month (e.g. 2026 September)
    m_year_month = re.match(r"^(\d{4})\s*[-/,\s]?\s*([a-zA-Z]+)$", p)
    if m_year_month:
        year = int(m_year_month.group(1))
        m_str = m_year_month.group(2).lower()
        if m_str in MONTH_MAP:
            month = MONTH_MAP[m_str]
            _, last_day = calendar.monthrange(year, month)
            start = date(year, month, 1)
            end = date(year, month, last_day)
            display = f"{MONTH_NAMES[month]} {year}"
            return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"), display

    # Case 4: Full Year alone (e.g. 2026)
    if re.match(r"^\d{4}$", p):
        year = int(p)
        start = date(year, 1, 1)
        end = date(year, 12, 31)
        display = f"January {year} to December {year}"
        return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"), display

    # Fallback to current month
    now = datetime.now()
    start = date(now.year, now.month, 1)
    _, last_day = calendar.monthrange(now.year, now.month)
    end = date(now.year, now.month, last_day)
    display = f"{MONTH_NAMES[now.month]} {now.year}"
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"), display
