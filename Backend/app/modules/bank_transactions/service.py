from datetime import date
from typing import Optional

from app.core.exceptions import AppException

from .repository import BankTransactionRepository


class TransactionNotFoundException(AppException):

    def __init__(self, transaction_id: int):
        super().__init__(
            status_code=404,
            message=f"Bank transaction with id {transaction_id} not found."
        )


class StatementNotFoundException(AppException):

    def __init__(self, statement_id: int):
        super().__init__(
            status_code=404,
            message=f"No transactions found for bank statement {statement_id}."
        )


class BankTransactionService:

    def __init__(self, db):
        self.db = db
        self.repo = BankTransactionRepository(db)

    def get_transaction(self, transaction_id: int) -> dict:
        txn = self.repo.get_by_id(transaction_id)
        if not txn:
            raise TransactionNotFoundException(transaction_id)
        return txn

    def list_transactions(
        self,
        statement_id: Optional[int] = None,
        document_extraction_id: Optional[int] = None,
        transaction_type: Optional[str] = None,
        transaction_method: Optional[str] = None,
        description: Optional[str] = None,
        amount_min: Optional[float] = None,
        amount_max: Optional[float] = None,
        transaction_date_from: Optional[date] = None,
        transaction_date_to: Optional[date] = None,
        reconciled: Optional[bool] = None,
        is_active: bool = True,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[dict], int]:
        return self.repo.get_by_statement_id(
            statement_id=statement_id,
            document_extraction_id=document_extraction_id,
            transaction_type=transaction_type,
            transaction_method=transaction_method,
            description=description,
            amount_min=amount_min,
            amount_max=amount_max,
            transaction_date_from=transaction_date_from,
            transaction_date_to=transaction_date_to,
            reconciled=reconciled,
            is_active=is_active,
            page=page,
            page_size=page_size,
        )

    def get_summary(self, statement_id: int) -> dict:
        return self.repo.get_summary(statement_id)