<!--
  Cursor Auto Prompt: Lease Statement Redesign
  Purpose: End-to-end redesign of the Lease "View Statement" to match the provided professional example, including A4 print/PDF fidelity and backend data integrity. 
  Notes: No mock data. Keep scope focused to statement-related logic. Update docs and tests.
-->

ROLE
You are a senior full-stack team working inside this repo:
- Backend: Django (Python) in `/Users/patel/Documents/GitHub/ExcevaPropertyManagement/backend`
- Frontend: Next.js/TypeScript + Tailwind in `/Users/patel/Documents/GitHub/ExcevaPropertyManagement/frontend`
Objective: Redesign the Lease “View Statement” screen and PDF/print output to match the attached sample statement image (professional property statement) with pixel-accurate layout, robust data mapping, and A4 print/PDF fidelity. Fix root causes in data and UI; no mock data.

NON-NEGOTIABLES
- Do not introduce mock data anywhere (dev or prod). Use the real data and existing endpoints or add/extend real APIs as needed.
- Keep changes scoped to statement-related code unless refactors are essential for correctness.
- Preserve existing indentation. Keep edits minimal and focused.
- Break work into stages; create `plan.md`, update `progress.md`, and `TODO.txt` as you proceed.
- Write unit/integration tests where applicable. Ensure app builds and page renders without console errors.
- Provide exact `npm` installation commands if any new frontend packages are required (avoid unless critical).

WHERE THIS FEATURE LIVES (START HERE)
- Find the Lease detail screen “View Statement” entry point, component(s), and route.
- Frontend root: `/Users/patel/Documents/GitHub/ExcevaPropertyManagement/frontend/src`
  - Likely paths: `app/(dashboard)/**`, `components/**`, `features/**`, or `pages/**`.
- Backend root: `/Users/patel/Documents/GitHub/ExcevaPropertyManagement/backend`
  - Finance/statement data likely modeled in: `finance/serializers.py`, `leases/**`, `payments/**`, `reports/**`.
- Add minimal backend endpoints only if gaps exist (Django REST). Reuse serializers in `backend/finance/serializers.py` if suitable. Do not duplicate.

DATA CONTRACT (SOURCE OF TRUTH)
For a given lease id, the statement needs:
- Landlord/Agent header info: company name, reg no, VAT no (if present), address, contact email/phone.
- Tenant name and postal address lines (multi-line).
- Property reference and display name/address.
- Statement metadata: period start (inclusive), period end (inclusive), payment reference.
- Opening balance (as of period start).
- Line items in period (sorted by date asc):
  - Each row: date, reference number (or blank), description, method (Deposit/Invoice/Direct Deposit/etc.), debit (positive), credit (positive), running balance after row.
- Summary lines:
  - “Balance due on YYYY-MM-DD” (bold, right aligned, clear)
  - Damage deposit balance (if applicable)
  - Interest for the period line (with small-print advisory text)
- “Ways to pay” block (bank details) and a “Please quote Bill Payment Reference” footer string.
- Branding: small “Powered by …” footer if applicable (use our brand; do not copy third-party logos unless already in `/public`).

If any field is currently unavailable, extend backend serializers and endpoints to expose it properly (no mock). Document new fields in code comments and in `plan.md`.

UI/UX SPEC (MATCH THE ATTACHED SAMPLE)
- Page is A4 portrait, print-optimized; whitespace and alignment must mirror the sample:
  - Header: Left = tenant name + address (stacked). Right = company block (company name, reg no, VAT, full address lines, tel, email).
  - Title area: big “STATEMENT” title, then metadata lines:
    - Payment reference: <value>
    - Property: <value>
    - Statement period: <YYYY-MM-DD> to <YYYY-MM-DD>
- Transactions table:
  - Columns: Date | Ref no | Description | Method | Debit | Credit | Balance
  - Opening balance row (bold description “Opening balance”, balance value).
  - Proper currency formatting (two decimals; adhere to locale if configured).
  - Subtle alternating rows; minimalist grid.
  - Running balance computed and shown per row (server-side preferred for consistency).
- Totals section:
  - Prominent “Balance due on <end-date>” aligned right, bold, larger font.
  - Damage deposit balance and Interest rows with caption “(After a monthly administrative & advisory fee)” where applicable.
- Footer:
  - “Ways to Pay”: left column “Direct Deposit” with bank details (account name, number, branch code, SWIFT if available). Right column “At any of these stores” with instructions (use our known copy if already present; otherwise use actual backend-provided text).
  - Bottom note: “Please quote this Bill Payment Reference: <value>” with extra emphasis.
- Colors: grayscale for print. Use Tailwind classes that print well.
- Typography: title ~20–24px; table ~12–13px; metadata ~12–13px; footer ~10–11px.
- Responsiveness: Screen shows centered A4 canvas with shadow; print/PDF uses ~12–16mm margins.

TECH IMPLEMENTATION
Frontend
- Create a dedicated statement view component (server component if using App Router) to render a pure A4 layout with print CSS.
- Encapsulate table rendering and currency formatting utilities.
- Implement `@media print` to:
  - Hide app chrome/navigation.
  - Ensure A4 pagination; repeat table headers on page breaks.
- Provide a “Download PDF” button:
  - Option A (preferred): Call a backend endpoint that returns server-rendered PDF (wkhtmltopdf, WeasyPrint, or existing utility).
  - Option B: Next.js server route rendering the same HTML to PDF (avoid heavy deps unless necessary).
- Use only real API data; if fields are missing, extend backend.

Backend
- Add/extend an endpoint: `GET /api/leases/{lease_id}/statement?start=YYYY-MM-DD&end=YYYY-MM-DD` returning:
  - tenant, property, company header blocks
  - payment reference
  - opening_balance
  - transactions (date, ref, description, method, debit, credit, running_balance)
  - balance_due_on_date
  - damage_deposit_balance
  - interest_line (amount, caption)
  - bank_details and payment_instructions
- Calculate running balance server-side.
- Reuse or extend serializers in `backend/finance/serializers.py` and related models in `leases/`, `payments/`, `finance/`.
- Validate inputs and handle errors (invalid dates, lease not found, etc.).
- Optional: `GET /api/leases/{lease_id}/statement.pdf?...` producing identical layout as PDF.

PRINT/PDF FIDELITY
- Repeat table header on page breaks.
- Maintain consistent font sizes between screen and PDF.
- Use `page-break-inside: avoid` appropriately.

TESTING
- Unit tests for:
  - Running balance correctness across invoices and payments.
  - Opening balance at arbitrary start dates.
  - Interest/damage deposit presence or absence.
- Integration test hitting the statement API asserting JSON shape and totals.
- Visual smoke test for the component using real API.
- Verify print preview pagination and header repetition.

FILES TO CREATE/EDIT (EXAMPLES; DISCOVER ACTUAL PATHS)
- Frontend:
  - `frontend/src/app/leases/[leaseId]/statement/page.tsx` (or current routing equivalent)
  - `frontend/src/components/finance/StatementView.tsx`
  - `frontend/src/styles/print.css` (or colocated CSS module)
  - `frontend/src/lib/currency.ts`
- Backend:
  - `backend/finance/serializers.py` (extend/add serializer for statement response)
  - `backend/finance/views.py` or `backend/leases/views.py` (API endpoints)
  - `backend/urls.py` (route)
  - Optional: `backend/reports/pdf.py` if server-side PDF is implemented

ACCEPTANCE CRITERIA
- Lease “View Statement” page renders professional A4-like layout matching the sample.
- Bold “Balance due on <date>” line identical in emphasis.
- Accurate payment instructions footer from real data.
- Print preview shows correct pagination/margins and header repetition.
- “Download PDF” yields identical PDF to on-screen layout.
- No console errors/warnings; lint and typecheck pass.
- No mock data anywhere.
- `plan.md`, `progress.md`, and `TODO.txt` updated with scope, status, and next steps.
- New/updated tests pass locally.

NOTES
- Prefer minimal dependencies; if a new PDF library is required on frontend, declare exactly with:
  npm i <package>
- Use SOLID and small, well-named components and functions. Avoid duplication.

DELIVERABLES
- Fully implemented UI + API with tests.
- Updated documentation in `plan.md`, `progress.md`, `TODO.txt`.
- Short README section in either `frontend/src/app/leases/[leaseId]/statement/README.md` or a central doc describing how to print/PDF and which endpoints power the view.


