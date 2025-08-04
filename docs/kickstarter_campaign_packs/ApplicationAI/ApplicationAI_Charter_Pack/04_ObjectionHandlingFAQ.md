# Objection Handling FAQ

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
