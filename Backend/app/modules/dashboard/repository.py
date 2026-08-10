from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from app.modules.bank_reconciliation.model import TABLE_NAME as TABLE_RECONCILIATION_RECORDS
from app.modules.invoice.model import TABLE_NAME as TABLE_INVOICES
from app.modules.statement.model import TABLE_STATEMENTS, TABLE_TRANSACTIONS
from app.modules.vendor.models import TABLE_NAME as TABLE_VENDORS
from .models import (
    TABLE_DASHBOARD_SUMMARY,
    TABLE_DASHBOARD_MONTHLY_INCOME_EXPENSE,
    TABLE_DASHBOARD_DEPOSIT_COLLECTION,
    TABLE_DASHBOARD_UPCOMING_VENDOR_PAYMENTS,
    TABLE_DASHBOARD_OUTSTANDING_RECONCILIATION,
    TABLE_DASHBOARD_ACTIVITY,
)


TABLE_CONDO_UNITS = "condo_units"

PLACEHOLDER_VENDOR_NAMES = {
    "string", "test", "testvendor", "test vendor", "sample", "samplevendor",
    "sample vendor", "null", "none", "n/a", "na", "unknown", "abc", "xyz",
}


class DashboardRepository:
    MONEY_MARKET_KEYWORDS = (
        "money market", "money mkt", "mmkt", "mm account", "savings",
        "savings account", "certificate of deposit", "cd account",
        "money market deposit", "treasury",
    )

    def __init__(self, db):
        self.db = db

    @staticmethod
    def _is_placeholder_name(name: str | None) -> bool:
        normalized = (name or "").strip().lower()
        return normalized in PLACEHOLDER_VENDOR_NAMES

    def get_summary(self) -> dict:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM vw_dashboard_summary")
        return cursor.fetchone() or {}

    def _latest_statement_ids(self) -> list[int]:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            f"""
            SELECT MAX(id) AS id
            FROM {TABLE_STATEMENTS}
            WHERE is_active = 1
            GROUP BY period_year, period_month
            ORDER BY period_year, period_month
            """
        )
        return [row["id"] for row in cursor.fetchall() if row.get("id") is not None]

    def _keyword_clause(self, keywords: tuple[str, ...]) -> tuple[str, list[str]]:
        fragments: list[str] = []
        params: list[str] = []
        for keyword in keywords:
            fragments.append("LOWER(bt.description) LIKE %s")
            params.append(f"%{keyword}%")
        return " OR ".join(fragments), params

    def _money_market_statement_ids(self) -> set[int]:
        """Statements that belong to a money-market / savings account, detected from
        the statement file name or any of its transaction descriptions."""
        cursor = self.db.cursor(dictionary=True)
        keyword_clause, keyword_params = self._keyword_clause(self.MONEY_MARKET_KEYWORDS)
        cursor.execute(
            f"""
            SELECT DISTINCT bs.id
            FROM {TABLE_STATEMENTS} bs
            LEFT JOIN {TABLE_TRANSACTIONS} bt
              ON bt.bank_statement_id = bs.id AND bt.is_active = 1
            WHERE bs.is_active = 1
              AND (
                  {keyword_clause}
                  OR LOWER(bs.file_name) LIKE %s
                  OR LOWER(bs.file_name) LIKE %s
                  OR LOWER(bs.file_name) LIKE %s
              )
            """,
            keyword_params + ["%money%", "%savings%", "%mmkt%"],
        )
        return {row["id"] for row in cursor.fetchall()}

    def _get_balances(self) -> tuple[Decimal, Decimal]:
        """Compute checking and money-market balances in one pass.

        Returns (checking_balance, money_market_balance). A transaction belongs to
        the money market account when either its description matches a money-market
        keyword or it belongs to a statement detected as a money-market statement.
        """
        latest_ids = self._latest_statement_ids()
        if not latest_ids:
            return Decimal("0"), Decimal("0")

        mm_statement_ids = self._money_market_statement_ids()
        placeholders = ", ".join(["%s"] * len(latest_ids))
        keyword_clause, keyword_params = self._keyword_clause(self.MONEY_MARKET_KEYWORDS)

        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            f"""
            SELECT bt.bank_statement_id, bt.type, bt.amount,
                   CASE WHEN {keyword_clause} THEN 1 ELSE 0 END AS is_mm_txn
            FROM {TABLE_TRANSACTIONS} bt
            WHERE bt.is_active = 1
              AND bt.bank_statement_id IN ({placeholders})
            """,
            keyword_params + latest_ids,
        )

        checking = Decimal("0")
        money_market = Decimal("0")
        for row in cursor.fetchall():
            amount = row.get("amount") or Decimal("0")
            if row.get("type") != "Credit":
                amount = -amount
            is_mm = bool(row.get("is_mm_txn")) or row.get("bank_statement_id") in mm_statement_ids
            if is_mm:
                money_market += amount
            else:
                checking += amount

        return checking, money_market

    def get_monthly_hoa_total(self) -> Decimal:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            f"""
            SELECT COALESCE(SUM(monthly_hoa_amount), 0) AS total
            FROM {TABLE_CONDO_UNITS}
            WHERE is_active = 1
              AND status = 'Active'
            """
        )
        row = cursor.fetchone() or {}
        return row.get("total") or Decimal("0")

    def get_ytd_received_deposits(self) -> Decimal:
        latest_ids = self._latest_statement_ids()
        if not latest_ids:
            return Decimal("0")

        cursor = self.db.cursor(dictionary=True)
        placeholders = ", ".join(["%s"] * len(latest_ids))
        current_year = date.today().year
        cursor.execute(
            f"""
            SELECT COALESCE(SUM(bt.amount), 0) AS total
            FROM {TABLE_TRANSACTIONS} bt
            WHERE bt.is_active = 1
              AND bt.bank_statement_id IN ({placeholders})
              AND bt.type = 'Credit'
              AND YEAR(bt.transaction_date) = %s
              AND LOWER(bt.description) LIKE 'hoa deposit%%'
            """,
            latest_ids + [current_year],
        )
        row = cursor.fetchone() or {}
        return row.get("total") or Decimal("0")

    def get_monthly_income_expense(self) -> list[dict]:
        latest_ids = self._latest_statement_ids()
        if not latest_ids:
            return []

        cursor = self.db.cursor(dictionary=True)
        placeholders = ", ".join(["%s"] * len(latest_ids))
        cursor.execute(
            f"""
            SELECT
                DATE_FORMAT(bt.transaction_date, '%Y-%m') AS txn_month,
                COALESCE(SUM(CASE WHEN bt.type = 'Credit' THEN bt.amount ELSE 0 END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN bt.type = 'Debit' THEN bt.amount ELSE 0 END), 0) AS total_expense
            FROM {TABLE_TRANSACTIONS} bt
            WHERE bt.is_active = 1
              AND bt.bank_statement_id IN ({placeholders})
            GROUP BY DATE_FORMAT(bt.transaction_date, '%Y-%m')
            ORDER BY txn_month
            """,
            latest_ids,
        )
        return cursor.fetchall()

    def get_ytd_expense_transactions(self) -> list[dict]:
        latest_ids = self._latest_statement_ids()
        if not latest_ids:
            return []

        cursor = self.db.cursor(dictionary=True)
        placeholders = ", ".join(["%s"] * len(latest_ids))
        current_year = date.today().year
        cursor.execute(
            f"""
            SELECT bt.description, bt.amount, bt.transaction_date
            FROM {TABLE_TRANSACTIONS} bt
            WHERE bt.is_active = 1
              AND bt.bank_statement_id IN ({placeholders})
              AND bt.type = 'Debit'
              AND YEAR(bt.transaction_date) = %s
            ORDER BY bt.transaction_date ASC, bt.id ASC
            """,
            latest_ids + [current_year],
        )
        return cursor.fetchall()

    def get_active_vendors(self) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            f"""
            SELECT id, vendor_name, category
            FROM {TABLE_VENDORS}
            WHERE is_active = 1
            ORDER BY vendor_name ASC
            """
        )
        return cursor.fetchall()

    def get_checking_balance(self) -> Decimal:
        checking, _ = self._get_balances()
        return checking

    def get_money_market_balance(self) -> Decimal:
        _, money_market = self._get_balances()
        return money_market

    def get_pending_invoices_count(self) -> int:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            f"""
            SELECT COUNT(*) AS count
            FROM {TABLE_INVOICES}
            WHERE is_active = 1
              AND status = 'Pending'
            """
        )
        row = cursor.fetchone() or {}
        return int(row.get("count") or 0)

    def get_pending_reconciliation_count(self) -> int:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            f"""
            SELECT COUNT(*) AS count
            FROM {TABLE_RECONCILIATION_RECORDS}
            WHERE is_active = 1
              AND status IN ('NeedsReview', 'Unresolved')
            """
        )
        row = cursor.fetchone() or {}
        return int(row.get("count") or 0)

    def get_late_hoa_units_count(self) -> int:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            f"""
            SELECT COUNT(DISTINCT reference_id) AS count
            FROM {TABLE_RECONCILIATION_RECORDS}
            WHERE is_active = 1
              AND reconciliation_type = 'Deposit'
              AND payment_status = 'Late'
            """
        )
        row = cursor.fetchone() or {}
        return int(row.get("count") or 0)

    def get_deposit_collection_ytd(self) -> dict:
        monthly_expected = self.get_monthly_hoa_total()
        expected = monthly_expected * date.today().month
        collected = self.get_ytd_received_deposits()
        pending = expected - collected
        if pending < 0:
            pending = Decimal("0")

        collection_pct = float((collected / expected) * 100) if expected else 0.0
        return {
            "expected": expected,
            "collected": collected,
            "pending": pending,
            "collection_pct": collection_pct,
        }

    def get_upcoming_vendor_payments(self, limit: int = 10) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT
                i.id AS invoice_id,
                i.vendor_id,
                v.vendor_name AS vendor_name,
                i.due_date,
                i.amount,
                i.status
            FROM {TABLE_INVOICES} i
            JOIN {TABLE_VENDORS} v ON v.id = i.vendor_id
            WHERE i.status = 'Pending'
              AND i.is_active = 1
              AND i.amount > 0
              AND i.due_date IS NOT NULL
            ORDER BY i.due_date ASC
            LIMIT %s
            """,
            (limit,),
        )

        return [
            row for row in cursor.fetchall()
            if not self._is_placeholder_name(row.get("vendor_name"))
        ]

    def get_outstanding_reconciliation(self, limit: int = 10) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT
                rr.id AS id,
                rr.bank_transaction_id,
                rr.reconciliation_type,
                bt.transaction_date,
                bt.description,
                bt.amount,
                rr.status,
                rr.payment_status
            FROM {TABLE_RECONCILIATION_RECORDS} rr
            LEFT JOIN {TABLE_TRANSACTIONS} bt ON bt.id = rr.bank_transaction_id
            WHERE rr.status IN ('NeedsReview', 'Unresolved')
              AND rr.is_active = 1
            ORDER BY rr.created_at DESC
            LIMIT %s
            """,
            (limit,),
        )

        return cursor.fetchall()

    def populate_dashboard_summary(self, data: dict, user_id: Optional[int] = None) -> bool:
        cursor = self.db.cursor(dictionary=True)
        
        # Deactivate old records
        cursor.execute(
            f"UPDATE {TABLE_DASHBOARD_SUMMARY} SET is_active = 0, updated_at = NOW() WHERE is_active = 1"
        )
        
        # Insert new summary
        cursor.execute(
            f"""
            INSERT INTO {TABLE_DASHBOARD_SUMMARY} (
                ytd_deposits, expected_deposits, received_deposits, collection_rate,
                checking_balance, pending_vendor_payments, pending_reconciliation,
                late_hoa_payments, generated_at, created_by, is_active, version
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s, 1, 1)
            """,
            (
                data.get("ytd_deposits", 0),
                data.get("expected_deposits", 0),
                data.get("received_deposits", 0),
                data.get("collection_rate", 0),
                data.get("checking_balance", 0),
                data.get("pending_vendor_payments", 0),
                data.get("pending_reconciliation", 0),
                data.get("late_hoa_payments", 0),
                user_id,
            ),
        )
        self.db.commit()
        return True

    def populate_monthly_income_expense(self, data: list[dict]) -> bool:
        cursor = self.db.cursor(dictionary=True)

        # Deactivate old records
        cursor.execute(
            f"UPDATE {TABLE_DASHBOARD_MONTHLY_INCOME_EXPENSE} SET is_active = 0, updated_at = NOW() WHERE is_active = 1"
        )

        if not data:
            self.db.commit()
            return False

        # Insert new records
        for item in data:
            cursor.execute(
                f"""
                INSERT INTO {TABLE_DASHBOARD_MONTHLY_INCOME_EXPENSE} (
                    month, total_income, total_expense, is_active, version
                ) VALUES (%s, %s, %s, 1, 1)
                ON DUPLICATE KEY UPDATE
                    total_income = VALUES(total_income),
                    total_expense = VALUES(total_expense),
                    updated_at = NOW(),
                    is_active = 1
                """,
                (
                    item.get("txn_month"),
                    item.get("total_income", 0),
                    item.get("total_expense", 0),
                ),
            )
        self.db.commit()
        return True

    def populate_deposit_collection(self, data: dict, year: int) -> bool:
        cursor = self.db.cursor(dictionary=True)
        
        # Deactivate old records for the year
        cursor.execute(
            f"UPDATE {TABLE_DASHBOARD_DEPOSIT_COLLECTION} SET is_active = 0, updated_at = NOW() WHERE report_year = %s",
            (year,),
        )
        
        # Insert new record
        cursor.execute(
            f"""
            INSERT INTO {TABLE_DASHBOARD_DEPOSIT_COLLECTION} (
                collected_amount, pending_amount, collection_percentage, report_year, is_active, version
            ) VALUES (%s, %s, %s, %s, 1, 1)
            """,
            (
                data.get("collected", 0),
                data.get("pending", 0),
                data.get("collection_pct", 0),
                year,
            ),
        )
        self.db.commit()
        return True

    def populate_upcoming_vendor_payments(self, data: list[dict]) -> bool:
        cursor = self.db.cursor(dictionary=True)

        # Deactivate old records
        cursor.execute(
            f"UPDATE {TABLE_DASHBOARD_UPCOMING_VENDOR_PAYMENTS} SET is_active = 0, updated_at = NOW() WHERE is_active = 1"
        )

        if not data:
            self.db.commit()
            return False

        # Insert new records
        for item in data:
            cursor.execute(
                f"""
                INSERT INTO {TABLE_DASHBOARD_UPCOMING_VENDOR_PAYMENTS} (
                    invoice_id, vendor_id, vendor_name, due_date, amount, payment_status, is_active, version
                ) VALUES (%s, %s, %s, %s, %s, %s, 1, 1)
                """,
                (
                    item.get("invoice_id"),
                    item.get("vendor_id"),
                    item.get("vendor_name"),
                    item.get("due_date"),
                    item.get("amount", 0),
                    item.get("status", "Pending"),
                ),
            )
        self.db.commit()
        return True

    def populate_outstanding_reconciliation(self, data: list[dict]) -> bool:
        cursor = self.db.cursor(dictionary=True)

        # Deactivate old records
        cursor.execute(
            f"UPDATE {TABLE_DASHBOARD_OUTSTANDING_RECONCILIATION} SET is_active = 0, updated_at = NOW() WHERE is_active = 1"
        )

        if not data:
            self.db.commit()
            return False

        # Insert new records
        for item in data:
            cursor.execute(
                f"""
                INSERT INTO {TABLE_DASHBOARD_OUTSTANDING_RECONCILIATION} (
                    reconciliation_id, bank_transaction_id, reconciliation_type,
                    transaction_date, description, amount, reconciliation_status,
                    payment_status, is_active, version
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1, 1)
                """,
                (
                    item.get("id"),
                    item.get("bank_transaction_id", 0),
                    item.get("reconciliation_type", ""),
                    item.get("transaction_date"),
                    item.get("description", ""),
                    item.get("amount", 0),
                    item.get("status", ""),
                    item.get("payment_status"),
                ),
            )
        self.db.commit()
        return True

    def create_activity(self, activity_data: dict) -> Optional[int]:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            f"""
            INSERT INTO {TABLE_DASHBOARD_ACTIVITY} (
                activity_type, title, description, reference_table, reference_id,
                status, icon, created_by, is_active, version
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1, 1)
            """,
            (
                activity_data.get("activity_type"),
                activity_data.get("title"),
                activity_data.get("description"),
                activity_data.get("reference_table"),
                activity_data.get("reference_id"),
                activity_data.get("status", "Success"),
                activity_data.get("icon"),
                activity_data.get("created_by"),
            ),
        )
        self.db.commit()
        return cursor.lastrowid

    def get_recent_activities(self, limit: int = 10) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)
        activities: list[dict] = []

        # Invoice activities
        cursor.execute(
            f"""
            SELECT i.id, i.invoice_number, i.amount, i.status, i.created_at,
                   v.vendor_name AS vendor_name
            FROM {TABLE_INVOICES} i
            LEFT JOIN {TABLE_VENDORS} v ON v.id = i.vendor_id
            WHERE i.is_active = 1
              AND i.is_deleted = 0
              AND i.amount > 0
            ORDER BY i.created_at DESC
            LIMIT 10
            """
        )
        for row in cursor.fetchall():
            vendor_name = row.get("vendor_name")
            if self._is_placeholder_name(vendor_name):
                vendor_name = "Unknown vendor"
            title = f"Invoice {row['invoice_number']} from {vendor_name} marked {row['status']}"
            activities.append({
                "id": f"invoice-{row['id']}",
                "activity_type": "Invoice",
                "title": title,
                "description": None,
                "reference_table": TABLE_INVOICES,
                "reference_id": row["id"],
                "status": "Success" if row["status"] != "Rejected" else "Warning",
                "icon": "invoice",
                "created_at": row["created_at"],
                "created_by": None,
            })

        # Bank statement upload activities
        cursor.execute(
            f"""
            SELECT id, period_month, period_year, status, created_at
            FROM {TABLE_STATEMENTS}
            WHERE is_active = 1
            ORDER BY created_at DESC
            LIMIT 10
            """
        )
        for row in cursor.fetchall():
            try:
                month_name = datetime(row["period_year"], row["period_month"], 1).strftime("%B")
            except (ValueError, TypeError):
                month_name = str(row.get("period_year", ""))
            title = f"Bank statement for {month_name} {row['period_year']} uploaded"
            activities.append({
                "id": f"statement-{row['id']}",
                "activity_type": "Bank Statement",
                "title": title,
                "description": None,
                "reference_table": TABLE_STATEMENTS,
                "reference_id": row["id"],
                "status": "Success" if row["status"] == "Processed" else "Warning",
                "icon": "bank-statement",
                "created_at": row["created_at"],
                "created_by": None,
            })

        # Reconciliation activities
        cursor.execute(
            f"""
            SELECT rr.id, rr.status, rr.payment_status, rr.created_at,
                   bt.description, bt.amount
            FROM {TABLE_RECONCILIATION_RECORDS} rr
            LEFT JOIN {TABLE_TRANSACTIONS} bt ON bt.id = rr.bank_transaction_id
            WHERE rr.is_active = 1
            ORDER BY rr.created_at DESC
            LIMIT 10
            """
        )
        for row in cursor.fetchall():
            description = row.get("description") or f"transaction #{row['id']}"
            title = f"Reconciliation {row['status']} for {description}"
            activities.append({
                "id": f"reconciliation-{row['id']}",
                "activity_type": "Reconciliation",
                "title": title,
                "description": None,
                "reference_table": TABLE_RECONCILIATION_RECORDS,
                "reference_id": row["id"],
                "status": "Success" if row["status"] == "Matched" else "Pending",
                "icon": "reconciliation",
                "created_at": row["created_at"],
                "created_by": None,
            })

        # Deposit / payment transaction activities
        cursor.execute(
            f"""
            SELECT bt.id, bt.transaction_date, bt.description, bt.amount, bt.type,
                   bt.created_at
            FROM {TABLE_TRANSACTIONS} bt
            WHERE bt.is_active = 1
            ORDER BY bt.transaction_date DESC, bt.id DESC
            LIMIT 10
            """
        )
        for row in cursor.fetchall():
            amount = str(row["amount"])
            if row["type"] == "Credit":
                title = f"Deposit of ${amount} received"
                icon = "deposit"
            else:
                title = f"Payment of ${amount} made"
                icon = "payment"
            activities.append({
                "id": f"transaction-{row['id']}",
                "activity_type": "Deposit",
                "title": title,
                "description": row.get("description"),
                "reference_table": TABLE_TRANSACTIONS,
                "reference_id": row["id"],
                "status": "Success",
                "icon": icon,
                "created_at": row.get("created_at") or row.get("transaction_date"),
                "created_by": None,
            })

        # Merge with any dashboard_activity rows logged via /populate
        cursor.execute(
            f"""
            SELECT id, activity_type, title, description, reference_table, reference_id,
                   status, icon, created_at, created_by
            FROM {TABLE_DASHBOARD_ACTIVITY}
            WHERE is_active = 1
            ORDER BY created_at DESC
            LIMIT {limit}
            """
        )
        for row in cursor.fetchall():
            row["id"] = f"dashboard-{row['id']}"
            activities.append(row)

        activities.sort(key=lambda a: a.get("created_at") or datetime.min, reverse=True)
        return self._serialize_activities(activities[:limit])

    @staticmethod
    def _serialize_activities(activities: list[dict]) -> list[dict]:
        serialized: list[dict] = []
        for activity in activities:
            item = dict(activity)
            created_at = item.get("created_at")
            if isinstance(created_at, (datetime, date)):
                item["created_at"] = created_at.isoformat(sep=" ") if isinstance(created_at, datetime) else created_at.isoformat()
            elif created_at is None:
                item["created_at"] = None
            for key, value in item.items():
                if isinstance(value, Decimal):
                    item[key] = str(value)
            serialized.append(item)
        return serialized
