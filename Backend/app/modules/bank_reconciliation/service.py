import json
import logging
import re
from typing import Optional

from app.core.exceptions import AppException
from app.modules.extraction.engine import ExtractionEngine
from app.prompt.manager import PromptManager

from .constants import (
    RECORD_TYPE_DEPOSIT,
    RECORD_TYPE_INVOICE,
    RECORD_TYPE_MANUAL,
    RECORD_TYPE_PAYABLE,
    RECORD_TYPE_RECEIVABLE,
    STATUS_MATCHED,
    STATUS_SUGGESTED,
    STATUS_UNMATCHED,
    METHOD_AUTO_MATCH,
    METHOD_MANUAL,
    SCORE_THRESHOLD_MATCHED,
    SCORE_THRESHOLD_SUGGESTED,
    CREDIT_TRANSACTION_TYPES,
    DEBIT_TRANSACTION_TYPES,
    AMBIGUOUS_TRANSACTION_TYPES,
)
from .audit import (
    AuditLogger,
    ACTION_RECONCILIATION_STARTED,
    ACTION_ANALYSIS_COMPLETED,
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

    def _is_credit_transaction(self, transaction: dict) -> bool:
        """Determine if a transaction is credit (money IN) based on transaction_type and amount sign."""
        txn_type = transaction.get("transaction_type", "")
        amount = float(transaction.get("amount", 0))

        if txn_type in CREDIT_TRANSACTION_TYPES:
            return True
        if txn_type in DEBIT_TRANSACTION_TYPES:
            return False
        # ACH or other ambiguous types: use amount sign
        return amount > 0

    def _get_direction_label(self, transaction: dict) -> str:
        """Return 'Credit' or 'Debit' for display purposes."""
        return "Credit" if self._is_credit_transaction(transaction) else "Debit"

    def reconcile_transaction(self, bank_transaction_id: int, matched_by: Optional[int] = None) -> dict:
        """Run the reconciliation checklist for a single transaction."""

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

        # Get association_id
        association_id = self.repo.get_association_id_for_transaction(bank_transaction_id)

        # Determine direction
        direction = self._get_direction_label(transaction)

        # Audit: Reconciliation started
        self.audit.log(
            entity_type="bank_transaction",
            entity_id=bank_transaction_id,
            action=ACTION_RECONCILIATION_STARTED,
            performed_by=matched_by,
            notes=f"Auto-reconciliation started for transaction #{bank_transaction_id}: "
                  f"{transaction['description']}, ${transaction['amount']} ({direction})",
        )

        # Load candidate business records based on direction
        is_credit = self._is_credit_transaction(transaction)
        vendors = self.repo.get_all_vendors()
        units = self.repo.get_all_units()

        if is_credit:
            # Credit: match against receivables + outstanding assessments
            receivables = self.repo.get_pending_receivables()
            assessments = self.repo.get_outstanding_assessments()
            invoices = []
            payables = []
        else:
            # Debit: match against payables + invoices
            payables = self.repo.get_pending_payables()
            invoices = self.repo.get_pending_invoices()
            receivables = []
            assessments = []

        # Build the prompt with context
        prompt_template = self.prompt_manager.get_prompt(document_type="bank_reconciliation")
        prompt = self._build_prompt(
            prompt_template, transaction, invoices, vendors, units,
            assessments, receivables, payables, direction,
        )

        # Call Gemini
        logger.info("Calling Gemini for reconciliation of transaction %s", bank_transaction_id)
        raw_response = self.engine.call_llm(prompt)
        parsed = self.engine.safe_json_parse(raw_response)

        if not parsed:
            logger.warning("Gemini returned empty/unparseable response for transaction %s", bank_transaction_id)
            record_id = self._create_unmatched_record(bank_transaction_id, association_id, matched_by)
            return self.repo.get_by_id(record_id)

        # Parse and validate Gemini result
        try:
            gemini_result = GeminiReconciliationResult.model_validate(parsed)
        except Exception as e:
            logger.warning("Gemini response validation failed: %s. Raw: %s", e, parsed)
            record_id = self._create_unmatched_record(
                bank_transaction_id, association_id, matched_by,
                notes=f"Gemini response validation failed: {e}",
            )
            return self.repo.get_by_id(record_id)

        # Map Gemini result to DB record
        record_type = self._map_record_type(gemini_result.transaction_type, is_credit)
        recon_status = self._map_status(gemini_result.reconciliation_status, gemini_result.confidence_score)
        reasoning_text = "; ".join(gemini_result.reasoning) if gemini_result.reasoning else None
        score = gemini_result.confidence_score

        record_id_ref = gemini_result.matched_record_id

        # For Deposit type: Gemini returns condo_units.id as matched_record_id.
        # If Gemini couldn't find it, try to resolve from description.
        if record_type == RECORD_TYPE_DEPOSIT and record_id_ref is None:
            unit = self._find_unit_from_description(transaction["description"], units)
            if unit:
                record_id_ref = unit["id"]
                recon_status = STATUS_MATCHED
                score = max(score, 95)
                logger.info(
                    "Auto-resolved deposit for Unit %s (condo_units.id=%s)",
                    unit["unit_number"], unit["id"],
                )

        # For Receivable type with assessment: try to resolve from description
        if record_type == RECORD_TYPE_RECEIVABLE and record_id_ref is None and assessments:
            unit = self._find_unit_from_description(transaction["description"], units)
            if unit:
                for a in assessments:
                    if a["unit_id"] == unit["id"]:
                        record_id_ref = a["id"]
                        break

        # Duplicate deposit check
        if record_type == RECORD_TYPE_DEPOSIT and record_id_ref is not None and recon_status == STATUS_MATCHED:
            txn_date = transaction["transaction_date"]
            existing = self.repo.get_deposit_for_unit_month(record_id_ref, txn_date.month, txn_date.year)
            if existing:
                recon_status = STATUS_SUGGESTED
                score = min(score, 75)
                reasoning_text = (reasoning_text or "") + \
                    f"; NOTE: Unit already has a matched deposit for {txn_date.strftime('%B %Y')}. Flagged for manual review."
                logger.info(
                    "Duplicate deposit detected for unit_id=%s, month=%s/%s. Downgrading to Suggested.",
                    record_id_ref, txn_date.month, txn_date.year,
                )

        # Audit: Gemini analysis completed
        self.audit.log(
            entity_type="bank_transaction",
            entity_id=bank_transaction_id,
            action=ACTION_GEMINI_ANALYSIS_COMPLETED,
            new_value={
                "record_type": record_type,
                "matched_record_id": record_id_ref,
                "confidence_score": score,
                "status": recon_status,
            },
            performed_by=matched_by,
            notes=f"Gemini identified as {record_type}. "
                  f"Reference: {record_id_ref}. Score: {score}. Status: {recon_status}",
        )

        # Create reconciliation record
        new_record_id = self.repo.create_reconciliation(
            association_id=association_id,
            bank_transaction_id=bank_transaction_id,
            record_type=record_type,
            record_id=record_id_ref,
            status=recon_status,
            method=METHOD_AUTO_MATCH,
            match_score=score,
            notes=reasoning_text,
            matched_by=matched_by,
            created_by=matched_by,
        )

        # If matched, update business records and mark transaction reconciled
        if recon_status == STATUS_MATCHED:
            self.repo.mark_transaction_reconciled(bank_transaction_id)

            self.audit.log(
                entity_type="bank_transaction",
                entity_id=bank_transaction_id,
                action=ACTION_TRANSACTION_RECONCILED,
                performed_by=matched_by,
                notes=f"Bank transaction #{bank_transaction_id} marked as reconciled.",
            )

            self._update_business_record(record_type, record_id_ref, transaction, new_record_id, matched_by)

            status_action = ACTION_RECORD_MATCHED
        elif recon_status == STATUS_SUGGESTED:
            status_action = ACTION_RECORD_NEEDS_REVIEW
        else:
            status_action = ACTION_RECORD_UNRESOLVED

        self.audit.log(
            entity_type="reconciliation",
            entity_id=new_record_id,
            action=status_action,
            new_value={"status": recon_status, "match_score": score},
            performed_by=matched_by,
            notes=f"Reconciliation record #{new_record_id} created with status: {recon_status} (Score: {score}%)",
        )

        return self.repo.get_by_id(new_record_id)

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

        # Get transaction details for business record update
        transaction = self.repo.get_bank_transaction(existing["bank_transaction_id"])
        
        # If manually resolving, mark transaction as reconciled
        new_status = data.get("status")
        if new_status == STATUS_MATCHED and existing["status"] in (STATUS_SUGGESTED, STATUS_UNMATCHED):
            self.repo.mark_transaction_reconciled(existing["bank_transaction_id"])

            self.audit.log(
                entity_type="bank_transaction",
                entity_id=existing["bank_transaction_id"],
                action=ACTION_TRANSACTION_RECONCILED,
                performed_by=updated_by,
                notes=f"Bank transaction #{existing['bank_transaction_id']} manually marked as reconciled.",
            )
            
            # Update business records when manually matched
            reference_id = data.get("reference_id", existing.get("reference_id"))
            reconciliation_type = data.get("reconciliation_type", existing.get("reconciliation_type"))
            
            if reference_id and transaction:
                self._update_business_record(
                    recon_type=reconciliation_type,
                    reference_id=reference_id,
                    transaction=transaction,
                    record_id=record_id,
                    matched_by=updated_by,
                )

        # Add method=Manual if status is being changed to Matched manually
        if new_status == STATUS_MATCHED:
            data["method"] = METHOD_MANUAL

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
        assessments: list = None, receivables: list = None,
        payables: list = None, direction: str = None,
    ) -> str:
        """Replace placeholders in the prompt template with actual data."""

        txn_json = json.dumps({
            "id": transaction["id"],
            "date": str(transaction["transaction_date"]),
            "description": transaction["description"],
            "amount": float(transaction["amount"]),
            "type": direction or self._get_direction_label(transaction),
            "transaction_type": transaction.get("transaction_type", ""),
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
            "name": v["vendor_name"],
            "category": v.get("category", ""),
        } for v in vendors], indent=2)

        unit_list = json.dumps([{
            "id": u["id"],
            "unit_number": u["unit_number"],
            "owner_name": u["owner_name"],
            "monthly_hoa_amount": float(u["monthly_hoa_amount"]),
        } for u in units], indent=2)

        assessment_list = json.dumps([{
            "id": a["id"],
            "unit_id": a["unit_id"],
            "unit_number": a["unit_number"],
            "owner_name": a["owner_name"],
            "title": a["title"],
            "allocated_amount": float(a["allocated_amount"]),
            "paid_amount": float(a.get("paid_amount", 0)),
            "due_date": str(a["due_date"]),
            "status": a["status"],
        } for a in (assessments or [])], indent=2)

        receivable_list = json.dumps([{
            "id": r["id"],
            "unit_id": r.get("unit_id"),
            "unit_number": r.get("unit_number", ""),
            "owner_name": r.get("owner_name", ""),
            "amount": float(r["amount"]),
            "due_date": str(r["due_date"]) if r.get("due_date") else None,
            "status": r["status"],
            "description": r.get("description", ""),
        } for r in (receivables or [])], indent=2)

        payable_list = json.dumps([{
            "id": p["id"],
            "vendor_id": p.get("vendor_id"),
            "vendor_name": p.get("vendor_name", ""),
            "amount": float(p["amount"]),
            "due_date": str(p["due_date"]) if p.get("due_date") else None,
            "status": p["status"],
            "description": p.get("description", ""),
        } for p in (payables or [])], indent=2)

        prompt = template.replace("{{transaction}}", txn_json)
        prompt = prompt.replace("{{invoices}}", inv_list)
        prompt = prompt.replace("{{vendors}}", vendor_list)
        prompt = prompt.replace("{{units}}", unit_list)
        prompt = prompt.replace("{{assessments}}", assessment_list)
        prompt = prompt.replace("{{receivables}}", receivable_list)
        prompt = prompt.replace("{{payables}}", payable_list)

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

    def _create_unmatched_record(
        self, bank_transaction_id: int, association_id: Optional[int],
        matched_by: Optional[int] = None, notes: str = None
    ) -> int:
        return self.repo.create_reconciliation(
            association_id=association_id,
            bank_transaction_id=bank_transaction_id,
            record_type=RECORD_TYPE_MANUAL,
            record_id=None,
            status=STATUS_UNMATCHED,
            method=METHOD_AUTO_MATCH,
            match_score=0,
            notes=notes or "Gemini could not determine a match.",
            matched_by=matched_by,
            created_by=matched_by,
        )

    def _map_record_type(self, gemini_type: str, is_credit: bool) -> str:
        """Map Gemini's transaction_type response to our record_type ENUM."""
        mapping = {
            "invoice": RECORD_TYPE_INVOICE,
            "deposit": RECORD_TYPE_DEPOSIT,
            "hoa deposit": RECORD_TYPE_DEPOSIT,
            "hoa_deposit": RECORD_TYPE_DEPOSIT,
            "special assessment": RECORD_TYPE_RECEIVABLE,
            "special_assessment": RECORD_TYPE_RECEIVABLE,
            "specialassessment": RECORD_TYPE_RECEIVABLE,
            "receivable": RECORD_TYPE_RECEIVABLE,
            "payable": RECORD_TYPE_PAYABLE,
            "manual": RECORD_TYPE_MANUAL,
        }
        result = mapping.get(gemini_type.lower().strip(), RECORD_TYPE_MANUAL)

        # If Gemini says Invoice but this is a credit, it's likely a Receivable
        if result == RECORD_TYPE_INVOICE and is_credit:
            return RECORD_TYPE_RECEIVABLE
        # If Gemini says Deposit but this is a debit, it's likely a Payable
        if result == RECORD_TYPE_DEPOSIT and not is_credit:
            return RECORD_TYPE_PAYABLE

        return result

    def _map_status(self, gemini_status: str, score: int) -> str:
        """Map confidence score to reconciliation status."""
        if score >= SCORE_THRESHOLD_MATCHED:
            return STATUS_MATCHED
        if score >= SCORE_THRESHOLD_SUGGESTED:
            return STATUS_SUGGESTED
        return STATUS_UNMATCHED

    def _update_business_record(
        self, recon_type: str, reference_id: Optional[int],
        transaction: dict, record_id: int = None, matched_by: Optional[int] = None,
    ):
        """After a successful match, update the matched business record.

        For Invoice: update invoice status to Paid.
        For Payable: update payable status to Paid.
        For Receivable: update receivable status to Paid.
        For Deposit: reference_id points to condo_units.id — log only.
        """

        if not reference_id:
            return

        txn_date = transaction["transaction_date"]
        txn_amount = float(transaction["amount"])

        if recon_type == RECORD_TYPE_INVOICE:
            self.repo.update_invoice_status(reference_id, "Paid")
            logger.info("Invoice %s marked as Paid.", reference_id)

            self.audit.log(
                entity_type="invoice",
                entity_id=reference_id,
                action=ACTION_INVOICE_STATUS_UPDATED,
                old_value={"status": "Pending"},
                new_value={"status": "Paid"},
                performed_by=matched_by,
                notes=f"Invoice #{reference_id} status changed: Pending → Paid. "
                      f"Paid on {txn_date} via bank transaction #{transaction['id']}",
            )

        elif recon_type == RECORD_TYPE_PAYABLE:
            self.repo.update_payable_status(reference_id, "Paid")
            logger.info("Payable %s marked as Paid.", reference_id)

            self.audit.log(
                entity_type="payable",
                entity_id=reference_id,
                action=ACTION_INVOICE_STATUS_UPDATED,
                old_value={"status": "Pending"},
                new_value={"status": "Paid"},
                performed_by=matched_by,
                notes=f"Payable #{reference_id} status changed: Pending → Paid. "
                      f"Paid on {txn_date} via bank transaction #{transaction['id']}",
            )

        elif recon_type == RECORD_TYPE_RECEIVABLE:
            self.repo.update_receivable_status(reference_id, "Paid")
            logger.info("Receivable %s marked as Paid.", reference_id)

            # If this receivable is linked to an assessment allocation, update it too
            self._sync_assessment_allocation(reference_id, txn_amount)

            self.audit.log(
                entity_type="receivable",
                entity_id=reference_id,
                action=ACTION_ASSESSMENT_MATCHED,
                old_value={"status": "Pending"},
                new_value={"status": "Paid"},
                performed_by=matched_by,
                notes=f"Receivable #{reference_id} status changed: Pending → Paid. "
                      f"Amount: ${txn_amount:.2f}. Date: {txn_date}",
            )

        elif recon_type == RECORD_TYPE_DEPOSIT:
            logger.info(
                "Deposit recorded for condo_units.id=%s via reconciliations.", reference_id
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

    def get_matchable_records(self, bank_transaction_id: int) -> dict:
        """
        Get all possible records that can be matched with this bank transaction.
        
        Returns different types of records based on transaction direction:
        - For Debit transactions (money OUT): Returns pending invoices + payables
        - For Credit transactions (money IN): Returns condo units (deposits) + receivables + assessments
        """
        transaction = self.repo.get_bank_transaction(bank_transaction_id)
        if not transaction:
            raise TransactionNotFoundException(bank_transaction_id)
        
        is_credit = self._is_credit_transaction(transaction)
        direction = self._get_direction_label(transaction)
        transaction_amount = abs(float(transaction["amount"]))
        
        result = {
            "transaction": {
                "id": transaction["id"],
                "date": str(transaction["transaction_date"]),
                "description": transaction["description"],
                "amount": transaction_amount,
                "type": direction,
            },
            "matchable_records": []
        }
        
        if not is_credit:
            # DEBIT transactions (money OUT) -> Show pending invoices + payables
            invoices = self.repo.get_pending_invoices()
            for inv in invoices:
                result["matchable_records"].append({
                    "record_type": "Invoice",
                    "id": inv["id"],
                    "invoice_number": inv["invoice_number"],
                    "vendor_id": inv["vendor_id"],
                    "vendor_name": inv.get("vendor_name", f"Vendor #{inv['vendor_id']}"),
                    "amount": float(inv["amount"]),
                    "invoice_date": str(inv["invoice_date"]),
                    "due_date": str(inv["due_date"]) if inv["due_date"] else None,
                    "status": inv["status"],
                    "notes": inv.get("notes"),
                    "description": inv.get("notes") or f"Invoice {inv['invoice_number']}",
                })

            payables = self.repo.get_pending_payables()
            for p in payables:
                result["matchable_records"].append({
                    "record_type": "Payable",
                    "id": p["id"],
                    "vendor_id": p.get("vendor_id"),
                    "vendor_name": p.get("vendor_name", ""),
                    "amount": float(p["amount"]),
                    "due_date": str(p["due_date"]) if p.get("due_date") else None,
                    "status": p["status"],
                    "description": p.get("description", ""),
                })
        else:
            # CREDIT transactions (money IN) -> Show condo units + receivables + assessments
            units = self.repo.get_all_units()
            for unit in units:
                result["matchable_records"].append({
                    "record_type": "Deposit",
                    "id": unit["id"],
                    "unit_number": unit["unit_number"],
                    "owner_name": unit["owner_name"],
                    "owner_email": unit.get("owner_email"),
                    "monthly_hoa_amount": float(unit["monthly_hoa_amount"]),
                    "description": f"HOA Deposit - Unit {unit['unit_number']}",
                    "amount": float(unit["monthly_hoa_amount"]),
                })

            receivables = self.repo.get_pending_receivables()
            for r in receivables:
                result["matchable_records"].append({
                    "record_type": "Receivable",
                    "id": r["id"],
                    "unit_id": r.get("unit_id"),
                    "unit_number": r.get("unit_number", ""),
                    "owner_name": r.get("owner_name", ""),
                    "amount": float(r["amount"]),
                    "due_date": str(r["due_date"]) if r.get("due_date") else None,
                    "status": r["status"],
                    "description": r.get("description", ""),
                })

            # Outstanding special assessments
            assessments = self.repo.get_outstanding_assessments()
            for a in assessments:
                result["matchable_records"].append({
                    "record_type": "SpecialAssessment",
                    "id": a["id"],
                    "unit_id": a["unit_id"],
                    "unit_number": a["unit_number"],
                    "owner_name": a["owner_name"],
                    "title": a["title"],
                    "amount": float(a["allocated_amount"]),
                    "due_date": str(a["due_date"]),
                    "status": a["status"],
                    "description": f"{a['title']} - Unit {a['unit_number']}",
                })
        
        return result

    def _sync_assessment_allocation(self, receivable_id: int, paid_amount: float):
        """If a receivable is linked to an assessment allocation, update the allocation too."""
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            "SELECT assessment_allocation_id FROM receivables WHERE id = %s",
            (receivable_id,),
        )
        row = cursor.fetchone()
        if not row or not row.get("assessment_allocation_id"):
            return

        allocation_id = row["assessment_allocation_id"]

        # Update allocation: set paid_amount and status
        cursor.execute(
            """
            UPDATE assessment_allocations
            SET paid_amount = %s, status = 'Paid', updated_at = NOW()
            WHERE id = %s
            """,
            (paid_amount, allocation_id),
        )

        # Check if ALL allocations for this assessment are now Paid → mark parent Completed
        cursor.execute(
            "SELECT assessment_id FROM assessment_allocations WHERE id = %s",
            (allocation_id,),
        )
        alloc_row = cursor.fetchone()
        if alloc_row:
            assessment_id = alloc_row["assessment_id"]
            cursor.execute(
                """
                SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) as paid
                FROM assessment_allocations WHERE assessment_id = %s
                """,
                (assessment_id,),
            )
            counts = cursor.fetchone()
            if counts["total"] > 0 and counts["total"] == counts["paid"]:
                cursor.execute(
                    "UPDATE special_assessments SET status = 'Completed', updated_at = NOW() WHERE id = %s",
                    (assessment_id,),
                )
                logger.info("All allocations paid for assessment %s. Marked as Completed.", assessment_id)

        self.db.commit()
