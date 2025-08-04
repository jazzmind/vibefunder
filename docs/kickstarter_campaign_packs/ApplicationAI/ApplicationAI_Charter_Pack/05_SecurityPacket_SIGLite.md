# Security Questionnaire (SIG Lite / CAIQ — Short Answers)

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
