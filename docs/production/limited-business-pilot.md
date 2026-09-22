# Limited V1 business pilot

## Purpose

Validate the complete customer journey with real business owners before V1 GA. This readiness protocol does not represent a pilot pass until anonymized evidence has been collected and the manual certification workflow succeeds.

## Entry conditions

- Use 5–10 participating businesses across at least 4 industries.
- Each participating owner completes the flow on their own tenant: submit a brief, review at least 20 candidates, select a site, edit it, publish it, submit an enquiry from the public site, and republish.
- Use real owners and real business content only with their consent. Do not invent or seed customer evidence to satisfy the gate.
- Record each participant under a pseudonymous pilot ID. Keep names, emails, phone numbers, domains, tenant IDs, enquiry bodies, and credentials out of the evidence file and CI logs.

## Per-business exit checks

- Full journey completed: brief → 20+ candidates → selection → edit → publish → public enquiry → republish.
- 0 open P0 issues and 0 unresolved P1 issues.
- Tenant-isolation review passed, with a reference to the access-controlled evidence artifact.
- No manual database intervention was needed to complete the journey.
- Evidence references are opaque artifact identifiers, not public URLs or customer data.

## Evidence format

When participant work is complete, create `docs/production/pilot/evidence.json` using this structure:

```json
{
  "schemaVersion": "micirql.v1.pilot.v1",
  "startedAt": "2026-10-01T00:00:00Z",
  "completedAt": "2026-10-07T00:00:00Z",
  "businesses": [
    {
      "pilotId": "pilot-01",
      "industry": "dental",
      "journey": {
        "briefSubmitted": true,
        "candidatesReviewed": 20,
        "siteSelected": true,
        "edited": true,
        "published": true,
        "publicEnquirySubmitted": true,
        "republished": true
      },
      "openP0": 0,
      "unresolvedP1": 0,
      "tenantIsolationPassed": true,
      "tenantIsolationEvidenceRef": "artifact:pilot-01/isolation-review",
      "manualDatabaseIntervention": false,
      "evidenceRefs": ["artifact:pilot-01/journey"]
    }
  ]
}
```

Use one object per business, unique IDs `pilot-01` through `pilot-10`, and the supported industry enum in the auditor. Do not store screenshots containing personal information in this repository; use access-controlled artifacts and record opaque references only.

## Certification

The pull-request workflow audits that this protocol preserves its minimum thresholds and privacy rules. After evidence is collected, run **V1 Limited Business Pilot** with workflow dispatch. It fails closed unless all businesses satisfy the journey, issue, tenant-isolation, and no-manual-database criteria.

A successful CI policy audit means the gate is intact. Only a successful evidence certification means the limited pilot passed.
