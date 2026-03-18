# Phase 0B: Document Import & Data Ingestion System PRD

**Owner:** Brandon Micci | **Version:** 1.0 | **Date:** March 17, 2026
**Status:** Ready to Build | **Priority:** HIGH — replaces static seed scripts with a living import system
**Depends On:** Phase 0 (Foundation Refactor — Supabase-first data layer must be in place)

---

## 1. Purpose

Replace hardcoded seed data and one-time seed scripts with a document-driven data ingestion system. Users upload financial documents (Excel files, PDFs, bank statements, tax forms, IRS notices) and the system extracts structured data into Supabase tables using the appropriate parsing method — deterministic for structured files, AI-assisted for unstructured documents.

This is the data backbone of micci-os. Every financial module (M1–M9), health protocol, and life plan gets its data through this system rather than through hardcoded constants or manual database entry.

## 2. Why This Approach

| Approach | Accuracy | Flexibility | User Experience | Maintainability |
|---|---|---|---|---|
| Hardcoded constants | 100% (at write time) | None — code change required | None — developer only | Poor — stale immediately |
| Seed scripts | 100% (at run time) | Low — new script per file | None — CLI only | Moderate — scripts break when schema changes |
| **Document Import (this PRD)** | **99.9% structured / 95%+ AI with review** | **High — upload any time** | **Great — user-facing flow** | **Excellent — schema-aware, reprocessable** |

The document import system turns data ingestion into a first-class feature, not a developer task.

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Document Upload UI                        │
│  (drag-drop zone — existing DocumentUpload.tsx component)   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  File Router │  ← Detects file type
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
    ┌─────────────────┐      ┌─────────────────────┐
    │  PATH 1:         │      │  PATH 2:             │
    │  Structured      │      │  AI-Assisted         │
    │  Import          │      │  Extraction          │
    │                  │      │                      │
    │  .xlsx, .csv     │      │  .pdf, .docx, .txt   │
    │  Known layouts   │      │  Unstructured docs   │
    │  Deterministic   │      │  LLM extraction      │
    │  xlsx/SheetJS    │      │  Claude + prompts    │
    └────────┬────────┘      └──────────┬──────────┘
             │                          │
             ▼                          ▼
    ┌─────────────────────────────────────────────┐
    │           Review & Confirm Screen            │
    │  User sees extracted data in table format    │
    │  Can edit any field before confirming        │
    │  Confidence indicators on AI-extracted data  │
    └──────────────────────┬──────────────────────┘
                           │
                           ▼
    ┌─────────────────────────────────────────────┐
    │        Supabase Insert / Upsert              │
    │  Data written to target table(s)             │
    │  Source document linked for audit trail       │
    │  Document also chunked + embedded for RAG    │
    └─────────────────────────────────────────────┘
```

## 4. What Already Exists

The current codebase has a working document pipeline:

- **`DocumentUpload.tsx`** — Drag-and-drop file upload component with progress indicators
- **`/api/upload/route.ts`** — Uploads files to Supabase Storage, creates record in `documents` table
- **`/api/process-document/route.ts`** — Parses PDF (pdf-parse), XLSX (xlsx), DOCX (mammoth) → chunks text → generates embeddings (OpenAI text-embedding-3-small) → stores in `document_chunks` table
- **`documents` table** — File metadata (name, file_type, section, is_processed)
- **`document_chunks` table** — Vector embeddings for RAG retrieval

**What's being added:** A structured extraction layer that sits between "file parsed" and "chunks embedded." Instead of only creating text chunks for chat context, the system also extracts structured records and writes them to the appropriate Supabase tables.

---

## 5. Path 1: Structured Import (Deterministic)

### When to Use
- Excel files (.xlsx, .xls) with tabular data in known or recognizable column layouts
- CSV files with headers
- Any file where columns map directly to database fields

### How It Works

1. **Upload:** User drops file into import UI
2. **Parse:** SheetJS (`xlsx` package — already installed) reads the workbook
3. **Sheet Detection:** System scans sheet names and headers to identify the data type:
   - Headers like "Account Name", "Balance", "Rate", "Payment" → debt accounts
   - Headers like "Subscription", "Monthly Cost", "Status" → subscriptions
   - Headers like "Category", "Annual", "Monthly", "Survival" → budget categories
   - Headers like "Test Name", "Date", "Value", "Unit" → lab results
4. **Column Mapping UI:** User sees a mapping screen:
   - Left: detected columns from the file
   - Right: target database fields
   - Auto-mapped where header names match (fuzzy match)
   - User can adjust/override mappings
   - Preview of first 5 rows with mapped data
5. **Validation:** Type checking (numbers are numbers, dates parse correctly), required field check, range validation (interest rates 0–100%, balances >= 0)
6. **Review:** Full data table preview with any validation warnings highlighted
7. **Confirm:** User clicks "Import" → data upserted into Supabase
8. **Audit:** Source document linked to imported records via `import_source_id`

### Supported File Types & Target Tables

| File Pattern | Target Table | Key Mappings |
|---|---|---|
| HELOC Consolidation Plan / Debt accounts | `debt_accounts` | account_name, balance, rate, payment, status |
| Subscription audit | `subscriptions` | name, category, monthly_cost, annual_cost, status |
| Spending analysis / Budget | `budget_categories` | category, annual_amount, monthly_amount, survival_target |
| Transaction history | `transactions` | date, amount, category, merchant, description |
| Module tracker | `financial_modules` | module_id, status, progress |
| Lab results (if tabular) | `lab_markers` | test_name, date, value, unit, reference_range |

### Column Mapping Configuration

Store mappings so repeat imports of the same file format auto-map correctly:

```typescript
interface ImportMapping {
  id: string;
  name: string;               // e.g., "HELOC Consolidation Plan"
  targetTable: string;         // e.g., "debt_accounts"
  columnMappings: {
    sourceColumn: string;      // Column header from file
    targetField: string;       // Database field name
    transform?: string;        // Optional: 'currency_to_number', 'date_parse', 'percentage_to_decimal'
  }[];
  lastUsed: Date;
}
```

```sql
CREATE TABLE import_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  target_table TEXT NOT NULL,
  column_mappings JSONB NOT NULL,
  last_used TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE import_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own mappings" ON import_mappings
  FOR ALL USING (auth.uid() = user_id);
```

---

## 6. Path 2: AI-Assisted Extraction (LLM)

### When to Use
- PDF documents (IRS notices, W-2s, tax forms, property tax assessments, bank statements)
- DOCX files with unstructured text
- Any document where data is embedded in prose, tables within PDFs, or scanned text

### How It Works

1. **Upload:** User drops file into import UI
2. **Parse:** Existing pipeline extracts text (pdf-parse for PDFs, mammoth for DOCX)
3. **Classify:** LLM identifies the document type and what data can be extracted:
   - "This appears to be an IRS Notice CP2000 for tax year 2024"
   - "This appears to be a W-2 form from JPMorgan Chase"
   - "This appears to be a lab results report from Quest Diagnostics"
4. **Extract:** LLM extracts structured fields using a schema-aware prompt:

```typescript
// Example extraction prompt for IRS notices
const extractionPrompt = `
You are extracting structured data from an IRS notice.
Extract the following fields if present:

- notice_type: (e.g., CP2000, CP501, CP14, LT11)
- tax_year: (YYYY)
- amount_owed: (numeric, in dollars)
- response_deadline: (YYYY-MM-DD)
- taxpayer_id_last4: (last 4 of SSN if visible)
- issue_summary: (1-2 sentence description of the issue)
- proposed_changes: (array of {description, amount})

Return as JSON. If a field is not found, return null.
For each field, include a confidence score (0.0 to 1.0).

Document text:
${documentText}
`;
```

5. **Confidence Scoring:** Each extracted field gets a confidence score:
   - **High (0.9+):** Clear, unambiguous value found → Green indicator
   - **Medium (0.7–0.89):** Value found but some ambiguity → Amber indicator
   - **Low (<0.7):** Uncertain or inferred → Red indicator, requires manual review

6. **Review Screen:** User sees extracted data in a form:
   - Each field shows: extracted value, confidence badge, source text highlight
   - User can edit any field
   - Fields with low confidence are pre-highlighted for attention
   - "Show source" button reveals the original text passage the value was extracted from

7. **Confirm:** User reviews, edits if needed, clicks "Import"
8. **Insert:** Data written to target Supabase table
9. **Audit:** Source document linked, extraction metadata stored (which LLM, confidence scores)
10. **RAG:** Document also chunked and embedded for chat context (existing pipeline)

### Extraction Schemas by Document Type

| Document Type | Target Table | Extracted Fields |
|---|---|---|
| IRS Notice | `irs_notices` (new) | notice_type, tax_year, amount_owed, response_deadline, issue_summary |
| W-2 Form | `tax_documents` (new) | employer, gross_wages, federal_withholding, ss_wages, medicare_wages, state |
| 1099 Form | `tax_documents` (new) | payer, income_type, amount, tax_year |
| Property Tax Notice | `property_assessments` (new) | assessed_value, land_value, improvement_value, tax_rate, total_tax, protest_deadline |
| Lab Results (PDF) | `lab_markers` | test_name, date, value, unit, reference_min, reference_max, provider |
| Bank Statement | `transactions` | date, description, amount, balance, account_number_last4 |
| Medical Bill | `health_expenses` (new) | provider, service_date, amount, insurance_paid, patient_owes, due_date |

### New Tables for AI-Extracted Data

```sql
-- IRS Notices (Module 7)
CREATE TABLE irs_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  notice_type TEXT, -- CP2000, CP501, etc.
  tax_year INTEGER,
  amount_owed NUMERIC,
  response_deadline DATE,
  issue_summary TEXT,
  proposed_changes JSONB,
  status TEXT CHECK (status IN ('new', 'reviewing', 'responded', 'resolved', 'escalated')) DEFAULT 'new',
  source_document_id UUID REFERENCES documents(id),
  extraction_confidence JSONB, -- per-field confidence scores
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tax Documents
CREATE TABLE tax_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  document_type TEXT CHECK (document_type IN ('w2', '1099_misc', '1099_int', '1099_div', '1099_b', '1098', 'other')),
  tax_year INTEGER NOT NULL,
  payer_employer TEXT,
  gross_amount NUMERIC,
  federal_withholding NUMERIC,
  state_withholding NUMERIC,
  ss_wages NUMERIC,
  medicare_wages NUMERIC,
  additional_fields JSONB,
  source_document_id UUID REFERENCES documents(id),
  extraction_confidence JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Property Assessments (Module 6)
CREATE TABLE property_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  tax_year INTEGER NOT NULL,
  assessed_value NUMERIC,
  land_value NUMERIC,
  improvement_value NUMERIC,
  total_tax NUMERIC,
  tax_rate_breakdown JSONB, -- by district
  homestead_exemptions JSONB,
  protest_deadline DATE,
  protest_status TEXT CHECK (protest_status IN ('not_filed', 'filed', 'informal_hearing', 'arb_hearing', 'resolved')) DEFAULT 'not_filed',
  source_document_id UUID REFERENCES documents(id),
  extraction_confidence JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE irs_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own irs_notices" ON irs_notices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tax_documents" ON tax_documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own property_assessments" ON property_assessments FOR ALL USING (auth.uid() = user_id);
```

---

## 7. Import Center UI

### Location Options

The import system should be accessible from two places:

**1. Global Import Center** — `/settings/import` or a top-nav upload button
   - Shows all uploaded documents with processing status
   - "Upload new document" action
   - History of all imports with source → target table linkage
   - Re-process button (re-extract from source if schema changed)

**2. Module-Level Import** — Import action within each module
   - HELOC Tracker → "Import accounts from Excel"
   - Tax module → "Upload W-2" or "Upload IRS Notice"
   - Health → "Upload lab results"
   - The module-level import pre-selects the target table and provides contextual help about what format to upload

### Import Flow UI Mockup

```
┌─────────────────────────────────────────────────────┐
│ Import Data                                   [×]   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │     📄 Drop file here or click to browse    │    │
│  │                                             │    │
│  │     Supports: .xlsx, .csv, .pdf, .docx     │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  Recent Imports:                                     │
│  ✅ HELOC_Plan.xlsx → debt_accounts (15 rows) Mar 17│
│  ✅ Module_2_Subs.xlsx → subscriptions (25 rows) ... │
│  ⏳ IRS_Notice_CP2000.pdf → processing...           │
│                                                      │
└─────────────────────────────────────────────────────┘

           ↓ (after file uploaded and parsed)

┌─────────────────────────────────────────────────────┐
│ Review Import: HELOC_Consolidation_Plan.xlsx        │
├─────────────────────────────────────────────────────┤
│ Target: debt_accounts  |  Rows: 15  |  Path: ✅     │
├─────────────────────────────────────────────────────┤
│ Column Mapping:                                      │
│  "Account Name"    →  account_name     ✅ auto      │
│  "Current Balance" →  current_balance  ✅ auto      │
│  "Interest Rate"   →  interest_rate    ✅ auto      │
│  "Monthly Payment" →  monthly_payment  ✅ auto      │
│  "Status"          →  status           ✅ auto      │
│  "Notes"           →  notes            ⚙️ manual    │
├─────────────────────────────────────────────────────┤
│ Preview (first 5 rows):                              │
│                                                      │
│ Account Name      | Balance     | Rate   | Status   │
│ SoFi Personal Loan| $56,246.68 | 12.41% | rolled   │
│ Wells Fargo (Dad) | $21,420.00 | 12.49% | rolled   │
│ Virginia FCU Auto | $18,600.00 | 9.25%  | rolled   │
│ LightStream Auto  | $44,018.42 | 5.87%  | keep     │
│ AmEx Personal Loan| $3,558.53  | 7.33%  | keep     │
│ ... 10 more rows                                    │
│                                                      │
│ ⚠ 0 validation warnings                             │
│                                                      │
│              [Cancel]  [Import 15 rows →]            │
└─────────────────────────────────────────────────────┘
```

### AI Extraction Review Screen

```
┌─────────────────────────────────────────────────────┐
│ AI Extraction: IRS_Notice_CP2000.pdf                │
├─────────────────────────────────────────────────────┤
│ Detected: IRS Notice CP2000 (Proposed Changes)      │
│ Target: irs_notices  |  Path: AI-Assisted           │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Notice Type:   CP2000            🟢 High (0.98)     │
│ Tax Year:      2024              🟢 High (0.99)     │
│ Amount Owed:   [$3,247.00]       🟢 High (0.95)     │
│ Response By:   [2026-04-30]      🟡 Med  (0.82)     │
│ Summary:       [Unreported 1099  🟢 High (0.91)     │
│                income from...]                       │
│                                                      │
│ [Show source text]  ← highlights relevant passages   │
│                                                      │
│ ⚠ 1 field needs review (Response deadline)          │
│                                                      │
│              [Cancel]  [Confirm & Import →]          │
└─────────────────────────────────────────────────────┘
```

---

## 8. Audit Trail

Every import creates an audit record linking the source document to the imported data:

```sql
CREATE TABLE import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  source_document_id UUID REFERENCES documents(id),
  source_filename TEXT NOT NULL,
  import_path TEXT CHECK (import_path IN ('structured', 'ai_assisted')) NOT NULL,
  target_table TEXT NOT NULL,
  rows_imported INTEGER NOT NULL,
  column_mapping_id UUID REFERENCES import_mappings(id),
  extraction_metadata JSONB, -- for AI path: model used, confidence scores, prompt version
  status TEXT CHECK (status IN ('completed', 'partial', 'failed', 'rolled_back')) DEFAULT 'completed',
  error_details TEXT,
  imported_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own imports" ON import_history
  FOR ALL USING (auth.uid() = user_id);
```

This enables:
- "Where did this data come from?" → trace any record back to its source document
- "Re-import with updated file" → upload a new version, system identifies changed rows
- "Undo import" → rollback all records from a specific import (if needed)

---

## 9. Re-Import & Update Flow

When uploading a file that targets a table with existing data:

1. **Match Detection:** System compares incoming rows to existing records (match on account_name for debt_accounts, name for subscriptions, etc.)
2. **Diff Display:** Shows which rows are new, which are updates, and what changed:
   - New rows → green highlight
   - Changed values → amber highlight with old → new comparison
   - Unchanged rows → gray
   - Missing rows (in DB but not in file) → flagged but NOT auto-deleted
3. **User Choice:** Import all, import only changes, or select row-by-row
4. **Upsert:** Uses Supabase upsert with conflict resolution on the match key

This is critical for the monthly workflow: Brandon updates his HELOC plan Excel with new balances → uploads → system shows "SoFi balance changed from $56,246.68 to $55,102.33" → confirms → database updated.

---

## 10. Integration with Existing RAG Pipeline

Every document imported through this system ALSO goes through the existing RAG pipeline:
- Text extracted → chunked → embedded → stored in `document_chunks`
- This means uploaded financial documents are available to the AI Chat for contextual queries
- "What did my last IRS notice say?" → RAG retrieves the relevant chunks
- "What's my highest-rate debt?" → can answer from both structured data (Supabase query) AND document context (RAG)

The dual storage (structured tables + vector embeddings) gives the system both:
- **Precise data** for calculations and displays (from Supabase tables)
- **Rich context** for AI conversations (from RAG embeddings)

---

## 11. API Routes

```
app/api/import/
├── detect/route.ts         — Upload file, detect type, return parsing options
├── map-columns/route.ts    — Auto-map columns for structured import, return mapping
├── preview/route.ts        — Parse file with mapping, return preview data
├── extract/route.ts        — AI extraction for unstructured docs (streaming)
├── confirm/route.ts        — Write confirmed data to target Supabase table
├── history/route.ts        — List import history
└── rollback/route.ts       — Undo a specific import
```

---

## 12. Build Order

| Step | Task | Duration | Depends On |
|---|---|---|---|
| 0B.1 | Import Center UI shell + file upload routing | 1 day | Phase 0 |
| 0B.2 | Path 1: Structured parser (xlsx column detection + auto-mapping) | 2 days | 0B.1 |
| 0B.3 | Column mapping UI + preview table | 1 day | 0B.2 |
| 0B.4 | Structured import confirm → Supabase upsert | 1 day | 0B.3 |
| 0B.5 | Path 2: AI extraction prompts per document type | 2 days | 0B.1 |
| 0B.6 | AI review screen with confidence indicators | 1 day | 0B.5 |
| 0B.7 | Audit trail + import history | 0.5 days | 0B.4 + 0B.6 |
| 0B.8 | Re-import diff detection + upsert flow | 1 day | 0B.4 |
| 0B.9 | Module-level import buttons (HELOC, Tax, Health, etc.) | 0.5 days | 0B.4 + 0B.6 |
| 0B.10 | New Supabase tables (irs_notices, tax_documents, property_assessments) | 0.5 days | Phase 0 |

**Total: ~2 weeks**

## 13. Acceptance Criteria

- [ ] Can upload .xlsx file and see auto-detected column mappings
- [ ] Column mapping UI allows manual adjustment before import
- [ ] Preview shows exact data that will be imported (no surprises)
- [ ] Structured import: imported values are byte-identical to source cells (no rounding, no format loss)
- [ ] Can upload PDF and see AI-extracted fields with confidence scores
- [ ] AI extraction: low-confidence fields are visually flagged for review
- [ ] AI extraction: "Show source" highlights the original text passage
- [ ] User can edit any extracted field before confirming
- [ ] Import history shows all past imports with source file linkage
- [ ] Re-import of updated file shows diff (new rows, changed values)
- [ ] Uploaded documents also appear in RAG context for AI Chat
- [ ] Module-level import actions work (HELOC → import accounts, Tax → upload W-2)
- [ ] All new tables have RLS enabled and working
- [ ] Audit trail: any imported record can be traced back to its source document

## 14. Impact on Other PRDs

This PRD replaces the "seed script" approach in Phase 0. Specifically:

- **Phase 0 PRD (Section 3.3):** The seed script (`scripts/seed-financial-data.ts`) is no longer needed for production. It can still exist as a development convenience for quickly populating a fresh DB, but the primary data ingestion path is now document upload.
- **Phase 1 (Financial Simulator):** HELOC Tracker seed data comes from uploading the HELOC Consolidation Plan Excel file through the Import Center, not from a hardcoded seed.
- **Modules M7–M9:** These "not started" modules become actionable immediately — starting the module IS uploading the relevant documents (IRS notices, bank statements, estate docs).
- **CLAUDE.md:** Should be updated to reference the document import system as the primary data ingestion method.
