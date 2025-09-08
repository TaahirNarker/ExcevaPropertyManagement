## Feature: Lease Account Status Column

Goal: Add an "Account Status" column on `/dashboard/leases` showing if a tenant is Up to Date, In Debt, or In Credit for the lease, with numeric balance available.

Approach:
- Compute balance per lease in backend list API via annotations to avoid extra round trips.
- Use finance models: `Invoice.total_amount` (exclude draft/cancelled) as charges and `PaymentAllocation.allocated_amount` as payments for those invoices.
- Define `balance_cents = (payments - charges) * 100` and expose alongside a `financial_status` string in the lease serializer.
- Update frontend leases page to render a badge and accessible tooltip with the amount.

Key Decisions:
- No schema changes; only computed fields.
- Single-query annotation using `Coalesce` and `Sum`.
- Status mapping: 0 => UP_TO_DATE, <0 => IN_DEBT, >0 => IN_CREDIT.

Files Touched:
- `backend/leases/views.py`: annotate queryset with `balance_cents`.
- `backend/leases/serializers.py`: add `balance_cents` and `financial_status` read-only fields.
- `frontend/src/app/dashboard/leases/page.tsx`: include new column and TS fields.

Testing Notes:
- Verify leases with no invoices (balance 0 => UP_TO_DATE).
- Verify partially paid invoices (negative balance => IN_DEBT).
- Verify overpayments and credits (positive balance => IN_CREDIT).


