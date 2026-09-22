# V1 production release certification

## Purpose

This gate records evidence for the V1 production release decision. Passing its pull-request policy audit means the gate definition is intact; it does not mean the product is production-ready. Certification passes only after the actual release evidence is collected, reviewed by an authorized human, and submitted to the manual workflow.

Do not tag `micirql-v1.0.0`, deploy a release, or claim V1 GA from a policy-audit result.

## Required release evidence

The release candidate must have passing, access-controlled evidence for every category below:

| ID | Required review |
| --- | --- |
| `security` | Security review, tenant isolation, authentication/authorization boundaries, and disposition of findings |
| `backup_recovery` | Backup configuration plus a successful restore exercise; record observed recovery point and recovery time against approved targets |
| `load_performance` | Production-like load and latency/error results against approved capacity and performance targets |
| `domains_tls` | Custom-domain setup, DNS ownership, HTTPS certificate issuance/renewal behavior, and routing checks |
| `privacy_legal_support` | Privacy disclosures, terms, data handling/deletion path, support contact and incident response readiness reviewed for release |
| `clean_room_journey` | Fresh-account end-to-end journey from brief through candidate review, edit, publish, public-site visit, enquiry submission, and republish |

The review must use a release candidate built from the exact commit proposed for release. Any failed or incomplete category, unresolved release-blocking finding, or missing evidence means **not certified**.

## Evidence handling

After reviews are complete, provide `docs/production/release/evidence.json` to the manual **V1 Production Release Certification** workflow. The file is intentionally absent from this change. Use opaque `artifact:` references to access-controlled evidence; do not commit customer data, screenshots containing personal information, credentials, domains, emails, or free-form notes.

The evidence package identifies the release candidate, review date, six category outcomes, and an opaque reference to the authorized approval record. The auditor checks structure and declared outcomes. A human reviewer must inspect the referenced artifacts and confirm that they support the claims before approving the release.

## Decision

A successful manual evidence workflow records that the submitted package satisfies the gate schema and all required declarations. It does not independently inspect external systems or artifacts. Release approval still requires human review of the evidence, confirmation that the release candidate matches the intended commit, and separate deployment/tagging authorization.
