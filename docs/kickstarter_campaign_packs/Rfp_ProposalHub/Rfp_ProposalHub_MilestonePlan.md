# Rfp ProposalHub — Milestone Plan & Acceptance
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

- **RFP-specific:**
- Ingest 20-sample RFP set → structured spec with ≥95% key field extraction accuracy (human-labeled).
- Proposal draft generation fills ≥90% of mandatory sections using KB with citations.
- Compliance matrix exported and validated in CSV and Docx.
- Round-trip editing preserves structure (Word/Google Docs).

## Integrations (initial adapters)
- Connectors: Google Drive/Docs, Microsoft 365, Slack, Zoom/Meet transcripts, Salesforce/HubSpot.
- CPQ placeholders; DocuSign/Adobe Sign (optional).
- Auth: Okta, Azure AD.
