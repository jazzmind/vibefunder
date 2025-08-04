# ApplicationAI — Milestone Plan & Acceptance
**Start:** 2025-08-11  |  **Venue:** Massachusetts, USA

## M0 — Spec & Risk Plan (Week 1–2)
- Threat model, data flows, acceptance tests, backlog & velocity plan.
- Evidence: architecture doc, test plan, DPIA (if needed).
- Release: 0–10% (optional).

## M1 — Security & Identity (Weeks 3–6) — Release 30% (Due 2025-09-08)
- SSO (SAML/OIDC), RBAC/ABAC, audit logging.
- SBOM; SCA/DAST; dependency pinning; secrets scanning.
- Initial pen test & remediation plan.
- **Acceptance evidence:** SSO/RBAC tests; pen test summary; SBOM/SCA reports.

## M2 — Reliability & Data (Weeks 7–12) — Release 40% (Due 2025-10-20)
- SLOs & alerting, error budgets; runbooks.
- Backups/restore drill (RTO < 4h, RPO < 24h).
- Rate limits; usage metering.
- Admin console & data export (CSV/Parquet).
- **Acceptance evidence:** dashboards; restore drill video; rate limit tests; export samples.

## M3 — Compliance & Enterprise Fit (Weeks 13–17) — Release 30% (Due 2025-11-24)
- Security questionnaire pack (SIG Lite/CAIQ mapping), DPA, data retention policy.
- Deployment guides (SaaS/VPC/on-prem), hardening checklist.
- Badges: Security-Ready, SSO-Ready, PII-Safe.
- **Acceptance evidence:** completed questionnaires; DPA ready; guides uploaded.

## Product-Specific Acceptance Criteria
- URL→Application pipeline: 50-sample test set with >95% required field fill rate.  
- Submitter chat: >80% completion without human assist on test cohort.  
- Enrichment: ≥90% resolvable citations; explainability cards attached.  
- CRM export validated (Affinity + HubSpot).

## Integrations (Initial)
- Sources: public web, customer docs, Perplexity API (customer key).  
- Destinations: Affinity, HubSpot, Salesforce (basic), Notion export.  
- Auth: Okta, Azure AD.
