# Vikisol One — Frontend Architecture

This document exists so a future contributor can add a module without breaking the patterns
already in place. It reflects the codebase as actually inspected (file counts, import graphs,
memoization checked directly in source) — not an aspirational target.

## 1. Folder structure (as it exists today)

```
src/
  api/          24 domain modules + client.js (flat, one file per backend resource)
  components/
    ui/         24 generic, feature-agnostic primitives (Button, Card, Modal, DataTable, ...)
    layout/     AppLayout, Sidebar, Topbar - the persistent app shell
  context/      5 providers (Data, Auth, Theme, ApprovalEngine, PayrollEngine)
  pages/        15 feature subfolders (payroll/, employees/, leave/, ...) + 5 flat
                cross-cutting pages (Login, HelpCenter, NotificationCenter, OrgChart,
                ResourceAllocation) that don't belong to one feature
  data/         mock/demo data generators (generator.js, mock.js)
  utils/        format.js, logger.js, fileValidation.js
```

**Verdict**: hybrid, not a mistake. `pages/` is already feature-organized; `api/`, `context/`,
`utils/`, `components/ui/` are technical-grouped. This works today because API modules are flat
and decoupled (see §4) and there's no per-feature component logic yet that needs its own home.
It stops working once a feature accumulates enough feature-specific components/hooks/services
that a technical grouping makes them hard to find — the point to introduce
`src/features/<name>/` co-location is **when a feature folder needs more than page components**,
not before.

## 2. Module ownership

Each domain owns its business logic; other modules consume its *output*, never recompute its
rules. This is the boundary that must hold as new modules are added.

| Module | Owns | Must not happen elsewhere |
|---|---|---|
| **Employees** | Employee profile data, onboarding checklist, org hierarchy | Salary math, document templates |
| **Payroll** (`PayrollEngine` + `api/payroll.js`) | Salary structure breakdown, LOP/overtime calculation, CTC breakup, payroll run aggregation | Any other module computing `netPay`/`totalPayroll` independently (see §3 finding) |
| **Documents** (`doctemplate` backend module + `api/documentEngine.js`/`documentStudio.js`) | Template rendering, placeholder substitution, PDF generation | Any page building document HTML by hand |
| **Branding** (`api/branding.js`) | Company logo/signature/theme values documents inherit | Hardcoded company name/logo in any component |
| **Approval** (`ApprovalEngine`) | Generic approve/reject/hierarchy workflow, role-based `canApprove` | Domain-specific business rules (it receives an `updateFn` closure from the caller rather than mutating domain data itself - this is correct and should stay this way) |
| **Auth** (`AuthContext`) | Session identity, token lifecycle | Role-based UI gating logic belongs in the *consuming* page (client-side gating is UX only - the backend is the real authorization boundary, confirmed in Phase 4's security review) |

## 3. State management

**Provider tree** (`App.jsx`): `Theme > Auth > Data > Toast > Confirm > Approval > Payroll`.
Order is load-bearing: `Data` depends on `Auth` (calls `useAuth()`), `Approval`/`Payroll` depend on
`Data`/`Auth` being ancestors. Verified no circular imports exist between any context file.

| Context | Responsibility | Call sites | Memoized value? | Risk to refactor |
|---|---|---|---|---|
| `DataContext` | 14+ independent data domains (employees, leave, payroll, tickets, assets...), each with source/loading/error state and CRUD | 24 call sites / 21 files | Yes (`useMemo`, large dep array) | **High** - deeply woven, any structural change needs incremental migration |
| `AuthContext` | Session identity | 22 / 21 files | **No** - fresh object every render | High call-site count, but the fix (wrap in `useMemo`) is low-risk and worth doing |
| `ThemeContext` | Light/dark toggle | few | No, but re-renders rarely | Low risk, low priority |
| `ApprovalEngine` | Generic approve/reject workflow + role hierarchy | 3 / 3 files | No | **Low** - cheap to refactor, small blast radius |
| `PayrollEngine` | Salary/payslip calculation math | 1 / 1 file | No | **Low** - cheap to refactor, smallest blast radius of all 5 |

**Known real duplication** (not yet fixed): `DataContext`'s `stats.totalPayroll` and
`PayrollEngine`'s `payrollSummary.totalPayroll` both independently sum `netPay` over
`data.payslips` - two aggregation implementations over the same source array in two different
providers. Low-risk to consolidate given `PayrollEngine` has exactly 1 call site.

**DataContext is a god-object by data-domain count, not by design flaw** - it fetches from ~24 API
modules across 14 domains. This was somewhat necessary given the app's history (one context grew
with the app), but the ceiling is real: adding LMS/Vendor/Procurement/etc. as more `useState`
pairs and `useEffect` blocks in this same file is the wrong move. See §5.

## 4. API layer

24 domain modules (`api/*.js`), all importing only from `client.js` - confirmed zero cross-file
imports within `api/`. Naming is consistent (`getAll*/get*/create*/update*/delete*` plus
domain-specific actions like `runPayroll`, `generateOfferLetter`). Every raw `fetch()` call in the
codebase now goes through `client.js`'s shared `request()`/`uploadMultipart()`/`fetchBlob()` -
verified no domain module bypasses this (an earlier audit found and fixed 3 that did).

**What's centralized**: request/response envelope handling, error classification
(network/authentication/authorization/validation/timeout/server), structured logging, JWT
attachment, file upload/blob-fetch paths.

**What's not implemented** (real gaps, not claiming otherwise): no request cancellation
(`AbortController`), no retry-with-backoff strategy, no response caching layer beyond
`DataContext`'s in-memory state, no optimistic-update convention (each page handles this ad hoc
where it exists at all).

## 5. Scalability — adding a new module (e.g. Learning Management)

**Can be added without touching existing code**:
- A new `api/learningManagement.js` following the existing naming convention.
- New `pages/learning/*.jsx` following the existing per-feature folder pattern.
- New backend document types/branding fields (the doctemplate engine is already
  generic - confirmed in Phase 1/2, new document types need zero backend code).

**Will hit a real architectural bottleneck if not addressed first**:
- Adding the new module's data to `DataContext` the way every domain has been added so far
  (another `useState` triple + `useEffect` + entry in the `value` object) makes an already
  900-line file grow further and adds another eager-fetch-on-login candidate. **Recommendation**:
  new modules should NOT be added to `DataContext`. Use the existing `ensureLoad`/`retryLoad`
  lazy-loading pattern (built in Phase 3) as a **standalone per-module hook**
  (`useLearningManagementData()`) instead of extending the shared context. This is the concrete
  answer to "can new modules be added without revisiting the core architecture" - the lazy-load
  registry pattern is already generic; it just needs to stop being exclusively inside
  `DataContext` and become a reusable hook shape new modules adopt independently.
- Global search (`Topbar.jsx`) reads `data.candidates`/`data.tickets` directly from the preloaded
  array. A new module wanting to be globally searchable must not repeat this pattern (it's what
  blocked further lazy-loading in Phase 3) - it should register a search provider function instead
  of Topbar reading a growing list of preloaded arrays by name.

## 6. Shared services (reusable across future modules today)

Confirmed reusable, no changes needed: `Upload` (`uploadMultipart`), `Documents`
(generic `Document.DocumentType` + template engine), `Branding` (arbitrary key/value settings),
`Logging` (`utils/logger.js`), `Authentication` (`AuthContext`), sensitive-data masking
(`SensitiveValue`).

**Not yet a shared service, called out because future modules will want it**: permission-checking
is currently done ad hoc per-page (`['ceo','hr_manager','admin'].includes(user?.role)` repeated
across CompanyBranding, DocumentStudio, EmployeeDirectory, etc.) rather than a single
`hasPermission(user, action)` utility. Low urgency today (client-side gating is UX only, per the
security review), but worth centralizing before a 10th module repeats the same inline array.

## 7. Extension guidelines (for future contributors)

1. New feature → new `pages/<feature>/` folder + new `api/<feature>.js`. Don't add to an existing
   feature's files.
2. New feature's data → its own hook using the `ensureLoad`/`retryLoad` lazy pattern, not a new
   entry in `DataContext`.
3. New feature needs global search visibility → extend Topbar's search via a registered provider
   function, not a new `data.<feature>` array read directly.
4. New confidential field (salary-like, ID-like) → use `SensitiveValue`, no exceptions without a
   documented reason (see the two exceptions already on record: active offer-approval/hike
   contexts, where masking would impede the task the user is doing that moment).
5. New document type → add the enum value + a published template via Document Studio. No backend
   PDF-layout code needed - this is already fully generic.
6. Before adding business logic to a shared component (`components/ui/*`), ask whether it's
   feature-specific - if so it belongs in the feature's own folder, not in the shared layer.

---
*Last verified against the codebase in Phase 5 (see the accompanying Phase 5 report for the raw
findings this document was built from).*
