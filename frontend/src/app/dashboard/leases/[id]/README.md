# Lease Statement

This route renders the A4 print-ready statement for a lease at `dashboard/leases/[id]/statement`.

Data source:
- GET `/finance/payment-reconciliation/lease-statement/{lease_id}/?start=YYYY-MM-DD&end=YYYY-MM-DD`

Print/PDF:
- Use the Print button (or browser print) to generate an A4 PDF. The table header repeats across pages and margins are set for ~12mm.

Notes:
- All values come from the backend (no mock data). Running balance and opening balance are calculated server-side.

