# Re-run creation after kernel reset (stateful environment note)

import os, zipfile, datetime, textwrap, pathlib

base = "./output/kickstarter_campaign_packs"
os.makedirs(base, exist_ok=True)
ts = datetime.datetime.utcnow().strftime("%Y-%m-%d")

def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)

def campaign_one_pager(name, blurb, charter_price, backers, total_budget, audience, core_capabilities, milestones_extra, metrics, add_ons):
    return f"""# {name} — Charter Backer Invitation
**Date:** {ts}

**Audience:** {audience}

## TL;DR
Join {backers} charter backers to fund hardening from prototype to enterprise-grade. Contribute **${charter_price:,}**; receive **lifetime org access**, priority roadmap input, and **source-code escrow** for continuity. Funds are milestone-escrowed; no equity, no rev-share.

## Problem & Solution
{blurb}

## What you get
- Lifetime internal-use license (non-transferable) or 5-Year All-Inclusive (your choice).
- Deployment options: SaaS / your VPC / on-prem.
- Source-code escrow with continuity triggers.
- Quarterly charter council; vote on priorities.
- Security & compliance artifacts (questionnaire pack, DPA, audit logs).

## Core capabilities (v1)
{core_capabilities}

## Milestones & Timeline (12–20 weeks)
- **M1 Security & Identity (30%)**: SSO (SAML/OIDC), RBAC, audit logging, SBOM/SCA, pen test.
- **M2 Reliability & Data (40%)**: SLOs, alerting, backups/restore drills, rate limits, admin console, exports.
- **M3 Compliance & Enterprise Fit (30%)**: questionnaire bundle, DPA, deployment guides, badging.
{milestones_extra}

## Budget & Mechanics
- Target budget: **${total_budget:,}** = {backers} × ${charter_price:,} (escrowed).
- Funds released per milestone acceptance (30/40/30) with 10-day review windows.
- Optional maintenance plan: **$5k/yr** for upgrades & security updates.
- Add-ons available (below).

## Recommended add-ons
{add_ons}

## Success metrics
{metrics}

**Contact:** [Your Name] · [email] · [phone]  
**Prototype demo:** [Link] · **Security packet:** available on request
"""

def milestone_plan(name, specific_acceptance, integrations):
    return f"""# {name} — Milestone Plan & Acceptance
**Date:** {ts}

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
{specific_acceptance}

## Integrations (initial adapters)
{integrations}
"""

def data_map(name, items):
    return f"""# {name} — Data Map & Model Strategy
**Date:** {ts}

## Data classes
{items}

## Model & provider strategy
- Default inference: pluggable (OpenAI, Anthropic, Google, local via vLLM/llama.cpp).
- Retrieval: vector DB optional; embeddings provider pluggable.
- Guardrails: prompt redaction (PII), eval harness for leakage & bias; determinizers (instruction+temperature regimes).
- No training on customer data without explicit opt-in; per-tenant isolation.
"""

def outreach_email(name, audience, hook):
    return f"""Subject: Co-design {name}: charter access + code continuity

Hi {{FirstName}},

We’re inviting a handful of {audience} to co-design **{name}**. Contribute **$20k** as a charter backer (funds in escrow), and you’ll receive **lifetime org access**, roadmap influence, and **source-code escrow** for continuity. No equity; just outsized value on a tool built to your workflows.

{hook}

If helpful, we’ll run a 30-minute demo on sanitized data this week. Interested in a quick call?

Best,  
[Your Name]  
[Title] · [Company] · [Phone]
"""

# Campaign definitions
apps_blurb = ("Turn a company URL or brief into a complete, evaluable application: auto-populate forms (Perplexity-assisted retrieval), "
              "chat with the submitter to fill gaps, submitter review, then enrich with market/competitor analysis and risk signals; "
              "generate standardized go/no-go summaries for VC dealflow, grant competitions, and RFP triage.")
apps_caps = ("- URL → profile: scrape + enrich (team, traction, docs).\n"
             "- AI copilot chat with submitter to resolve missing fields (secure link).\n"
             "- Enrichment: market sizing, comps, risks, citations.\n"
             "- Auto-scored rubric + human review workflow; decision-ready summary.\n"
             "- Exports to CRM/ATS; audit trail and explainability cards.")
apps_metrics = ("- Time-to-first qualified application < 10 minutes.\n"
                "- Reviewer hours saved per 100 apps > 40%.\n"
                "- Agreement between AI pre-score and human committee (>0.75 Spearman).\n"
                "- Data-leakage incidents: 0; P0 bugs per month: ≤1.")
apps_addons = ("- Perplexity/Custom Retrieval Adapter hardening.\n"
               "- Advanced de-duplication & entity resolution.\n"
               "- Custom rubric builder & bias testing.\n"
               "- VPC/on-prem deploy & SSO/SCIM.")
apps_accept = ("- URL→Application pipeline completes on 50-sample test set with >95% required field fill rate.\n"
               "- Submitter chat achieves >80% completion without human assist on test cohort.\n"
               "- Enrichment cards show sources with ≥90% resolvable citations.\n"
               "- Rubric scoring reproducible with fixed seeds; CRM export validated (Affinity + HubSpot).")
apps_integrations = ("- Sources: public web, customer-supplied data, Perplexity API (customer key).\n"
                     "- Destinations: Affinity, HubSpot, Salesforce (basic), Notion export.\n"
                     "- Auth: Okta, Azure AD.")

rfp_blurb = ("Convert messy RFPs and sales conversations into winning proposals. Generate structured requirements, pull answers from a knowledge base of past proposals, "
             "assemble compliant drafts, and turn discovery calls into RFPs your team can issue.")
rfp_caps = ("- RFP ingestion: PDF/Docx/email → structured spec (sections/requirements).\n"
            "- Conversation → requirements (call transcript ingestion).\n"
            "- Proposal assembler: reusable blocks, pricing tables, schedules, compliance matrices.\n"
            "- KB builder from past proposals with citation-backed retrieval.\n"
            "- Reviewer workflows; red-team checks; export to Word/Google Docs.")
rfp_metrics = ("- Draft time reduced by 70% vs baseline.\n"
               "- Compliance matrix completeness ≥ 95%.\n"
               "- Win-rate lift on comparable deals after 90 days.\n"
               "- Hallucination citation error rate ≤ 1% on test set.")
rfp_addons = ("- E-Sign and intake portal.\n"
              "- Pricing configurator adapter (CPQ).\n"
              "- GovCon compliance pack (FAR/DFARS mapping).\n"
              "- Multi-language localization pack.")
rfp_accept = ("- Ingest 20-sample RFP set → structured spec with ≥95% key field extraction accuracy (human-labeled).\n"
              "- Proposal draft generation fills ≥90% of mandatory sections using KB with citations.\n"
              "- Compliance matrix exported and validated in CSV and Docx.\n"
              "- Round-trip editing preserves structure (Word/Google Docs).")
rfp_integrations = ("- Connectors: Google Drive/Docs, Microsoft 365, Slack, Zoom/Meet transcripts, Salesforce/HubSpot.\n"
                    "- CPQ placeholders; DocuSign/Adobe Sign (optional).\n"
                    "- Auth: Okta, Azure AD.")

comp_blurb = ("Run innovation challenges and hackathons end-to-end: intake via ApplicationAI, team formation, mentoring, judging, and awards — "
              "with enterprise security and reporting, leveraging ClimatechInnovationChallenge.org playbooks.")
comp_caps = ("- Challenge setup: tracks, criteria, timelines, comms.\n"
             "- ApplicationAI-powered submissions + team linking.\n"
             "- Mentor matching and office hours scheduling.\n"
             "- Judging portal with rubric scoring and leaderboards.\n"
             "- Analytics: participation, diversity, outcomes, post-challenge follow-up.")
comp_metrics = ("- Admin time reduced by 50% per challenge.\n"
                "- Judge completion rate ≥ 90%.\n"
                "- Inter-rater reliability ≥ 0.7.\n"
                "- Data export/API parity with target LMS/CRM.")
comp_addons = ("- Payments/sponsorships module.\n"
               "- University SSO pack + LTI 1.3 connector.\n"
               "- Badging/certificates with verifiable credentials.\n"
               "- Anti-plagiarism & duplicate detection.")
comp_accept = ("- Pilot challenge: ≥100 applications, ≥20 mentors, ≥10 judges; >90% judging completion.\n"
               "- Real-time leaderboard and audit logs verified.\n"
               "- Data exports to two specified systems validated.\n"
               "- Accessibility audit (WCAG 2.1 AA) documented.")
comp_integrations = ("- LMS/LTI (Canvas, Moodle) optional; Calendars (Google/Microsoft); Slack/Teams; Storage (Drive/OneDrive).\n"
                     "- CRM (Salesforce/HubSpot) and email (SendGrid).\n"
                     "- Auth: Okta, Azure AD; student IdP via SAML.")

campaigns = [
    ("ApplicationAI", apps_blurb, 20000, 5, 100000, "VC firms, competition managers, procurement triage teams", apps_caps, f"\n- **Application-specific:**\n{apps_accept}", apps_metrics, apps_addons, apps_integrations),
    ("Rfp_ProposalHub", rfp_blurb, 20000, 5, 100000, "capture teams, agencies, GovCon", rfp_caps, f"\n- **RFP-specific:**\n{rfp_accept}", rfp_metrics, rfp_addons, rfp_integrations),
    ("CompetitionManager", comp_blurb, 20000, 5, 100000, "universities, corporates, foundations", comp_caps, f"\n- **Competition-specific:**\n{comp_accept}", comp_metrics, comp_addons, comp_integrations),
]

created = []

for name, blurb, price, backers, budget, audience, caps, extra, metrics, addons, integrations in campaigns:
    folder = os.path.join(base, name)
    one_pager = campaign_one_pager(name.replace("_"," "), blurb, price, backers, budget, audience, caps, extra, metrics, addons)
    milestone = milestone_plan(name.replace("_"," "), extra, integrations)
    datamap = data_map(name.replace("_"," "), f"- **Inputs/Outputs/PII/Storage/Transfers** defined per product; see acceptance criteria for benchmarks.\n")
    outreach = outreach_email(name.replace("_"," "), audience, f"We have a working prototype and can demo on sanitized data. Your top three workflows will shape v1 for {name.replace('_',' ')}.")
    write(os.path.join(folder, f"{name}_OnePager.md"), one_pager)
    write(os.path.join(folder, f"{name}_MilestonePlan.md"), milestone)
    write(os.path.join(folder, f"{name}_DataMap_ModelStrategy.md"), datamap)
    write(os.path.join(folder, f"{name}_OutreachEmail.txt"), outreach)
    created.extend([os.path.join(folder, f) for f in os.listdir(folder)])

comparison = """# Campaign Comparison (Quick Reference)
| Campaign | Target Buyers | Charter Ask | Backers | Budget | Primary Outcome |
|---|---|---:|---:|---:|---|
| ApplicationAI | VCs, competitions, procurement triage | $20,000 | 5 | $100,000 | URL→Application, enrichment, go/no-go |
| Rfp/ProposalHub | Sales capture, agencies, GovCon | $20,000 | 5 | $100,000 | RFP→Proposal drafts & compliance |
| CompetitionManager | Universities, corporates, foundations | $20,000 | 5 | $100,000 | Run challenges end-to-end |
"""
write(os.path.join(base, "Campaign_Comparison.md"), comparison)

# Zip
zip_path = "./output/Charter_Campaign_Packs.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(base):
        for f in files:
            full = os.path.join(root, f)
            arc = os.path.relpath(full, base)
            z.write(full, arcname=arc)

zip_path, [str(p) for p in pathlib.Path(base).rglob("*") if p.is_file()]