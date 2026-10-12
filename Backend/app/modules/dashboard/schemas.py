from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


# Dashboard Summary Schema
class DashboardSummary(BaseModel):
    kpis: dict = Field(default_factory=dict, description="Key performance indicators")
    charts: dict = Field(default_factory=dict, description="Chart data for visualization")
    tables: dict = Field(default_factory=dict, description="Table data for detailed views")

    class Config:
        from_attributes = True


class DashboardSummaryBase(BaseModel):
    ytd_deposits: Decimal = Field(default=0.0, description="Year-to-date deposits")
    expected_deposits: Decimal = Field(default=0.0, description="Expected deposits")
    received_deposits: Decimal = Field(default=0.0, description="Received deposits")
    collection_rate: Decimal = Field(default=0.0, description="Collection rate percentage")
    checking_balance: Decimal = Field(default=0.0, description="Checking account balance")
    pending_vendor_payments: int = Field(default=0, description="Count of pending vendor payments")
    pending_reconciliation: int = Field(default=0, description="Count of pending reconciliations")
    late_hoa_payments: int = Field(default=0, description="Count of late HOA payments")


class DashboardSummaryCreate(DashboardSummaryBase):
    generated_at: Optional[datetime] = None
    created_by: Optional[int] = None


class DashboardSummaryUpdate(BaseModel):
    ytd_deposits: Optional[Decimal] = None
    expected_deposits: Optional[Decimal] = None
    received_deposits: Optional[Decimal] = None
    collection_rate: Optional[Decimal] = None
    checking_balance: Optional[Decimal] = None
    pending_vendor_payments: Optional[int] = None
    pending_reconciliation: Optional[int] = None
    late_hoa_payments: Optional[int] = None
    updated_by: Optional[int] = None
    is_active: Optional[bool] = None


class DashboardSummaryResponse(DashboardSummaryBase):
    id: int
    generated_at: datetime
    created_at: datetime
    created_by: Optional[int]
    updated_at: Optional[datetime]
    updated_by: Optional[int]
    is_active: bool
    version: int

    class Config:
        from_attributes = True


# Dashboard Monthly Income Expense Schema
class DashboardMonthlyIncomeExpenseBase(BaseModel):
    month: str = Field(description="Month in YYYY-MM format")
    total_income: Decimal = Field(default=0.0, description="Total income for the month")
    total_expense: Decimal = Field(default=0.0, description="Total expense for the month")


class DashboardMonthlyIncomeExpenseCreate(DashboardMonthlyIncomeExpenseBase):
    pass


class DashboardMonthlyIncomeExpenseUpdate(BaseModel):
    total_income: Optional[Decimal] = None
    total_expense: Optional[Decimal] = None
    is_active: Optional[bool] = None


class DashboardMonthlyIncomeExpenseResponse(DashboardMonthlyIncomeExpenseBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    is_active: bool
    version: int

    class Config:
        from_attributes = True


# Dashboard Deposit Collection Schema
class DashboardDepositCollectionBase(BaseModel):
    collected_amount: Decimal = Field(default=0.0, description="Amount collected")
    pending_amount: Decimal = Field(default=0.0, description="Amount pending")
    collection_percentage: Decimal = Field(default=0.0, description="Collection percentage")
    report_year: int = Field(description="Year of the report")


class DashboardDepositCollectionCreate(DashboardDepositCollectionBase):
    pass


class DashboardDepositCollectionUpdate(BaseModel):
    collected_amount: Optional[Decimal] = None
    pending_amount: Optional[Decimal] = None
    collection_percentage: Optional[Decimal] = None
    is_active: Optional[bool] = None


class DashboardDepositCollectionResponse(DashboardDepositCollectionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    is_active: bool
    version: int

    class Config:
        from_attributes = True


# Dashboard Upcoming Vendor Payments Schema
class DashboardUpcomingVendorPaymentBase(BaseModel):
    invoice_id: int = Field(description="Invoice ID")
    vendor_id: int = Field(description="Vendor ID")
    vendor_name: str = Field(description="Vendor name")
    due_date: date = Field(description="Due date")
    amount: Decimal = Field(description="Payment amount")
    payment_status: str = Field(description="Payment status")


class DashboardUpcomingVendorPaymentCreate(DashboardUpcomingVendorPaymentBase):
    pass


class DashboardUpcomingVendorPaymentUpdate(BaseModel):
    payment_status: Optional[str] = None
    is_active: Optional[bool] = None


class DashboardUpcomingVendorPaymentResponse(DashboardUpcomingVendorPaymentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    is_active: bool
    version: int

    class Config:
        from_attributes = True


# Dashboard Outstanding Reconciliation Schema
class DashboardOutstandingReconciliationBase(BaseModel):
    reconciliation_id: int = Field(description="Reconciliation record ID")
    bank_transaction_id: int = Field(description="Bank transaction ID")
    reconciliation_type: str = Field(description="Type of reconciliation")
    transaction_date: date = Field(description="Transaction date")
    description: Optional[str] = Field(None, description="Transaction description")
    amount: Decimal = Field(description="Transaction amount")
    reconciliation_status: str = Field(description="Reconciliation status")
    payment_status: Optional[str] = Field(None, description="Payment status")


class DashboardOutstandingReconciliationCreate(DashboardOutstandingReconciliationBase):
    pass


class DashboardOutstandingReconciliationUpdate(BaseModel):
    reconciliation_status: Optional[str] = None
    payment_status: Optional[str] = None
    is_active: Optional[bool] = None


class DashboardOutstandingReconciliationResponse(DashboardOutstandingReconciliationBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    is_active: bool
    version: int

    class Config:
        from_attributes = True


# Dashboard Activity Schema
class DashboardActivityBase(BaseModel):
    activity_type: str = Field(description="Type of activity")
    title: str = Field(description="Activity title")
    description: Optional[str] = Field(None, description="Activity description")
    reference_table: Optional[str] = Field(None, description="Reference table name")
    reference_id: Optional[int] = Field(None, description="Reference record ID")
    status: str = Field(default="Success", description="Activity status")
    icon: Optional[str] = Field(None, description="Activity icon")


class DashboardActivityCreate(DashboardActivityBase):
    created_by: Optional[int] = None


class DashboardActivityUpdate(BaseModel):
    status: Optional[str] = None
    is_active: Optional[bool] = None


class DashboardActivityResponse(DashboardActivityBase):
    id: int
    created_at: datetime
    created_by: Optional[int]
    is_active: bool
    version: int

    class Config:
        from_attributes = True