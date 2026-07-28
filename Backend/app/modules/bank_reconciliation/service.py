import json
import logging
import re
from typing import Optional

from app.core.exceptions import AppException
from app.modules.extraction.engine import ExtractionEngine
from app.prompt.manager import PromptManager

from .constants import (
    RECONCILIATION_TYPE_BANK_FEE,
    RECONCILIATION_TYPE_DEPOSIT,
    RECONCILIATION_TYPE_INTEREST,
    RECONCILIATION_TYPE_INVOICE,
    RECONCILIATION_TYPE_MANUAL,
    RECONCILIATION_TYPE_SPECIAL_ASSESSMENT,
    PAYMENT_TIMING_EARLY,
    PAYMENT_TIMING_ON_TIME,
    PAYMENT_TIMING_LATE,
    STATUS_MATCHED,
    STATUS_NEEDS_REVIEW,
    STATUS_UNRESOLVED,
)
from .audit import (
    AuditLogger,
    ACTION_RECONCILIATION_STARTED,
    ACTION_GEMINI_ANALYSIS_COMPLETED,
    ACTION_RECORD_MATCHED,
    ACTION_RECORD_NEEDS_REVIEW,
    ACTION_RECORD_UNRESOLVED,
    ACTION_INVOICE_STATUS_UPDATED,
    ACTION_TRANSACTION_RECONCILED,
    ACTION_MANUAL_RESOLUTION,
    ACTION_STATUS_CHANGED,
    ACTION_DEPOSIT_MATCHED,
    ACTION_ASSESSMENT_MATCHED,
)
from .repository import ReconciliationRepository
from .schema import GeminiReconciliationResult, ReconciliationUpdateRequest

logger = logging.getLogger(__name__)


class TransactionNotFoundException(AppException):

    def __init__(self, transaction_id: int):
        super().__init__(
            status_code=404,
            message=f"Bank transaction with id {transaction_id} not found."
        )


class TransactionAlreadyReconciledException(AppException):

    def __init__(self, transaction_id: int):
        super().__init__(
            status_code=409,
            message=f"Bank transaction {transaction_id} is already reconciled."
        )


class ReconciliationNotFoundException(AppException):

    def __init__(self, record_id: int):
        super().__init__(
            status_code=404,
            message=f"Reconciliation record with id {record_id} not found."
        )


class ReconciliationService:

    def __init__(self, db):
        self.db = db
        self.repo = ReconciliationRepository(db)
        self.audit = AuditLogger(db)
        self.engine = ExtractionEngine()
        self.prompt_manager = PromptManager()

    def reconcile_transaction(self, bank_transaction_id: int, matched_by: Optional[int] = None) -> dict:
        """Run the 10-step reconciliation checklist for a single transaction."""

        # Step 1: Get the transaction
        transaction = self.repo.get_bank_transaction(bank_transaction_id)
        if not transaction:
            raise TransactionNotFoundException(bank_transaction_id)

        # Check if already reconciled
        if transaction["reconciled"]:
            raise TransactionAlreadyReconciledException(bank_transaction_id)

        # Duplicate reconciliation check
        existing_record = self.repo.get_by_transaction_id(bank_transaction_id)
        if existing_record:
            raise TransactionAlreadyReconciledException(bank_transaction_id)

        # Audit: Reconciliation started
        self.audit.log(
            entity_type="bank_transaction",
            entity_id=bank_transaction_id,
            action=ACTION_RECONCILIATION_STARTED,
            performed_by=matched_by,
            notes=f"Auto-reconciliation started for transaction #{bank_transaction_id}: "
                  f"{transaction['description']}, ${transaction['amount']} ({transaction['type']})",
        )

        # Load candidate business records
        invoices = self.repo.get_pending_invoices()
        vendors = self.repo.get_all_vendors()
        units = self.repo.get_all_units()

        # Build the prompt with context
        prompt_template = self.prompt_manager.get_prompt(document_type="bank_reconciliation")
        prompt = self._build_prompt(prompt_template, transaction, invoices, vendors, units)

        # Call Gemini
        logger.info("Calling Gemini for reconciliation of transaction %s", bank_transaction_id)
        raw_response = self.engine.call_llm(prompt)
        parsed = self.engine.safe_json_parse(raw_response)

        if not parsed:
            logger.warning("Gemini returned empty/unparseable response for transaction %s", bank_transaction_id)
            record_id = self._create_unresolved_record(bank_transaction_id, matched_by)
            return self.repo.get_by_id(record_id)

        # Parse and validate Gemini result
        try:
            gemini_result = GeminiReconciliationResult.model_validate(parsed)
        except Exception as e:
            logger.warning("Gemini response validation failed: %s. Raw: %s", e, parsed)
            record_id = self._create_unresolved_record(
                bank_transaction_id, matched_by,
                notes=f"Gemini response validation failed: {e}",
            )
            return self.repo.get_by_id(record_id)

        # Map Gemini result to DB record
        recon_type = self._map_transaction_type(gemini_result.transaction_type)
        payment_status = self._map_payment_timing(gemini_result.payment_timing)
        recon_status = self._map_status(gemini_result.reconciliation_status, gemini_result.confidence_score)
        reasoning_text = "; ".join(gemini_result.reasoning) if gemini_result.reasoning else None
        score = gemini_result.confidence_score

        reference_id = gemini_result.matched_record_id

        # For Deposit type: Gemini returns condo_units.id as matched_record_id.
        # If Gemini couldn't find it, try to resolve from description.
        if recon_type == RECONCILIATION_TYPE_DEPOSIT and reference_id is None:
            unit = self._find_unit_from_description(transaction["description"], units)
            if unit:
                reference_id = unit["id"]
                recon_status = STATUS_MATCHED
                score = max(score, 95)
                logger.info(
                    "Auto-resolved deposit for Unit %s (condo_units.id=%s)",
                    unit["unit_number"], unit["id"],
                )

        # For SpecialAssessment type: reference_id points to condo_units.id
        if recon_type == RECONCILIATION_TYPE_SPECIAL_ASSESSMENT and reference_id is None:
            unit = self._find_unit_from_description(transaction["description"], units)
            if unit:
                reference_id = unit["id"]

        # Audit: Gemini analysis completed
        self.audit.log(
            entity_type="bank_transaction",
            entity_id=bank_transaction_id,
            action=ACTION_GEMINI_ANALYSIS_COMPLETED,
            new_value={
                "transaction_type": recon_type,
                "matched_record_id": reference_id,
                "confidence_score": score,
                "status": recon_status,
                "payment_timing": payment_status,
            },
            performed_by=matched_by,
            notes=f"Gemini identified as {recon_type}. "
                  f"Reference: {reference_id}. Score: {score}. Status: {recon_status}",
        )

        # Create reconciliation record
        record_id = self.repo.create_reconciliation(
            bank_transaction_id=bank_transaction_id,
            reconciliation_type=recon_type,
            reference_id=reference_id,
            payment_status=payment_status,
            match_score=score,
            status=recon_status,
            resolution_notes=reasoning_text,
            matched_by=matched_by,
            created_by=matched_by,
        )

        # If matched, update business records and log audit
        if recon_status == STATUS_MATCHED:
            self.repo.mark_transaction_reconciled(bank_transaction_id)

            self.audit.log(
                entity_type="bank_transaction",
                entity_id=bank_transaction_id,
                action=ACTION_TRANSACTION_RECONCILED,
                performed_by=matched_by,
                notes=f"Bank transaction #{bank_transaction_id} marked as reconciled.",
            )

            self._update_business_record(recon_type, reference_id, transaction, record_id, matched_by)

            status_action = ACTION_RECORD_MATCHED
        elif recon_status == STATUS_NEEDS_REVIEW:
            status_action = ACTION_RECORD_NEEDS_REVIEW
        else:
            status_action = ACTION_RECORD_UNRESOLVED

        self.audit.log(
            entity_type="reconciliation",
            entity_id=record_id,
            action=status_action,
            new_value={"status": recon_status, "match_score": score},
            performed_by=matched_by,
            notes=f"Reconciliation record #{record_id} created with status: {recon_status} (Score: {score}%)",
        )

        return self.repo.get_by_id(record_id)

    def reconcile_statement(self, bank_statement_id: int, matched_by: Optional[int] = None) -> list[dict]:
        """Reconcile all unreconciled transactions for a bank statement."""

        transactions = self.repo.get_unreconciled_transactions(bank_statement_id)
        results = []

        for txn in transactions:
            try:
                result = self.reconcile_transaction(txn["id"], matched_by=matched_by)
                results.append(result)
            except (TransactionAlreadyReconciledException, TransactionNotFoundException):
                continue
            except Exception as e:
                logger.exception("Reconciliation failed for transaction %s: %s", txn["id"], e)
                results.append({
                    "bank_transaction_id": txn["id"],
                    "error": str(e),
                })

        return results

    def get_reconciliation(self, record_id: int) -> dict:
        record = self.repo.get_by_id(record_id)
        if not record:
            raise ReconciliationNotFoundException(record_id)
        return record

    def list_reconciliations(
        self,
        bank_statement_id: Optional[int] = None,
        reconciliation_type: Optional[str] = None,
        status: Optional[str] = None,
        payment_status: Optional[str] = None,
        is_active: bool = True,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        return self.repo.get_filtered(
            bank_statement_id=bank_statement_id,
            reconciliation_type=reconciliation_type,
            status=status,
            payment_status=payment_status,
            is_active=is_active,
            page=page,
            page_size=page_size,
        )

    def get_summary(self, bank_statement_id: Optional[int] = None) -> dict:
        return self.repo.get_summary(bank_statement_id=bank_statement_id)

    def update_reconciliation(
        self, record_id: int, payload: ReconciliationUpdateRequest, updated_by: Optional[int] = None
    ) -> dict:
        existing = self.repo.get_by_id(record_id, active_only=False)
        if not existing:
            raise ReconciliationNotFoundException(record_id)

        data = payload.get_update_fields()

        if not data:
            return existing

        # If manually resolving, mark transaction as reconciled
        new_status = data.get("status")
        if new_status in (STATUS_MATCHED, "Resolved") and existing["status"] == STATUS_NEEDS_REVIEW:
            self.repo.mark_transaction_reconciled(existing["bank_transaction_id"])

            self.audit.log(
                entity_type="bank_transaction",
                entity_id=existing["bank_transaction_id"],
                action=ACTION_TRANSACTION_RECONCILED,
                performed_by=updated_by,
                notes=f"Bank transaction #{existing['bank_transaction_id']} manually marked as reconciled.",
            )

        self.audit.log(
            entity_type="reconciliation",
            entity_id=record_id,
            action=ACTION_MANUAL_RESOLUTION if new_status else ACTION_STATUS_CHANGED,
            old_value={"status": existing["status"]},
            new_value=data,
            performed_by=updated_by,
            notes=f"Reconciliation #{record_id} updated. "
                  f"Status: {existing['status']} → {new_status or existing['status']}. "
                  f"Notes: {data.get('resolution_notes', 'N/A')}",
        )

        return self.repo.update_reconciliation(record_id, data, updated_by=updated_by)

    # ── Private helpers ───────────────────────────────────────────────

    def _build_prompt(
        self, template: str, transaction: dict,
        invoices: list, vendors: list, units: list,
    ) -> str:
        """Replace placeholders in the prompt template with actual data."""

        txn_json = json.dumps({
            "id": transaction["id"],
            "date": str(transaction["transaction_date"]),
            "description": transaction["description"],
            "amount": float(transaction["amount"]),
            "type": transaction["type"],
        }, indent=2)

        inv_list = json.dumps([{
            "id": inv["id"],
            "invoice_number": inv["invoice_number"],
            "vendor_id": inv["vendor_id"],
            "vendor_name": inv.get("vendor_name", ""),
            "amount": float(inv["amount"]),
            "invoice_date": str(inv["invoice_date"]),
            "due_date": str(inv["due_date"]) if inv["due_date"] else None,
            "status": inv["status"],
        } for inv in invoices], indent=2)

        vendor_list = json.dumps([{
            "id": v["id"],
            "name": v["name"],
            "category": v["category"],
        } for v in vendors], indent=2)

        unit_list = json.dumps([{
            "id": u["id"],
            "unit_number": u["unit_number"],
            "owner_name": u["owner_name"],
            "monthly_hoa_amount": float(u["monthly_hoa_amount"]),
        } for u in units], indent=2)

        prompt = template.replace("{{transaction}}", txn_json)
        prompt = prompt.replace("{{invoices}}", inv_list)
        prompt = prompt.replace("{{vendors}}", vendor_list)
        prompt = prompt.replace("{{units}}", unit_list)

        return prompt

    def _find_unit_from_description(self, description: str, units: list) -> Optional[dict]:
        """Extract unit number from transaction description and find matching condo unit."""

        desc_lower = description.lower()

        # Try to extract unit number: "Unit 101", "Unit-101", "unit101"
        match = re.search(r'unit[\s\-]?(\d+)', desc_lower)
        if match:
            unit_number = match.group(1)
            for unit in units:
                if unit["unit_number"] == unit_number:
                    return unit

        # Try owner name match
        for unit in units:
            owner_lower = unit["owner_name"].lower()
            name_parts = owner_lower.split()
            for part in name_parts:
                if len(part) > 2 and part in desc_lower:
                    return unit

        return None

    def _create_unresolved_record(
        self, bank_transaction_id: int, matched_by: Optional[int], notes: str = None
    ) -> int:
        return self.repo.create_reconciliation(
            bank_transaction_id=bank_transaction_id,
            reconciliation_type=RECONCILIATION_TYPE_MANUAL,
            reference_id=None,
            payment_status=PAYMENT_TIMING_ON_TIME,
            match_score=0,
            status=STATUS_NEEDS_REVIEW,
            resolution_notes=notes or "Gemini could not determine a match.",
            matched_by=matched_by,
            created_by=matched_by,
        )

    def _map_transaction_type(self, gemini_type: str) -> str:
        mapping = {
            "invoice": RECONCILIATION_TYPE_INVOICE,
            "deposit": RECONCILIATION_TYPE_DEPOSIT,
            "hoa deposit": RECONCILIATION_TYPE_DEPOSIT,
            "hoa_deposit": RECONCILIATION_TYPE_DEPOSIT,
            "special assessment": RECONCILIATION_TYPE_SPECIAL_ASSESSMENT,
            "special_assessment": RECONCILIATION_TYPE_SPECIAL_ASSESSMENT,
            "specialassessment": RECONCILIATION_TYPE_SPECIAL_ASSESSMENT,
            "bank fee": RECONCILIATION_TYPE_BANK_FEE,
            "bank_fee": RECONCILIATION_TYPE_BANK_FEE,
            "bankfee": RECONCILIATION_TYPE_BANK_FEE,
            "interest": RECONCILIATION_TYPE_INTEREST,
            "manual": RECONCILIATION_TYPE_MANUAL,
        }
        return mapping.get(gemini_type.lower().strip(), RECONCILIATION_TYPE_MANUAL)

    def _map_payment_timing(self, gemini_timing: str) -> str:
        mapping = {
            "early": PAYMENT_TIMING_EARLY,
            "on_time": PAYMENT_TIMING_ON_TIME,
            "ontime": PAYMENT_TIMING_ON_TIME,
            "on time": PAYMENT_TIMING_ON_TIME,
            "late": PAYMENT_TIMING_LATE,
        }
        return mapping.get(gemini_timing.lower().strip(), PAYMENT_TIMING_ON_TIME)

    def _map_status(self, gemini_status: str, score: int) -> str:
        gs = gemini_status.lower().strip()
        if gs == "matched" and score >= 85:
            return STATUS_MATCHED
        if gs in ("needsreview", "needs_review", "needs review"):
            return STATUS_NEEDS_REVIEW
        if gs == "unresolved":
            return STATUS_UNRESOLVED
        if score >= 85:
            return STATUS_MATCHED
        if score >= 50:
            return STATUS_NEEDS_REVIEW
        return STATUS_UNRESOLVED

    def _update_business_record(
        self, recon_type: str, reference_id: Optional[int],
        transaction: dict, record_id: int = None, matched_by: Optional[int] = None,
    ):
        """After a successful match, update the matched business record.

        For Invoice: update invoice status to Paid.
        For Deposit/SpecialAssessment: reference_id points to condo_units.id,
            data lives in reconciliation_records - no separate table to update.
        For BankFee/Interest: nothing to update.
        """

        if not reference_id:
            return

        txn_date = transaction["transaction_date"]
        txn_amount = float(transaction["amount"])

        if recon_type == RECONCILIATION_TYPE_INVOICE:
            self.repo.update_invoice_status(reference_id, "Paid", paid_at=txn_date)
            logger.info("Invoice %s marked as Paid.", reference_id)

            self.audit.log(
                entity_type="invoice",
                entity_id=reference_id,
                action=ACTION_INVOICE_STATUS_UPDATED,
                old_value={"status": "Pending"},
                new_value={"status": "Paid", "paid_at": str(txn_date)},
                performed_by=matched_by,
                notes=f"Invoice #{reference_id} status changed: Pending → Paid. "
                      f"Paid on {txn_date} via bank transaction #{transaction['id']}",
            )

        elif recon_type == RECONCILIATION_TYPE_DEPOSIT:
            logger.info(
                "Deposit recorded for condo_units.id=%s via reconciliation_records.", reference_id
            )

            self.audit.log(
                entity_type="reconciliation",
                entity_id=record_id or 0,
                action=ACTION_DEPOSIT_MATCHED,
                new_value={"unit_id": reference_id, "amount": txn_amount, "date": str(txn_date)},
                performed_by=matched_by,
                notes=f"HOA Deposit matched to condo unit #{reference_id}. "
                      f"Amount: ${txn_amount:.2f}. Date: {txn_date}",
            )

        elif recon_type == RECONCILIATION_TYPE_SPECIAL_ASSESSMENT:
            logger.info(
                "Special assessment recorded for condo_units.id=%s via reconciliation_records.", reference_id
            )

            self.audit.log(
                entity_type="reconciliation",
                entity_id=record_id or 0,
                action=ACTION_ASSESSMENT_MATCHED,
                new_value={"unit_id": reference_id, "amount": txn_amount, "date": str(txn_date)},
                performed_by=matched_by,
                notes=f"Special Assessment matched to condo unit #{reference_id}. "
                      f"Amount: ${txn_amount:.2f}. Date: {txn_date}",
            )
