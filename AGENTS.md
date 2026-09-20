# DSDST Label Printer and renderer rules

This repository owns label-template authoring and deterministic rendering. It does not own catalog, inventory, warehouse, sales, finance, shipment or print-job business state. Read the binding V2 architecture in the checked-out `dsdst-operations/docs/architecture/` directory.

## Ownership and persistence

- L is the sole editable label-template source of truth.
- Each saved template has an immutable version/content hash. Concurrent updates require revision/CAS or a transactional equivalent; never acknowledge a lost update.
- Product lists, imported CSV/package data, editor settings and previews are inputs/projections only. They are not canonical product or stock data.
- The renderer reads templates and renders deterministic output. It never mutates business state.
- P owns print jobs, payload snapshots, attempts, printer target and delivery state. A job references an exact template version.
- Render success, CUPS/spool submission and physical delivery are distinct. Unknown delivery remains explicit and is not blindly retried.

## Security

- Human editor access uses P's live identity/capabilities in the backend.
- Renderer service authentication is scoped and internal; it never impersonates a human.
- Validate payload schemas, sizes, fonts/assets and file paths. Do not fetch arbitrary URLs or expose local files.
- Never log or persist tokens, API keys, customer secrets or unnecessary production payloads.
- Preserve non-root/read-only-container compatibility and read-only renderer access to template state.

Template-store changes require concurrency regression tests; renderer changes require deterministic fixture tests; auth changes require negative permission/session tests. Do not add business authority, weaken tests, touch printers/production, deploy, restart or migrate without explicit authorization.
