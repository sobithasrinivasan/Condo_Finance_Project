
DOCUMENT_NOT_FOUND = {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Requested document was not found."
}

INVALID_DOCUMENT = {
    "code": "INVALID_DOCUMENT",
    "message": "Invalid or unsupported document."
}

EXTRACTION_FAILED = {
    "code": "EXTRACTION_FAILED",
    "message": "Failed to extract document."
}

VENDOR_NOT_IN_LIST = {
    "code": "VENDOR_NOT_IN_LIST",
    "message": (
        "The vendor is not in the vendor list. "
        "Kindly add the vendor in the vendor list and click extraction."
    )
}

VENDOR_NAME_REQUIRED = {
    "code": "VENDOR_NAME_REQUIRED",
    "message": (
        "vendor_name is required when document_type is INVOICE. "
        "Bank statement uploads do not need a vendor_name."
    )
}

VENDOR_MISMATCH = {
    "code": "VENDOR_MISMATCH",
    "message": (
        "The vendor on the uploaded document does not match the vendor_name "
        "provided. Upload the invoice for the correct vendor, or add that "
        "vendor to the vendor list first."
    )
}

DATABASE_ERROR = {
    "code": "DATABASE_ERROR",
    "message": "Database operation failed."
}

UNAUTHORIZED = {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized access."
}


PROMPT_NOT_FOUND = {
    "code": "PROMPT_NOT_FOUND",
    "message": "Prompt file not found."
}

PROMPT_CONFIGURATION_ERROR = {
    "code": "PROMPT_CONFIGURATION_ERROR",
    "message": "Invalid prompt configuration."
}

YAML_NOT_FOUND = {
    "code": "YAML_NOT_FOUND",
    "message": "YAML configuration file not found."
}

INVALID_YAML = {
    "code": "INVALID_YAML",
    "message": "Invalid YAML configuration."
}


OCR_FAILED = {
    "code": "OCR_FAILED",
    "message": "OCR extraction failed."
}


GEMINI_FAILED = {
    "code": "GEMINI_FAILED",
    "message": "Gemini extraction failed."
}

INVALID_GEMINI_RESPONSE = {
    "code": "INVALID_GEMINI_RESPONSE",
    "message": "Gemini returned an invalid response."
}


INSERT_FAILED = {
    "code": "INSERT_FAILED",
    "message": "Failed to insert record."
}

UPDATE_FAILED = {
    "code": "UPDATE_FAILED",
    "message": "Failed to update record."
}

DELETE_FAILED = {
    "code": "DELETE_FAILED",
    "message": "Failed to delete record."
}