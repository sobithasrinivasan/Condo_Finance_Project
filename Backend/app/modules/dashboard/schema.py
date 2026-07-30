from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class KPIs(BaseModel):
    ytd_deposits: Decimal
    received_deposits: Decimal
    received_deposits_pct: float
    checking_balance: Decimal
    pending_invoices_count: int
    pending_reconciliation_count: int
    late_invoices_count: int


class MonthlyIncomeExpense(BaseModel):
    txn_month: str
    total_income: Decimal
    total_expense: Decimal


class ExpenseSummaryItem(BaseModel):
    category: str
    total_amount: Decimal
    pct: float


class Charts(BaseModel):
    monthly_income_expense: list[MonthlyIncomeExpense]
    expense_summary_ytd: list[ExpenseSummaryItem]


class UpcomingVendorPayment(BaseModel):
    vendor_name: str
    due_date: date
    amount: Decimal
    status: str


class OutstandingReconciliation(BaseModel):
    id: int
    matched_entity_type: str
    status: str
    difference: Decimal | None


class Tables(BaseModel):
    upcoming_vendor_payments: list[UpcomingVendorPayment]
    outstanding_reconciliation: list[OutstandingReconciliation]


class DashboardSummary(BaseModel):
    kpis: KPIs
    charts: Charts
    tables: Tables
