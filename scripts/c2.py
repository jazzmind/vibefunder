# Recreate the ApplicationAI Charter Pack after environment reset

import os, zipfile, datetime, pathlib, textwrap, csv

base = "./output/ApplicationAI_Charter_Pack"
os.makedirs(base, exist_ok=True)
ts = datetime.datetime.now().strftime("%B %d, %Y")

company_name = "[Your Company]"
venue = "Massachusetts, USA"
charter_price = 20000
backers = 5
budget = charter_price * backers
start_date = datetime.date(2025, 8, 11)
m1_end = start_date + datetime.timedelta(weeks=4)
m2_end = m1_end + datetime.timedelta(weeks=6)
m3_end = m2_end + datetime.timedelta(weeks=5)

docs = {}

docs["01_OnePager.md"] = f"""# ApplicationAI — Charter Backer Invitation
**Date:** {ts}  
**From:** {company_name}  
**Venue/Law:** {venue}

## TL;DR
Join **{backers}** charter backers to harden **ApplicationAI** from prototype to enterprise-grade. Contribute **${charter_price:,}**; receive **lifetime org access**, roadmap influence, and **source-code escrow** for continuity. Funds sit in milestone escrow; no equity, no rev-share.

## Problem
Evaluating inbound startups, grant applications, and bids is slow and inconsistent. Data is scattered, submitters omit key info, and reviewers lack a common format.

## Solution
Turn a company URL into a complete application package. We auto-fill forms (Perplexity-assisted retrieval), run a submitter chat to gather missing info, let the submitter review/approve, enrich with market/competitor signals, and generate a standardized, explainable **go/no-go** brief.

## What you get
- **Lifetime internal-use license** (or 5-Year All-Inclusive).  
- **Deployment:** SaaS, your VPC, or on-prem.  
- **Code continuity:** escrow with trigger-based access.  
- **Security & compliance pack:** questionnaire answers, DPA, audit logs/export.  
- **Roadmap influence:** quarterly charter council.

## Core v1 Capabilities
- URL → profile (team, traction, docs) with citations.  
- **Submitter copilot**: secure link to resolve missing fields.  
- Enrichment: market sizing, comps, risks; explainability cards.  
- Auto-scored rubric + human review workflow; CRM/ATS export (Affinity, HubSpot, Salesforce).  
- Audit trail; data export; admin console.

## Milestones, Dates & Escrow
- **M1 Security & Identity (30%) — due {m1_end.isoformat()}**: SSO (SAML/OIDC), RBAC, audit logging, SBOM/SCA, pen test.  
- **M2 Reliability & Data (40%) — due {m2_end.isoformat()}**: SLOs/alerting, backups/restore drills, rate limits, admin console, exports.  
- **M3 Compliance & Fit (30%) — due {m3_end.isoformat()}**: security questionnaire pack, DPA, deployment guides, badging.

## Budget & Mechanics
- Target budget **${budget:,}** = {backers} × ${charter_price:,} (escrowed).  
- Funds released upon milestone acceptance (30/40/30) with 10-day review windows.  
- Optional maintenance: **$5k/yr** for upgrades & security updates.

## Success Measures
- Time-to-first qualified application < **10 minutes**.  
- Reviewer hours saved per 100 apps > **40%**.  
- AI pre-score vs. committee correlation **≥ 0.75** (Spearman).  
- **Zero** data-leakage incidents; P0 bugs ≤ 1/mo.

**Prototype demo:** [link] · **Security packet:** included  
**Contact:** [Name, Title] · [email] · [phone]
"""

docs["02_MilestonePlan.md"] = f"""# ApplicationAI — Milestone Plan & Acceptance
**Start:** {start_date.isoformat()}  |  **Venue:** {venue}

## M0 — Spec & Risk Plan (Week 1–2)
- Threat model, data flows, acceptance tests, backlog & velocity plan.
- Evidence: architecture doc, test plan, DPIA (if needed).
- Release: 0–10% (optional).

## M1 — Security & Identity (Weeks 3–6) — Release 30% (Due {m1_end.isoformat()})
- SSO (SAML/OIDC), RBAC/ABAC, audit logging.
- SBOM; SCA/DAST; dependency pinning; secrets scanning.
- Initial pen test & remediation plan.
- **Acceptance evidence:** SSO/RBAC tests; pen test summary; SBOM/SCA reports.

## M2 — Reliability & Data (Weeks 7–12) — Release 40% (Due {m2_end.isoformat()})
- SLOs & alerting, error budgets; runbooks.
- Backups/restore drill (RTO < 4h, RPO < 24h).
- Rate limits; usage metering.
- Admin console & data export (CSV/Parquet).
- **Acceptance evidence:** dashboards; restore drill video; rate limit tests; export samples.

## M3 — Compliance & Enterprise Fit (Weeks 13–17) — Release 30% (Due {m3_end.isoformat()})
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
"""

docs["03_DemoScript.md"] = """# Demo Script & Talk Track (15 minutes)

## Setup
- Use a sanitized URL (e.g., acme-robotics.example). Screen shows: URL input, target program (e.g., 'Seed Program'), and 'Generate Application'.

## Flow
1) **URL → Application (3 min):** Run the pipeline. Narrate retrieval + extraction + field population. Show citations panel.  
2) **Submitter Copilot (3 min):** Open the secure link view; show 2–3 missing fields auto-queried; complete them; submitter approves.  
3) **Enrichment (4 min):** Show market/comps/risks cards; drill into sources; open explainability card.  
4) **Rubric & Summary (3 min):** Show auto-score, human adjust, and the decision-ready summary; export to Affinity demo org.  
5) **Security & Admin (2 min):** Show SSO login, audit log entries, data export, and role settings.

## Close
- Reiterate milestone dates, escrow, and charter benefits. Ask for top three workflows to shape v1.
"""

docs["04_ObjectionHandlingFAQ.md"] = """# Objection Handling FAQ

**Q: Why not just buy an off-the-shelf CRM plugin?**  
A: ApplicationAI is built for *evaluation*, not just capture. It standardizes applicant data, runs submitter Q&A to fill gaps, enriches with market signals, and produces an explainable go/no-go brief with citations. It plugs into CRMs rather than replacing them.

**Q: Will you train on our data?**  
A: No. We do not train foundation models on your data. Tenant data is isolated; models run under scoped policies with optional VPC/on-prem deployment.

**Q: How do we avoid hallucinations?**  
A: Retrieval-first prompts, source citations with confidence thresholds, and an eval harness for leakage and bias. Deterministic modes available for repeatability.

**Q: Can legal review this fast?**  
A: We provide a ready security packet (SIG Lite/CAIQ), DPA, and a Charter License with escrow triggers to speed review.

**Q: What happens if you disappear?**  
A: Code escrow with trigger-based access; on-prem/VPC deployment guides; internal-use fork rights for continuity.
"""

docs["05_SecurityPacket_SIGLite.md"] = f"""# Security Questionnaire (SIG Lite / CAIQ — Short Answers)

**Identity & Access**  
- SSO via SAML/OIDC (Okta, Azure AD). RBAC with least privilege; admin actions require MFA.  
- SCIM optional for provisioning.

**Data Protection**  
- Encryption: TLS 1.2+ in transit; AES-256 at rest. Keys via cloud KMS.  
- Tenant isolation at the DB and application layers; row-level policies where applicable.  
- Backups daily; quarterly restore drills (RTO < 4h, RPO < 24h).

**Logging & Monitoring**  
- Audit logs for auth, privilege changes, exports, and admin actions, retained 12 months.  
- Centralized metrics/alerts; P1 page within 15 minutes.

**Secure SDLC**  
- SAST/DAST/SCA; dependency pinning; SBOM produced at build; code reviews required.  
- Penetration test at M1 and after major changes.

**AI-Specific Controls**  
- No training on customer data without explicit opt-in.  
- Prompt/response logging policy with PII redaction options.  
- Eval harness for leakage, bias, and citation accuracy; confidence thresholds.

**Privacy & Compliance**  
- DPA attached; subprocessors listed with regions and DPAs.  
- Data residency options per environment; deletion/export within 30 days of request.

**Business Continuity**  
- Runbooks, DR tested; weekly restore verification; issue management and postmortems.
"""

docs["06_DPA_ShortForm.md"] = f"""# DPA Attachment (Short Form Summary)
- Roles: Customer = Controller, {company_name} = Processor.  
- Subject matter: provision of ApplicationAI and support.  
- Duration: license/support term.  
- Transfers: SCCs/IDTA as applicable; supplementary measures documented.  
- Subprocessors: Cloud (IaaS), Auth, Email/Notifications, LLM API (customer keys).  
- Return/Deletion: within 30 days of termination or written request.
"""

docs["07_DataFlow_Diagram.mmd"] = """```mermaid
flowchart LR
A[Submitter URL] --> B[Retriever & Extractor]
B --> C[Draft Application Fields]
C -->|Secure Link| D[Submitter Copilot]
D --> E[Validated Application]
E --> F[Enrichment: Market/Comps/Risks]
F --> G[Explainability & Citations]
G --> H[Auto-Score + Human Review]
H --> I[Go/No-Go Summary]
I --> J[(CRM/ATS Export)]
subgraph Security
SSO[SSO (SAML/OIDC)]
RBAC[RBAC]
AL[Audit Log]
end
SSO --> H
RBAC --> H
AL --> H
```"""

docs["08_Pricing_and_Licensing.md"] = f"""# Pricing & Licensing

## Charter Options
- **Lifetime Org License:** ${charter_price:,} one-time per org; internal use; non-transferable; code escrow.  
- **5-Year All-Inclusive:** ${int(charter_price*1.25):,} (includes support/updates).  
- **On-Prem/VPC Add-On:** ${int(charter_price*0.5):,} setup + SRE hours at T&M.

## Support (Optional)
- **Maintenance & Security Updates:** $5,000/year (business hours).  
- Premium SLOs available on request.

## Public GA Target Price
- SaaS: **$10,000/year** per org baseline, tiers by seats and integrations.
"""

docs["09_Pilot_SOW.md"] = f"""# Pilot SOW (Statement of Work)

**Scope:** Hardening of ApplicationAI to enterprise readiness across Security/Identity, Reliability/Data, and Compliance/Fit.  
**Term:** Start {start_date.isoformat()} — Target completion {m3_end.isoformat()}.  
**Deliverables:** As per Milestone Plan.  
**Fees:** ${budget:,} in escrow; releases 30/40/30 on acceptance.  
**Backer Responsibilities:** Provide test data, reviewer access, IdP integration support, and two demo sessions per milestone.  
**Change Control:** Changes captured via backlog; if scope expands beyond buffers, mutually agreed SOW addenda.
"""

docs["10_Outreach_Sequence.md"] = """# Outreach Sequence (3 Touches + Call Script)

**Email 1 (Value + Escrow + Code Continuity)**  
Subject: Co-design ApplicationAI (charter access + code escrow)  
[Body summarizing TL;DR and ask for 20-min demo.]

**Email 2 (Proof + Metrics)**  
Subject: 10 minutes to a qualified application  
Share a 60-second loom of URL→Application→Summary; cite targets (10 min, 40% hours saved).

**Email 3 (Security + Timeline)**  
Subject: Security packet attached + go-live dates  
Attach SIG Lite/CAIQ short answers and milestone dates.

**Call Script (10–15 min)**  
- Qualify top workflows; show demo; align on deployment; walk through escrow and triggers; schedule security review.
"""

# Write files
for name, content in docs.items():
    with open(os.path.join(base, name), "w") as f:
        f.write(content)

# Create a target list CSV template
csv_path = os.path.join(base, "Target_Backers_Template.csv")
with open(csv_path, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["Firm", "Contact Name", "Role", "Email", "Warm Intro From", "Status", "Notes"])

# Zip everything
zip_path = "./output/ApplicationAI_Charter_Pack.zip"
with zipfile.ZipFile(zip_path, "w") as z:
    for root, _, files_in in os.walk(base):
        for f in files_in:
            full = os.path.join(root, f)
            arc = os.path.relpath(full, base)
            z.write(full, arcname=arc)

zip_path