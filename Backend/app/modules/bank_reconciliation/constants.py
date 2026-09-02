# Record Types (matches DB ENUM for record_type)
RECORD_TYPE_INVOICE = "Invoice"
RECORD_TYPE_DEPOSIT = "Deposit"
RECORD_TYPE_RECEIVABLE = "Receivable"
RECORD_TYPE_PAYABLE = "Payable"
RECORD_TYPE_MANUAL = "Manual"

RECORD_TYPES = {
    RECORD_TYPE_INVOICE,
    RECORD_TYPE_DEPOSIT,
    RECORD_TYPE_RECEIVABLE,
    RECORD_TYPE_PAYABLE,
    RECORD_TYPE_MANUAL,
}

# Reconciliation Status (matches DB ENUM)
STATUS_MATCHED = "Matched"
STATUS_SUGGESTED = "Suggested"
STATUS_UNMATCHED = "Unmatched"

RECONCILIATION_STATUSES = {
    STATUS_MATCHED,
    STATUS_SUGGESTED,
    STATUS_UNMATCHED,
}

# Reconciliation Method (matches DB ENUM)
METHOD_AUTO_MATCH = "Auto_Match"
METHOD_MANUAL = "Manual"

RECONCILIATION_METHODS = {
    METHOD_AUTO_MATCH,
    METHOD_MANUAL,
}

# Score Thresholds
SCORE_THRESHOLD_MATCHED = 85
SCORE_THRESHOLD_SUGGESTED = 50
# Below 50 = Unmatched

# Direction helpers - determine credit/debit from transaction_type
# transaction_type ENUM: 'Credit', 'Debit'
# transaction_method ENUM: 'Cheque', 'Debit', 'Deposit', 'ACH', 'Other' (original instrument)
CREDIT_TRANSACTION_TYPES = {"Credit"}
DEBIT_TRANSACTION_TYPES = {"Debit"}
AMBIGUOUS_TRANSACTION_TYPES = set()  # No longer needed; transaction_type is always Credit or Debit
