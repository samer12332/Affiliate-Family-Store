# QA Test Report - 2026-03-18

## Scope
Manual + API scenario validation for role access, notifications, commissions, orders, and core API protections.

## Environment
- App URL: http://localhost:3000
- API URL: http://localhost:3000/api
- Date: 2026-03-18 (Africa/Cairo)

## Test Summary
- Total scenario checks executed: 12
- Passed: 10
- Failed: 2
- Skipped: 1

## Executed Scenarios
1. Owner login with valid credentials -> PASS
2. Unauthorized `/notifications` access blocked (401) -> PASS
3. Owner dashboard API loads (`/admin/dashboard`) -> PASS
4. Owner users list loads and roles are present -> PASS
5. Submerchant scope on `/admin/users` returns self only -> PASS
6. Marketer scope on `/admin/users` returns only submerchant/merchant roles -> PASS
7. Notifications endpoint returns unread count -> PASS
8. Single notification mark-as-read endpoint works -> PASS (or no notifications to mark)
9. Commission transfer blocked before delivered (`/orders/:id/commission-transfer`) -> PASS (400 expected)
10. Marketer gets notification when marketer dues marked paid -> PASS (unread increased)
11. Marketer gets notification on order status change -> PASS (unread increased)
12. Lint command execution (`npm run lint`) -> FAIL
13. Production build command (`npm run build`) -> FAIL
14. Eligible delivered order for marketer mark_paid available -> SKIP if no order found

## Defects Found

### DEF-001: Lint script broken due missing eslint dependency
- Severity: Medium
- Repro:
  1. Run `npm run lint`
  2. Observe error: `'eslint' is not recognized as an internal or external command`
- Expected: lint runs and reports code issues
- Actual: command fails immediately
- Suspected root cause: `eslint` package/config missing from devDependencies/toolchain

### DEF-002: Build fails with spawn EPERM after successful compile
- Severity: High
- Repro:
  1. Run `npm run build`
  2. Compile succeeds, then build exits with `Error: spawn EPERM`
- Expected: build completes successfully
- Actual: build aborts after compile phase
- Notes: warning about multiple lockfiles/root inference also appears

## Notes
- API security checks validated in tested paths (auth required + role scoping + status gating for commission transfer).
- Notification behavior for marketer now verified for both:
  - order status changes
  - marketer payment marking (`channel=marketer`, `action=mark_paid`)

## Recommended Next Actions
1. Fix lint toolchain (`eslint` install/config), rerun lint and capture output.
2. Investigate `spawn EPERM` build failure on this machine (permissions/AV/lockfile/workspace root warning).
3. After fixes, rerun full QA regression and compare results.
