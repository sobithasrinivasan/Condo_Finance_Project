import axiosInstance from "../interceptor"

export const getReconciliationSummaryApi = async () => {
    const result = await axiosInstance.get(`bank-reconciliation/summary`)
    return result?.data || { data: [] }
}

export const getAllTransactionsApi = async (params: { page: number, page_size: number, bank_statement_id?: number, reconciled?: boolean }) => {
    const result = await axiosInstance.get(`bank-reconciliation/all-transactions`, { params })
    return result?.data
    // return {
    //     "data": [
    //         {
    //             "transaction": {
    //                 "id": 3,
    //                 "bank_statement_id": 1,
    //                 "transaction_date": "2026-06-03",
    //                 "description": "ACH Debit - Harborview Gas & Electric",
    //                 "amount": 356.5,
    //                 "type": "Debit",
    //                 "ocr_verified": 1,
    //                 "reconciled": 0,
    //                 "created_at": "2026-08-03T11:53:01",
    //                 "created_by": 1,
    //                 "updated_by": 1,
    //                 "updated_at": "2026-08-03T11:53:01",
    //                 "is_active": 1,
    //                 "version": 1,
    //                 "reconciliation_id": 3,
    //                 "reconciliation_type": "Invoice",
    //                 "reconciliation_status": "NeedsReview",
    //                 "match_score": 50,
    //                 "payment_status": "Early",
    //                 "matched_record_name": "0092-4471-38"
    //             },
    //             "reconciliations": [
    //                 {
    //                     "id": 15,
    //                     "bank_transaction_id": 3,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 4,
    //                     "payment_status": "Early",
    //                     "match_score": 50,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - Harborview Gas & Electric', which matches a known vendor name, classifying it as an Invoice.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:03",
    //                     "created_at": "2026-08-03T14:33:41",
    //                     "updated_at": "2026-08-03T14:33:41",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 },
    //                 {
    //                     "id": 14,
    //                     "bank_transaction_id": 3,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 4,
    //                     "payment_status": "Early",
    //                     "match_score": 50,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - Harborview Gas & Electric', which matches a known vendor name, classifying it as an Invoice.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:03",
    //                     "created_at": "2026-08-03T14:33:40",
    //                     "updated_at": "2026-08-03T14:33:40",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 },
    //                 {
    //                     "id": 13,
    //                     "bank_transaction_id": 3,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 4,
    //                     "payment_status": "Early",
    //                     "match_score": 50,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - Harborview Gas & Electric', which matches a known vendor name, classifying it as an Invoice.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:03",
    //                     "created_at": "2026-08-03T14:33:38",
    //                     "updated_at": "2026-08-03T14:33:38",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 },
    //                 {
    //                     "id": 3,
    //                     "bank_transaction_id": 3,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 4,
    //                     "payment_status": "Early",
    //                     "match_score": 50,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - Harborview Gas & Electric', which matches a known vendor name, classifying it as an Invoice.; Step 2: The extracted vendor name 'Harborview Gas & Electric' matches 'Harborview Gas & Electric Co.' from Known Vendors and Pending Invoices after stripping suffixes. vendor_match is set to true.; Step 3: Searched the Pending Invoices list and found invoice id 4 ('0092-4471-38') for Harborview Gas & Electric Co. with an amount of 356.5. However, the invoice date is 2026-06-28 and due date is 2026-07-22, while the transaction date is 2026-06-03, which is before the invoice date. matched_record_id is set to 4.; Step 4: The transaction amount of 356.5 matches the invoice amount of 356.5 exactly, so amount_match is true.; Step 5: The transaction date (2026-06-03) is prior to the invoice date (2026-06-28) and due date (2026-07-22). Therefore, date_consistent is false and payment_timing is Early.; Step 6: duplicate_match is false.; Step 7: Vendor match (+30), exact amount match (+30 +10 bonus), but date is outside the expected range (transaction date is before invoice date), resulting in a base score adjusted to 50.; Step 8: Score is 50, which falls in the 50-84 range, resulting in a 'NeedsReview' status due to the date discrepancy.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:03",
    //                     "created_at": "2026-08-03T11:54:02",
    //                     "updated_at": "2026-08-03T11:54:02",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 }
    //             ]
    //         },
    //         {
    //             "transaction": {
    //                 "id": 3,
    //                 "bank_statement_id": 1,
    //                 "transaction_date": "2026-06-03",
    //                 "description": "ACH Debit - Harborview Gas & Electric",
    //                 "amount": 356.5,
    //                 "type": "Debit",
    //                 "ocr_verified": 1,
    //                 "reconciled": 0,
    //                 "created_at": "2026-08-03T11:53:01",
    //                 "created_by": 1,
    //                 "updated_by": 1,
    //                 "updated_at": "2026-08-03T11:53:01",
    //                 "is_active": 1,
    //                 "version": 1,
    //                 "reconciliation_id": 13,
    //                 "reconciliation_type": "Invoice",
    //                 "reconciliation_status": "NeedsReview",
    //                 "match_score": 50,
    //                 "payment_status": "Early",
    //                 "matched_record_name": "0092-4471-38"
    //             },
    //             "reconciliations": [
    //                 {
    //                     "id": 15,
    //                     "bank_transaction_id": 3,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 4,
    //                     "payment_status": "Early",
    //                     "match_score": 50,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - Harborview Gas & Electric', which matches a known vendor name, classifying it as an Invoice.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:03",
    //                     "created_at": "2026-08-03T14:33:41",
    //                     "updated_at": "2026-08-03T14:33:41",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 },
    //                 {
    //                     "id": 14,
    //                     "bank_transaction_id": 3,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 4,
    //                     "payment_status": "Early",
    //                     "match_score": 50,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - Harborview Gas & Electric', which matches a known vendor name, classifying it as an Invoice.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:03",
    //                     "created_at": "2026-08-03T14:33:40",
    //                     "updated_at": "2026-08-03T14:33:40",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 },
    //                 {
    //                     "id": 13,
    //                     "bank_transaction_id": 3,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 4,
    //                     "payment_status": "Early",
    //                     "match_score": 50,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - Harborview Gas & Electric', which matches a known vendor name, classifying it as an Invoice.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:03",
    //                     "created_at": "2026-08-03T14:33:38",
    //                     "updated_at": "2026-08-03T14:33:38",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 },
    //                 {
    //                     "id": 3,
    //                     "bank_transaction_id": 3,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 4,
    //                     "payment_status": "Early",
    //                     "match_score": 50,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - Harborview Gas & Electric', which matches a known vendor name, classifying it as an Invoice.; Step 2: The extracted vendor name 'Harborview Gas & Electric' matches 'Harborview Gas & Electric Co.' from Known Vendors and Pending Invoices after stripping suffixes. vendor_match is set to true.; Step 3: Searched the Pending Invoices list and found invoice id 4 ('0092-4471-38') for Harborview Gas & Electric Co. with an amount of 356.5. However, the invoice date is 2026-06-28 and due date is 2026-07-22, while the transaction date is 2026-06-03, which is before the invoice date. matched_record_id is set to 4.; Step 4: The transaction amount of 356.5 matches the invoice amount of 356.5 exactly, so amount_match is true.; Step 5: The transaction date (2026-06-03) is prior to the invoice date (2026-06-28) and due date (2026-07-22). Therefore, date_consistent is false and payment_timing is Early.; Step 6: duplicate_match is false.; Step 7: Vendor match (+30), exact amount match (+30 +10 bonus), but date is outside the expected range (transaction date is before invoice date), resulting in a base score adjusted to 50.; Step 8: Score is 50, which falls in the 50-84 range, resulting in a 'NeedsReview' status due to the date discrepancy.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:03",
    //                     "created_at": "2026-08-03T11:54:02",
    //                     "updated_at": "2026-08-03T11:54:02",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 }
    //             ]
    //         },
    //         {
    //             "transaction": {
    //                 "id": 3,
    //                 "bank_statement_id": 1,
    //                 "transaction_date": "2026-06-03",
    //                 "description": "ACH Debit - Harborview Gas & Electric",
    //                 "amount": 356.5,
    //                 "type": "Debit",
    //                 "ocr_verified": 1,
    //                 "reconciled": 0,
    //                 "created_at": "2026-08-03T11:53:01",
    //                 "created_by": 1,
    //                 "updated_by": 1,
    //                 "updated_at": "2026-08-03T11:53:01",
    //                 "is_active": 1,
    //                 "version": 1,
    //                 "reconciliation_id": 14,
    //                 "reconciliation_type": "Invoice",
    //                 "reconciliation_status": "NeedsReview",
    //                 "match_score": 50,
    //                 "payment_status": "Early",
    //                 "matched_record_name": "0092-4471-38"
    //             },
    //             "reconciliations": [
    //                 {
    //                     "id": 15,
    //                     "bank_transaction_id": 3,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 4,
    //                     "payment_status": "Early",
    //                     "match_score": 50,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - Harborview Gas & Electric', which matches a known vendor name, classifying it as an Invoice.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:03",
    //                     "created_at": "2026-08-03T14:33:41",
    //                     "updated_at": "2026-08-03T14:33:41",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 },
    //                 {
    //                     "id": 14,
    //                     "bank_transaction_id": 3,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 4,
    //                     "payment_status": "Early",
    //                     "match_score": 50,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - Harborview Gas & Electric', which matches a known vendor name, classifying it as an Invoice.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:03",
    //                     "created_at": "2026-08-03T14:33:40",
    //                     "updated_at": "2026-08-03T14:33:40",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 },
    //                 {
    //                     "id": 13,
    //                     "bank_transaction_id": 3,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 4,
    //                     "payment_status": "Early",
    //                     "match_score": 50,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - Harborview Gas & Electric', which matches a known vendor name, classifying it as an Invoice.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:03",
    //                     "created_at": "2026-08-03T14:33:38",
    //                     "updated_at": "2026-08-03T14:33:38",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 },
    //                 {
    //                     "id": 3,
    //                     "bank_transaction_id": 3,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 4,
    //                     "payment_status": "Early",
    //                     "match_score": 50,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - Harborview Gas & Electric', which matches a known vendor name, classifying it as an Invoice.; Step 2: The extracted vendor name 'Harborview Gas & Electric' matches 'Harborview Gas & Electric Co.' from Known Vendors and Pending Invoices after stripping suffixes. vendor_match is set to true.; Step 3: Searched the Pending Invoices list and found invoice id 4 ('0092-4471-38') for Harborview Gas & Electric Co. with an amount of 356.5. However, the invoice date is 2026-06-28 and due date is 2026-07-22, while the transaction date is 2026-06-03, which is before the invoice date. matched_record_id is set to 4.; Step 4: The transaction amount of 356.5 matches the invoice amount of 356.5 exactly, so amount_match is true.; Step 5: The transaction date (2026-06-03) is prior to the invoice date (2026-06-28) and due date (2026-07-22). Therefore, date_consistent is false and payment_timing is Early.; Step 6: duplicate_match is false.; Step 7: Vendor match (+30), exact amount match (+30 +10 bonus), but date is outside the expected range (transaction date is before invoice date), resulting in a base score adjusted to 50.; Step 8: Score is 50, which falls in the 50-84 range, resulting in a 'NeedsReview' status due to the date discrepancy.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:03",
    //                     "created_at": "2026-08-03T11:54:02",
    //                     "updated_at": "2026-08-03T11:54:02",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 }
    //             ]
    //         },
    //         {
    //             "transaction": {
    //                 "id": 3,
    //                 "bank_statement_id": 1,
    //                 "transaction_date": "2026-06-03",
    //                 "description": "ACH Debit - Harborview Gas & Electric",
    //                 "amount": 356.5,
    //                 "type": "Debit",
    //                 "ocr_verified": 1,
    //                 "reconciled": 0,
    //                 "created_at": "2026-08-03T11:53:01",
    //                 "created_by": 1,
    //                 "updated_by": 1,
    //                 "updated_at": "2026-08-03T11:53:01",
    //                 "is_active": 1,
    //                 "version": 1,
    //                 "reconciliation_id": 15,
    //                 "reconciliation_type": "Invoice",
    //                 "reconciliation_status": "NeedsReview",
    //                 "match_score": 50,
    //                 "payment_status": "Early",
    //                 "matched_record_name": "0092-4471-38"
    //             },
    //             "reconciliations": [
    //                 {
    //                     "id": 15,
    //                     "bank_transaction_id": 3,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 4,
    //                     "payment_status": "Early",
    //                     "match_score": 50,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - Harborview Gas & Electric', which matches a known vendor name, classifying it as an Invoice.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:03",
    //                     "created_at": "2026-08-03T14:33:41",
    //                     "updated_at": "2026-08-03T14:33:41",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 },
    //                 {
    //                     "id": 14,
    //                     "bank_transaction_id": 3,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 4,
    //                     "payment_status": "Early",
    //                     "match_score": 50,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - Harborview Gas & Electric', which matches a known vendor name, classifying it as an Invoice.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:03",
    //                     "created_at": "2026-08-03T14:33:40",
    //                     "updated_at": "2026-08-03T14:33:40",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 },
    //                 {
    //                     "id": 13,
    //                     "bank_transaction_id": 3,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 4,
    //                     "payment_status": "Early",
    //                     "match_score": 50,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - Harborview Gas & Electric', which matches a known vendor name, classifying it as an Invoice.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:03",
    //                     "created_at": "2026-08-03T14:33:38",
    //                     "updated_at": "2026-08-03T14:33:38",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 },
    //                 {
    //                     "id": 3,
    //                     "bank_transaction_id": 3,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 4,
    //                     "payment_status": "Early",
    //                     "match_score": 50,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - Harborview Gas & Electric', which matches a known vendor name, classifying it as an Invoice.; Step 2: The extracted vendor name 'Harborview Gas & Electric' matches 'Harborview Gas & Electric Co.' from Known Vendors and Pending Invoices after stripping suffixes. vendor_match is set to true.; Step 3: Searched the Pending Invoices list and found invoice id 4 ('0092-4471-38') for Harborview Gas & Electric Co. with an amount of 356.5. However, the invoice date is 2026-06-28 and due date is 2026-07-22, while the transaction date is 2026-06-03, which is before the invoice date. matched_record_id is set to 4.; Step 4: The transaction amount of 356.5 matches the invoice amount of 356.5 exactly, so amount_match is true.; Step 5: The transaction date (2026-06-03) is prior to the invoice date (2026-06-28) and due date (2026-07-22). Therefore, date_consistent is false and payment_timing is Early.; Step 6: duplicate_match is false.; Step 7: Vendor match (+30), exact amount match (+30 +10 bonus), but date is outside the expected range (transaction date is before invoice date), resulting in a base score adjusted to 50.; Step 8: Score is 50, which falls in the 50-84 range, resulting in a 'NeedsReview' status due to the date discrepancy.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:03",
    //                     "created_at": "2026-08-03T11:54:02",
    //                     "updated_at": "2026-08-03T11:54:02",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 }
    //             ]
    //         },
    //         {
    //             "transaction": {
    //                 "id": 7,
    //                 "bank_statement_id": 1,
    //                 "transaction_date": "2026-06-10",
    //                 "description": "ACH Debit - CrestLine Communications",
    //                 "amount": 137.79,
    //                 "type": "Debit",
    //                 "ocr_verified": 1,
    //                 "reconciled": 0,
    //                 "created_at": "2026-08-03T11:53:01",
    //                 "created_by": 1,
    //                 "updated_by": 1,
    //                 "updated_at": "2026-08-03T11:53:01",
    //                 "is_active": 1,
    //                 "version": 1,
    //                 "reconciliation_id": 7,
    //                 "reconciliation_type": "Invoice",
    //                 "reconciliation_status": "NeedsReview",
    //                 "match_score": 70,
    //                 "payment_status": "Early",
    //                 "matched_record_name": "INV-2026-118273"
    //             },
    //             "reconciliations": [
    //                 {
    //                     "id": 7,
    //                     "bank_transaction_id": 7,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": 3,
    //                     "payment_status": "Early",
    //                     "match_score": 70,
    //                     "status": "NeedsReview",
    //                     "resolution_notes": "Step 1: The transaction is a Debit with description 'ACH Debit - CrestLine Communications', which matches the known vendor CrestLine Communications, classifying it as an Invoice.; Step 2: Extracted vendor name is 'CrestLine Communications', which matches vendor id 3 in both Known Vendors and Pending Invoices; vendor_match is set to true.; Step 3: Searched Pending Invoices and found invoice id 3 for CrestLine Communications with an exact amount match of 137.79, but the transaction date (2026-06-10) is before the invoice date (2026-07-01), leading to a date discrepancy.; Step 4: Transaction amount 137.79 matches invoice id 3 amount 137.79 exactly, so amount_match is true.; Step 5: Transaction date (2026-06-10) is prior to the invoice date (2026-07-01), which is outside the normal expected window following invoice issuance, so date_consistent is false and payment_timing is Early relative to the invoice date.; Step 6: duplicate_match is set to false.; Step 7: Confidence score calculated as 30 (vendor match) + 30 (amount match) + 10 (exact amount bonus) - 0 = 70 points (date consistency points omitted due to date preceding invoice date).; Step 8: Final status is 'NeedsReview' because the confidence score is between 50 and 84 and the transaction date precedes the invoice issuance date.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:11",
    //                     "created_at": "2026-08-03T11:54:11",
    //                     "updated_at": "2026-08-03T11:54:11",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 }
    //             ]
    //         },
    //         {
    //             "transaction": {
    //                 "id": 9,
    //                 "bank_statement_id": 1,
    //                 "transaction_date": "2026-06-18",
    //                 "description": "Check #1043 - Reliant Plumbing Services",
    //                 "amount": 925,
    //                 "type": "Debit",
    //                 "ocr_verified": 1,
    //                 "reconciled": 0,
    //                 "created_at": "2026-08-03T11:53:01",
    //                 "created_by": 1,
    //                 "updated_by": 1,
    //                 "updated_at": "2026-08-03T11:53:01",
    //                 "is_active": 1,
    //                 "version": 1,
    //                 "reconciliation_id": 9,
    //                 "reconciliation_type": "Invoice",
    //                 "reconciliation_status": "Unresolved",
    //                 "match_score": 30,
    //                 "payment_status": "Late",
    //                 "matched_record_name": null
    //             },
    //             "reconciliations": [
    //                 {
    //                     "id": 9,
    //                     "bank_transaction_id": 9,
    //                     "reconciliation_type": "Invoice",
    //                     "reference_id": null,
    //                     "payment_status": "Late",
    //                     "match_score": 30,
    //                     "status": "Unresolved",
    //                     "resolution_notes": "Step 1: The transaction is a Debit and mentions a vendor name, so it is classified as 'Invoice'.; Step 2: Extracted vendor name is 'Reliant Plumbing Services'. Checked against Known Vendors list and Pending Invoices list using fuzzy matching. No match found.; Step 3: Searched the Pending Invoices list for a record matching vendor 'Reliant Plumbing Services' and amount $925.0. No matching record found.; Step 4: Amount could not be verified against any matched record since no pending invoice exists for Reliant Plumbing Services.; Step 5: Date consistency could not be properly evaluated against a matched record, defaulting to Late.; Step 6: Duplicate match is false.; Step 7: Vendor not found in Known Vendors list (-30 points), no amount match, no date match. Base score is 30.; Step 8: Score is below 50, resulting in 'Unresolved' status.",
    //                     "matched_by": null,
    //                     "matched_date": "2026-08-03T06:24:15",
    //                     "created_at": "2026-08-03T11:54:15",
    //                     "updated_at": "2026-08-03T11:54:15",
    //                     "created_by": null,
    //                     "updated_by": null,
    //                     "is_active": 1,
    //                     "version": 1
    //                 }
    //             ]
    //         }
    //     ],
    //     "pagination": {
    //         "page": 1,
    //         "page_size": 10,
    //         "total": 3,
    //         "total_pages": 1
    //     }
    // }
}


export const getTransactionAuditApi = async (transactionId: number) => {
    const result = await axiosInstance.get(`bank-reconciliation/${transactionId}/audit`)
    return result?.data
}

export const exportReconciliationApi = async (data: {
    format: string;
    sections: string[];
    bank_statement_id?: number;
    bank_statement_ids?: number[];
    include_audit?: boolean;
}) => {
    const result = await axiosInstance.post(`bank-reconciliation/export`, data, {
        responseType: "blob",
    })
    return result
}

export const reconcileStatementApi = async (data: {
    bank_statement_ids: number[];
}, params?: {
    matched_by?: number | null;
}) => {
    const result = await axiosInstance.post(`bank-reconciliation/reconcile-statement`, data, { params })
    return result?.data
}

export const updateReconciliationRecordApi = async (reconciliationId: number, data: {
    status: string;
    resolution_notes?: string;
    reconciliation_type?: string;
    reference_id?: number | null;
}) => {
    const result = await axiosInstance.patch(`bank-reconciliation/${reconciliationId}`, data)
    return result?.data
}

