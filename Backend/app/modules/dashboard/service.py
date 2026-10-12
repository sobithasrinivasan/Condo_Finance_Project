from collections import defaultdict
from datetime import date
from decimal import Decimal

from .repository import DashboardRepository


class DashboardService:

    def __init__(self, db):
        self.db = db
        self.repo = DashboardRepository(db)

    @staticmethod
    def _normalize_text(value: str | None) -> str:
        return "".join(ch.lower() for ch in (value or "") if ch.isalnum() or ch.isspace()).strip()

    def _categorize_expense(self, description: str, vendors: list[dict]) -> str:
        normalized_description = self._normalize_text(description)

        for vendor in vendors:
            vendor_name = self._normalize_text(vendor.get("name"))
            if not vendor_name:
                continue

            vendor_tokens = [token for token in vendor_name.split() if len(token) >= 4]
            if vendor_name in normalized_description or any(token in normalized_description for token in vendor_tokens):
                return vendor.get("category") or "Other"

        keyword_categories = (
            ("insurance", "Insurance"),
            ("plumbing", "Repairs"),
            ("repair", "Repairs"),
            ("maintenance", "Maintenance"),
            ("landscap", "Landscaping"),
            ("electric", "Utilities"),
            ("gas", "Utilities"),
            ("utility", "Utilities"),
            ("water", "Utilities"),
            ("communication", "Telephone Provider"),
            ("phone", "Telephone Provider"),
            ("internet", "Telephone Provider"),
        )

        for keyword, category in keyword_categories:
            if keyword in normalized_description:
                return category

        return "Other"

    def _build_expense_summary(self, transactions: list[dict], vendors: list[dict]) -> list[dict]:
        category_totals: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        for transaction in transactions:
            amount = transaction.get("amount") or Decimal("0")
            category = self._categorize_expense(transaction.get("description", ""), vendors)
            category_totals[category] += amount

        total_expense = sum(category_totals.values(), Decimal("0"))
        if total_expense <= 0:
            return []

        sorted_items = sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
        if len(sorted_items) > 5:
            top_items = sorted_items[:4]
            other_total = sum((amount for _, amount in sorted_items[4:]), Decimal("0"))
            sorted_items = top_items + [("Other", other_total)]

        summary: list[dict] = []
        for category, amount in sorted_items:
            pct = float((amount / total_expense) * 100) if total_expense else 0.0
            summary.append({
                "category": category,
                "total_amount": amount,
                "pct": round(pct, 2),
            })

        return summary

    def get_summary(self) -> dict:
        self._sync_dashboard_tables()

        deposit_collection = self.repo.get_deposit_collection_ytd()
        vendors = self.repo.get_active_vendors()
        expense_summary = self._build_expense_summary(
            self.repo.get_ytd_expense_transactions(),
            vendors,
        )

        kpis = {
            "ytd_deposits": deposit_collection["collected"],
            "expected_deposits": deposit_collection["expected"],
            "received_deposits": deposit_collection["collected"],
            "received_deposits_pct": deposit_collection["collection_pct"],
            "checking_balance": self.repo.get_checking_balance(),
            "money_market_balance": self.repo.get_money_market_balance(),
            "pending_invoices_count": self.repo.get_pending_invoices_count(),
            "pending_reconciliation_count": self.repo.get_pending_reconciliation_count(),
            "late_invoices_count": self.repo.get_late_hoa_units_count(),
        }

        charts = {
            "monthly_income_expense": self.repo.get_monthly_income_expense(),
            "deposit_collection_ytd": deposit_collection,
            "expense_summary_ytd": expense_summary,
        }

        tables = {
            "upcoming_vendor_payments": self._format_vendor_payments(
                self.repo.get_upcoming_vendor_payments(limit=10)
            ),
            "outstanding_reconciliation": self._format_outstanding_reconciliation(
                self.repo.get_outstanding_reconciliation(limit=10)
            ),
        }

        return {"kpis": kpis, "charts": charts, "tables": tables}

    @staticmethod
    def _format_vendor_payments(rows: list[dict]) -> list[dict]:
        return [
            {
                "vendor_name": row.get("vendor_name"),
                "due_date": row.get("due_date"),
                "amount": row.get("amount"),
                "status": row.get("status"),
            }
            for row in rows
        ]

    @staticmethod
    def _format_outstanding_reconciliation(rows: list[dict]) -> list[dict]:
        return [
            {
                "id": row.get("id"),
                "matched_entity_type": row.get("description")
                    or row.get("reconciliation_type")
                    or f"ID #{row.get('id')}",
                "status": row.get("status"),
                "difference": row.get("amount", 0),
                "bank_transaction_id": row.get("bank_transaction_id"),
                "transaction_date": row.get("transaction_date"),
            }
            for row in rows
        ]

    def _sync_dashboard_tables(self) -> dict:
        """Recompute and persist dashboard tables from the source data tables."""
        results = {
            "summary_updated": False,
            "monthly_data_updated": False,
            "deposit_collection_updated": False,
            "vendor_payments_updated": False,
            "reconciliation_updated": False,
        }

        try:
            deposit_collection = self.repo.get_deposit_collection_ytd()
            checking_balance = self.repo.get_checking_balance()
            monthly_income_expense = self.repo.get_monthly_income_expense()
            upcoming_vendor_payments = self.repo.get_upcoming_vendor_payments(limit=10)
            outstanding_reconciliation = self.repo.get_outstanding_reconciliation(limit=10)

            collection_rate = 0.0
            if deposit_collection["expected"] > 0:
                collection_rate = float((deposit_collection["collected"] / deposit_collection["expected"]) * 100)

            summary_data = {
                "ytd_deposits": deposit_collection["collected"],
                "expected_deposits": deposit_collection["expected"],
                "received_deposits": deposit_collection["collected"],
                "collection_rate": collection_rate,
                "checking_balance": checking_balance,
                "pending_vendor_payments": self.repo.get_pending_invoices_count(),
                "pending_reconciliation": self.repo.get_pending_reconciliation_count(),
                "late_hoa_payments": self.repo.get_late_hoa_units_count(),
            }

            results["summary_updated"] = self.repo.populate_dashboard_summary(summary_data)
            results["monthly_data_updated"] = self.repo.populate_monthly_income_expense(monthly_income_expense)
            results["deposit_collection_updated"] = self.repo.populate_deposit_collection(
                deposit_collection, date.today().year
            )
            results["vendor_payments_updated"] = self.repo.populate_upcoming_vendor_payments(upcoming_vendor_payments)
            results["reconciliation_updated"] = self.repo.populate_outstanding_reconciliation(outstanding_reconciliation)
        except Exception:
            # Never fail the summary read because the dashboard sync failed.
            pass

        return results
