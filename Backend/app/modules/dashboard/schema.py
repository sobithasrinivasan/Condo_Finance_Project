from datetime import date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class KPIs(BaseModel):
    ytd_deposits: Decimal = Decimal("0.00")
    expected_deposits: Decimal = Decimal("0.00")
    received_deposits: Decimal = Decimal("0.00")
    received_deposits_pct: float = 0.0
    checking_balance: Decimal = Decimal("0.00")
    money_market_balance: Decimal = Decimal("0.00")
    pending_invoices_count: int = 0
    pending_reconciliation_count: int = 0
    late_invoices_count: int = 0


class MonthlyIncomeExpense(BaseModel):
    txn_month: str
    total_income: Decimal = Decimal("0.00")
    total_expense: Decimal = Decimal("0.00")


class DepositCollectionYtd(BaseModel):
    expected: Decimal = Decimal("0.00")
    collected: Decimal = Decimal("0.00")
    pending: Decimal = Decimal("0.00")
    collection_pct: float = 0.0


class ExpenseSummaryItem(BaseModel):
    category: str
    total_amount: Decimal = Decimal("0.00")
    pct: float = 0.0


class Charts(BaseModel):
    monthly_income_expense: list[MonthlyIncomeExpense] = []
    deposit_collection_ytd: DepositCollectionYtd = DepositCollectionYtd()
    expense_summary_ytd: list[ExpenseSummaryItem] = []


class UpcomingVendorPayment(BaseModel):
    vendor_name: str
    due_date: Optional[date] = None
    amount: Decimal = Decimal("0.00")
    status: str = "Pending"


class OutstandingReconciliation(BaseModel):
    id: int
    matched_entity_type: Optional[str] = None
    status: str = "Unmatched"
    difference: Optional[Decimal] = Decimal("0.00")
    transaction_date: Optional[date] = None


class Tables(BaseModel):
    upcoming_vendor_payments: list[UpcomingVendorPayment] = []
    outstanding_reconciliation: list[OutstandingReconciliation] = []


class DashboardSummary(BaseModel):
    kpis: KPIs
    charts: Charts
    tables: Tables


class ActivityItem(BaseModel):
    id: Optional[int | str] = None
    title: str
    description: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[str] = None
    activity_type: Optional[str] = None


class ActivitiesResponse(BaseModel):
    activities: list[ActivityItem] = []
