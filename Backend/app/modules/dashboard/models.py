from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

# Dashboard Summary Table
TABLE_DASHBOARD_SUMMARY = "dashboard_summary"

@dataclass
class DashboardSummary:
    id: Optional[int] = None
    ytd_deposits: float = 0.0
    expected_deposits: float = 0.0
    received_deposits: float = 0.0
    collection_rate: float = 0.0
    checking_balance: float = 0.0
    pending_vendor_payments: int = 0
    pending_reconciliation: int = 0
    late_hoa_payments: int = 0
    generated_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[int] = None
    is_active: bool = True
    version: int = 1


# Dashboard Monthly Income Expense Table
TABLE_DASHBOARD_MONTHLY_INCOME_EXPENSE = "dashboard_monthly_income_expense"

@dataclass
class DashboardMonthlyIncomeExpense:
    id: Optional[int] = None
    month: str = ""
    total_income: float = 0.0
    total_expense: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_active: bool = True
    version: int = 1


# Dashboard Deposit Collection Table
TABLE_DASHBOARD_DEPOSIT_COLLECTION = "dashboard_deposit_collection"

@dataclass
class DashboardDepositCollection:
    id: Optional[int] = None
    collected_amount: float = 0.0
    pending_amount: float = 0.0
    collection_percentage: float = 0.0
    report_year: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_active: bool = True
    version: int = 1


# Dashboard Upcoming Vendor Payments Table
TABLE_DASHBOARD_UPCOMING_VENDOR_PAYMENTS = "dashboard_upcoming_vendor_payments"

@dataclass
class DashboardUpcomingVendorPayment:
    id: Optional[int] = None
    invoice_id: int = 0
    vendor_id: int = 0
    vendor_name: str = ""
    due_date: Optional[date] = None
    amount: float = 0.0
    payment_status: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_active: bool = True
    version: int = 1


# Dashboard Outstanding Reconciliation Table
TABLE_DASHBOARD_OUTSTANDING_RECONCILIATION = "dashboard_outstanding_reconciliation"

@dataclass
class DashboardOutstandingReconciliation:
    id: Optional[int] = None
    reconciliation_id: int = 0
    bank_transaction_id: int = 0
    reconciliation_type: str = ""
    transaction_date: Optional[date] = None
    description: Optional[str] = None
    amount: float = 0.0
    reconciliation_status: str = ""
    payment_status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_active: bool = True
    version: int = 1


# Dashboard Activity Table
TABLE_DASHBOARD_ACTIVITY = "dashboard_activity"

@dataclass
class DashboardActivity:
    id: Optional[int] = None
    activity_type: str = ""
    title: str = ""
    description: Optional[str] = None
    reference_table: Optional[str] = None
    reference_id: Optional[int] = None
    status: str = "Success"
    icon: Optional[str] = None
    created_at: Optional[datetime] = None
    created_by: Optional[int] = None
    is_active: bool = True
    version: int = 1