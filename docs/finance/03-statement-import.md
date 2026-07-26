# Finance Phase 3 - Bank Statement Import

## Goal

Allow bank statement upload, extraction, transaction preview, duplicate detection, and reviewed import.

This phase should use deterministic parsing and validation first, with AI only assisting where structured extraction is ambiguous.

## Scope

- PDF upload.
- Secure file handling.
- Text and table extraction.
- Transaction detection.
- Structured normalization.
- Merchant normalization.
- Category classification.
- Duplicate detection.
- Import preview.
- Confirmed import.

## Processing Pipeline

Use a pipeline rather than one large AI prompt:

1. PDF upload.
2. Validate file type and size.
3. Store or process file securely.
4. Extract text and tables.
5. Detect candidate transactions.
6. Normalize dates, descriptions, merchants, amounts, and transaction type.
7. Generate duplicate fingerprints.
8. Suggest categories.
9. Validate parsed rows.
10. Show review screen.
11. Import only confirmed rows.

## PDF Extraction Types

Support progressively:

- Type 1: text-based PDF with readable lines.
- Type 2: PDF with transaction tables.
- Type 3: scanned or image-heavy PDF.

Type 3 may require OCR later. Do not block the whole import feature on scanned-statement support.

## Import Preview

Never immediately commit imported transactions.

Preview columns:

- date
- description
- normalized merchant
- amount
- type
- category
- duplicate status
- confidence

Allow the user to:

- edit category
- edit merchant
- exclude rows
- confirm import
- cancel import

## Duplicate Detection

Uploading the same bank statement twice must not duplicate transactions.

Generate a deterministic fingerprint from:

- account
- transaction date
- amount
- reference or description
- statement identifier if available
- imported source

Flag possible duplicates before importing. Exact duplicates should be blocked by database constraints where practical.

## AI Usage

Use AI for:

- ambiguous descriptions
- merchant recognition
- category suggestions
- anomaly explanation

Do not make the LLM the sole parser unless unavoidable.

## Security

- Validate uploaded file type and size.
- Avoid logging statement contents.
- Avoid logging account numbers.
- Do not expose raw server file paths.
- Mask account identifiers by default.
- Retain full bank details only when genuinely required.

## Acceptance Criteria

- User can upload a representative statement.
- System extracts candidate transactions.
- User can review and edit extracted rows.
- Duplicate rows are flagged before import.
- Confirmed import creates transactions.
- Uploading the same statement again does not silently duplicate records.
- Failed parsing shows actionable errors.

## Tests

Add tests for:

- parser fixtures where feasible
- duplicate fingerprint generation
- duplicate import blocking
- category suggestion fallback behavior
- import preview validation
- confirmed import writes
- canceled import no-op behavior
