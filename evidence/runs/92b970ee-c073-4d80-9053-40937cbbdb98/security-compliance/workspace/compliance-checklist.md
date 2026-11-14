# Compliance Checklist — wo-notification-schema-001

- Run ID: 92b970ee-c073-4d80-9053-40937cbbdb98
- Release: 1.4.0
- Status: **PRODUCED (proposal). Not ACCEPTED. No certification is claimed.**

Legend: PASSED / FAILED / N-A / HUMAN-EXCEPTION / **NOT VERIFIED** (evidence missing)

No formal control IDs were supplied, because the trusted policy was not available. The rows below use descriptive names, not invented control identifiers.

## Provenance and integrity

| Check | Result | Evidence |
|---|---|---|
| Input artifact SHA-256 verified | NOT VERIFIED | No artifact or digest provided |
| Repository base SHA / source commit SHA recorded | NOT VERIFIED | Not provided |
| FactoryRelease 1.4.0 digest verified | NOT VERIFIED | Only the version string is available |
| Scanner identity and version verified | NOT VERIFIED | No scanner output provided |
| Trusted policy reference and digest | NOT VERIFIED | Not provided |
| Service classification | NOT VERIFIED | `targetService` is empty |

## Security controls

| Check | Result | Evidence |
|---|---|---|
| Tenant isolation tests | NOT VERIFIED | No test report |
| Secrets scan | NOT VERIFIED | No scan result |
| Dependency / lockfile change review | NOT VERIFIED | No diff |
| PII exposure review of the new payload | NOT VERIFIED | No schema diff |
| Non-breaking compatibility of the schema addition | NOT VERIFIED | No diff or contract tests |
| Open critical or high findings | NOT VERIFIED | No findings data |

## Deterministic checks

| Check | Result | Evidence |
|---|---|---|
| `pnpm exec tsx factories/security-compliance/scripts/verify-security.ts` | NOT RUN | No repository checkout in the workspace; no exit code exists |
| `pnpm factory registry:verify` | NOT RUN | Same reason |

## Exceptions and approvals

| Item | Result |
|---|---|
| Human exceptions requested or approved | None. None were fabricated. |
| Patch PR | None created. No vulnerability was identified, and nothing could be scanned. |
| Approver / authority sign-off | Pending. Required from the designated security authority. |

## Disposition request

- **Proposed disposition:** NOT ACCEPTABLE AS-IS, because required evidence is missing. This is a request to escalate, not a rejection of the change itself.
- **Needed to proceed:** candidate PR and SHA, verified scanner results, trusted policy and service classification, FactoryRelease digest.
- **Final decision:** the independent verifier or an authenticated designated human.
