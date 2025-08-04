# ApplicationAI — Milestone Plan & Acceptance
**Date:** 2025-08-02

## Scope notes
- Deployment modes: SaaS / VPC / on-prem supported.
- Models: support for provider-agnostic LLMs with pluggable adapters; no training on customer data without consent.

## M0 — Spec & Risk Plan (0–2 weeks)
- Threat model, data flows, acceptance tests, backlog & velocity plan.
- Evidence: architecture doc, test plan, DPIA (if needed).
- Release: 0–10% (optional).

## M1 — Security & Identity (2–6 weeks) — Release 30%
- SSO (SAML/OIDC), RBAC, audit logging.
- SBOM; SCA/DAST; dependency pinning.
- Initial pen test & remediation plan.
- **Acceptance evidence:** demo, SSO/RBAC tests, pen test summary, SBOM/SCA reports.

## M2 — Reliability & Data (4–8 weeks) — Release 40%
- SLOs & alerting, error budgets.
- Backups/restore drill (RTO<4h, RPO<24h).
- Rate limits; usage metering.
- Admin console & data export (CSV/Parquet).
- **Acceptance evidence:** dashboards, restore drill video, rate limit tests, export samples.

## M3 — Compliance & Enterprise Fit (3–6 weeks) — Release 30%
- Security questionnaire pack (SIG Lite/CAIQ mapping), DPA, data retention policy.
- Deployment guides (SaaS/VPC/on-prem), runbooks.
- Badges: Security-Ready, SSO-Ready, PII-Safe (as applicable).
- **Acceptance evidence:** completed questionnaires, DPA template ready, guides uploaded.

## Product-specific acceptance criteria

- **Application-specific:**
- URL→Application pipeline completes on 50-sample test set with >95% required field fill rate.
- Submitter chat achieves >80% completion without human assist on test cohort.
- Enrichment cards show sources with ≥90% resolvable citations.
- Rubric scoring reproducible with fixed seeds; CRM export validated (Affinity + HubSpot).

## Integrations (initial adapters)
- Sources: public web, customer-supplied data, Perplexity API (customer key).
- Destinations: Affinity, HubSpot, Salesforce (basic), Notion export.
- Auth: Okta, Azure AD.
