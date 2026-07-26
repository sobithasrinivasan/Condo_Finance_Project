from typing import Optional

from app.core.exceptions import AppException

from .repository import BankStatementRepository
from .schema import BankStatementFilters


class BankStatementNotFoundException(AppException):

    def __init__(self, statement_id: int):
        super().__init__(
            status_code=404,
            message=f"Bank statement with id {statement_id} not found."
        )


class BankStatementService:

    def __init__(self, db):
        self.db = db
        self.repo = BankStatementRepository(db)

    def get_statement(self, statement_id: int) -> dict:
        statement = self.repo.get_by_id(statement_id)
        if not statement:
            raise BankStatementNotFoundException(statement_id)

        transactions = self.repo.get_transactions_for_statements([statement_id])
        statement["transactions"] = transactions.get(statement_id, [])
        return statement

    def list_statements(self, filters: BankStatementFilters) -> tuple[list[dict], int]:
        rows, total = self.repo.get_filtered(filters)

        statement_ids = [row["id"] for row in rows]
        transactions_by_statement = self.repo.get_transactions_for_statements(statement_ids)

        for row in rows:
            row["transactions"] = transactions_by_statement.get(row["id"], [])

        return rows, total

    def delete_statement(self, statement_id: int, updated_by: Optional[int] = None) -> dict:
        existing = self.repo.get_by_id(statement_id, active_only=False)
        if not existing:
            raise BankStatementNotFoundException(statement_id)

        self.repo.soft_delete(statement_id, updated_by=updated_by)

        existing["is_active"] = False
        transactions = self.repo.get_transactions_for_statements([statement_id], active_only=False)
        existing["transactions"] = transactions.get(statement_id, [])
        return existing
